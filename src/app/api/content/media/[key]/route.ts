import { NextResponse } from "next/server";
import { getMediaAsset } from "@/lib/content";
import { limitOr429 } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A single CMS image, by media key.
 *
 * `BackendImage` runs in the browser and cannot open a database connection,
 * so it resolves its key here. Server components import `getMediaAsset` from
 * `lib/content` directly and never touch this route.
 */
export async function GET(request: Request, { params }: { params: { key: string } }) {
  const limited = limitOr429(request, "media", 300);
  if (limited) return limited;
  try {
    const asset = await getMediaAsset(params.key);
    if (!asset) {
      return NextResponse.json({ data: null }, { status: 404 });
    }
    return NextResponse.json(
      { data: asset },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
    );
  } catch (error) {
    console.error(`[/api/content/media/${params.key}]`, error);
    return NextResponse.json({ error: "Could not load the image." }, { status: 500 });
  }
}
