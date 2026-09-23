import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { PREVIEW_SEATS } from "@/lib/leadGate";
import { hasAccess } from "@/lib/userAuth";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { chanceFor, summarise, BAND_ORDER, type ChanceBand, type SeatOptionRow } from "@/lib/predictor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RESULTS = 300;

interface PredictQuery {
  rank: number;
  level: "ug" | "pg";
  category: string;
  states: string[];
  ownership: string[];
  maxFee: number | null;
}

function parse(searchParams: URLSearchParams): PredictQuery | { error: string } {
  const rankRaw = searchParams.get("rank");
  const rank = Number(String(rankRaw ?? "").replace(/[,\s]/g, ""));
  if (!rankRaw || !Number.isFinite(rank) || rank < 1 || rank > 2_000_000) {
    return { error: "Rank must be a number between 1 and 20,00,000." };
  }

  const level = searchParams.get("level") === "ug" ? "ug" : "pg";
  const category = (searchParams.get("category") || "GEN").toUpperCase().slice(0, 48);

  const list = (k: string) =>
    (searchParams.get(k) || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 40);

  const maxFeeRaw = searchParams.get("maxFee");
  const maxFee = maxFeeRaw ? Number(maxFeeRaw) : null;

  return {
    rank: Math.round(rank),
    level,
    category,
    states: list("states"),
    ownership: list("ownership"),
    maxFee: Number.isFinite(maxFee as number) && (maxFee as number) > 0 ? (maxFee as number) : null,
  };
}

export async function GET(request: Request) {
  // The closing-rank data is the product, and this endpoint hands out 300
  // fully detailed seats per call. Unlimited, a few thousand requests rebuild
  // the dataset. 30 a minute is well above what a person clicking through
  // filters needs and well below what a scraper wants.
  const LIMIT = 30;
  const limit = rateLimit(`predict:${clientKey(request)}`, LIMIT, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  const parsed = parse(new URL(request.url).searchParams);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { rank, level, category, states, ownership, maxFee } = parsed;

  try {
    // Pull every seat whose widest recorded cut could still contain this rank,
    // plus the ones it clears outright. Scoring happens in JS so the band
    // definitions live in one place (src/lib/predictor.ts) rather than in SQL.
    const rows = await db.execute(sql`
      SELECT
        so.institute_id           AS institute_id,
        i.name                    AS institute,
        i.slug                    AS institute_slug,
        i.ownership               AS ownership,
        i.district                AS district,
        i.beds                    AS beds,
        st.name                   AS state,
        c.name                    AS course,
        c.degree_type             AS degree_type,
        q.code                    AS quota,
        q.master_quota            AS master_quota,
        cat.code                  AS category,
        cn.name                   AS counselling,
        so.r1_latest              AS r1_latest,
        so.widest_latest          AS widest_latest,
        so.widest_previous        AS widest_previous,
        so.furthest_ever          AS furthest_ever,
        so.latest_year            AS latest_year,
        so.seats_latest           AS seats_latest,
        so.years_of_data          AS years_of_data,
        so.low_confidence         AS low_confidence,
        so.fee_inr                AS fee_inr,
        so.bond_years             AS bond_years
      FROM seat_options so
      JOIN institutes  i   ON i.id  = so.institute_id
      JOIN courses     c   ON c.id  = so.course_id
      JOIN quotas      q   ON q.id  = so.quota_id
      JOIN categories  cat ON cat.id = so.category_id
      LEFT JOIN states       st ON st.id = i.state_id
      LEFT JOIN counsellings cn ON cn.id = so.counselling_id
      WHERE so.level = ${level}
        AND cat.code = ${category}
        AND COALESCE(so.furthest_ever, so.widest_latest) >= ${rank}
        ${states.length ? sql`AND st.name IN (${sql.join(states.map((s) => sql`${s}`), sql`, `)})` : sql``}
        ${ownership.length ? sql`AND i.ownership::text IN (${sql.join(ownership.map((o) => sql`${o}`), sql`, `)})` : sql``}
        ${maxFee ? sql`AND (so.fee_inr IS NULL OR so.fee_inr <= ${maxFee})` : sql``}
      ORDER BY so.widest_latest ASC NULLS LAST
      LIMIT ${MAX_RESULTS}
    `);

    const results = (rows as unknown as Record<string, unknown>[]).map((r) => {
      const option: SeatOptionRow = {
        r1Latest: r.r1_latest as number | null,
        widestLatest: r.widest_latest as number | null,
        widestPrevious: r.widest_previous as number | null,
        furthestEver: r.furthest_ever as number | null,
        latestYear: r.latest_year as number | null,
        seatsLatest: r.seats_latest as number | null,
        yearsOfData: (r.years_of_data as number) ?? 0,
        lowConfidence: Boolean(r.low_confidence),
      };
      const chance = chanceFor(rank, option);
      return {
        institute: r.institute as string,
        instituteSlug: r.institute_slug as string,
        state: (r.state as string) ?? null,
        district: (r.district as string) ?? null,
        ownership: r.ownership as string,
        beds: r.beds as number | null,
        course: r.course as string,
        degreeType: (r.degree_type as string) ?? null,
        quota: r.quota as string,
        counselling: (r.counselling as string) ?? null,
        category: r.category as string,
        feeInr: r.fee_inr as number | null,
        bondYears: r.bond_years as number | null,
        seats: option.seatsLatest,
        widestRank: option.widestLatest,
        firstRoundRank: option.r1Latest,
        previousYearRank: option.widestPrevious,
        furthestEver: option.furthestEver,
        year: option.latestYear,
        lowConfidence: option.lowConfidence,
        ...chance,
      };
    });

    // Safest band first; inside a band, the most competitive seat first.
    //
    // Sorting by comfort would put the weakest seat at the top of "safe" — the
    // one the candidate clears by the widest margin. A counsellor does the
    // opposite: of everything you are safe for, look at the best seats first.
    // A tighter closing rank is the proxy for a better seat.
    results.sort((a, b) => {
      const d = BAND_ORDER.indexOf(a.band as ChanceBand) - BAND_ORDER.indexOf(b.band as ChanceBand);
      if (d !== 0) return d;
      const ar = a.firstRoundRank ?? a.widestRank ?? Number.MAX_SAFE_INTEGER;
      const br = b.firstRoundRank ?? b.widestRank ?? Number.MAX_SAFE_INTEGER;
      return ar - br;
    });

    // The counts are free and always complete — a visitor should be able to
    // see that the answer exists, and how big it is, before being asked for
    // anything. Only the seat-by-seat detail is behind the gate, and it is cut
    // here rather than hidden in the UI: an unlocked payload never leaves the
    // server, so there is nothing to read out of the network tab.
    const unlocked = Boolean(await hasAccess(request));
    const visible = unlocked ? results : results.slice(0, PREVIEW_SEATS);

    return NextResponse.json({
      query: { rank, level, category, states, ownership, maxFee },
      counts: summarise(results),
      total: results.length,
      truncated: unlocked && results.length === MAX_RESULTS,
      locked: !unlocked,
      lockedCount: unlocked ? 0 : Math.max(0, results.length - visible.length),
      results: visible,
    });
  } catch (error) {
    logError(error, { route: "/api/predict", request });
    return NextResponse.json(
      { error: "Could not read the counselling data. Try again in a moment." },
      { status: 500 },
    );
  }
}
