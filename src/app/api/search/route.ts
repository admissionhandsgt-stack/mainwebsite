import { NextResponse } from "next/server";
import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { getBranches } from "@/lib/branchQueries";
import { getPgStates } from "@/lib/pgStateQueries";
import { collegeName } from "@/lib/collegeName";
import { clientIp } from "@/lib/clientIp";
import { rateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";

/**
 * Site search (2026-10-21): the header's search box. With ~3,900 college pages, 101 branches and two
 * sets of state pages, the menus can lead somebody to a list but not to their college. Every word
 * typed must appear in the name; colleges whose name starts with it come first. Names, links and a
 * line of context only — nothing a page does not already show.
 *   GET /api/search?q=kasturba manipal
 *
 * People type what they say, not what the counselling calls it: "radiology" for Radio Diagnosis,
 * "skin" for Dermatology, "aiims" for All India Institute of Medical Sciences. ALIASES widens a word
 * to the words the names use. A word of three letters or fewer matches only as a whole word, so "md"
 * finds the MD branches and not "Hamdard".
 */
export const dynamic = "force-dynamic";

const rows = <T,>(r: unknown) => r as unknown as T[];
const fold = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const ALIASES: Record<string, string[]> = {
  aiims: ["all india institute of medical sciences"],
  gmc: ["government medical college"],
  cmc: ["christian medical college"],
  esi: ["employees state insurance", "esic"],
  esic: ["employees state insurance"],
  radiology: ["radio diagnosis", "radiodiagnosis", "radio"],
  radiologist: ["radio diagnosis", "radio"],
  skin: ["dermatology"],
  derma: ["dermatology"],
  eye: ["ophthalmology"],
  ent: ["oto rhino laryngology", "otorhinolaryngology"],
  child: ["paediatric", "pediatric", "child health"],
  kids: ["paediatric", "pediatric"],
  pediatrics: ["paediatrics"],
  peds: ["paediatric", "pediatric"],
  gynae: ["gynaecology", "gynecology"],
  gyne: ["gynaecology", "gynecology"],
  gyno: ["gynaecology", "gynecology"],
  obg: ["obstetrics"],
  obgy: ["obstetrics"],
  anesthesia: ["anaesthesi", "anesthesi"],
  anesthesiology: ["anaesthesiology"],
  anaesthesia: ["anaesthesi"],
  bones: ["orthopaedic", "orthopedic"],
  bone: ["orthopaedic", "orthopedic"],
  chest: ["respiratory", "tuberculosis", "pulmonary"],
  tb: ["tuberculosis"],
  lungs: ["respiratory", "pulmonary"],
  mental: ["psychiatry", "psychological"],
  psych: ["psychiatry", "psychological"],
  heart: ["cardio"],
  cardiology: ["cardio"],
  lab: ["pathology", "biochemistry", "microbiology", "lab medicine"],
  pondicherry: ["puducherry"],
  puducherry: ["pondicherry"],
  bangalore: ["bengaluru"],
  bengaluru: ["bangalore"],
  bombay: ["mumbai"],
  calcutta: ["kolkata"],
  madras: ["chennai"],
  orissa: ["odisha"],
};

/** The forms one typed word may take in a name. */
const formsOf = (w: string) => [w, ...(ALIASES[w] ?? [])].map(fold);
const shortWord = (f: string) => f.length <= 3 && !f.includes(" ");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One word, as a SQL condition on the name. */
function nameMatches(w: string): SQL {
  const parts = formsOf(w).map((f) =>
    shortWord(f) ? sql`i.name ~* ${"\\y" + escapeRe(f) + "\\y"}` : sql`i.name ILIKE ${"%" + f.replace(/ /g, "%") + "%"}`,
  );
  return sql`(${sql.join(parts, sql` OR `)})`;
}

/** The same test in JS, for branch and state names. */
const textMatches = (text: string, w: string) => {
  const t = ` ${fold(text)} `;
  return formsOf(w).some((f) => (shortWord(f) ? t.includes(` ${f} `) : t.replace(/ /g, "").includes(f.replace(/ /g, ""))));
};

/** What a UG listing actually admits to, from its own name (the UG list carries every NEET stream). */
function ugKind(name: string) {
  if (/dental/i.test(name)) return "BDS college";
  if (/ayurved|homo?eopath|unani|siddha|yoga|naturopath/i.test(name)) return "AYUSH college";
  if (/nursing/i.test(name)) return "Nursing college";
  if (/veterinar|animal/i.test(name)) return "Veterinary college";
  return "MBBS college";
}

export async function GET(request: Request) {
  const limit = rateLimit(`search:${clientIp(request) ?? "unknown"}`, 60, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many searches — try again in a minute." }, { status: 429 });

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  const words = fold(q).split(" ").filter((w) => w.length >= 2).slice(0, 5);
  if (!words.length) return NextResponse.json({ colleges: [], branches: [], states: [] });

  try {
    const first = formsOf(words[0])[0];
    const [colleges, branches, pgStates, ugStates] = await Promise.all([
      db.execute(sql`
        SELECT i.slug, i.name, i.level::text AS level, s.name AS state,
               (i.level = 'pg' AND EXISTS (
                  SELECT 1 FROM seat_options so JOIN courses co ON co.id = so.course_id
                   WHERE so.institute_id = i.id AND co.name !~* '^(DNB|DrNB|FNB|Diploma|PG Diploma)')) AS mdms
          FROM institutes i LEFT JOIN states s ON s.id = i.state_id
         WHERE i.is_active AND i.slug IS NOT NULL AND ${sql.join(words.map(nameMatches), sql` AND `)}
         ORDER BY (i.name ILIKE ${first + "%"}) DESC, length(i.name) ASC
         LIMIT 8`),
      getBranches(),
      getPgStates(),
      db.execute(sql`SELECT name, slug FROM mbbs_states WHERE is_active ORDER BY name`),
    ]);
    const has = (text: string) => words.every((w) => textMatches(text, w));
    return NextResponse.json(
      {
        colleges: rows<{ slug: string; name: string; level: string; state: string | null; mdms: boolean }>(colleges).map((c) => {
          const n = collegeName(c.name);
          const pg = c.level === "pg";
          return {
            label: n.place && !n.short.toLowerCase().includes(n.place.toLowerCase()) ? `${n.short}, ${n.place}` : n.short,
            sub: [pg ? (c.mdms ? "MD/MS college" : "DNB hospital") : ugKind(c.name), c.state].filter(Boolean).join(" · "),
            url: `${pg ? "/md-ms-india/colleges" : "/mbbs-india/colleges"}/${c.slug}`,
          };
        }),
        branches: branches
          .filter((b) => has(b.name))
          .slice(0, 5)
          .map((b) => ({ label: b.name, sub: "PG branch · cutoff, seats and colleges", url: `/md-ms-india/branches/${b.slug}` })),
        states: [
          ...pgStates.filter((s) => has(s.name)).map((s) => ({ label: `MD/MS in ${s.name}`, sub: "PG colleges, counselling and cutoff", url: `/md-ms-india/states/${s.slug}` })),
          ...rows<{ name: string; slug: string }>(ugStates)
            .filter((s) => has(s.name))
            .map((s) => ({ label: `MBBS in ${s.name}`, sub: "MBBS colleges and counselling", url: `/mbbs-india/${encodeURIComponent(s.slug)}` })),
        ].slice(0, 4),
      },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  } catch (error) {
    logError(error, { route: "api/search" });
    return NextResponse.json({ colleges: [], branches: [], states: [] }, { status: 500 });
  }
}
