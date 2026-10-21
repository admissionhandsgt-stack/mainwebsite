/**
 * WhatsApp to the team (2026-10-16): a reminder at the follow-up time a
 * counsellor set in the sheet or the admin, and a 10 AM digest of the day.
 *
 * Recipients are the staff list (`alerts.staff`, default Gulshan Tomar and Dev
 * Kumar). A reminder for a student assigned to one of them goes to that person;
 * anything else goes to everybody on the list. Sent through the linked-device
 * gateway like the lead alerts — the same few staff numbers all day is ordinary
 * traffic, and it costs nothing.
 *
 * Server only.
 */

import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { staffList, type Staff } from "@/lib/staffList";
import { sendText } from "@/lib/waGateway";
import { logError } from "@/lib/logger";
import { CLOSED, TABS, followAt, loadPeople, sheetUrl, type Person } from "@/lib/leadSheet";

/** "Gulshan", "gulshan tomar", "Gulshan Tomar" are one person. */
const same = (a: string, b: string) => {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  return !!x && !!y && (x === y || x.split(/\s+/)[0] === y.split(/\s+/)[0]);
};

function recipientsFor(p: Person, staff: Staff[]): Staff[] {
  const mine = staff.filter((s) => same(s.name, p.team.counsellor));
  return mine.length ? mine : staff;
}

const IST = "Asia/Kolkata";
const name = (p: Person) => String(p.latest.name ?? "Not given");
const rankLine = (p: Person) =>
  [TABS[p.tab], p.latest.rank != null ? `rank ${Number(p.latest.rank).toLocaleString("en-IN")}` : null, p.latest.category ?? null]
    .filter(Boolean)
    .join(" · ");

/** Follow-ups whose time has come, each sent once (reset when the time is changed). */
export async function sendDueReminders(): Promise<{ sent: number; failed: number }> {
  const out = { sent: 0, failed: 0 };
  const staff = await staffList();
  if (!staff.length) return out;
  const people = await loadPeople();
  const now = Date.now();

  for (const p of people) {
    if (CLOSED.includes(p.team.status) || !p.team.followDate || !p.team.followTime) continue;
    const at = followAt(p.team.followDate, p.team.followTime);
    // Due, and not more than a day late: an old one belongs in the morning digest, not a 2 a.m. ping.
    if (!at || +at > now || now - +at > 24 * 3600_000) continue;
    const ids = p.rows.map((r) => r.id);
    const [fresh] = (await db.execute(sql`
      SELECT bool_and(follow_up_reminded_at IS NULL) AS due FROM leads WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
    `)) as unknown as { due: boolean }[];
    if (!fresh?.due) continue;

    // Claim first, so an overlapping run cannot send the same reminder twice.
    await db.execute(sql`UPDATE leads SET follow_up_reminded_at = now() WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`);
    const link = await sheetUrl();
    const text =
      `⏰ *Follow-up now — ${name(p)}*\n` +
      `${rankLine(p)}\n` +
      `📞 ${p.phone}\n` +
      `Set for ${p.team.followTime}${p.team.counsellor ? ` · ${p.team.counsellor}` : ""}\n` +
      (p.team.notes ? `\n📝 ${p.team.notes.slice(0, 500)}\n` : "") +
      (p.team.outcome ? `Last call: ${p.team.outcome}\n` : "") +
      (link ? `\nSheet: ${link}` : "");
    for (const s of recipientsFor(p, staff)) {
      const r = await sendText(s.phone, text, { purpose: "alert" });
      if (r.sent) out.sent++;
      else {
        out.failed++;
        logError(new Error(`Follow-up reminder to ${s.name} failed: ${r.error}`), { route: "staffAlerts.reminder" });
      }
    }
  }
  return out;
}

