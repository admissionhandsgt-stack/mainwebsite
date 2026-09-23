import { NextResponse } from "next/server";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import {
  getContactInfo,
  getLiveAlerts,
  getVideos,
  getMediaAssets,
  getMbbsStates,
  getCuratedColleges,
  getPgBranches,
  getPgCollegesContent,
} from "@/lib/content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Read-only content for client components.
 *
 * Client hooks cannot reach PostgreSQL directly, so they come through here.
 * Only the resources listed below are exposed — an unknown name is a 404
 * rather than an opening to query anything in the database.
 */
const RESOURCES = {
  contact: getContactInfo,
  alerts: getLiveAlerts,
  videos: () => getVideos(),
  media: () => getMediaAssets(),
  states: getMbbsStates,
  "colleges-ug": () => getCuratedColleges("ugAll"),
  "colleges-recommended": () => getCuratedColleges("ugRecommended"),
  "colleges-deemed": () => getCuratedColleges("deemed"),
  "pg-branches": getPgBranches,
  "pg-colleges": getPgCollegesContent,
} as const;

type Resource = keyof typeof RESOURCES;

export async function GET(request: Request, { params }: { params: { resource: string } }) {
  const LIMIT = 120;
  const limit = rateLimit(`content:${clientKey(request)}`, LIMIT, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  const key = params.resource as Resource;
  const handler = RESOURCES[key];

  if (!handler) {
    return NextResponse.json(
      { error: `Unknown resource '${params.resource}'.` },
      { status: 404 },
    );
  }

  try {
    const data = await handler();
    return NextResponse.json(
      { data },
      {
        headers: {
          // Content changes rarely and is edited through the admin, so a short
          // shared cache absorbs bursts without making edits feel stale.
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error(`[/api/content/${params.resource}]`, error);
    return NextResponse.json({ error: "Could not load content." }, { status: 500 });
  }
}
