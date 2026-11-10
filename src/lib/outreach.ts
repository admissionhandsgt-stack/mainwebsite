import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getIntegration, getIntegrationFlag } from "@/lib/integrations";
import { getStipends } from "@/lib/cutoffHubQueries";
import { getBondByState } from "@/lib/pgSeatData";
import { sendMail } from "@/lib/mailer";
import { editOwnerMessage, tellOwner, type InlineButton } from "@/lib/telegramBot";

/**
 * Outreach email with the owner's approval on Telegram (2026-11-10; owner: "sab kuch banake telegram ke through approval
 * and preview and send and changes").
 *
 * - Targets are added in Admin → Outreach email (an address from a public page, the organisation, why them). Each gets a
 *   draft written from today's figures (stipend by state, the bond) — never a typed number.
 * - Every day (`POST /api/cron/outreach`, 05:35 UTC) drafts go to the owner's Telegram as previews, up to the daily cap
 *   less what was already sent today. Buttons: Send · Skip · Opted out. Replying to a preview with new text replaces the
 *   body (a first line "Subject: …" replaces the subject) and a fresh preview comes back.
 * - Seven days after a send, one follow-up is previewed the same way unless the owner marked "Replied". Never a second.
 * - One row per address, ever (unique index). Plain text, a real signature, and an opt-out line in every message.
 *
 * What it never does: ask for a link in exchange for anything, write to an address not added by a person, or send
 * without the owner pressing Send. Google calls link exchanges and automated link requests a link scheme.
 */

const SITE = "https://www.admissionhands.com";
const inr = (v: number | null | undefined) => (v == null ? "—" : `₹${Math.round(v).toLocaleString("en-IN")}`);
const lakh = (v: number | null | undefined) => (v == null ? "—" : v >= 1e7 ? `₹${(v / 1e7).toFixed(2).replace(/\.?0+$/, "")} Cr` : `₹${(v / 1e5).toFixed(2).replace(/\.?0+$/, "")} L`);

export type Kind = "journalist" | "association" | "other";
export type OutreachRow = {
  id: number;
  email: string;
  name: string | null;
  org: string;
  kind: Kind;
  why: string | null;
  source_url: string | null;
  subject: string;
  body: string;
  status: string;
  tg_message_id: number | null;
  sent_at: string | null;
  followed_up_at: string | null;
  last_error: string | null;
  created_at: string;
};

const SIGNATURE = `Gulshan Tomar\nAdmission Counselor, AdmissionHands\n${SITE.replace("https://", "")} · +91 92206 26002`;
const OPT_OUT = `If you would rather not hear from me, reply "no" and I won't write again.`;

/* ------------------------------------------------------------------ drafts ---- */

