import { NextResponse } from "next/server";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { hasAccess } from "@/lib/userAuth";
import { getCollegeCutoffs } from "@/lib/collegeQueries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The rest of a college's cutoff table, once the visitor is through the gate.
 *
 * The per-college pages are the SEO engine — around 3,500 of them, statically
 * rendered and cached for a day — so the gate cannot live in the page itself.
 * Reading a cookie there would make every one of them per-request and throw
 * that away. Instead the page ships a real preview in its HTML, which is what
 * Google indexes and what a visitor reads, and this route serves the remainder
 * to whoever has unlocked.
 *
 * So the page stays static, the content stays indexed, and the depth still
 * costs a phone number.
 */
export async function GET(request: Request) {
  const LIMIT = 60;
  const limit = rateLimit(`college-cutoffs:${clientKey(request)}`, LIMIT, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  const params = new URL(request.url).searchParams;
  const slug = (params.get("slug") ?? "").trim().slice(0, 200);
  const level = params.get("level") === "ug" ? "ug" : "pg";
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid college." }, { status: 400 });
  }

  // 401 rather than an empty list, so the UI can tell "you are locked out"
  // apart from "this college has no published rounds".
  if (!(await hasAccess(request))) {
    return NextResponse.json({ error: "locked" }, { status: 401 });
  }

  try {
    const rows = await getCollegeCutoffs(slug, level);
    return NextResponse.json({ rows }, { headers: rateLimitHeaders(limit, LIMIT) });
  } catch (error) {
    console.error("[/api/college-cutoffs]", error);
    return NextResponse.json({ error: "Could not read the cutoff data." }, { status: 500 });
  }
}
