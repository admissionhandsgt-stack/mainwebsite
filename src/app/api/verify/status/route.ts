import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { attemptStatus } from "@/lib/waVerify";
import { mintUnlock, unlockCookie } from "@/lib/leadGate";
import { upsertUser, startSession, sessionCookie } from "@/lib/userAuth";
import { recordLead } from "@/lib/leadCapture";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * What the waiting browser polls, and where the unlock is actually granted.
 *
 * The cookie is minted here rather than in the webhook because the webhook is
 * a server-to-server call from the gateway — it has no browser to set a cookie
 * on. This is the first request after verification that does.
 */
export async function GET(request: Request) {
  // A poll every two seconds for the fifteen-minute window is 450 requests, so
  // the ceiling only needs to catch something pathological.
  const limit = rateLimit(`verify-status:${clientKey(request)}`, 600, 15 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[0-9a-f]{48}$/.test(token)) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  try {
    const status = await attemptStatus(token);
    if (!status.found) {
      return NextResponse.json({ error: "Unknown verification." }, { status: 404 });
    }
    if (!status.verified) {
      return NextResponse.json({ verified: false, expired: status.expired });
    }

    const phone = status.phone!;

    // The browser keeps polling after success (a slow network, a retry), so
    // `recordLead` deduplicates on a 24-hour window — the same rule the code
    // path uses, so the two cannot double up on each other either.
    await recordLead({
      name: status.name ?? "WhatsApp verified",
      phone,
      level: status.level ?? "pg",
      rank: status.rank ?? null,
      category: status.category ?? null,
      source: status.sourcePage ?? null,
      verified: true,
    });

    // Same as the code path, but the number was proved by a message arriving
    // from it, so the account is marked verified.
    const user = await upsertUser({
      name: status.name,
      phone,
      level: status.level ?? null,
      rank: status.rank,
      category: status.category,
      verified: true,
    });

    // `hasPassword` decides the flow's next step: offer one, or finish. The
    // polling browser has no other way to know.
    const response = NextResponse.json({
      verified: true,
      phone,
      signedIn: Boolean(user),
      hasPassword: Boolean(user?.hasPassword),
    });
    response.cookies.set(unlockCookie(await mintUnlock(phone)));
    if (user) response.cookies.set(sessionCookie(await startSession(user.id)));
    return response;
  } catch (error) {
    logError(error, { route: "/api/verify/status", request });
    return NextResponse.json({ error: "Could not check the verification." }, { status: 500 });
  }
}