export async function draftFor(kind: Kind, name: string | null, org: string): Promise<{ subject: string; body: string }> {
  const [st, bond] = await Promise.all([getStipends(), getBondByState().catch(() => null)]);
  const top = st.states[0];
  const low = st.states[st.states.length - 1];
  const govtTop = [...st.states].filter((x) => x.govtMedian != null).sort((a, b) => (b.govtMedian ?? 0) - (a.govtMedian ?? 0))[0];
  const hi = `Hi ${name?.trim() || (kind === "association" ? `${org} team` : "there")},`;
  const me = "I'm Gulshan Tomar, a NEET PG admission counsellor at AdmissionHands.";

  if (kind === "association") {
    return {
      subject: `State-wise PG stipend and bond data, free for ${org}`.slice(0, 150),
      body: [
        hi,
        "",
        `${me} We keep a state-wise table of the first-year MD/MS stipend that ${st.colleges.toLocaleString("en-IN")} medical colleges publish${
          bond ? `, and of the service bond and seat-leaving penalty listed for the ${bond.year} counselling` : ""
        }. It may be useful for ${org}'s work on resident doctors' pay:`,
        "",
        ...(top && low ? [`• The median first-year stipend runs from ${inr(low.median)} a month (${low.state}) to ${inr(top.median)} (${top.state}).`] : []),
        ...(govtTop ? [`• In government colleges, ${govtTop.state} pays most: ${inr(govtTop.govtMedian)} a month.`] : []),
        ...(bond?.govtBonded ? [`• ${bond.govtBonded} of ${bond.govtColleges} government PG colleges list a service bond; the middle penalty is ${lakh(bond.penaltyMedian)}.`] : []),
        "",
        `Stipend by state and college: ${SITE}/md-ms-india/stipend`,
        ...(bond ? [`Bond and penalties by state: ${SITE}/md-ms-india/bond (as listed for the counselling, not an official notice)`] : []),
        "",
        "Free to use with a link. If a state's figure looks wrong to you, tell me and I'll check it against the notice.",
        "",
        SIGNATURE,
        "",
        OPT_OUT,
      ].join("\n"),
    };
  }

  if (kind === "journalist") {
    return {
      subject: top && low ? `Data: first-year PG stipend runs from ${inr(low.median)} to ${inr(top.median)} a month across states` : "Data: PG resident stipend by state",
      body: [
        hi,
        "",
        `${me} We compiled the first-year MD/MS stipend that ${st.colleges.toLocaleString("en-IN")} medical colleges publish, state by state. A few findings that may help your coverage of NEET PG counselling:`,
        "",
        ...(top && low ? [`• Highest median: ${top.state}, ${inr(top.median)} a month; lowest: ${low.state}, ${inr(low.median)}.`] : []),
        ...(govtTop ? [`• In government colleges, ${govtTop.state} pays most: ${inr(govtTop.govtMedian)} a month.`] : []),
        ...(st.govtMedian && st.privateMedian ? [`• Government colleges' median ${inr(st.govtMedian)} against ${inr(st.privateMedian)} in private and deemed colleges.`] : []),
        "",
        `The full table, the method and a free CSV: ${SITE}/reports/neet-pg-stipend-2026`,
        ...(bond ? [`Service bond and seat-leaving penalties, state by state: ${SITE}/md-ms-india/bond`] : []),
        "",
        "Happy to share state-level data or answer questions.",
        "",
        SIGNATURE,
        "",
        OPT_OUT,
      ].join("\n"),
    };
  }

  return {
    subject: "NEET PG data: stipend, bond and cut offs by state",
    body: [
      hi,
      "",
      `${me} We publish free, source-linked NEET PG data — the stipend ${st.colleges.toLocaleString("en-IN")} colleges publish, state-wise bonds, branch-wise cut offs and marks vs rank — and thought it might be useful to ${org}.`,
      "",
      `Stipend by state: ${SITE}/md-ms-india/stipend`,
      `Open data (CSV): ${SITE}/data`,
      "",
      SIGNATURE,
      "",
      OPT_OUT,
    ].join("\n"),
  };
}

function followupFor(r: OutreachRow): { subject: string; body: string } {
  return {
    subject: r.subject.startsWith("Re:") ? r.subject : `Re: ${r.subject}`,
    body: [
      `Hi ${r.name?.trim() || "there"},`,
      "",
      "Bringing my note below back to the top in case it is useful. No reply needed if not.",
      "",
      SIGNATURE,
      "",
      OPT_OUT,
      "",
      "---- earlier ----",
      r.body,
    ].join("\n"),
  };
}

/* ------------------------------------------------------------------- rows ---- */

const rows = async (q: ReturnType<typeof sql>) => (await db.execute(q)) as unknown as OutreachRow[];

export async function listOutreach(): Promise<OutreachRow[]> {
  return rows(sql`
    SELECT id, email, name, org, kind, why, source_url, subject, body, status, tg_message_id,
           to_json(sent_at)#>>'{}' AS sent_at, to_json(followed_up_at)#>>'{}' AS followed_up_at, last_error,
           to_json(created_at)#>>'{}' AS created_at
      FROM outreach_emails ORDER BY created_at DESC LIMIT 500`);
}

export async function addOutreach(t: { email: string; name?: string; org: string; kind: Kind; why?: string; sourceUrl?: string }) {
  const email = t.email.trim().toLowerCase();
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(email)) throw new Error("That is not an email address.");
  const org = t.org.trim().slice(0, 160);
  if (!org) throw new Error("Say which organisation it is.");
  const name = t.name?.trim().slice(0, 80) || null;
  const d = await draftFor(t.kind, name, org);
  const r = await rows(sql`
    INSERT INTO outreach_emails (email, name, org, kind, why, source_url, subject, body)
    VALUES (${email}, ${name}, ${org}, ${t.kind}, ${t.why?.trim().slice(0, 300) || null}, ${t.sourceUrl?.trim().slice(0, 400) || null}, ${d.subject}, ${d.body})
    ON CONFLICT ((lower(email))) DO NOTHING
    RETURNING id`);
  if (!r.length) throw new Error("That address is already on the list — nobody is written to twice.");
  return r[0].id;
}

