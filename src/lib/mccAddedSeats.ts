import { revalidateTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { pingIndexNow } from "@/lib/indexNow";
import { tellOwner } from "@/lib/telegramBot";
import { getIntegration } from "@/lib/integrations";

/**
 * MCC's "newly added seats" notices into the seat matrix (2026-11-10; owner: "mostly data dynamic hona chaiye, static
 * nhi"). The mcc-worker reads the PDF, checks its rows add up to the total MCC prints, and stages them in
 * mcc_added_seats_staging; this maps them into mcc_seat_matrix — the rules of the hand import of 10 Nov
 * (scripts/mcc/README_added_seats.md):
 *   quota → matrix: All India → AIQ; Self-Financed Merit Seat / NRI / Jain / Muslim minority → Deemed; DNB Quota → DNB;
 *   BHU / AMU / IP / DU → Central Institutes Internal Quota; Armed Forces Medical left out (not in the base matrix);
 *   category "OP|EW|BC|SC|ST" + "NO|PH" → open/ews/obc/sc/st (+ _pwd);
 *   course by MCC's branch name with its trailing code stripped, institute by MCC's institute code from earlier rows.
 * Replaces this file's own rows (source_file = the PDF's URL), so a re-read never doubles a seat. Then the pages that
 * print the matrix are refreshed and the owner is told on Telegram.
 *
 * Server only.
 */
const MATRIX = sql`CASE
  WHEN s.quota ILIKE 'All India%' THEN 'AIQ'
  WHEN s.quota ~* 'self.?financed|non.?resident|jain|muslim|paid' THEN 'Deemed'
  WHEN s.quota ~* '^DNB' THEN 'DNB'
  WHEN s.quota ~* 'banaras|aligarh|ip university|delhi university|jamia' THEN 'Central Institutes Internal Quota'
END`;

const strip = (col: ReturnType<typeof sql>) => sql`regexp_replace(${col}, '\\s*\\([A-Z][A-Z-]{1,8}\\)$', '')`;

/** "Newly added seats, Round 2 (10 Nov 2026)" from MCC's title and the upload stamp in the PDF's file name. */
function niceTitle(title: string, url: string): string {
  const round = title.match(/round\s*[-–]?\s*(\d|one|two|three|four)/i)?.[1];
  const word: Record<string, string> = { one: "1", two: "2", three: "3", four: "4" };
  const r = round ? word[round.toLowerCase()] ?? round : null;
  const stamp = url.match(/\/(20\d\d)(\d\d)(\d\d)\d+\.pdf$/i);
  const date = stamp ? new Date(Date.UTC(+stamp[1], +stamp[2] - 1, +stamp[3])).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null;
  return `Newly added seats${r ? `, Round ${r}` : ""}${date ? ` (${date})` : ""}`;
}

export async function ingestAddedSeats(url: string, year: number): Promise<{ rows: number; seats: number; skipped: number; title: string }> {
  const file = ((await db.execute(sql`SELECT title, status, seats, printed_total FROM mcc_added_seat_files WHERE url = ${url} AND year = ${year}`)) as unknown as {
    title: string;
    status: string;
    seats: number | null;
    printed_total: number | null;
  }[])[0];
  if (!file) throw new Error("No such file recorded");
  if (file.status !== "staged") throw new Error(`File is ${file.status}, not staged`);
  if (file.printed_total == null || file.seats !== file.printed_total) throw new Error("Rows do not add up to MCC's total");
  const title = `MCC PG Medical ${year} - ${niceTitle(file.title, url)}`;

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM mcc_seat_matrix WHERE source_file = ${url}`);
    const skipped = ((await tx.execute(sql`
      SELECT COALESCE(SUM(seats), 0)::int AS n FROM mcc_added_seats_staging s WHERE s.url = ${url} AND (${MATRIX}) IS NULL`)) as unknown as { n: number }[])[0]?.n ?? 0;
    const ins = (await tx.execute(sql`
      WITH r AS (
        SELECT s.state, s.institute, s.code, s.branch, s.quota, ${MATRIX} AS seat_matrix,
               CASE WHEN s.quota ~* '^DNB' THEN (CASE WHEN s.branch ~* 'diploma' THEN 'DNB Diploma' ELSE 'DNB' END)
                    WHEN s.branch ~* '^M\\.?\\s*D\\.' THEN 'MD' WHEN s.branch ~* '^M\\.?\\s*S\\.' THEN 'MS'
                    WHEN s.branch ~* 'diploma' THEN 'Diploma' WHEN s.branch ~* '^M\\.?\\s*Ch' THEN 'M.Ch.' ELSE 'MD' END AS programme,
               split_part(s.category, ' ', 1) AS cat, split_part(s.category, ' ', 2) = 'PH' AS pwd, s.seats
          FROM mcc_added_seats_staging s WHERE s.url = ${url}
      ), g AS (
        SELECT state, institute, code, branch, quota, seat_matrix, programme,
               SUM(seats) FILTER (WHERE cat = 'OP' AND NOT pwd)::int AS open_seats, SUM(seats) FILTER (WHERE cat = 'OP' AND pwd)::int AS open_pwd,
               SUM(seats) FILTER (WHERE cat = 'EW' AND NOT pwd)::int AS ews, SUM(seats) FILTER (WHERE cat = 'EW' AND pwd)::int AS ews_pwd,
               SUM(seats) FILTER (WHERE cat = 'BC' AND NOT pwd)::int AS obc, SUM(seats) FILTER (WHERE cat = 'BC' AND pwd)::int AS obc_pwd,
               SUM(seats) FILTER (WHERE cat = 'SC' AND NOT pwd)::int AS sc, SUM(seats) FILTER (WHERE cat = 'SC' AND pwd)::int AS sc_pwd,
               SUM(seats) FILTER (WHERE cat = 'ST' AND NOT pwd)::int AS st, SUM(seats) FILTER (WHERE cat = 'ST' AND pwd)::int AS st_pwd,
               SUM(seats)::int AS total
          FROM r WHERE seat_matrix IS NOT NULL
         GROUP BY state, institute, code, branch, quota, seat_matrix, programme
      )
      INSERT INTO mcc_seat_matrix (year, programme, seat_matrix, state, mcc_institute_code, mcc_college_name, mcc_course, course_id, quota,
        open_seats, open_pwd, ews, ews_pwd, obc, obc_pwd, sc, sc_pwd, st, st_pwd, total_seats, institute_id, match_method, source_title, source_file)
      SELECT ${year}, g.programme, g.seat_matrix, g.state, g.code, g.institute, g.branch,
             (SELECT m.course_id FROM mcc_seat_matrix m
               WHERE m.course_id IS NOT NULL AND m.source_file IS DISTINCT FROM ${url}
                 AND ${strip(sql`m.mcc_course`)} = ${strip(sql`g.branch`)} LIMIT 1),
             g.quota,
             COALESCE(g.open_seats, 0), COALESCE(g.open_pwd, 0), COALESCE(g.ews, 0), COALESCE(g.ews_pwd, 0), COALESCE(g.obc, 0), COALESCE(g.obc_pwd, 0),
             COALESCE(g.sc, 0), COALESCE(g.sc_pwd, 0), COALESCE(g.st, 0), COALESCE(g.st_pwd, 0), g.total,
             (SELECT m.institute_id FROM mcc_seat_matrix m
               WHERE m.mcc_institute_code = g.code AND m.institute_id IS NOT NULL AND (m.seat_matrix = 'DNB') = (g.seat_matrix = 'DNB') LIMIT 1),
             'added-seats: code', ${title}, ${url}
        FROM g
      RETURNING total_seats`)) as unknown as { total_seats: number }[];
    const seats = ins.reduce((a, r) => a + Number(r.total_seats), 0);
    await tx.execute(sql`UPDATE mcc_added_seat_files SET status = 'live', imported = ${seats}, updated_at = now() WHERE url = ${url}`);
    await tx.execute(sql`DELETE FROM mcc_added_seats_staging WHERE url = ${url}`);
    return { rows: ins.length, seats, skipped };
  });

  revalidateTag("mcc");
  await pingIndexNow(["/neet-pg-statistics", "/neet-pg-seat-matrix"]).catch(() => undefined);
  if (await getIntegration("telegram.bot.chat_id").catch(() => null)) {
    await tellOwner(
      `🆕 MCC added seats: ${title.replace(/^MCC PG Medical \d{4} - /, "")} — ${result.seats.toLocaleString("en-IN")} seats now in the ${year} matrix${result.skipped ? ` (${result.skipped} AFMS/other left out)` : ""}. Statistics and seat matrix pages updated.`,
    ).catch(() => undefined);
  }
  return { ...result, title };
}
