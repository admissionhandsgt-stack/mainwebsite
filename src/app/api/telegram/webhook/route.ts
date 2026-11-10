import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getIntegration, setIntegration } from "@/lib/integrations";
import { tg } from "@/lib/telegramBot";
import { onOutreachButton, onOutreachEdit } from "@/lib/outreach";
import { logError } from "@/lib/logger";

/**
 * The site's Telegram bot webhook (2026-11-10), set from Admin → Outreach email. Telegram sends every update with the
 * secret we gave it in `X-Telegram-Bot-Api-Secret-Token`; anything without it is a 404. Of the updates, only one chat
 * counts: the owner's, linked once by "/start <code>" with the one-time code the admin screen shows. Everyone else who
 * writes to the bot is ignored.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Update = {
  message?: { message_id: number; chat: { id: number }; text?: string; reply_to_message?: { message_id: number } };
  callback_query?: { id: string; data?: string; message?: { message_id: number; chat: { id: number } } };
};

const same = (a: string, b: string) => a.length === b.length && a.length > 0 && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function POST(request: Request) {
  const secret = (await getIntegration("telegram.bot.secret")) ?? "";
  if (!secret || !same(request.headers.get("x-telegram-bot-api-secret-token") ?? "", secret)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let u: Update;
  try {
    u = (await request.json()) as Update;
  } catch {
    return NextResponse.json({ ok: true });
  }
  try {
    const chat = (await getIntegration("telegram.bot.chat_id")) ?? "";

    // Linking: "/start <code>" with the admin's one-time code makes this chat the owner's.
    const text = u.message?.text?.trim() ?? "";
    const start = text.match(/^\/start\s+([A-Za-z0-9_-]{8,64})$/);
    if (u.message && start) {
      const code = (await getIntegration("telegram.bot.link_code")) ?? "";
      if (code && same(start[1], code)) {
        await setIntegration("telegram.bot.chat_id", String(u.message.chat.id));
        await setIntegration("telegram.bot.link_code", "");
        await tg("sendMessage", { chat_id: u.message.chat.id, text: "✅ Linked. Outreach emails will come here for your approval." });
      }
      return NextResponse.json({ ok: true });
    }

    if (u.callback_query) {
      const cq = u.callback_query;
      if (!chat || String(cq.message?.chat.id) !== chat) return NextResponse.json({ ok: true });
      const m = cq.data?.match(/^o:(send|skip|out|replied):(\d+)$/);
      const reply = m && cq.message ? await onOutreachButton(m[1], Number(m[2]), cq.message.message_id) : "Unknown button.";
      await tg("answerCallbackQuery", { callback_query_id: cq.id, text: reply.slice(0, 190) }).catch(() => undefined);
      return NextResponse.json({ ok: true });
    }

    if (u.message && chat && String(u.message.chat.id) === chat && u.message.reply_to_message && text) {
      const done = await onOutreachEdit(u.message.reply_to_message.message_id, text);
      if (!done) await tg("sendMessage", { chat_id: chat, text: "That message is not a draft waiting for you." }).catch(() => undefined);
    }
  } catch (error) {
    logError(error, { route: "telegram/webhook" });
  }
  // Always 200 once authenticated: Telegram retries anything else, which would repeat a send.
  return NextResponse.json({ ok: true });
}
