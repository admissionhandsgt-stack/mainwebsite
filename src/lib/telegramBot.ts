import { getIntegration } from "@/lib/integrations";

/**
 * The site's own Telegram bot (2026-11-10), for the owner's approvals — today the outreach emails: each draft arrives as a
 * message with Send / Edit / Skip buttons. The bot is the owner's (made with @BotFather; its token pasted in Admin →
 * Outreach email, write-only). It talks to one chat only, linked once with a one-time code; everything else is ignored.
 *
 * Server only.
 */
const API = "https://api.telegram.org";

export type InlineButton = { text: string; callback_data: string };

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const token = await getIntegration("telegram.bot.token");
  if (!token) throw new Error("No Telegram bot token is set.");
  const r = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const j = (await r.json()) as { ok: boolean; result?: T; description?: string };
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description ?? r.status}`);
  return j.result as T;
}

/** A message to the owner's linked chat. Returns its message id. */
export async function tellOwner(text: string, buttons?: InlineButton[][], replyTo?: number): Promise<number> {
  const chat = await getIntegration("telegram.bot.chat_id");
  if (!chat) throw new Error("No Telegram chat is linked.");
  const m = await tg<{ message_id: number }>("sendMessage", {
    chat_id: chat,
    text: text.slice(0, 4000),
    disable_web_page_preview: true,
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
    ...(replyTo ? { reply_parameters: { message_id: replyTo, allow_sending_without_reply: true } } : {}),
  });
  return m.message_id;
}

/** Replaces a preview's text and buttons once it has been acted on. */
export async function editOwnerMessage(messageId: number, text: string, buttons?: InlineButton[][]): Promise<void> {
  const chat = await getIntegration("telegram.bot.chat_id");
  if (!chat) return;
  await tg("editMessageText", {
    chat_id: chat,
    message_id: messageId,
    text: text.slice(0, 4000),
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: buttons ?? [] },
  }).catch(() => undefined); // an old or unchanged message cannot be edited; nothing depends on it
}
