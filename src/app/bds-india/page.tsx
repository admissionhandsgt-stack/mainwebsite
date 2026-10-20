import CiteThis from "@/components/seo/CiteThis";
import type { Metadata } from "next";
import { fitTitle, fitDescription } from "@/lib/seoTitle";
import Link from "@/components/ui/Link";
import { getBdsColleges, getUgAiqCuts, type YearCuts } from "@/lib/cutoffHubQueries";
import { resolveMetadata } from "@/lib/content";
import CategoryCutTable from "@/components/cutoffs/CategoryCutTable";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";

import SectionHead from "@/components/ui/SectionHead";
import OpenOnHash from "@/components/ui/OpenOnHash";
import { ChevronDown, MapPin } from "lucide-react";

const stateSlug = (s: string) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/**
 * BDS had 326 colleges and 3,244 seat options in the data, and no page — the
 * predictor offered BDS, but "BDS colleges in India" and "BDS cutoff" found
 * nothing here. Every college links to its own page (which carries its rows
 * behind the gate); this page holds only counts and category ranges.
 */

const PATH = "/bds-india";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const complete = (years: YearCuts[]) => years.find((y) => y.rounds.includes("R3")) ?? years[0];

export async function generateMetadata(): Promise<Metadata> {
  const [{ colleges }, years] = await Promise.all([getBdsColleges(), getUgAiqCuts("BDS")]);
  const year = complete(years);
  const ur = year?.categories.find((c) => c.category === "UR");
  const y = year?.year ? ` ${year.year}` : "";
  // Searched as "bds cut off 2026 for government colleges", "bds seats in
  // india", "bds cutoff": the AIQ figure is the page's own FAQ answer.
  return resolveMetadata(PATH, {
    title: fitTitle(
      `BDS Cutoff${y}: AIQ Closing Ranks & All ${colleges.length} BDS Colleges`,
      `BDS Cutoff${y} & ${colleges.length} BDS Colleges in India`,
      `BDS Colleges in India: Cutoff${y} & Counselling`,
    ),
    description: fitDescription(
      ...(ur && ur.bestR1 && ur.widest
        ? [
            `NEET BDS cutoff${y}: All India Quota general seats closed from AIR ${ur.bestR1.toLocaleString("en-IN")} (round 1) to ${ur.widest.toLocaleString("en-IN")} (last admitted). All ${colleges.length} BDS colleges in India, state by state.`,
            `NEET BDS cutoff${y}: AIQ general seats closed from AIR ${ur.bestR1.toLocaleString("en-IN")} (round 1) to ${ur.widest.toLocaleString("en-IN")} (last admitted). ${colleges.length} BDS colleges.`,
          ]
        : []),
      `All ${colleges.length} BDS colleges with published NEET closing ranks, state by state, and the All India Quota BDS cutoff by category.`,
    ),
    keywords: "BDS colleges in India, BDS cutoff, BDS cutoff 2025, NEET cutoff for BDS, government dental colleges, BDS admission, dental colleges in India",
  });
}

