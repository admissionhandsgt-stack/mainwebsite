import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { setSearchFaqStatus } from "@/lib/searchFaq";

export const dynamic = "force-dynamic";

/** Take a search answer off its page, or put it back (Admin → Search research). */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;
  const body = (await request.json().catch(() => ({}))) as { id?: unknown; status?: unknown };
  const id = Number(body.id);
  const status = body.status === "live" ? "live" : body.status === "removed" ? "removed" : null;
  if (!Number.isInteger(id) || id <= 0 || !status) return NextResponse.json({ error: "id and status (live | removed) are required" }, { status: 400 });
  await setSearchFaqStatus(id, status);
  return NextResponse.json({ ok: true });
}
