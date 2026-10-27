import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { rateLimit, clientKey, rateLimitHeaders } from "@/lib/rateLimit";
import { canSeeDepth } from "@/lib/depth";
import { streamSpec, type Stream } from "@/lib/predictorFacets";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { chanceFor, BAND_ORDER, type ChanceBand, type SeatOptionRow } from "@/lib/predictor";
import { checkRank, NEET_LIMITS } from "@/lib/neetLimits";
import { approxFee } from "@/lib/chance";
import { categoryScope, homeStateScope } from "@/lib/categoryScopeSql";
import { optionsUser, allowQuery, logQuery, toOptions, DISTINCT_PER_DAY } from "@/lib/chanceView";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Rows staff are shown. */
const MAX_RESULTS = 300;
/** Rows read to build the chance view — server-side only, never returned. */
const MAX_SCAN = 2500;

interface PredictQuery {
  rank: number;
  /** MBBS, BDS or PG — one tool, the course decides the level. */
  stream: Stream;
  level: "ug" | "pg";
  /** Set for the single-course streams, null for PG. */
  courseOnly: string | null;
  category: string;
  states: string[];
  ownership: string[];
  seatType: "all" | "nri" | "management";
  branches: string[];
  maxFee: number | null;
  /** Home states — the domicile, and for MD/MS the MBBS state: other states' own quotas are not theirs. */
  home: string[];
}

function parse(searchParams: URLSearchParams): PredictQuery | { error: string } {
  // `level` is still accepted so existing links keep working, but the stream
  // is what the tool sends and it decides both the level and the course.
  const spec = streamSpec(
    searchParams.get("stream") ?? (searchParams.get("level") === "ug" ? "mbbs" : "pg"),
  );

  // Within the number who sat that exam — lib/neetLimits.ts.
  const checked = checkRank(searchParams.get("rank"), spec.level);
  if (!checked.ok) return { error: checked.error };
  const rank = checked.value;
  // Not upper-cased: codes are compared upper-cased on both sides (lib/categoryScopeSql.ts),
  // and upper-casing here alone made "GEN-PwD" and "UR PwD" match nothing.
  const category = (searchParams.get("category") || "").trim().slice(0, 48);

  // NRI and management are quotas, not categories — see predictorFacets.ts.
  const seatTypeRaw = searchParams.get("seatType");
  const seatType: "all" | "nri" | "management" =
    seatTypeRaw === "nri" || seatTypeRaw === "management" ? seatTypeRaw : "all";

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
    stream: spec.id,
    level: spec.level,
    courseOnly: spec.course,
    // Default to whichever "general" code this level publishes: UG says UR,
    // PG says GEN. Guessing one broke the other.
    category: category || (spec.level === "ug" ? "UR" : "GEN"),
    states: list("states"),
    ownership: list("ownership"),
    seatType,
    branches: list("branches"),
    home: list("home").slice(0, 2),
    maxFee: Number.isFinite(maxFee as number) && (maxFee as number) > 0 ? (maxFee as number) : null,
  };
}

/**
 * One answer, three audiences (2026-10-12):
 *
 * - **Anybody:** counts only — how many seat options, colleges and states the
 *   rank reached, by chance — plus where the rank stands among everyone who sat
 *   the paper. Filters are ignored here: a count narrowed to one state, one
 *   ownership and one branch can be a count of one college, and walking a rank
 *   up and down against it would read that college's cut back out.
 * - **A verified account:** its colleges in chance words with an approximate
 *   fee bracket (lib/chanceView.ts), for a few distinct ranks a day.
 * - **Staff:** the rows, as before.
 *
 * No closing rank for a named college reaches anyone but staff. See
 * lib/depth.ts for why that includes search engines.
 */
