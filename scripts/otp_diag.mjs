// Last three days of sign-in codes: channel, delivery receipts, errors and the WhatsApp config (no secrets,
// last four digits only). Answers "did the codes go out officially?" before anyone suspects the site.
//   node --env-file=.env.local scripts/otp_diag.mjs
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10 });
const tail = (p) => (p ? "…" + String(p).replace(/\D/g, "").slice(-4) : "-");
const ist = (d) => (d ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }) : "-");

console.log("== otp_codes, last 3 days (IST) ==");
for (const r of await sql`SELECT id, phone, purpose, sent_channel, sent_via, attempts, consumed_at, created_at, source_page
                          FROM otp_codes WHERE created_at > now() - interval '3 days' ORDER BY created_at`)
  console.log(ist(r.created_at), r.id, tail(r.phone), r.purpose, "channel=" + (r.sent_channel ?? "NONE"), "via=" + (r.sent_via ?? "-"), "attempts=" + r.attempts, r.consumed_at ? "consumed " + ist(r.consumed_at) : "live", r.source_page ?? "");

console.log("\n== verification_attempts (inbound path), last 3 days ==");
for (const r of await sql`SELECT id, phone_claimed, verified_phone, verified_at, created_at, source_page FROM verification_attempts
                          WHERE created_at > now() - interval '3 days' ORDER BY created_at`)
  console.log(ist(r.created_at), r.id, "claimed=" + tail(r.phone_claimed), "verified=" + tail(r.verified_phone), r.verified_at ? "at " + ist(r.verified_at) : "not verified", r.source_page ?? "");

console.log("\n== wa_messages outbound codes/templates, last 3 days ==");
for (const r of await sql`SELECT id, phone, kind, template, status, error_code, error_title, error_detail, sent_at, delivered_at, failed_at, created_at, otp_id
                          FROM wa_messages WHERE direction = 'out' AND created_at > now() - interval '3 days' ORDER BY created_at`)
  console.log(ist(r.created_at), r.id, tail(r.phone), r.kind, r.template ?? "", "status=" + r.status, r.error_code ?? "", r.error_title ?? "", (r.error_detail ?? "").slice(0, 120), "otp=" + (r.otp_id ?? "-"), r.delivered_at ? "delivered " + ist(r.delivered_at) : "");

console.log("\n== error_log, last 3 days (otp/whatsapp/auth) ==");
for (const r of await sql`SELECT created_at, level, route, message, meta FROM error_log
                          WHERE created_at > now() - interval '3 days' AND (route ILIKE '%otp%' OR route ILIKE '%whatsapp%' OR route ILIKE '%auth%' OR message ILIKE '%whatsapp%' OR message ILIKE '%cloud%')
                          ORDER BY created_at`)
  console.log(ist(r.created_at), r.level, r.route, "|", String(r.message).slice(0, 200), "|", JSON.stringify(r.meta ?? {}).slice(0, 200));

console.log("\n== cloud config (non-secret) ==");
for (const r of await sql`SELECT key, CASE WHEN key ~ '(token|secret|key)$' THEN '(set: ' || (length(value) > 0)::text || ')' ELSE value END AS v, updated_at
                          FROM integrations WHERE key LIKE 'whatsapp.%' ORDER BY key`)
  console.log(r.key, "=", String(r.v).slice(0, 80), "| updated", ist(r.updated_at));
await sql.end();
