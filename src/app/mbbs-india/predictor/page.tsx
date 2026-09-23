import type { Metadata } from "next";
import { resolveMetadata, getMediaAsset } from "@/lib/content";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import PageHero from "@/components/ui/PageHero";
import PredictorClient from "@/components/predictor/PredictorClient";
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic";

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/mbbs-india/predictor", {
    title: "NEET UG College Predictor | AdmissionHands",
    description:
      "Enter your NEET UG rank and see every MBBS seat it reaches, split into safe, likely, possible and stretch — each backed by the published closing rank it came from.",
  });
}

interface Facets {
  states: string[];
  categories: { code: string; label: string }[];
  seatCount: number;
  rankCount: number;
  years: number[];
}

/**
 * Filter options come from the data itself rather than a hardcoded list, so a
 * re-import that adds a state or a category scheme shows up without a deploy.
 */
async function getFacets(): Promise<Facets> {
  try {
    const [stateRows, catRows, seatRows, rankRows, yearRows] = await Promise.all([
      db.execute(sql`
        SELECT DISTINCT st.name
        FROM seat_options so
        JOIN institutes i ON i.id = so.institute_id
        JOIN states st ON st.id = i.state_id
        WHERE so.level = 'ug'
        ORDER BY st.name
      `),
      db.execute(sql`
        SELECT cat.code, COUNT(*)::int AS n
        FROM seat_options so
        JOIN categories cat ON cat.id = so.category_id
        WHERE so.level = 'ug'
        GROUP BY cat.code
        ORDER BY n DESC
        LIMIT 12
      `),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM seat_options WHERE level = 'ug'`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM closing_ranks WHERE level = 'ug'`),
      db.execute(sql`SELECT DISTINCT year FROM closing_ranks WHERE level = 'ug' ORDER BY year`),
    ]);

    const rows = <T,>(r: unknown) => r as unknown as T[];

    return {
      states: rows<{ name: string }>(stateRows).map((r) => r.name),
      categories: rows<{ code: string }>(catRows).map((r) => ({ code: r.code, label: r.code })),
      seatCount: rows<{ n: number }>(seatRows)[0]?.n ?? 0,
      rankCount: rows<{ n: number }>(rankRows)[0]?.n ?? 0,
      years: rows<{ year: number }>(yearRows).map((r) => r.year),
    };
  } catch (error) {
    // The page still works without facets — the rank box is the only required
    // input — so a database hiccup degrades the filters rather than the page.
    console.error("[ug predictor facets]", error);
    return { states: [], categories: [{ code: "UR", label: "UR" }], seatCount: 0, rankCount: 0, years: [] };
  }
}

export default async function UgPredictorPage() {
  // The hero came through a hardcoded path that no file sat at, so the page
  // shipped with a 400 where its image should be. It is a CMS asset like
  // every other hero — resolve it, and the admin can change it too.
  const [facets, heroImage] = await Promise.all([
    getFacets(),
    getMediaAsset("mbbs_hero_campus"),
  ]);

  const yearLabel =
    facets.years.length === 0
      ? "—"
      : facets.years.length === 1
        ? String(facets.years[0])
        : `${facets.years[0]}–${String(facets.years[facets.years.length - 1]).slice(2)}`;

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          webPage({
            name: "NEET UG College Predictor",
            description:
              "Enter your NEET UG rank and see every MBBS seat it reaches, backed by published closing ranks.",
            path: "/mbbs-india/predictor",
          }),
          breadcrumb([{ name: "Home", path: "/" }, { name: "MBBS India", path: "/mbbs-india" }, { name: "Seat predictor", path: "/mbbs-india/predictor" }]),
        ]}
      />
      <PageHero
        eyebrow="NEET UG 2026"
        eyebrowIcon="target"
        title="Enter your rank."
        titleAccent="See the MBBS seats it reaches."
        subtitle="Every seat is placed against the round it actually closed in — round 1, the widest the cut went that year, and how far it has ever reached. No estimates, no scores invented to look precise."
        image={
          heroImage?.imageUrl && heroImage.imageUrl !== "none"
            ? heroImage.imageUrl
            : "/assets/images/hero/neet-hero.avif"
        }
        tone="dark"
        stats={[
          { value: facets.rankCount.toLocaleString("en-IN"), label: "Closing ranks" },
          { value: facets.seatCount.toLocaleString("en-IN"), label: "Seats covered" },
          { value: yearLabel, label: "Years published" },
          { value: String(facets.states.length || "—"), label: "States" },
        ]}
      />

      <PredictorClient
        level="ug"
        states={facets.states}
        categories={facets.categories}
        seatCount={facets.seatCount}
        rankCount={facets.rankCount}
      />
    </main>
  );
}
