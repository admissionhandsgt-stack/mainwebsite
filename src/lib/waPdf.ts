/**
 * The state PG fee & stipend PDF on WhatsApp (2026-11-11; spec in D:/Admisson Hands/seo_data/research_2026_11/
 * lead_magnet_pdf.md). A page's button opens WhatsApp on the official number with "Send me the Maharashtra PG fee &
 * stipend PDF (ref MH-PDF)" typed; the student sends it, Meta's webhook (/api/whatsapp/cloud) hands the message here,
 * and the official number replies in the same chat with the state's PDF and a short menu — 1 a counsellor call, 2
 * another state, YES fee updates, STOP. The student wrote first, so every reply is inside WhatsApp's 24-hour window: a
 * free-form service message, no template, nothing sent to anyone who did not ask.
 *
 * Guard rails: only a message that asks for a PDF, or a menu reply from someone sent a PDF in the last seven days, is
 * answered; each inbound message is acted on once (wa_pdf_events, so a retried webhook sends nothing twice); three PDFs a
 * number a day and a site-wide ceiling; sent through Meta's API only, never the linked-device gateway. A first request
 * creates a lead and tells the team; a "1" flags it for a call. Words: Admin → Content → "Site: PG fee PDF on WhatsApp".
 * Server only.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { cloudConfig, cloudReady, graph, graphError, type CloudConfig } from "@/lib/waCloud";
import { recordOutbound } from "@/lib/waLog";
import { pageCopy } from "@/lib/pageCopy";
import { sendWhatsAppNotification } from "@/lib/whatsappService";
import { logError } from "@/lib/logger";

const SITE = "https://www.admissionhands.com";
const PER_NUMBER_DAY = 3;
const SITE_DAY = 300;
const REF = /\(\s*ref\s+([A-Za-z]{2,3})\s*-\s*PDF\s*\)/i;

interface Pdf {
  slug: string;
  state: string;
  ref: string;
  filename: string;
  token: string;
  data_date: string | null;
}

/** The newest active PDF of each state. */
export async function activePdfs(): Promise<Pdf[]> {
  return (await db.execute(sql`
    SELECT DISTINCT ON (slug) slug, state, ref, filename, token, to_char(data_date, 'DD Mon YYYY') AS data_date
      FROM lead_pdfs WHERE active
     ORDER BY slug, created_at DESC`)) as unknown as Pdf[];
}

const fold = (s: string) => ` ${s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim()} `;
/** The state a message names: its ref code first, else the state's name. */
function stateOf(text: string, pdfs: Pdf[]): Pdf | null {
  const ref = REF.exec(text)?.[1]?.toUpperCase();
  if (ref) {
    const p = pdfs.find((x) => x.ref === ref);
    if (p) return p;
  }
  const t = fold(text);
  const named = pdfs.filter((p) => t.includes(fold(p.state)) || (p.state === "Tamil Nadu" && t.includes(" tamilnadu ")) || (p.state === "Pondicherry" && /\s(puducherry|pondy)\s/.test(t)));
  return named.sort((a, b) => b.state.length - a.state.length)[0] ?? null;
}

async function send(c: CloudConfig, phone: string, payload: Record<string, unknown>, logBody: string): Promise<boolean> {
  const r = await graph(c.token, `/${c.phoneNumberId}/messages`, {
    method: "POST",
    body: { messaging_product: "whatsapp", recipient_type: "individual", to: phone.replace(/\D/g, ""), ...payload },
  });
  const id = r.ok ? ((r.body.messages as { id?: string }[] | undefined) ?? [])[0]?.id ?? null : null;
  await recordOutbound({ wamid: id, phone, kind: "pdf", body: logBody, error: r.ok ? null : graphError(r) });
  if (!r.ok) logError(new Error(`PDF flow send to ${phone.slice(-4)} failed: ${graphError(r)}`), { route: "waPdf" });
  return r.ok;
}
const text = (c: CloudConfig, phone: string, body: string) => send(c, phone, { type: "text", text: { body, preview_url: true } }, body);

/** First claim on an inbound message: false when it was already acted on (a retried webhook). */
async function claim(wamid: string, phone: string, action: string, slug: string | null): Promise<boolean> {
  const r = (await db.execute(sql`
    INSERT INTO wa_pdf_events (wamid, phone, action, slug) VALUES (${wamid}, ${phone}, ${action}, ${slug})
    ON CONFLICT (wamid) DO NOTHING RETURNING wamid`)) as unknown as unknown[];
  return r.length > 0;
}

async function lastPdf(phone: string): Promise<string | null> {
  const r = (await db.execute(sql`
    SELECT slug FROM wa_pdf_events WHERE phone = ${phone} AND action = 'pdf' AND created_at > now() - interval '7 days'
     ORDER BY created_at DESC LIMIT 1`)) as unknown as { slug: string | null }[];
  return r[0] ? r[0].slug ?? "" : null;
}

