import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { mintUnlock, unlockCookie, normalisePhone } from "@/lib/leadGate";
import { upsertUser, startSession, sessionCookie } from "@/lib/userAuth";
import { sendWhatsAppNotification } from "@/lib/whatsappService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Trades a phone number for access to the full seat list.
 *
 * The visitor gets their seats, we get a lead, and a scraper has to find a new
 * number and a new address for every 300 rows instead of none. See
 * `src/lib/leadGate.ts` for why this is a gate and not a verification.
 */

/**
 * Generous on purpose, because the address is not the person.
 *
 * Five an hour was written as "covers a shared connection and a retry", and that
 * is wrong for this audience in this season: a hostel, a coaching centre or a
 * family connection puts dozens of NEET candidates behind one address in the same
 * evening, and the sixth of them was being told to come back later. A blocked
 * candidate is a lost enquiry, and nobody reports it.
 *
 * Raising it costs little, because the address was never the control that
 * matters. A phone number is required for every unlock, the same number cannot
 * open a second enquiry within 24 hours, and the OTP path caps codes **per
 * number** in the database. Those bound a harvester; this only bounds a flood.
 */
const IP_LIMIT = 25;
const IP_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const ip = clientKey(request);
  const limit = rateLimit(`unlock:${ip}`, IP_LIMIT, IP_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts from this connection. Try again in a little while." },
      { status: 429, headers: rateLimitHeaders(limit, IP_LIMIT) },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // Answer as if it worked, so a bot learns nothing about which field caught it.
  if (body.honeypot) {
    console.warn(`[unlock] honeypot tripped from ${ip}`);
    return NextResponse.json({ ok: true });
  }

  const name = String(body.name ?? "").trim().slice(0, 120);
  if (name.length < 2) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  const phone = normalisePhone(body.phone);
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a 10-digit Indian mobile number." },
      { status: 400 },
    );
  }

  const level = body.level === "ug" ? "ug" : "pg";
  const rankRaw = Number(String(body.rank ?? "").replace(/[^\d]/g, ""));
  const rank = Number.isFinite(rankRaw) && rankRaw > 0 && rankRaw <= 2_000_000 ? rankRaw : null;
  const category = String(body.category ?? "").trim().slice(0, 48) || null;

  try {
    // Someone re-opening the tool next week is the same lead, not a new one.
    // The cookie is re-issued either way — losing a cookie should not cost
    // them access to something they already gave us their number for.
    const existing = (await db.execute(sql`
      SELECT id FROM leads
      WHERE phone = ${phone} AND created_at >= now() - interval '24 hours'
      LIMIT 1
    `)) as unknown as unknown[];

    const isNew = existing.length === 0;

    if (isNew) {
      await db.execute(sql`
        INSERT INTO leads
          (level, name, phone, rank, category, source_page, lead_status, message)
        VALUES
          (${level}::level, ${name}, ${phone}, ${rank}, ${category},
           ${`Seat predictor — ${level.toUpperCase()}`}, 'New',
           ${rank ? `Unlocked the seat list at rank ${rank}${category ? ` (${category})` : ""}.` : "Unlocked the seat list."})
      `);

      // Fire and forget: an alerting outage must not cost the visitor access.
      sendWhatsAppNotification({
        name,
        phone,
        rank: rank ?? undefined,
        source: `Seat predictor (${level.toUpperCase()})`,
      }).catch((err) => console.error("[unlock] WhatsApp alert failed:", err));
    }

    // Unlocking is also signing up. The number is the identity, so a visitor
    // who gives one gets an account and a session rather than only a cookie
    // that expires into nothing — which is the difference between a lead and
    // somebody who can come back.
    const user = await upsertUser({ name, phone, level, rank, category, verified: false });

    const response = NextResponse.json({ ok: true, returning: !isNew, signedIn: Boolean(user) });
    response.cookies.set(unlockCookie(await mintUnlock(phone)));
    if (user) response.cookies.set(sessionCookie(await startSession(user.id)));
    return response;
  } catch (error) {
    logError(error, { route: "/api/unlock", request });
    return NextResponse.json(
      { error: "Could not complete that just now. Please try again." },
      { status: 500 },
    );
  }
}
