import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { attemptStatus } from "@/lib/waVerify";
import { mintUnlock, unlockCookie } from "@/lib/leadGate";
import { upsertUser, startSession, sessionCookie } from "@/lib/userAuth";
import { sendWhatsAppNotification } from "@/lib/whatsappService";

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
    // the lead is created once and then recognised. Same 24-hour rule as the
    // typed-number path, so the two cannot double up on each other either.
    const existing = (await db.execute(sql`
      SELECT id FROM leads
       WHERE phone = ${phone} AND created_at >= now() - interval '24 hours'
       LIMIT 1
    `)) as unknown as unknown[];

    if (existing.length === 0) {
      const note = status.rank
        ? `Verified on WhatsApp. Unlocked the seat list at rank ${status.rank}${
            status.category ? ` (${status.category})` : ""
          }.`
        : "Verified on WhatsApp.";

      await db.execute(sql`
        INSERT INTO leads
          (level, name, phone, rank, category, source_page, lead_status, message)
        VALUES (
          ${status.level ?? "pg"}::level,
          ${status.name ?? "WhatsApp verified"},
          ${phone},
          ${status.rank ?? null},
          ${status.category ?? null},
          ${status.sourcePage ?? `Seat predictor — ${(status.level ?? "pg").toUpperCase()}`},
          'New',
          ${note}
        )
      `);

      sendWhatsAppNotification({
        name: status.name ?? "WhatsApp verified",
        phone,
        rank: status.rank ?? undefined,
        source: status.sourcePage ?? "Seat predictor (WhatsApp verified)",
      }).catch((err) => console.error("[verify/status] WhatsApp alert failed:", err));
    }

    // Same as the typed path, but the number was proved rather than claimed,
    // so the account is marked verified.
    const user = await upsertUser({
      name: status.name,
      phone,
      level: status.level ?? null,
      rank: status.rank,
      category: status.category,
      verified: true,
    });

    const response = NextResponse.json({ verified: true, phone, signedIn: Boolean(user) });
    response.cookies.set(unlockCookie(await mintUnlock(phone)));
    if (user) response.cookies.set(sessionCookie(await startSession(user.id)));
    return response;
  } catch (error) {
    console.error("[/api/verify/status]", error);
    return NextResponse.json({ error: "Could not check the verification." }, { status: 500 });
  }
}
