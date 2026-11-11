// Submits ah_fee_pdf_update (MARKETING) for Meta's approval (2026-11-11): the message a student who replied YES after a
// state's PG fee PDF gets when that state's PDF is rebuilt with newer figures (lib/waPdfUpdates.ts sends it from the
// hourly follow-up run, only once approved). No file in the template: "Send the new PDF" comes back as a tap that
// lib/waPdf.ts answers with the PDF inside the 24-hour window; "Stop updates" withdraws the opt-in.
// Prints Meta's answer only — never the token.
//   node --env-file=.env.local scripts/wa_fee_update_template.mjs [--status]
import postgres from "postgres";

const NAME = "ah_fee_pdf_update";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const cfg = Object.fromEntries((await sql`SELECT key, value FROM integrations WHERE key LIKE 'whatsapp.cloud.%'`).map((r) => [r.key, r.value]));
await sql.end();
const api = `https://graph.facebook.com/v25.0/${cfg["whatsapp.cloud.waba_id"]}/message_templates`;
const auth = { authorization: `Bearer ${cfg["whatsapp.cloud.token"]}` };

if (process.argv.includes("--status")) {
  const r = await fetch(`${api}?name=${NAME}&fields=name,status,category,rejected_reason`, { headers: auth });
  console.log(r.status, JSON.stringify(await r.json()));
  process.exit(0);
}

const template = {
  name: NAME,
  language: "en",
  category: "MARKETING",
  components: [
    { type: "HEADER", format: "TEXT", text: "Your PG fee PDF has new figures" },
    {
      type: "BODY",
      text:
        "Hi, you asked us to tell you when the {{1}} PG fee and stipend figures change. Our PDF now carries figures as of {{2}}.\n\n" +
        "Tap *Send the new PDF* and we will send the updated copy here in this chat.",
      example: { body_text: [["Maharashtra", "11 Nov 2026"]] },
    },
    { type: "FOOTER", text: "AdmissionHands · Reply STOP to stop updates" },
    {
      type: "BUTTONS",
      buttons: [
        { type: "QUICK_REPLY", text: "Send the new PDF" },
        { type: "QUICK_REPLY", text: "Stop updates" },
      ],
    },
  ],
};
const res = await fetch(api, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify(template) });
console.log(template.name, res.status, JSON.stringify(await res.json()));
