// Submits ah_meet_counsellor_v3 for Meta's approval: ah_meet_counsellor_v2 word for word, with the Telegram channel's
// request-to-join link (https://t.me/+2oCwgUBSa6xjOGJl) in place of the public one (2026-11-17, owner: "ye jo template
// bolra hai wo approve karwalo meta se"; the request came from zyn-92's PG session — only a join through the request link
// reaches the students' bot, which welcomes and approves the joiner). lib/followups.ts sends it in place of v2 once Meta
// approves it, and v2 until then. Prints Meta's answer only — never the token.
//   node --env-file=.env.local scripts/wa_counsellor_v3_template.mjs [--status]
import postgres from "postgres";

const NAME = "ah_meet_counsellor_v3";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const cfg = Object.fromEntries((await sql`SELECT key, value FROM integrations WHERE key LIKE 'whatsapp.cloud.%'`).map((r) => [r.key, r.value]));
await sql.end();
const api = `https://graph.facebook.com/v25.0/${cfg["whatsapp.cloud.waba_id"]}/message_templates`;
const auth = { authorization: `Bearer ${cfg["whatsapp.cloud.token"]}` };

const existing = await (await fetch(`${api}?name=${NAME}&fields=name,status,category,rejected_reason,id`, { headers: auth })).json();
if (process.argv.includes("--status") || existing.data?.length) {
  console.log(NAME, JSON.stringify(existing.data ?? existing));
  process.exit(0);
}

const template = {
  name: NAME,
  language: "en",
  category: "MARKETING",
  components: [
    { type: "HEADER", format: "TEXT", text: "Your NEET seat plan, made with an expert" },
    {
      type: "BODY",
      text:
        "Hi {{1}}, students with the same NEET rank often land a whole tier apart — it comes down to choice order, the round they freeze in and the quota they pick.\n\n" +
        "Gulshan Tomar, admission counsellor at AdmissionHands, builds that plan with you:\n" +
        "✅ Which colleges to fill, and in what order\n" +
        "✅ When to float, freeze or upgrade\n" +
        "✅ Real fees, bond and hidden charges, confirmed with colleges\n\n" +
        "15+ years of NEET counselling · open daily, 10 AM – 10 PM.\n\n" +
        "For the latest counselling updates and info, join our Telegram channel: https://t.me/+2oCwgUBSa6xjOGJl",
      example: { body_text: [["Rahul"]] },
    },
    { type: "FOOTER", text: "AdmissionHands, Noida" },
    {
      type: "BUTTONS",
      buttons: [
        { type: "URL", text: "Expert Counsellor", url: "https://www.admissionhands.com/chat/gulshan-tomar" },
        { type: "URL", text: "See Gulshan's profile", url: "https://www.admissionhands.com/gulshan-tomar" },
      ],
    },
  ],
};
const res = await fetch(api, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify(template) });
console.log(NAME, res.status, JSON.stringify(await res.json()));