export async function deleteOutreach(id: number) {
  // A sent row stays as the record of what went; only unsent ones can go.
  await db.execute(sql`DELETE FROM outreach_emails WHERE id = ${id} AND sent_at IS NULL`);
}

async function getRow(id: number) {
  const r = await rows(sql`SELECT * FROM outreach_emails WHERE id = ${id}`);
  return r[0] ?? null;
}

async function setRow(id: number, fields: ReturnType<typeof sql>) {
  await db.execute(sql`UPDATE outreach_emails SET ${fields}, updated_at = now() WHERE id = ${id}`);
}

/* ----------------------------------------------------------------- previews ---- */

function previewText(r: OutreachRow & { followup_subject?: string | null; followup_body?: string | null }, followup: boolean) {
  const subject = followup ? r.followup_subject ?? "" : r.subject;
  const body = followup ? r.followup_body ?? "" : r.body;
  return [
    `${followup ? "↩️ FOLLOW-UP" : "📧 EMAIL"} #${r.id} — ${r.org} (${r.kind})`,
    `To: ${r.name ? `${r.name} <${r.email}>` : r.email}`,
    ...(r.why ? [`Why: ${r.why}`] : []),
    "",
    `Subject: ${subject}`,
    "",
    body,
    "",
    "✏️ To change it, reply to this message with the new text (first line \"Subject: …\" changes the subject).",
  ].join("\n");
}

const buttons = (id: number): InlineButton[][] => [
  [
    { text: "✅ Send", callback_data: `o:send:${id}` },
    { text: "⏭ Skip", callback_data: `o:skip:${id}` },
  ],
  [{ text: "🚫 Opted out / don't write", callback_data: `o:out:${id}` }],
];

async function sentToday(): Promise<number> {
  const r = (await db.execute(sql`
    SELECT count(*)::int AS n FROM outreach_emails
     WHERE (sent_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date
        OR (followed_up_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date`)) as unknown as { n: number }[];
  return r[0]?.n ?? 0;
}

async function cap(): Promise<number> {
  const v = Number(await getIntegration("outreach.daily_cap"));
  return Number.isFinite(v) && v > 0 ? Math.min(v, 20) : 10;
}

/** The daily run: previews to the owner, up to the cap less what is already sent or waiting today. */
export async function runOutreach(opts: { force?: boolean } = {}): Promise<{ previewed: number; followups: number; skipped?: string }> {
  if (!opts.force && !(await getIntegrationFlag("outreach.enabled"))) return { previewed: 0, followups: 0, skipped: "switched off" };
  if (!(await getIntegration("telegram.bot.chat_id"))) return { previewed: 0, followups: 0, skipped: "Telegram not linked" };
  const waiting = (await db.execute(sql`SELECT count(*)::int AS n FROM outreach_emails WHERE status IN ('previewed', 'followup_previewed')`)) as unknown as { n: number }[];
  let room = (await cap()) - (await sentToday()) - (waiting[0]?.n ?? 0);
  let previewed = 0;
  let followups = 0;

  // Follow-ups first: they are owed to people already written to.
  const due = await rows(sql`
    SELECT * FROM outreach_emails
     WHERE status = 'sent' AND followed_up_at IS NULL AND followup_body IS NULL AND sent_at < now() - interval '7 days'
     ORDER BY sent_at LIMIT 20`);
  for (const r of due) {
    if (room <= 0) break;
    const f = followupFor(r);
    const full = { ...r, followup_subject: f.subject, followup_body: f.body };
    const mid = await tellOwner(previewText(full, true), buttons(r.id));
    await setRow(r.id, sql`status = 'followup_previewed', followup_subject = ${f.subject}, followup_body = ${f.body}, tg_message_id = ${mid}`);
    room--;
    followups++;
  }

  const drafts = await rows(sql`SELECT * FROM outreach_emails WHERE status = 'draft' ORDER BY created_at LIMIT 20`);
  for (const r of drafts) {
    if (room <= 0) break;
    const mid = await tellOwner(previewText(r, false), buttons(r.id));
    await setRow(r.id, sql`status = 'previewed', tg_message_id = ${mid}`);
    room--;
    previewed++;
  }
  return { previewed, followups };
}

