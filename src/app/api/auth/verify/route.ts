import { NextResponse } from "next/server";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { checkCode } from "@/lib/otp";
import { normalisePhone, mintUnlock, unlockCookie } from "@/lib/leadGate";
import { upsertUser, startSession, sessionCookie } from "@/lib/userAuth";
import { recordLead } from "@/lib/leadCapture";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Redeems a code: the moment a number becomes proved and an account exists.
 *
 * Three things happen together, and all three are the point:
 *
 *   - the number is marked verified, permanently — proof is not re-earned
 *   - a session is issued, so they are signed in rather than merely allowed
 *   - the enquiry is recorded, because this is also how the business hears
 *     about them
 *
 * The response says whether a password is already set, because the screen's
 * next step depends on it: offer one, or finish.
 *
 * Wrong-code counting lives on the row in `otp_codes`, not here — per-isolate
 * counters do not add up across a deploy, and a six-digit code with an
 * unlimited retry budget is a four-digit code.
 */
const LIMIT = 20;
const WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  const limit = rateLimit(`verify:${clientKey(request)}`, LIMIT, WINDOW_MS);
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

  const phone = normalisePhone(body.phone);
  if (!phone) {
    return NextResponse.json({ error: "Enter a 10-digit Indian mobile number." }, { status: 400 });
  }

  const purpose = body.purpose === "reset" ? "reset" : "signup";

  try {
    const checked = await checkCode(phone, String(body.code ?? ""), purpose);
    if (!checked.ok) {
      return NextResponse.json(
        { error: checked.message ?? "That code is not right." },
        { status: 400, headers: rateLimitHeaders(limit, LIMIT) },
      );
    }

    // What they typed on this screen wins over what was carried through the
    // code, because it is newer — but neither ever blanks a stored value.
    const carried = checked.carried;
    const name = String(body.name ?? "").trim().slice(0, 120) || carried?.name || null;
    const level = body.level === "ug" ? "ug" : body.level === "pg" ? "pg" : carried?.level ?? null;
    const rankRaw = Number(String(body.rank ?? "").replace(/\D/g, ""));
    const rank =
      Number.isFinite(rankRaw) && rankRaw > 0 && rankRaw <= 2_000_000 ? rankRaw : carried?.rank ?? null;
    const category = String(body.category ?? "").trim().slice(0, 48) || carried?.category || null;

    const user = await upsertUser({ phone, name, level, rank, category, verified: true });
    if (!user) {
      return NextResponse.json({ error: "Could not complete that just now." }, { status: 500 });
    }

    // A reset is an existing person coming back, not a new enquiry.
    if (purpose === "signup") {
      await recordLead({
        name: name || "Not given",
        phone,
        level: level ?? "pg",
        rank,
        category,
        source: carried?.sourcePage ?? null,
        verified: true,
      });
    }

    const response = NextResponse.json(
      {
        ok: true,
        signedIn: true,
        hasPassword: user.hasPassword,
        name: user.name,
        phone: user.phone,
      },
      { headers: rateLimitHeaders(limit, LIMIT) },
    );

    response.cookies.set(sessionCookie(await startSession(user.id)));
    // The unlock cookie as well: a page rendered on the server reads that one,
    // and a visitor who is signed in must not see a locked page because two
    // mechanisms disagree about them.
    response.cookies.set(unlockCookie(await mintUnlock(phone)));
    return response;
  } catch (error) {
    logError(error, { route: "/api/auth/verify", request });
    return NextResponse.json(
      { error: "Could not complete that just now. Please try again." },
      { status: 500 },
    );
  }
}
