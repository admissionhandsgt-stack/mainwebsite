import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { userFromRequest } from "@/lib/userAuth";
import {
  parseProfile,
  saveProfile,
  getProfile,
  enrichLead,
  completeness,
  missingFields,
} from "@/lib/counsellingProfile";
import { sendWhatsAppNotification } from "@/lib/whatsappService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * What the visitor told us about themselves.
 *
 * `GET` reads it back so the tools open where they left off. `POST` saves it,
 * copies it onto the enquiry they already made, and tells the counsellors —
 * **once**, and only when there is enough to act on.
 *
 * Scoped to the session and nothing else: there is no `userId` parameter on this
 * route, so the only way to read or write somebody's profile is to hold their
 * cookie.
 */

/**
 * Keyed by session, not by address.
 *
 * This audience is on shared networks — a college hostel, a family connection,
 * a browsing centre — and an IP-keyed limit makes them one bucket. The tuner is
 * five saves per person, so four students behind one NAT would have hit a
 * 20-per-IP limit between them and simply stopped being able to answer. A
 * session is per person and cannot be shared by accident.
 *
 * Anonymous callers keep an address limit, because there is no session to key on
 * and the route still has to cost something to hammer.
 */
const LIMIT = 60;
const ANON_LIMIT = 20;
const WINDOW_MS = 10 * 60 * 1000;

export async function GET(request: Request) {
  const user = await userFromRequest(request);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  try {
    return NextResponse.json({ profile: (await getProfile(user.id)) ?? {} });
  } catch (error) {
    logError(error, { route: "/api/profile:GET", request });
    return NextResponse.json({ error: "Could not read that." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // The session is resolved first so the limit can be keyed on it. Doing this
  // the other way round also meant a rejected request spent somebody else's
  // budget: three anonymous probes used three of the twenty an entire shared
  // network had between them.
  const user = await userFromRequest(request);

  if (!user) {
    const anon = rateLimit(`profile-anon:${clientKey(request)}`, ANON_LIMIT, WINDOW_MS);
    if (!anon.ok) {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: rateLimitHeaders(anon, ANON_LIMIT) },
      );
    }
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const limit = rateLimit(`profile:${user.id}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many updates. Try again shortly." },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const profile = parseProfile(body);

    await saveProfile(user.id, profile);

    // The enquiry may still say "Not given" because it was written before the
    // gate required a name. The account has one, so backfill from there rather
    // than leaving a counsellor to open with "who am I speaking to?".
    const attached = await enrichLead(user.phone, {
      ...profile,
      name: profile.name ?? user.name ?? null,
    });

    /**
     * Alert the counsellors, but not on every keystroke of a multi-step form.
     *
     * The client sends `notify` on the last step only. Without that guard a
     * five-question tuner is five WhatsApp messages about one person, which is
     * how a team stops reading the alerts — and the alerts are the product here,
     * as the screenshot of their phone makes plain.
     */
    if (body.notify === true) {
      const merged = (await getProfile(user.id)) ?? profile;
      // Fire and forget: a messaging outage must not fail the save.
      void sendWhatsAppNotification({
        name: merged.name ?? user.name ?? "Not given",
        phone: user.phone,
        rank: merged.rank ?? undefined,
        preferred_branch: merged.preferredBranches?.join(", ") ?? undefined,
        preferred_state: merged.preferredState ?? undefined,
        category: merged.category ?? undefined,
        attempt: merged.attempt ?? undefined,
        budget_max: merged.budgetMax ?? undefined,
        budget_total_max: merged.budgetTotalMax ?? undefined,
        mbbs_college: merged.mbbsCollege ?? undefined,
        missing: missingFields(merged),
        source: String(body.source ?? "Profile completed"),
      }).catch((error) => logError(error, { route: "/api/profile:notify" }));
    }

    const saved = (await getProfile(user.id)) ?? profile;
    return NextResponse.json(
      { ok: true, profile: saved, attachedToLead: attached, completeness: completeness(saved) },
      { headers: rateLimitHeaders(limit, LIMIT) },
    );
  } catch (error) {
    logError(error, { route: "/api/profile:POST", request });
    return NextResponse.json({ error: "Could not save that." }, { status: 500 });
  }
}
