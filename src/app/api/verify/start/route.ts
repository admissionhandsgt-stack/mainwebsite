import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { startAttempt, verifyEnabled } from "@/lib/waVerify";
import { nameOrNull } from "@/lib/formRules";
import { rankOrNull } from "@/lib/neetLimits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Opens a WhatsApp verification and hands back the link to tap.
 *
 * Nothing is sent here and nothing is unlocked here — this only reserves a
 * code. The unlock happens in `/api/verify/status` once the gateway has seen
 * the visitor's own message arrive.
 */
export async function POST(request: Request) {
  if (!(await verifyEnabled())) {
    // The number is configured per environment; without it the UI should not
    // have offered this path at all, so say so plainly rather than 500.
    return NextResponse.json(
      { error: "WhatsApp verification is not configured." },
      { status: 503 },
    );
  }

  // A code costs a row and a deep link. Generous enough for someone retrying
  // on a flaky connection, tight enough that nobody farms live codes.
  const LIMIT = 10;
  const limit = rateLimit(`verify-start:${clientKey(request)}`, LIMIT, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes." },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    /* Everything here is optional — an empty body is a valid request. */
  }

  if (body.honeypot) {
    console.warn(`[verify/start] honeypot tripped from ${clientKey(request)}`);
    return NextResponse.json({ error: "Could not start verification." }, { status: 400 });
  }

  const level = body.level === "ug" ? "ug" : "pg";

  try {
    const started = await startAttempt({
      name: nameOrNull(body.name),
      phone: (body.phone as string) ?? null,
      level,
      rank: rankOrNull(body.rank, level),
      category: String(body.category ?? "").trim().slice(0, 48) || null,
      sourcePage: String(body.source ?? "").trim().slice(0, 160) || null,
    });

    if (!started) {
      return NextResponse.json(
        { error: "Could not start verification. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json(started, { headers: rateLimitHeaders(limit, LIMIT) });
  } catch (error) {
    logError(error, { route: "/api/verify/start", request });
    return NextResponse.json({ error: "Could not start verification." }, { status: 500 });
  }
}
