import { NextResponse } from "next/server";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { issueCode } from "@/lib/otp";
import { startAttempt } from "@/lib/waVerify";
import { normalisePhone } from "@/lib/leadGate";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Sends the code.
 *
 * Two channels, in order of how little the visitor has to do:
 *
 *   1. **We send it.** Six digits to their WhatsApp, they type it in. On a
 *      laptop the code lands on the phone already in their hand, which is the
 *      whole reason this is the default now.
 *
 *   2. **They send it.** If the gateway is unpaired, unreachable, or the
 *      number has had its allowance, we fall back to the original handshake: a
 *      code they carry to us in a WhatsApp message. Stronger proof, more work,
 *      and it needs nothing of ours to be working.
 *
 * The response says which one happened, because the two screens are different
 * — one has a code box, the other has a button that opens WhatsApp.
 *
 * Volume caps live in `src/lib/otp.ts` and count rows, not memory: they exist
 * to keep a WhatsApp number alive across deploys, and a per-isolate counter
 * would not. This limiter is the cheaper guard in front of them.
 */
const LIMIT = 8;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const limit = rateLimit(`otp:${clientKey(request)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many codes requested from this connection. Try again later." },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // Answered as if it worked, so a bot learns nothing about which field caught it.
  if (body.honeypot) {
    console.warn(`[otp] honeypot tripped from ${clientKey(request)}`);
    return NextResponse.json({ ok: true, channel: "whatsapp", masked: "" });
  }

  const phone = normalisePhone(body.phone);
  if (!phone) {
    return NextResponse.json({ error: "Enter a 10-digit Indian mobile number." }, { status: 400 });
  }

  const purpose = body.purpose === "reset" ? "reset" : "signup";
  const name = String(body.name ?? "").trim().slice(0, 120) || null;
  const level = body.level === "ug" ? "ug" : body.level === "pg" ? "pg" : null;
  const rankRaw = Number(String(body.rank ?? "").replace(/\D/g, ""));
  const rank = Number.isFinite(rankRaw) && rankRaw > 0 && rankRaw <= 2_000_000 ? rankRaw : null;
  const category = String(body.category ?? "").trim().slice(0, 48) || null;
  const sourcePage = String(body.sourcePage ?? "").trim().slice(0, 200) || null;

  try {
    const sent = await issueCode({ phone, purpose, name, level, rank, category, sourcePage });

    if (sent.ok) {
      return NextResponse.json(
        {
          ok: true,
          channel: sent.channel,
          masked: sent.masked,
          expiresInSeconds: sent.expiresInSeconds,
        },
        { headers: rateLimitHeaders(limit, LIMIT) },
      );
    }

    if (!sent.fallback) {
      return NextResponse.json({ error: sent.message ?? "Could not send a code." }, { status: 400 });
    }

    // Fall back to the handshake that needs nothing of ours to be up.
    const attempt = await startAttempt({ name, phone, level: level ?? "pg", rank, category, sourcePage });
    if (!attempt) {
      return NextResponse.json(
        {
          error:
            sent.message ??
            "We cannot verify numbers right now. Please try again in a few minutes.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        channel: "inbound",
        token: attempt.token,
        code: attempt.code,
        waLink: attempt.waLink,
        expiresAt: attempt.expiresAt,
        // Said plainly, because the screen changes shape and the visitor is
        // entitled to know why they are being asked to do the work.
        note: sent.message ?? null,
      },
      { headers: rateLimitHeaders(limit, LIMIT) },
    );
  } catch (error) {
    logError(error, { route: "/api/auth/otp", request });
    return NextResponse.json(
      { error: "Could not send a code just now. Please try again." },
      { status: 500 },
    );
  }
}
