import { NextResponse } from "next/server";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { accountLookup } from "@/lib/userAuth";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Step one of signing in: which question to ask next.
 *
 * The visitor types a number and we answer whether it already has a password —
 * so the screen can ask for the password, or send a code, without ever making
 * them declare whether they are new here. That is a question only we can
 * answer, and every site that asks it gets it wrong half the time.
 *
 * It does confirm whether a number is registered, so it is rate-limited hard
 * enough that the answer cannot be harvested in bulk, and it returns nothing
 * but a first name.
 */
const LIMIT = 20;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const limit = rateLimit(`lookup:${clientKey(request)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts from this connection. Try again in a few minutes." },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  try {
    const found = await accountLookup(String(body.phone ?? ""));
    return NextResponse.json(found, { headers: rateLimitHeaders(limit, LIMIT) });
  } catch (error) {
    logError(error, { route: "/api/auth/lookup", request });
    // Treated as "new here", which sends a code — the path that works for
    // everyone, rather than asking for a password that may not exist.
    return NextResponse.json({ exists: false, hasPassword: false, firstName: null, verified: false });
  }
}
