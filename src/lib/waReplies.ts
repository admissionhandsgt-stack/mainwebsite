/**
 * Answering the menu at the end of a sign-in code message.
 *
 * The code message ends "reply 1 for a counsellor call, 2 for the colleges
 * your rank reached last year, 3 for the document checklist" (otp.ts). The
 * point is the reply itself: WhatsApp judges a number by whether its chats are
 * two-way, and a code nobody answers looks like a stranger being messaged —
 * which got the number locked on 2026-10-06. A reply only keeps coming if it
 * gets the student something, so each one is answered at once, in the same
 * chat, from the same number:
 *
 *   1 — "a counsellor will call you", and the team is alerted with the lead
 *   2 — the predictor with their rank already filled in
 *   3 — the documents to keep ready for reporting, UG or PG
 *
 * Deliberately narrow, because the primary is also the business number people
 * chat with: only a bare 1, 2 or 3, only from someone we sent a code to in the
 * last week, and each option answered at most once a day. Anything else is
 * left for a person to read.
 */
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { sendText } from "@/lib/waGateway";
import { sendWhatsAppNotification } from "@/lib/whatsappService";
import { recordLead } from "@/lib/leadCapture";
import { logError } from "@/lib/logger";

const SITE = "https://www.admissionhands.com";

const DOCS = {
  ug: [
    "NEET UG admit card",
    "NEET UG scorecard / rank letter",
    "Class 10 certificate (date of birth proof)",
    "Class 12 marksheet and pass certificate",
    "A photo ID — Aadhaar, PAN, passport or driving licence",
    "8 passport-size photographs (the ones on the NEET form)",
    "Category certificate, if you apply under SC / ST / OBC-NCL / EWS",
    "Domicile certificate, for state quota seats",
    "PwBD certificate, if applicable",
    "The seat allotment letter, once you are allotted",
  ],
  pg: [
    "NEET PG admit card",
    "NEET PG result / rank letter",
    "MBBS degree or provisional certificate",
    "MBBS marksheets (all professional years)",
    "Internship completion certificate",
    "NMC / state medical council registration",
    "Class 10 certificate (date of birth proof)",
    "A photo ID, and passport-size photographs",
    "Category, domicile or PwBD certificate, if you apply under one",
    "The seat allotment letter, once you are allotted",
  ],
};

/** "1", " 2 ", "3️⃣", "1." → the digit; anything longer is a person writing, not a menu choice. */
function choiceOf(body: string): "1" | "2" | "3" | null {
  const t = String(body ?? "").replace(/[️⃣]/g, "").trim().replace(/[.!)]$/, "");
  return t === "1" || t === "2" || t === "3" ? t : null;
}

interface CodeRow {
  name: string | null;
  level: "ug" | "pg" | null;
  rank: number | null;
  category: string | null;
  sent_via: number | null;
}

/** Returns true when the message was a menu reply we handled (answered or already answered today). */
export async function handleMenuReply(phone: string, body: string): Promise<boolean> {
  const choice = choiceOf(body);
  if (!choice) return false;

  // Only someone we sent a code to recently: the primary is also the number
  // people chat with, and a "1" in an ordinary conversation is not a menu.
  const rows = (await db.execute(sql`
    SELECT name, level::text AS level, rank, category, sent_via
      FROM otp_codes
     WHERE phone = ${phone} AND sent_channel = 'whatsapp' AND created_at > now() - interval '7 days'
     ORDER BY created_at DESC LIMIT 1
  `)) as unknown as CodeRow[];
  const code = rows[0];
  if (!code) return false;

  const already = (await db.execute(sql`
    SELECT 1 FROM wa_replies WHERE phone = ${phone} AND choice = ${choice} AND created_at > now() - interval '1 day' LIMIT 1
  `)) as unknown as unknown[];
  if (already.length) return true;

  await db.execute(sql`INSERT INTO wa_replies (phone, choice, sender_id) VALUES (${phone}, ${choice}, ${code.sent_via ?? 0})`);

  const level = code.level === "ug" ? "ug" : "pg";
  const first = (code.name ?? "").trim().split(/\s+/)[0] || "";
  const course = level === "ug" ? "mbbs" : "pg";
  let text: string;

  if (choice === "1") {
    text =
      `Thank you${first ? `, ${first}` : ""}! ✅ A counsellor will call you on this number during working hours.\n\n` +
      `If it's easier, just type your question here — rank, category and the states you're considering help us prepare.`;
    await flagCallback(phone, code, level);
  } else if (choice === "2") {
    const link = code.rank
      ? `${SITE}/neet-college-predictor?course=${course}&rank=${code.rank}`
      : `${SITE}/neet-college-predictor?course=${course}`;
    text = code.rank
      ? `Here is every seat rank ${code.rank.toLocaleString("en-IN")} reached in last year's counselling — it opens with your rank already filled in:\n${link}\n\n` +
        `These are the authorities' own published closing ranks, round by round. Reply *1* anytime for a free counsellor call.`
      : `Enter your rank here and see every seat it reached in last year's counselling, round by round:\n${link}\n\n` +
        `Reply *1* anytime for a free counsellor call.`;
  } else {
    text =
      `Documents to keep ready for ${level === "ug" ? "NEET UG" : "NEET PG"} counselling — originals plus a set of self-attested photocopies:\n\n` +
      DOCS[level].map((d) => `• ${d}`).join("\n") +
      `\n\nYou can keep them all in one place here: ${SITE}/account/documents\nReply *1* if you'd like a counsellor to check them with you.`;
  }

  // From the number they are talking to — a reply in their chat, not a new one.
  const sent = await sendText(phone, text, { purpose: "alert", via: code.sent_via ?? 0 });
  if (!sent.sent) logError(new Error(`menu reply ${choice} to ${phone} not sent: ${sent.error}`), { route: "waReplies" });
  return true;
}

/** "1": put them in front of a counsellor — on their lead if there is one, a new lead if not. */
async function flagCallback(phone: string, code: CodeRow, level: "ug" | "pg") {
  try {
    const lead = (await db.execute(sql`
      SELECT id FROM leads WHERE phone = ${phone} ORDER BY created_at DESC LIMIT 1
    `)) as unknown as { id: number }[];
    const note = `Replied 1 on WhatsApp on ${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}: wants a counsellor to call.`;
    if (lead[0]) {
      await db.execute(sql`
        UPDATE leads SET is_read = false, admin_notes = concat_ws(E'\n', nullif(admin_notes, ''), ${note})
         WHERE id = ${lead[0].id}
      `);
    } else {
      await recordLead({
        name: code.name || "WhatsApp reply",
        phone,
        level,
        rank: code.rank,
        category: code.category,
        source: "WhatsApp reply — wants a call",
        verified: true,
      });
    }
    await sendWhatsAppNotification({
      name: code.name || "Not given",
      phone,
      rank: code.rank ?? undefined,
      category: code.category ?? undefined,
      source: "📞 Replied 1 on WhatsApp — wants a call",
    });
  } catch (error) {
    logError(error, { route: "waReplies.flagCallback" });
  }
}