/** The 10 AM message: the day's follow-ups, what is overdue, and who to ring first. Once a day. */
export async function sendMorningDigest(opts: { force?: boolean } = {}) {
  const day = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  if (!opts.force) {
    const claimed = (await db.execute(sql`
      INSERT INTO staff_digests (day) VALUES (${day}::date) ON CONFLICT (day) DO NOTHING RETURNING day
    `)) as unknown as unknown[];
    if (!claimed.length) return { day, skipped: "already sent today" };
  }

  const staff = await staffList();
  const people = (await loadPeople()).filter((p) => !CLOSED.includes(p.team.status));
  const link = await sheetUrl();
  const sinceYesterday = Date.now() - 24 * 3600_000;
  // Students none of our WhatsApp follow-ups reached in three days (2026-10-21). Meta holds back marketing
  // messages to people it thinks get too many (131049 — about 1 in 3 of ours in Oct) and to its own test
  // groups (130472); the one retry recovers about 1 in 3 of those. For the rest, a call is the only way.
  const last10 = (p: string) => String(p ?? "").replace(/\D/g, "").slice(-10);
  const unreached = new Set(
    ((await db.execute(sql`
      SELECT DISTINCT right(regexp_replace(m.phone, '\\D', '', 'g'), 10) AS phone
        FROM wa_messages m
       WHERE m.direction = 'out' AND m.kind = 'followup' AND m.status = 'failed' AND m.created_at > now() - interval '3 days'
         AND NOT EXISTS (
           SELECT 1 FROM wa_messages x
            WHERE x.direction = 'out' AND x.kind = 'followup' AND x.status IN ('delivered', 'read')
              AND right(regexp_replace(x.phone, '\\D', '', 'g'), 10) = right(regexp_replace(m.phone, '\\D', '', 'g'), 10))
    `)) as unknown as { phone: string }[]).map((r) => r.phone),
  );
  const newCount: Record<string, number> = {};
  for (const p of people) {
    const lastAt = +new Date(p.rows[p.rows.length - 1].created_at);
    if (lastAt > sinceYesterday) newCount[TABS[p.tab]] = (newCount[TABS[p.tab]] ?? 0) + 1;
  }

  const report: Record<string, string> = {};
  for (const s of staff) {
    const mine = people.filter((p) => !p.team.counsellor || same(s.name, p.team.counsellor));
    const today = mine
      .filter((p) => p.team.followDate === day)
      .sort((a, b) => +(followAt(a.team.followDate, a.team.followTime) ?? 0) - +(followAt(b.team.followDate, b.team.followTime) ?? 0));
    const overdue = mine.filter((p) => p.team.followDate && p.team.followDate < day);
    const hot = mine
      .filter((p) => p.team.status === "Not contacted" && p.priority === "Hot")
      .sort((a, b) => +new Date(b.rows[b.rows.length - 1].created_at) - +new Date(a.rows[a.rows.length - 1].created_at));
    const listed = new Set([...today, ...overdue, ...hot]);
    const notReached = mine.filter((p) => p.team.status === "Not contacted" && !listed.has(p) && unreached.has(last10(p.phone)));

    const list = (items: Person[], extra: (p: Person) => string, max = 8) =>
      items
        .slice(0, max)
        .map((p, i) => `${i + 1}. ${name(p)} — ${rankLine(p)} — ${p.phone}${extra(p)}`)
        .join("\n") + (items.length > max ? `\n…and ${items.length - max} more in the sheet` : "");

    const first = s.name.split(/\s+/)[0];
    const parts = [
      `☀️ *Good morning ${first} — today's calls*`,
      Object.keys(newCount).length
        ? `New in the last 24 h: ${Object.entries(newCount).map(([k, v]) => `${k} ${v}`).join(" · ")}`
        : "No new enquiries in the last 24 h.",
      today.length ? `\n*Follow-ups today (${today.length})*\n${list(today, (p) => (p.team.followTime ? ` — ${p.team.followTime}` : ""))}` : "\nNo follow-ups set for today.",
      overdue.length ? `\n*Overdue (${overdue.length})*\n${list(overdue, (p) => ` — was ${p.team.followDate.split("-").reverse().join("-")}`, 5)}` : "",
      hot.length ? `\n*Hot, not contacted yet (${hot.length})*\n${list(hot, () => "")}` : "",
      notReached.length
        ? `\n*WhatsApp did not reach them — call instead (${notReached.length})*\n${list(notReached, () => "", 6)}`
        : "",
      link ? `\nSheet: ${link}` : "",
    ].filter(Boolean);
    const text = parts.join("\n");
    const r = await sendText(s.phone, text, { purpose: "alert" });
    report[s.name] = r.sent ? "sent" : `failed: ${r.error}`;
    if (!r.sent) logError(new Error(`Morning digest to ${s.name} failed: ${r.error}`), { route: "staffAlerts.digest" });
  }
  await db.execute(sql`UPDATE staff_digests SET report = ${JSON.stringify(report)}::jsonb WHERE day = ${day}::date`);
  return { day, report, at: new Date().toLocaleString("en-IN", { timeZone: IST }) };
}