/** A lead for a first request (the team is told); a note on the lead for a repeat. */
async function noteLead(phone: string, name: string | null, state: string, note: string, alert: string | null) {
  try {
    const lead = (await db.execute(sql`
      SELECT id FROM leads WHERE phone = ${phone} AND created_at > now() - interval '30 days' ORDER BY created_at DESC LIMIT 1`)) as unknown as { id: number }[];
    const day = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
    if (lead[0]) {
      await db.execute(sql`
        UPDATE leads SET admin_notes = concat_ws(E'\n', nullif(admin_notes, ''), ${`${day}: ${note}`})${alert ? sql`, is_read = false` : sql``}
         WHERE id = ${lead[0].id}`);
    } else {
      await db.execute(sql`
        INSERT INTO leads (level, name, phone, rank, category, source_page, lead_status, message)
        VALUES ('pg'::level, ${name || "WhatsApp PDF"}, ${phone}, NULL, NULL, ${`WhatsApp PDF — ${state} PG fees`}, 'New', ${note})`);
      alert = alert ?? `📄 Asked for the ${state} PG fee PDF on WhatsApp`;
    }
    if (alert) await sendWhatsAppNotification({ name: name || "Not given", phone, source: alert });
  } catch (error) {
    logError(error, { route: "waPdf.noteLead" });
  }
}

/**
 * Called for every inbound message to the official number, after it is recorded. True when the PDF flow answered it.
 */
export async function handlePdfMessage(m: { id?: string; from?: string; text?: { body?: string } }, name: string | null): Promise<boolean> {
  const body = (m.text?.body ?? "").trim();
  if (!body || !m.id || !m.from || body.length > 300) return false;
  const phone = `+${m.from.replace(/\D/g, "")}`;
  const asks = REF.test(body) || /\bpdf\b/i.test(body);
  const recent = await lastPdf(phone);
  if (!asks && recent === null) return false;
  if (!(await cloudReady())) return false;
  const c = await cloudConfig();
  if (!c?.phoneNumberId) return false;

  const pdfs = await activePdfs();
  // Nothing built yet: the message waits in the inbox for a person.
  if (!pdfs.length) return false;
  const states = pdfs.map((p) => p.state).join(", ");
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  const word = body.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  // Menu replies — only from someone sent a PDF in the last seven days.
  if (!asks && recent !== null) {
    const lastState = pdfs.find((p) => p.slug === recent)?.state ?? "your state";
    const copy = await pageCopy("site.fee_pdf", { first: first ? `, ${first}` : "", states, state: lastState });
    if (word === "1") {
      if (!(await claim(m.id, phone, "menu-1", recent || null))) return true;
      await text(c, phone, copy.on_1);
      await noteLead(phone, name, lastState, "Replied 1 after the PDF: wants a counsellor to call.", "📞 Replied 1 after the PDF — wants a call");
      return true;
    }
    if (word === "2") {
      if (!(await claim(m.id, phone, "menu-2", recent || null))) return true;
      await text(c, phone, copy.on_2);
      return true;
    }
    if (/^(yes|haan|ha|han|y)$/.test(word)) {
      if (!(await claim(m.id, phone, "yes", recent || null))) return true;
      await db.execute(sql`INSERT INTO wa_optins (phone, topic, text, source) VALUES (${phone}, ${`pg-fees:${recent || "all"}`}, ${body}, 'whatsapp')`);
      await text(c, phone, copy.on_yes);
      return true;
    }
    if (/^(stop|unsubscribe|band karo)$/.test(word)) {
      if (!(await claim(m.id, phone, "stop", null))) return true;
      await db.execute(sql`UPDATE wa_optins SET withdrawn_at = now() WHERE phone = ${phone} AND withdrawn_at IS NULL`);
      await text(c, phone, copy.on_stop);
      return true;
    }
    // A state's name on its own after "2": that state's PDF.
    if (!stateOf(body, pdfs)) return false;
  }

  const pdf = stateOf(body, pdfs);
  const copy = await pageCopy("site.fee_pdf", { first: first ? `, ${first}` : "", states, state: pdf?.state ?? "that state", date: pdf?.data_date ?? "" });
  if (!pdf) {
    if (!(await claim(m.id, phone, "none", null))) return true;
    await text(c, phone, copy.on_2);
    return true;
  }

  const [counts] = (await db.execute(sql`
    SELECT count(*) FILTER (WHERE phone = ${phone})::int AS mine, count(*)::int AS total
      FROM wa_pdf_events WHERE action = 'pdf' AND created_at > now() - interval '1 day'`)) as unknown as { mine: number; total: number }[];
  if ((counts?.mine ?? 0) >= PER_NUMBER_DAY || (counts?.total ?? 0) >= SITE_DAY) {
    if (!(await claim(m.id, phone, "cap", pdf.slug))) return true;
    await text(c, phone, copy.cap);
    return true;
  }
  if (!(await claim(m.id, phone, "pdf", pdf.slug))) return true;
  const sent = await send(
    c,
    phone,
    { type: "document", document: { link: `${SITE}/api/wa-pdf/${pdf.token}`, filename: pdf.filename, caption: copy.caption } },
    `[document: ${pdf.filename}] ${copy.caption}`,
  );
  if (!sent) {
    const none = (await pageCopy("site.fee_pdf", { state: pdf.state, link: `${SITE}/md-ms-india/fees/${pdf.slug}` })).none;
    await text(c, phone, none);
    return true;
  }
  await text(c, phone, copy.menu);
  // A first request is a new lead and the team is told (noteLead); a repeat is a note on it.
  await noteLead(phone, name, pdf.state, `Asked for the ${pdf.state} PG fee & stipend PDF on WhatsApp — sent.`, null);
  return true;
}
