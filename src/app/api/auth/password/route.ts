import { NextResponse } from "next/server";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { userFromRequest, setUserPassword } from "@/lib/userAuth";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Sets the password, for somebody who is already signed in.
 *
 * Deliberately requires a live session rather than taking a phone number and a
 * code: by the time this is called the code has already been redeemed and a
 * session issued, so the session *is* the proof. Accepting a code here as well
 * would mean two ways to set a password and one of them would eventually be
 * the one with the bug.
 *
 * This is also the "forgot password" completion — a reset code signs them in,
 * and then they land here. No separate reset-token path exists, because there
 * is nothing it would add.
 */
const LIMIT = 10;
const WINDOW_MS = 10 * 60 * 1000;

/** Short enough that people will actually set one, long enough to be a password. */
const MIN_LENGTH = 8;

export async function POST(request: Request) {
  const limit = rateLimit(`password:${clientKey(request)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  const user = await userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < MIN_LENGTH) {
    return NextResponse.json(
      { error: `Use at least ${MIN_LENGTH} characters.` },
      { status: 400 },
    );
  }
  if (password.length > 200) {
    return NextResponse.json({ error: "That password is too long." }, { status: 400 });
  }
  // The number is the username, so it is the one thing the password must not be.
  if (password.replace(/\D/g, "") && user.phone.endsWith(password.replace(/\D/g, ""))) {
    return NextResponse.json(
      { error: "Please pick something other than your phone number." },
      { status: 400 },
    );
  }

  try {
    const ok = await setUserPassword(user.id, password);
    if (!ok) return NextResponse.json({ error: "Could not save that password." }, { status: 500 });
    return NextResponse.json({ ok: true }, { headers: rateLimitHeaders(limit, LIMIT) });
  } catch (error) {
    logError(error, { route: "/api/auth/password", request });
    return NextResponse.json({ error: "Could not save that password." }, { status: 500 });
  }
}