export async function GET(request: Request) {
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

  const [user, depth] = await Promise.all([optionsUser(request), canSeeDepth(request)]);
  const staff = depth.full;
  const open = staff || Boolean(user);

  const { rank, stream, level, courseOnly, category } = parsed;
  const { states, ownership, branches, maxFee, seatType, home } = open
    ? parsed
    : {
        states: [] as string[],
        ownership: [] as string[],
        branches: [] as string[],
        maxFee: null as number | null,
        seatType: "all" as const,
        home: [] as string[],
      };

  if (user && !staff) {
    const allowed = await allowQuery(user.id, { level, stream, rank, category });
    if (!allowed.ok) {
      return NextResponse.json(
        {
          error:
            `You have checked ${DISTINCT_PER_DAY} different ranks today. ` +
            "Your counsellor can run more for you — or try again tomorrow.",
          code: "rank_limit",
          used: allowed.used,
        },
        { status: 429 },
      );
    }
  }

  // Drawn the same conservative way as /nri-quota/fees and /management-quota:
  // a seat counts only when its own quota label says so, and NRI wins ties.
  const seatTypeFilter =
    seatType === "nri"
      ? sql`AND q.label ILIKE '%NRI%'`
      : seatType === "management"
        ? sql`AND (q.label ILIKE '%management%' OR q.label = 'MNG') AND q.label NOT ILIKE '%NRI%'`
        : sql``;

  try {
    // Every seat whose widest recorded cut could still contain this rank —
    // those it clears in round 1 first and, inside that, the tightest first, so
    // the strongest seats the rank reaches are the ones read.
    const fromWhere = sql`
      FROM seat_options so
      JOIN institutes  i   ON i.id  = so.institute_id
      JOIN courses     c   ON c.id  = so.course_id
      JOIN quotas      q   ON q.id  = so.quota_id
      JOIN categories  cat ON cat.id = so.category_id
      LEFT JOIN states       st ON st.id = i.state_id
      LEFT JOIN counsellings cn ON cn.id = so.counselling_id
      WHERE so.level = ${level}
        AND ${categoryScope({ level, category, seatType, code: sql`cat.code`, quota: sql`q.label` })}
        AND COALESCE(so.furthest_ever, so.widest_latest) >= ${rank}
        ${states.length ? sql`AND st.name IN (${sql.join(states.map((s) => sql`${s}`), sql`, `)})` : sql``}
        ${ownership.length ? sql`AND i.ownership::text IN (${sql.join(ownership.map((o) => sql`${o}`), sql`, `)})` : sql``}
        ${courseOnly ? sql`AND c.name ILIKE ${courseOnly}` : sql``}
        ${
          // The UG source files some MBBS rows under dental and homoeopathy
          // colleges (CLAUDE.md, Known gaps 1); the MBBS directory drops them by
          // name, and so does this — a name is better evidence of the stream.
          courseOnly === "MBBS"
            ? sql`AND i.name !~* '(dental|ayurved|homoeopath|homeopath|nursing|physiothe|veterinar)'`
            : sql``
        }
        ${branches.length ? sql`AND c.name IN (${sql.join(branches.map((b) => sql`${b}`), sql`, `)})` : sql``}
        ${maxFee ? sql`AND (so.fee_inr IS NULL OR so.fee_inr <= ${maxFee})` : sql``}
        ${seatTypeFilter}
        ${
          home.length
            ? sql`AND ${homeStateScope({ home, counselling: sql`cn.name`, quota: sql`q.label`, code: sql`cat.code`, state: sql`st.name` })}`
            : sql``
        }
    `;

    // The counts and the spread are counted over every matching seat, not
    // only the MAX_SCAN read below — ordered by chance, the first 2,500 seats
    // of a mid rank are all "high chance", which reported 2,500 of 2,500 safe.
    const [tally, stateTally] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE so.r1_latest >= ${rank})::int AS safe,
          COUNT(*) FILTER (WHERE COALESCE(so.r1_latest >= ${rank}, false) = false
                             AND so.widest_latest >= ${rank})::int AS likely,
          COUNT(*) FILTER (WHERE COALESCE(so.r1_latest >= ${rank}, false) = false
                             AND COALESCE(so.widest_latest >= ${rank}, false) = false
                             AND so.furthest_ever >= ${rank})::int AS possible,
          COUNT(DISTINCT i.id)::int AS colleges,
          COUNT(DISTINCT st.id)::int AS states,
          COUNT(DISTINCT c.id)::int AS branches,
          COUNT(NULLIF(so.fee_inr, 0))::int AS priced,
          MIN(NULLIF(so.fee_inr, 0)) AS fee_min,
          MAX(NULLIF(so.fee_inr, 0)) AS fee_max
        ${fromWhere}
      `),
      db.execute(sql`
        SELECT st.name AS state, COUNT(DISTINCT i.id)::int AS colleges
        ${fromWhere}
        AND st.name IS NOT NULL
        GROUP BY st.name ORDER BY colleges DESC LIMIT 5
      `),
    ]);
    const t = (tally as unknown as Record<string, number | string | null>[])[0] ?? {};
    const tn = (k: string) => Number(t[k] ?? 0);

    const rows = await db.execute(sql`
      SELECT
        i.name                    AS institute,
        i.slug                    AS institute_slug,
        i.ownership               AS ownership,
        st.name                   AS state,
        c.name                    AS course,
        q.code                    AS quota,
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
      ${fromWhere}
      ORDER BY
        CASE WHEN so.r1_latest >= ${rank} THEN 0 WHEN so.widest_latest >= ${rank} THEN 1 ELSE 2 END,
        COALESCE(so.r1_latest, so.widest_latest) ASC NULLS LAST
      LIMIT ${MAX_SCAN}
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
        ownership: r.ownership as string,
        course: r.course as string,
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

    // Best chance first; inside a chance, the tightest seat first — of
    // everything you reach, a counsellor looks at the best seats first.
    results.sort((a, b) => {
      const d = BAND_ORDER.indexOf(a.band as ChanceBand) - BAND_ORDER.indexOf(b.band as ChanceBand);
      if (d !== 0) return d;
      const ar = a.firstRoundRank ?? a.widestRank ?? Number.MAX_SAFE_INTEGER;
      const br = b.firstRoundRank ?? b.widestRank ?? Number.MAX_SAFE_INTEGER;
      return ar - br;
    });

    const exam = NEET_LIMITS[level];
    const insight = {
      exam: exam.exam,
      appeared: exam.appeared,
      // Share of everyone who sat the paper that this rank is ahead of.
      aheadOf: Math.max(0, Math.min(99.99, Math.round((1 - rank / exam.appeared) * 10000) / 100)),
      topStates: (stateTally as unknown as { state: string; colleges: number }[]).map((x) => ({
        state: x.state,
        colleges: Number(x.colleges),
      })),
    };

    const shape = {
      states: tn("states"),
      colleges: tn("colleges"),
      branches: tn("branches"),
      // Only when enough of the seats publish a fee for the spread to mean
      // something: UG publishes per-seat fees for one year only.
      fee:
        tn("priced") >= Math.max(5, tn("total") * 0.3)
          ? approxFee(Number(t.fee_min), Number(t.fee_max))
          : null,
      // The college list is built from the strongest MAX_SCAN seats.
      capped: results.length === MAX_SCAN,
    };
    const counts = {
      safe: tn("safe"),
      likely: tn("likely"),
      possible: tn("possible"),
      stretch: Math.max(0, tn("total") - tn("safe") - tn("likely") - tn("possible")),
    };

    const options = open
      ? toOptions(
          results.map((r) => ({
            institute: r.institute,
            instituteSlug: r.instituteSlug,
            state: r.state,
            ownership: r.ownership,
            course: r.course,
            band: r.band as ChanceBand,
            feeInr: r.feeInr,
          })),
          level,
        )
      : null;

    if (user && !staff) {
      await logQuery(user.id, { level, stream, rank, category, options: tn("total") }).catch((e) =>
        logError(e, { route: "/api/predict:log", request }),
      );
    }

    return NextResponse.json({
      query: { rank, stream, level, category, states, ownership, branches, maxFee, seatType, home },
      counts,
      total: tn("total"),
      shape,
      insight,
      access: { signedIn: Boolean(user) || staff, verified: Boolean(user), staff },
      options,
      // Staff only — the rows with their ranks, for the counsellor's own use.
      results: staff ? results.slice(0, MAX_RESULTS) : [],
    });
  } catch (error) {
    logError(error, { route: "/api/predict", request });
    return NextResponse.json(
      { error: "Could not read the counselling data. Try again in a moment." },
      { status: 500 },
    );
  }
}
