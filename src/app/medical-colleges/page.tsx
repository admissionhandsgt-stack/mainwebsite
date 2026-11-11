import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { getCityIndex } from "@/lib/cityQueries";
import StructuredData, { breadcrumb, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import LeadCapture from "@/components/lead/LeadCapture";

/**
 * Medical colleges by city — the index of the city pages (2026-11-11). Indexed cities only (5+ MD/MS colleges, 3+ with
 * a yearly fee), grouped by state, with live counts. Words: Admin → Content → "Page: medical colleges by city".
 */

const PATH = "/medical-colleges";

export async function generateMetadata(): Promise<Metadata> {
  const cities = (await getCityIndex().catch(() => [])).filter((c) => c.indexable);
  return resolveMetadata(PATH, {
    title: "Medical Colleges by City in India: PG Fees, MD/MS & MBBS Seats",
    description: `${cities.length} Indian cities with five or more MD/MS colleges — each with every college's 2026-27 PG fee, NMC seats, stipend, bond and branches.`,
    keywords: "medical colleges by city, pg fees city wise, md ms colleges in city, medical colleges in bangalore, medical colleges in pune, medical colleges in delhi",
  });
}

export default async function CityHub() {
  const cities = (await getCityIndex().catch(() => [])).filter((c) => c.indexable);
  const colleges = cities.reduce((s, c) => s + c.mdms, 0);
  const [c, heroImage] = await Promise.all([pageCopy("page.city_hub", { cities: cities.length, colleges }), pageHeroImage("page.city.hero")]);
  const byState = new Map<string, typeof cities>();
  for (const x of cities) byState.set(x.state, [...(byState.get(x.state) ?? []), x]);
  const states = [...byState].sort((a, b) => b[1].reduce((s, x) => s + x.mdms, 0) - a[1].reduce((s, x) => s + x.mdms, 0));

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "Medical colleges by city", path: PATH },
          ]),
          webPage({ name: "Medical colleges by city", description: c.subtitle, path: PATH }),
        ]}
      />
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "By city" }]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={c.accent}
        subtitle={c.subtitle}
        image={heroImage}
        topic="map"
        cta={{ label: "Check your chance by rank", href: "/neet-college-predictor?course=pg" }}
        telegram="hero_city_hub"
      />
      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="map" eyebrow={`${cities.length} cities`} title="Pick a city" />
        <div className="mt-6 lg:columns-2 [&>div]:break-inside-avoid">
          {states.map(([state, list]) => (
            <div key={state} className="mb-4 rounded-2xl border border-border bg-card p-5">
              <h2 className="font-heading text-[17px] font-bold text-foreground">{state}</h2>
              <ul className="mt-3 space-y-2">
                {list.map((x) => (
                  <li key={x.slug} className="flex items-baseline justify-between gap-4">
                    <Link href={`/medical-colleges/${x.slug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                      Medical colleges in {x.name}
                    </Link>
                    <span className="tnum shrink-0 text-[13px] text-muted-foreground">
                      {x.mdms} MD/MS{x.mbbs ? ` · ${x.mbbs} MBBS` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <LeadCapture level="pg" source="City index" title="Choosing between cities?" body="Tell us your rank and budget; a counsellor sets the colleges of each city against your quota and fee." />
    </main>
  );
}
