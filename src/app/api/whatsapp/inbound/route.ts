import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { resolveInbound, verifyWebhookSignature } from "@/lib/waVerify";
import { resolveLid } from "@/lib/waGateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Where the self-hosted WhatsApp gateway delivers inbound messages.
 *
 * WAHA on the VPS holds the session and POSTs here for every message the
 * verification number receives. If the body carries a live code, the number
 * that sent it is verified.
 *
 * **The signature check is the whole security model.** This endpoint is public
 * — without it anyone could POST a code and a phone number of their choosing
 * and walk straight through the gate. It is checked before the body is parsed
 * or looked at, and the raw text is hashed, because re-serialising the JSON
 * would change the bytes and break the comparison.
 */
export async function POST(request: Request) {
  const raw = await request.text();

  const ok = await verifyWebhookSignature(raw, request.headers.get("x-webhook-hmac"));
  if (!ok) {
    console.warn("[whatsapp/inbound] rejected: bad or missing signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: { event?: string; payload?: { from?: string; body?: string; fromMe?: boolean } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  // WAHA emits several event types on the same hook; only inbound messages
  // matter, and our own outgoing ones must never verify anything.
  if (event.event !== "message" || event.payload?.fromMe) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let from = event.payload?.from ?? "";
  const body = event.payload?.body ?? "";

  // A sender WhatsApp identifies by LID (`…@lid`) is not a phone number, though
  // its digits look like one (+250… even passes as an international number).
  // Ask the gateway for the real number; if it cannot say, verify nothing — the
  // number recorded must be the one that sent the message, never a guess.
  if (/@lid$/i.test(from)) {
    const pn = await resolveLid(from).catch(() => null);
    if (!pn) {
      logError(new Error(`[whatsapp/inbound] could not resolve ${from} to a phone number`), {
        route: "/api/whatsapp/inbound",
        request,
      });
      return NextResponse.json({ ok: true, matched: false, unresolved: true });
    }
    from = `${pn}@c.us`;
  }

  try {
    const result = await resolveInbound(from, body);
    // Always 200: a message with no code in it is not an error, and a gateway
    // that retries on non-2xx would hammer us for every unrelated chat.
    return NextResponse.json({ ok: true, matched: result.matched });
  } catch (error) {
    logError(error, { route: "/api/whatsapp/inbound", request });
    return NextResponse.json({ error: "Could not process the message." }, { status: 500 });
  }
}
