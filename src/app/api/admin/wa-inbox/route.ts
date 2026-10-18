import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { logError } from "@/lib/logger";
import { conversation, listConversations, markSeen, sendReply } from "@/lib/waInbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A number as the log stores it: +91XXXXXXXXXX. Anything else is refused. */
const phoneOf = (v: unknown) => {
  const d = String(v ?? "").replace(/\D/g, "");
  return /^\d{10,15}$/.test(d) ? `+${d}` : null;
};

/**
 * Admin → WhatsApp inbox.
 *   GET                 the conversations, newest and unread first
 *   GET ?phone=…        one thread (and it is marked seen)
 *   POST {phone, text}  a typed reply, inside WhatsApp's 24-hour window only
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  const p = new URL(request.url).searchParams;
  try {
    const phone = p.get("phone") ? phoneOf(p.get("phone")) : null;
    if (p.get("phone")) {
      if (!phone) return NextResponse.json({ error: "Not a phone number." }, { status: 400 });
      const messages = await conversation(phone);
      await markSeen(phone);
      return NextResponse.json({ messages });
    }
    return NextResponse.json({
      conversations: await listConversations({ q: p.get("q") ?? "", filter: p.get("filter") ?? "" }),
    });
  } catch (error) {
    logError(error, { route: "/api/admin/wa-inbox:GET", request });
    return NextResponse.json({ error: "Could not load the inbox." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  if (!rateLimit(`wa-reply:${auth.id}`, 30, 60_000).ok) {
    return NextResponse.json({ error: "Too many messages in a minute. Wait a moment." }, { status: 429 });
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { phone?: string; text?: string };
    const phone = phoneOf(body.phone);
    if (!phone) return NextResponse.json({ error: "Not a phone number." }, { status: 400 });
    const r = await sendReply(phone, String(body.text ?? ""), auth.name || auth.email);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 400 });
  } catch (error) {
    logError(error, { route: "/api/admin/wa-inbox:POST", request });
    return NextResponse.json({ error: "Could not send that." }, { status: 500 });
  }
}