/* ----------------------------------------------------------- the owner's taps ---- */

export async function onOutreachButton(action: string, id: number, messageId: number): Promise<string> {
  const r = await getRow(id);
  if (!r) return "Not found.";
  const followup = r.status === "followup_previewed";
  if (action === "send") {
    if (r.status !== "previewed" && r.status !== "followup_previewed") return "Already handled.";
    if ((await sentToday()) >= (await cap())) return "Today's limit is reached — it stays here for tomorrow.";
    // Claim the row in one statement, so two taps (or Telegram retrying) can never send it twice.
    const claimed = (await db.execute(sql`
      UPDATE outreach_emails SET status = 'sending', updated_at = now()
       WHERE id = ${id} AND status = ${r.status} RETURNING id`)) as unknown as { id: number }[];
    if (!claimed.length) return "Already handled.";
    const row = r as OutreachRow & { followup_subject: string | null; followup_body: string | null };
    try {
      await sendMail(r.email, followup ? row.followup_subject ?? r.subject : r.subject, followup ? row.followup_body ?? r.body : r.body);
    } catch (e) {
      const err = e instanceof Error ? e.message.slice(0, 300) : "send failed";
      await setRow(id, sql`status = ${r.status}, last_error = ${err}`);
      return `Not sent: ${err}`;
    }
    await setRow(id, followup ? sql`status = 'followed_up', followed_up_at = now(), last_error = NULL` : sql`status = 'sent', sent_at = now(), last_error = NULL`);
    await editOwnerMessage(messageId, `✅ SENT${followup ? " (follow-up)" : ""} #${id} — ${r.org} <${r.email}>\n${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, followup ? [] : [[{ text: "💬 They replied — no follow-up", callback_data: `o:replied:${id}` }]]);
    return "Sent.";
  }
  if (action === "skip") {
    await setRow(id, sql`status = 'skipped'`);
    await editOwnerMessage(messageId, `⏭ Skipped #${id} — ${r.org} <${r.email}>`);
    return "Skipped.";
  }
  if (action === "out") {
    await setRow(id, sql`status = 'opted_out'`);
    await editOwnerMessage(messageId, `🚫 Never again #${id} — ${r.org} <${r.email}>`);
    return "Marked — never written to again.";
  }
  if (action === "replied") {
    await setRow(id, sql`status = 'replied'`);
    await editOwnerMessage(messageId, `💬 Replied #${id} — ${r.org} <${r.email}>. No follow-up.`);
    return "Noted — no follow-up.";
  }
  return "Unknown action.";
}

/** The owner replied to a preview with new text: it replaces the body (and the subject, if the first line says so). */
export async function onOutreachEdit(replyTo: number, text: string): Promise<boolean> {
  const r = (await rows(sql`SELECT * FROM outreach_emails WHERE tg_message_id = ${replyTo} AND status IN ('previewed', 'followup_previewed')`))[0] as
    | (OutreachRow & { followup_subject: string | null; followup_body: string | null })
    | undefined;
  if (!r) return false;
  let body = text.replace(/\r\n/g, "\n").trim();
  let subject: string | null = null;
  const m = body.match(/^subject:\s*(.+)\n+/i);
  if (m) {
    subject = m[1].trim().slice(0, 200);
    body = body.slice(m[0].length).trim();
  }
  if (!body) return true;
  const followup = r.status === "followup_previewed";
  if (followup) await setRow(r.id, sql`followup_body = ${body}, followup_subject = ${subject ?? r.followup_subject}`);
  else await setRow(r.id, sql`body = ${body}, subject = ${subject ?? r.subject}`);
  await editOwnerMessage(replyTo, `✏️ Changed #${r.id} — the new preview is below.`);
  const fresh = (await getRow(r.id)) as OutreachRow & { followup_subject: string | null; followup_body: string | null };
  const mid = await tellOwner(previewText(fresh, followup), buttons(r.id));
  await setRow(r.id, sql`tg_message_id = ${mid}`);
  return true;
}
