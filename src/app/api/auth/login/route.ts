import { NextResponse } from "next/server";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { authenticateUser, startSession, sessionCookie } from "@/lib/userAuth";
import { normalisePhone, mintUnlock, unlockCookie } from "@/lib/leadGate";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Phone and password. The whole point of the password existing.
 *
 * No code, no WhatsApp, no phone in hand — which is what a returning visitor on
 * a laptop needs, and exactly what the passwordless design could not do.
 *
 * Limited per number *and* per connection. Per connection alone lets one
 * attacker spread guesses across many accounts from one address; per number
 * alone lets a botnet pound one account. Neither answer says whether the number
 * or the password was the wrong half.
 */
const IP_LIMIT = 12;
const PHONE_LIMIT = 6;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const ipLimit = rateLimit(`login-ip:${clientKey(request)}`, IP_LIMIT, WINDOW_MS);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: "Too many attempts from this connection. Try again in a few minutes." },
      { status: 429, headers: rateLimitHeaders(ipLimit, IP_LIMIT) },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const phone = normalisePhone(body.phone);
  const password = typeof body.password === "string" ? body.password : "";
  if (!phone || !password) {
    return NextResponse.json({ error: "Enter your number and password." }, { status: 400 });
  }

  const phoneLimit = rateLimit(`login-phone:${phone}`, PHONE_LIMIT, WINDOW_MS);
  if (!phoneLimit.ok) {
    return NextResponse.json(
      {
        error:
          "Too many failed attempts on this number. Wait a few minutes, or use “Forgot password” to get a code.",
      },
      { status: 429 },
    );
  }

  try {
    const user = await authenticateUser(phone, password);
    if (!user) {
      // One message for both halves. Saying which was wrong tells an attacker
      // which numbers are worth guessing passwords for.
      return NextResponse.json(
        { error: "That number and password do not match." },
        { status: 401, headers: rateLimitHeaders(ipLimit, IP_LIMIT) },
      );
    }

    const response = NextResponse.json({
      ok: true,
      signedIn: true,
      name: user.name,
      phone: user.phone,
      verified: user.verified,
      level: user.level,
      rank: user.rank,
      category: user.category,
    });

    response.cookies.set(sessionCookie(await startSession(user.id)));
    // Server-rendered pages read the unlock cookie, so it is re-issued here
    // too — otherwise a signed-in visitor sees a locked page.
    if (user.verified) response.cookies.set(unlockCookie(await mintUnlock(user.phone)));
    return response;
  } catch (error) {
    logError(error, { route: "/api/auth/login", request });
    return NextResponse.json({ error: "Could not sign you in just now." }, { status: 500 });
  }
}
