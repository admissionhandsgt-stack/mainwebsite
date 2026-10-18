import { NextResponse } from "next/server";
import { getBranchCatalogue } from "@/lib/branchCatalogue";
import { logError } from "@/lib/logger";

/**
 * The NEET PG branch list every form offers (lib/branchCatalogue.ts): names
 * only, grouped by specialty. Public and cacheable — nothing in it is gated.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(
      { groups: await getBranchCatalogue() },
      { headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=3600" } },
    );
  } catch (error) {
    logError(error, { route: "/api/content/branches" });
    return NextResponse.json({ groups: [] }, { status: 500 });
  }
}
