import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { authenticate, createSession, destroySession, getSessionUser } from "@/lib/auth";
import { clientIp } from "@/lib/clientIp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Admin sign-in, sign-out and "who am I".
 *
 * Rate limited per IP: brute-forcing a single admin account over the internet
 * is the realistic attack here, and the login is the only unauthenticated
 * write endpoint in the admin surface.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}

export async function POST(request: Request) {
  // The left-most forwarded hop is the client's to choose, and on the admin
  // host Caddy appends rather than replaces — so reading it from the left made
  // the brute-force limit a header away from useless. See src/lib/clientIp.ts.
  const ip = clientIp(request) ?? "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  let email = "";
  let password = "";
  try {
    const body = await request.json();
    email = String(body.email ?? "").trim();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  try {
    const user = await authenticate(email, password);
    if (!user) {
      // Deliberately does not say which of the two was wrong.
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    await createSession(user.id);
    attempts.delete(ip);
    return NextResponse.json({ user });
  } catch (error) {
    logError(error, { route: "/api/admin/auth", request });
    return NextResponse.json({ error: "Could not sign you in. Try again." }, { status: 500 });
  }
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
