import nodemailer from "nodemailer";
import { getIntegration } from "@/lib/integrations";

/**
 * Sending email as the owner's mailbox (2026-11-10: gulshantomar@admissionhands.com; SMTP smtp.nevtan.com:465, the webmail mail.nevtan.com answers only 443). The
 * SMTP settings are rows in `integrations` (Admin → Outreach email); the password is write-only and pasted by the owner.
 * Plain text only — outreach is a letter from a person, and plain text is what lands in an inbox rather than "Promotions".
 *
 * Server only.
 */
export type MailConfig = { host: string; port: number; user: string; pass: string; fromName: string };

export async function mailConfig(): Promise<MailConfig | null> {
  const [host, port, user, pass, fromName] = await Promise.all([
    getIntegration("email.smtp.host"),
    getIntegration("email.smtp.port"),
    getIntegration("email.smtp.user"),
    getIntegration("email.smtp.pass"),
    getIntegration("email.from_name"),
  ]);
  if (!host || !user || !pass) return null;
  return { host, port: Number(port) || 465, user, pass, fromName: fromName || "Gulshan Tomar, AdmissionHands" };
}

function transport(c: MailConfig) {
  return nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.port === 465, // 465 is TLS from the start; 587 upgrades with STARTTLS
    requireTLS: c.port !== 465,
    auth: { user: c.user, pass: c.pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 60_000,
    // Never read a file or fetch a URL while building a message (nodemailer's own guards).
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

/** The SMTP login works: connects and authenticates, sends nothing. */
export async function verifyMail(): Promise<{ ok: boolean; error?: string }> {
  const c = await mailConfig();
  if (!c) return { ok: false, error: "The mailbox is not set up (host, user and password)." };
  try {
    await transport(c).verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "SMTP failed" };
  }
}

/** Sends one plain-text email from the mailbox. Throws with the server's own words on failure. */
export async function sendMail(to: string, subject: string, text: string): Promise<{ messageId: string }> {
  const c = await mailConfig();
  if (!c) throw new Error("The mailbox is not set up.");
  if (!/^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(to)) throw new Error(`Not an email address: ${to}`);
  const info = await transport(c).sendMail({
    from: { name: c.fromName, address: c.user },
    to,
    subject: subject.replace(/[\r\n]+/g, " ").slice(0, 200),
    text,
  });
  return { messageId: String(info.messageId ?? "") };
}
