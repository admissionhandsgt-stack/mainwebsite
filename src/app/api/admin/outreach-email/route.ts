import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import { getIntegration, getIntegrationFlag, maskSecret, setIntegration } from "@/lib/integrations";
import { mailConfig, sendMail, verifyMail } from "@/lib/mailer";
import { tellOwner, tg } from "@/lib/telegramBot";
import { addOutreach, deleteOutreach, listOutreach, runOutreach, type Kind } from "@/lib/outreach";
import { logError } from "@/lib/logger";
import { buildHunt, listHunt, markHunt } from "@/lib/hunt";
import { addSource, deleteSource, listSources, runDiscover } from "@/lib/outreachDiscover";

/**
 * Admin → Outreach email (2026-11-10). GET: the mailbox and bot settings (secrets masked), the switch, the cap and every
 * target, and the daily hunt. POST { action }: "save" · "test-mail" · "link-telegram" · "test-telegram" · "add" · "delete" ·
 * "preview-now" · "hunt-run" · "hunt-posted" { id, url } · "hunt-dismiss" { id }.
 * The SMTP password and the bot token are write-only: saved, never sent back.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITE = "https://www.admissionhands.com";

async function botName(): Promise<string | null> {
  if (!(await getIntegration("telegram.bot.token"))) return null;
  try {
    return (await tg<{ username: string }>("getMe", {})).username;
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  const [host, port, user, pass, fromName, token, chat, enabled, cap, bot, rows] = await Promise.all([
    getIntegration("email.smtp.host"),
    getIntegration("email.smtp.port"),
    getIntegration("email.smtp.user"),
    getIntegration("email.smtp.pass"),
    getIntegration("email.from_name"),
    getIntegration("telegram.bot.token"),
    getIntegration("telegram.bot.chat_id"),
    getIntegrationFlag("outreach.enabled"),
    getIntegration("outreach.daily_cap"),
    botName(),
    listOutreach(),
  ]);
  const hunt = await listHunt().catch(() => []);
  const sources = await listSources().catch(() => []);
  return NextResponse.json(
    {
      host: host ?? "smtp.nevtan.com",
      port: port ?? "465",
      user: user ?? "gulshantomar@admissionhands.com",
      passSet: Boolean(pass),
      fromName: fromName ?? "Gulshan Tomar, AdmissionHands",
      tokenSet: Boolean(token),
      tokenMasked: maskSecret(token),
      bot,
      linked: Boolean(chat),
      enabled,
      cap: cap ?? "10",
      rows,
      hunt,
      sources,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  let b: Record<string, unknown>;
  try {
    b = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  try {
    switch (b.action) {
      case "save": {
        const host = str(b.host, 120);
        if (host) {
          if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return NextResponse.json({ error: "The SMTP host is a name like mail.example.com." }, { status: 400 });
          await setIntegration("email.smtp.host", host);
        }
        const port = str(b.port, 5);
        if (port) {
          if (!["465", "587"].includes(port)) return NextResponse.json({ error: "The port is 465 (SSL) or 587 (STARTTLS)." }, { status: 400 });
          await setIntegration("email.smtp.port", port);
        }
        const user = str(b.user, 120);
        if (user) {
          if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(user)) return NextResponse.json({ error: "The login is the full email address." }, { status: 400 });
          await setIntegration("email.smtp.user", user.toLowerCase());
        }
        if (typeof b.pass === "string" && b.pass.length) {
          if (b.pass.length > 200) return NextResponse.json({ error: "That password is too long." }, { status: 400 });
          await setIntegration("email.smtp.pass", b.pass, true);
        }
        const fromName = str(b.fromName, 80);
        if (fromName) await setIntegration("email.from_name", fromName.replace(/[<>"\r\n]/g, ""));
        const token = str(b.token, 120);
        if (token) {
          if (!/^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(token)) return NextResponse.json({ error: "That does not look like a bot token from @BotFather." }, { status: 400 });
          await setIntegration("telegram.bot.token", token, true);
          await setIntegration("telegram.bot.chat_id", ""); // a new bot is linked afresh
        }
        if (typeof b.enabled === "boolean") await setIntegration("outreach.enabled", b.enabled ? "true" : "false");
        const cap = Number(b.cap);
        if (b.cap !== undefined && Number.isFinite(cap)) await setIntegration("outreach.daily_cap", String(Math.max(1, Math.min(20, Math.round(cap)))));
        return NextResponse.json({ ok: true });
      }
      case "test-mail": {
        const v = await verifyMail();
        if (!v.ok) return NextResponse.json(v);
        const c = await mailConfig();
        await sendMail(c!.user, "AdmissionHands outreach: test", "This is a test from Admin → Outreach email. The mailbox can send.");
        return NextResponse.json({ ok: true, sentTo: c!.user });
      }
      case "link-telegram": {
        if (!(await getIntegration("telegram.bot.token"))) return NextResponse.json({ error: "Save the bot token first." }, { status: 400 });
        let secret = await getIntegration("telegram.bot.secret");
        if (!secret) {
          secret = randomBytes(24).toString("hex");
          await setIntegration("telegram.bot.secret", secret, true);
        }
        await tg("setWebhook", { url: `${SITE}/api/telegram/webhook`, secret_token: secret, allowed_updates: ["message", "callback_query"], drop_pending_updates: true });
        const code = randomBytes(9).toString("base64url");
        await setIntegration("telegram.bot.link_code", code, true);
        const bot = await botName();
        return NextResponse.json({ ok: true, link: bot ? `https://t.me/${bot}?start=${code}` : null, code });
      }
      case "test-telegram":
        await tellOwner("✅ Test from Admin → Outreach email. Previews will arrive here.");
        return NextResponse.json({ ok: true });
      case "add": {
        const kind = (["journalist", "association", "other"].includes(String(b.kind)) ? b.kind : "other") as Kind;
        const id = await addOutreach({ email: str(b.email, 160), name: str(b.name, 80), org: str(b.org, 160), kind, why: str(b.why), sourceUrl: str(b.sourceUrl, 400) });
        return NextResponse.json({ ok: true, id });
      }
      case "delete":
        await deleteOutreach(Number(b.id));
        return NextResponse.json({ ok: true });
      case "source-add": {
        const kind = (["journalist", "association", "other"].includes(String(b.kind)) ? b.kind : "other") as Kind;
        await addSource(str(b.url, 300), str(b.org, 160), kind);
        return NextResponse.json({ ok: true });
      }
      case "source-delete":
        await deleteSource(Number(b.id));
        return NextResponse.json({ ok: true });
      case "discover-now":
        return NextResponse.json(await runDiscover({ force: true }));
      case "hunt-run":
        return NextResponse.json(await buildHunt());
      case "hunt-posted":
      case "hunt-dismiss":
        await markHunt(Number(b.id), b.action === "hunt-posted" ? "posted" : "dismissed", str(b.url, 500));
        return NextResponse.json({ ok: true });
      case "preview-now":
        return NextResponse.json(await runOutreach({ force: true }));
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    logError(error, { route: "admin/outreach-email" });
    return NextResponse.json({ error: error instanceof Error ? error.message.slice(0, 200) : "Failed" }, { status: 500 });
  }
}
