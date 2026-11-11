import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { cloudConfig, cloudReady, graph, sendTemplate } from "@/lib/waCloud";
import { readableDate } from "@/lib/pageDates";
import { logError } from "@/lib/logger";

/**
 * Fee-update messages (2026-11-11, owner: "I permit you" for the pending list). A student who took a state's PG fee
 * PDF on WhatsApp and replied YES (`wa_optins`, lib/waPdf.ts) is told when that state's PDF is rebuilt with newer
 * figures — the PDF's `data_date` later than the one they took. One message per student per build
 * (`wa_pdf_updates`), never to a withdrawn opt-in, 10 AM–9 PM IST, through the MARKETING template
 * `ah_fee_pdf_update` once Meta approves it. The template carries no file: its "Send the new PDF" quick reply comes
 * back as an inbound message with the state's ref, which lib/waPdf.ts answers with the PDF inside the 24-hour window
 * that tap opened; "Stop updates" withdraws the opt-in.
 */
export const FEE_UPDATE_TEMPLATE = "ah_fee_pdf_update";
const PER_RUN = 40;
const SITE_DAY = 200;

let approved: { at: number; ok: boolean } | null = null;
async function templateApproved(): Promise<boolean> {
  if (approved && Date.now() - approved.at < 10 * 60_000) return approved.ok;
  const c = await cloudConfig();
  let ok = false;
  if (c?.wabaId) {
    const r = await graph(c.token, `/${c.wabaId}/message_templates?name=${FEE_UPDATE_TEMPLATE}&fields=name,status`);
    const rows = (r.ok ? (r.body.data as { name?: string; status?: string }[]) : []) ?? [];
    ok = rows.some((t) => t.name === FEE_UPDATE_TEMPLATE && t.status === "APPROVED");
  }
  approved = { at: Date.now(), ok };
  return ok;
}

interface Due {
  pdf_id: number;
  phone: string;
  state: string;
  ref: string;
  data_date: string;
}

/**
 * Who is due an update: a live opt-in for the state (or, for a YES given with no state, every state the student took
 * a PDF of), the state's newest active PDF built after the student's last copy of it, and its figures dated later
 * than the build they took. A student with no earlier copy on record is never messaged.
 */
async function due(): Promise<Due[]> {
  return (await db.execute(sql`
    WITH optin AS (
      SELECT DISTINCT o.phone, s.slug
        FROM wa_optins o
        JOIN LATERAL (
          SELECT split_part(o.topic, ':', 2) AS slug WHERE split_part(o.topic, ':', 2) NOT IN ('', 'all')
          UNION
          SELECT e.slug FROM wa_pdf_events e
           WHERE split_part(o.topic, ':', 2) IN ('', 'all') AND e.phone = o.phone AND e.action = 'pdf' AND e.slug IS NOT NULL
        ) s ON true
       WHERE o.withdrawn_at IS NULL AND o.topic LIKE 'pg-fees:%'
    ),
    took AS (
      SELECT o.phone, o.slug, max(e.created_at) AS at
        FROM optin o JOIN wa_pdf_events e ON e.phone = o.phone AND e.slug = o.slug AND e.action = 'pdf'
       GROUP BY o.phone, o.slug
    )
    SELECT n.id AS pdf_id, t.phone, n.state, n.ref, n.data_date::text AS data_date
      FROM took t
      JOIN LATERAL (SELECT * FROM lead_pdfs WHERE slug = t.slug AND active ORDER BY created_at DESC LIMIT 1) n ON true
      JOIN LATERAL (SELECT data_date FROM lead_pdfs WHERE slug = t.slug AND created_at <= t.at ORDER BY created_at DESC LIMIT 1) had ON true
     WHERE n.created_at > t.at
       AND n.data_date IS NOT NULL AND had.data_date IS NOT NULL AND n.data_date > had.data_date
       AND NOT EXISTS (SELECT 1 FROM wa_pdf_updates u WHERE u.pdf_id = n.id AND u.phone = t.phone)
     ORDER BY t.at DESC
     LIMIT ${PER_RUN}
  `)) as unknown as Due[];
}

/** Run from the hourly follow-up cron. Sends nothing until the template is approved, outside 10 AM–9 PM IST, or past the day's cap. */
export async function sendFeeUpdates(): Promise<{ sent: number; failed: number; skipped?: string }> {
  const out = { sent: 0, failed: 0 };
  const hour = new Date(Date.now() + 5.5 * 3600_000).getUTCHours();
  if (hour < 10 || hour >= 21) return { ...out, skipped: "outside 10 AM–9 PM IST" };
  const list = await due();
  if (!list.length) return { ...out, skipped: "nobody due" };
  if (!(await cloudReady()) || !(await templateApproved())) return { ...out, skipped: "template not approved yet" };
  const [today] = (await db.execute(sql`SELECT count(*)::int AS n FROM wa_pdf_updates WHERE created_at > now() - interval '1 day'`)) as unknown as { n: number }[];
  let room = SITE_DAY - (today?.n ?? 0);

  for (const d of list) {
    if (room <= 0) break;
    const claimed = (await db.execute(sql`
      INSERT INTO wa_pdf_updates (pdf_id, phone) VALUES (${d.pdf_id}, ${d.phone}) ON CONFLICT DO NOTHING RETURNING pdf_id
    `)) as unknown as unknown[];
    if (!claimed.length) continue;
    room--;
    const r = await sendTemplate(d.phone, FEE_UPDATE_TEMPLATE, [d.state, readableDate(d.data_date)], "pdf", [
      { index: 0, payload: `(ref ${d.ref}-PDF)` },
      { index: 1, payload: "STOP" },
    ]);
    await db.execute(sql`
      UPDATE wa_pdf_updates SET wamid = ${r.ok ? r.id : null}, error = ${r.ok ? null : r.error}
       WHERE pdf_id = ${d.pdf_id} AND phone = ${d.phone}`);
    if (r.ok) out.sent++;
    else {
      out.failed++;
      logError(new Error(`Fee update to …${d.phone.slice(-4)} failed: ${r.error}`), { route: "waPdfUpdates" });
    }
  }
  return out;
}
