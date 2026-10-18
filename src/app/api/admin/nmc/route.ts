import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { syncNmc } from "@/lib/nmcSync";
import { findInstitutes, markNmcNone, mapNmc, nmcStatus, unmapNmc } from "@/lib/nmcAdmin";
import { logError } from "@/lib/logger";

/**
 * Admin → Data sync (NMC register). GET: what is held, how much is matched, what
 * still needs a person. POST: { action: "sync" } re-reads NMC now; "map" pairs an
 * NMC college with one of our institutes; "none" records that it is none of ours;
 * "unmap" undoes a pairing. Every change clears the cached NMC facts on pages.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const CODE = /^[A-Za-z0-9/\-]{3,40}$/;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  try {
    const url = new URL(request.url);
    const find = url.searchParams.get("find");
    if (find) {
      const level = url.searchParams.get("level") === "pg" ? "pg" : "ug";
      return NextResponse.json({ results: await findInstitutes(find.slice(0, 80), level) });
    }
    return NextResponse.json(await nmcStatus(), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError(error, { route: "/api/admin/nmc" });
    return NextResponse.json({ error: "Could not read the NMC register." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const action = body.action;
  try {
    if (action === "sync") {
      const result = await syncNmc(`admin:${auth.email}`);
      revalidateTag("nmc");
      return NextResponse.json(result);
    }
    const code = typeof body.code === "string" && CODE.test(body.code) ? body.code : null;
    if (action === "map") {
      const id = Number(body.instituteId);
      if (!code || !Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Pick a college." }, { status: 400 });
      await mapNmc(code, id);
    } else if (action === "none") {
      if (!code) return NextResponse.json({ error: "Bad request." }, { status: 400 });
      await markNmcNone(code);
    } else if (action === "unmap") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Bad request." }, { status: 400 });
      await unmapNmc(id);
    } else {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    revalidateTag("nmc");
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError(error, { route: `/api/admin/nmc:${String(action)}` });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed." }, { status: 500 });
  }
}
