import { ImapFlow } from "imapflow";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getIntegration, setIntegration } from "@/lib/integrations";
import { mailConfig } from "@/lib/mailer";
import { editOwnerMessage, tellOwner } from "@/lib/telegramBot";

/**
 * Replies and bounces from the outreach mailbox (2026-11-10; owner: "jiska response aa jaye wo auto email targets ruk
 * jaye"). Hourly (`POST /api/cron/outreach-inbox`): read the INBOX over IMAP (smtp.nevtan.com:993, the same login as the
 * SMTP), from the last message seen. A message from an address we wrote to — or from the same organisation's domain,
 * unless that is a free mail service — marks it "replied"; a delivery failure naming one marks it "bounced". Either stops
 * every further email to it, and the owner hears on Telegram. Only headers are read, plus the text of bounce messages;
 * nothing is stored but the subject.
 *
 * Server only.
 */
const FREE = new Set(["gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "outlook.com", "hotmail.com", "live.com", "rediffmail.com", "icloud.com", "proton.me", "protonmail.com"]);
const ACTIVE = sql`status IN ('previewed', 'sent', 'followup_previewed', 'followed_up', 'sending')`;

type Target = { id: number; email: string; org: string; status: string; tg_message_id: number | null };

export async function checkReplies(): Promise<{ read: number; replied: number; bounced: number; skipped?: string }> {
  const c = await mailConfig();
  if (!c) return { read: 0, replied: 0, bounced: 0, skipped: "mailbox not set up" };
  const targets = (await db.execute(sql`SELECT id, email, org, status, tg_message_id FROM outreach_emails WHERE ${ACTIVE} AND emails_sent > 0`)) as unknown as Target[];
  if (!targets.length) return { read: 0, replied: 0, bounced: 0, skipped: "nobody written to yet" };
  const byEmail = new Map(targets.map((t) => [t.email.toLowerCase(), t]));
  const byDomain = new Map<string, Target[]>();
  for (const t of targets) {
    const d = t.email.split("@")[1]?.toLowerCase();
    if (d && !FREE.has(d)) byDomain.set(d, [...(byDomain.get(d) ?? []), t]);
  }

  const host = (await getIntegration("email.imap.host")) || c.host;
  const client = new ImapFlow({ host, port: 993, secure: true, auth: { user: c.user, pass: c.pass }, logger: false, socketTimeout: 60_000 });
  const lastUid = Number(await getIntegration("outreach.imap_uid")) || 0;
  let maxUid = lastUid;
  let read = 0;
  const hits: { t: Target; kind: "replied" | "bounced"; note: string }[] = [];

  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    // First run: the last 30 days. After that, every message after the last one seen.
    const range = lastUid ? `${lastUid + 1}:*` : { since: new Date(Date.now() - 30 * 86_400_000) };
    for await (const m of client.fetch(range, { uid: true, envelope: true }, { uid: Boolean(lastUid) })) {
      if (m.uid <= lastUid) continue; // "N:*" always returns the newest message, even when it is older
      read++;
      maxUid = Math.max(maxUid, m.uid);
      const from = (m.envelope?.from?.[0]?.address ?? "").toLowerCase();
      const subject = (m.envelope?.subject ?? "").slice(0, 200);
      if (!from) continue;
      if (/^(mailer-daemon|postmaster)@/.test(from) || /undeliver|delivery status|failure notice|returned mail/i.test(subject)) {
        // A bounce names the address it could not reach; read its text to find which of ours.
        const full = await client.fetchOne(String(m.uid), { source: true }, { uid: true });
        const text = full && full.source ? full.source.toString("utf8").slice(0, 200_000).toLowerCase() : "";
        for (const t of targets) if (text.includes(t.email.toLowerCase())) hits.push({ t, kind: "bounced", note: subject || "delivery failed" });
        continue;
      }
      const exact = byEmail.get(from);
      const sameOrg = byDomain.get(from.split("@")[1] ?? "") ?? [];
      for (const t of exact ? [exact] : sameOrg) hits.push({ t, kind: "replied", note: subject });
    }
  } finally {
    lock.release();
    // Which folders the mailbox has, their flags and message counts (2026-11-12: the owner's webmail showed nothing in
    // Sent although every send "filed" a copy). Names and counts only — no message, no address.
    try {
      const boxes = await client.list({ statusQuery: { messages: true } });
      await setIntegration(
        "email.imap.folders",
        JSON.stringify(boxes.map((b) => ({ path: b.path, use: b.specialUse ?? null, flags: [...(b.flags ?? [])], messages: b.status?.messages ?? null }))),
      );
    } catch {
      /* a diagnostic must not fail the reply check */
    }
    await client.logout().catch(() => undefined);
  }
  if (maxUid > lastUid) await setIntegration("outreach.imap_uid", String(maxUid));

  let replied = 0;
  let bounced = 0;
  const seen = new Set<number>();
  for (const h of hits) {
    if (seen.has(h.t.id)) continue;
    seen.add(h.t.id);
    await db.execute(sql`
      UPDATE outreach_emails SET status = ${h.kind}, replied_at = now(), reply_note = ${h.note}, updated_at = now()
       WHERE id = ${h.t.id} AND ${ACTIVE}`);
    if (h.t.tg_message_id && (h.t.status === "previewed" || h.t.status === "followup_previewed")) {
      await editOwnerMessage(h.t.tg_message_id, `${h.kind === "replied" ? "💬" : "⚠️"} #${h.t.id} ${h.t.org} — ${h.kind}. Nothing more goes to them.`);
    }
    await tellOwner(
      h.kind === "replied"
        ? `💬 ${h.t.org} <${h.t.email}> replied: "${h.note}". No more emails go to them — answer from the mailbox yourself.`
        : `⚠️ Email to ${h.t.org} <${h.t.email}> bounced ("${h.note}"). Stopped for this address.`,
    ).catch(() => undefined);
    if (h.kind === "replied") replied++;
    else bounced++;
  }
  return { read, replied, bounced };
}