export default async function BdsPage() {
  const [{ colleges, counsellings }, years] = await Promise.all([getBdsColleges(), getUgAiqCuts("BDS")]);
  const year = complete(years);
  const ur = year?.categories.find((c) => c.category === "UR");

  const byState = new Map<string, typeof colleges>();
  for (const c of colleges) {
    const k = c.state ?? "Other";
    byState.set(k, [...(byState.get(k) ?? []), c]);
  }
  const states = [...byState.entries()].sort((a, b) => b[1].length - a[1].length);
  // Words from Admin → Content → Text & numbers ("Page: BDS colleges"); photo from Admin → Media.
  const [copy, heroImage] = await Promise.all([pageCopy("page.bds.hero", { year: year?.year ?? "" }), pageHeroImage("page.bds.hero")]);

  const faqs = [
    {
      question: "How many BDS colleges are there in India?",
      answer: `We list ${colleges.length} BDS colleges with published NEET closing ranks, across ${states.length} states. ${states
        .slice(0, 3)
        .map(([s, l]) => `${s} has ${l.length}`)
        .join(", ")}.`,
    },
    ...(ur && year
      ? [
          {
            question: `What NEET rank is needed for BDS in a government college?`,
            answer: `In ${year.year}, All India Quota BDS seats for the general category closed between AIR ${n(ur.bestR1)} (round 1, the tightest) and AIR ${n(ur.widest)} (the last admitted, any round). State quota seats close on each state's own merit list.`,
          },
        ]
      : []),
    {
      question: "Which counselling fills BDS seats?",
      answer: `In the published results: ${counsellings
        .slice(0, 6)
        .map((c) => `${c.name} (${c.colleges} colleges)`)
        .join(", ")}. MCC fills the All India Quota and deemed universities; each state fills its own quota and its private colleges.`,
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "BDS in India", path: PATH },
          ]),
          webPage({ name: "BDS colleges in India", description: "Every BDS college with published counselling results, and the BDS cutoff.", path: PATH }),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "BDS colleges in India",
            numberOfItems: colleges.length,
            itemListElement: colleges.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.name,
              url: `https://www.admissionhands.com/mbbs-india/colleges/${c.slug}`,
            })),
          },
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "BDS in India" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "BDS colleges", value: n(colleges.length) },
          { label: "States", value: n(states.length) },
          ...(ur ? [{ label: "General, last AIR", value: n(ur.widest), note: `All India Quota, ${year?.year}` }] : []),
        ]}
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=bds" }}
        telegram="hero_bds"
        source={copy.source}
        image={heroImage}
        topic="course"
        visual={
          <HeroBars
            title={copy.visual_title}
            caption="Dental colleges with published NEET closing ranks"
            rows={states.slice(0, 7).map(([state, list]) => ({
              label: state,
              value: list.length,
              display: `${list.length} ${list.length === 1 ? "college" : "colleges"}`,
            }))}
            footnote={states.length > 7 ? `And ${states.length - 7} more states — every college is listed below.` : undefined}
          />
        }
      />

      {year && (
        <section className="container-custom py-10 md:py-14">
          <SectionHead
            icon="chart"
            title={<>BDS cutoff {year.year} — All India Quota</>}
            intro={<>15% of government dental college seats, filled by MCC on All India Rank. Every round of {year.year}.{" "} <Link href="/neet-ug-cutoff" className="font-semibold text-primary-strong hover:underline">MBBS cutoff →</Link></>}
          />
          <div className="mt-5">
            <CategoryCutTable cuts={year.categories} />
          </div>
        </section>
      )}

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <SectionHead
            icon="college"
            title={<>BDS colleges, state by state</>}
            intro={<>Open a college for its fees, seat options and its general-category cutoff band.</>}
          />
          {/* One fold per state, the largest open — 326 colleges were 14,800px of page (2026-10-18). */}
          <OpenOnHash />
          <nav aria-label="Jump to a state" className="mt-6 flex flex-wrap gap-2">
            {states.map(([state, list]) => (
              <a
                key={state}
                href={`#${stateSlug(state)}`}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:border-primary/50"
              >
                {state} <span className="tnum text-muted-foreground">{list.length}</span>
              </a>
            ))}
          </nav>
          <div className="mt-6 space-y-3">
            {states.map(([state, list], i) => (
              <details
                key={state}
                id={stateSlug(state)}
                open={i === 0}
                className="group/state scroll-mt-28 rounded-3xl border border-border bg-card/60 open:bg-background"
              >
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <h3 className="flex min-w-0 items-baseline gap-2 font-heading text-[1.05rem] font-bold text-foreground md:text-lg">
                    <MapPin className="h-4 w-4 shrink-0 self-center text-primary" aria-hidden="true" />
                    BDS colleges in {state}
                    <span className="tnum text-[13px] font-normal text-muted-foreground">· {list.length}</span>
                  </h3>
                  <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open/state:rotate-180" aria-hidden="true" />
                </summary>
                <ul className="grid gap-2 px-3 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5 lg:grid-cols-3">
                  {list.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/mbbs-india/colleges/${c.slug}`}
                        className="flex h-full flex-col rounded-xl border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary"
                      >
                        <span className="font-medium text-foreground">{c.name}</span>
                        {c.established && <span className="text-[12px] text-muted-foreground">Est. {c.established}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <SectionHead
          icon="help"
          title={<>BDS: common questions</>}
        />
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="container-custom pb-10">
        <CiteThis title={"BDS colleges and cutoff in India"} path="/bds-india" source={"MCC's All India Quota results"} />
      </section>

      <LeadCapture
        level="ug"
        source="BDS colleges page"
        title="Deciding between BDS seats?"
        body="A counsellor orders your BDS and MBBS choices against the published closing ranks and your budget, through every round."
      />
      <TelegramJoin placement="bds_india" />
    </main>
  );
}
