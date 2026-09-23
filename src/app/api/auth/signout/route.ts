import { NextResponse } from "next/server";
import { signOut } from "@/lib/userAuth";
import { UNLOCK_COOKIE } from "@/lib/leadGate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ends the session.
 *
 * POST only: a link that signs you out can be triggered by anything that
 * renders an image, and browsers prefetch GETs.
 *
 * The unlock cookie goes too. Leaving it would mean "signed out" still showed
 * the gated data, which is not what anyone means by signing out.
 */
export async function POST() {
  await signOut();
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ name: UNLOCK_COOKIE, value: "", path: "/", maxAge: 0 });
  return response;
}
