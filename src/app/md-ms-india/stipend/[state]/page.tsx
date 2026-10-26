import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { getStateStipend } from "@/lib/cutoffHubQueries";
import { getPgStates } from "@/lib/pgStateQueries";
import { getBondByState } from "@/lib/pgSeatData";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import SectionHead from "@/components/ui/SectionHead";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import TelegramRoundAlert from "@/components/engage/TelegramRoundAlert";
import { collegeName } from "@/lib/collegeName";

/** The hero chart has room for a name, not an address: "ESIC Medical College, Alwar". The table below keeps the full one. */
const barName = (raw: string) => {
  const { short, place } = collegeName(raw);
  return place && !short.toLowerCase().includes(place.toLowerCase()) ? `${short}, ${place}` : short;
};

/**
 * One state's PG stipend, college by college (2026-10-20): "rajasthan pg stipend", "gujarat pg
 * stipend", "punjab pg stipend" — searched far more than the national question, and until now
 * all answered by /md-ms-india/stipend. Stipends are each college's own latest published monthly
 * figure (lib/cutoffHubQueries.ts, the hub's rule); a state needs three such colleges for a page.
 * The bond box reads pg_seat_terms (third-party, so it carries the caveat). Words from Admin →
 * Content ("Page: PG stipend, one state").
 */

const rupees = (v: number | null | undefined) => (v == null ? "—" : `₹${v.toLocaleString("en-IN")}`);
const big = (v: number | null | undefined) => {
  if (v == null) return "—";
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  if (v >= 1e7) return `₹${trim(v / 1e7)} Cr`;
  if (v >= 1e5) return `₹${trim(v / 1e5)} L`;
  return rupees(v);
};
const years = (y: number | null | undefined) => (y ? `${y} year${y === 1 ? "" : "s"}` : "—");
const OWN: Record<string, string> = { government: "Govt", private: "Private", deemed: "Deemed", other: "Other" };

async function load(slug: string) {
  const state = (await getPgStates()).find((s) => s.slug === slug);
  if (!state) return null;
  const data = await getStateStipend(state.name);
  return data ? { slug: state.slug, data } : null;
}

export async function generateMetadata({ params }: { params: { state: string } }): Promise<Metadata> {
  const page = await load(params.state);
  if (!page) return { title: "State not found", robots: { index: false } };
  const { data: s } = page;
  return resolveMetadata(`/md-ms-india/stipend/${page.slug}`, {
    // "rajasthan pg stipend", "pg stipend in rajasthan", "rajasthan neet pg stipend". No year:
    // the figures are each college's latest published stipend, not one year's.
    title: fitTitle(
      `${s.state} PG Stipend: ${rupees(s.median)} a Month, College Wise`,
      `${s.state} PG Stipend: MD/MS Stipend College Wise`,
      `${s.state} PG Stipend`,
    ),
    description: fitDescription(
      `MD/MS stipend in ${s.state}: median ${rupees(s.median)} a month in year 1 across ${s.colleges} colleges${
        s.govtMedian && s.privateMedian ? ` (govt ${rupees(s.govtMedian)}, private ${rupees(s.privateMedian)})` : ""
      }. Year 1–3 stipend for every college, and the bond.`,
      `MD/MS stipend in ${s.state}: median ${rupees(s.median)} a month across ${s.colleges} colleges, year 1 to 3, college by college.`,
    ),
    keywords: `${s.state} PG stipend, PG stipend in ${s.state}, ${s.state} NEET PG stipend, MD MS stipend ${s.state}, resident doctor stipend ${s.state}`,
  });
}

export default async function StateStipendPage({ params }: { params: { state: string } }) {
  const page = await load(params.state);
  if (!page) notFound();
  const { slug, data: s } = page;
  const path = `/md-ms-india/stipend/${slug}`;
  const bondAll = await getBondByState();
  const bond = bondAll?.states.find((b) => b.state === s.state) ?? null;
  const top = s.list[0];

  const tokens = {
    state: s.state,
    colleges: s.colleges,
    median: rupees(s.median),
    min: rupees(s.min),
    max: rupees(s.max),
    govt_median: rupees(s.govtMedian),
    private_median: rupees(s.privateMedian),
    y2_median: rupees(s.y2Median),
    y3_median: rupees(s.y3Median),
    top_college: top?.name,
    top_stipend: rupees(top?.y1),
    year: bondAll?.year,
    bond_bonded: bond?.govt.withBond,
    bond_colleges: bond?.govt.colleges,
    bond_years: years(bond?.govt.typicalYears),
    bond_penalty: big(bond?.govt.penaltyMedian),
  };
  const [copy, body, heroImage] = await Promise.all([
    pageCopy("page.pg_stipend_state.hero", tokens),
    pageCopy("page.pg_stipend_state.body", tokens),
    pageHeroImage(`page.pg_stipend_state.${slug}.hero`, "page.pg_stipend.hero"),
  ]);

  const showBond = !!bond && bond.govt.colleges > 0;
  const faqs = [
    { question: body.faq1_q, answer: body.faq1_a },
    ...(s.govtMedian && s.privateMedian && s.govtMedian !== s.privateMedian ? [{ question: body.faq2_q, answer: body.faq2_a }] : []),
    ...(top ? [{ question: body.faq3_q, answer: body.faq3_a }] : []),
    ...(s.y2Median && s.y3Median ? [{ question: body.faq4_q, answer: body.faq4_a }] : []),
    ...(showBond && bond!.govt.withBond > 0 && bond!.govt.penaltyMedian ? [{ question: body.faq5_q, answer: body.faq5_a }] : []),
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "PG stipend by state", path: "/md-ms-india/stipend" },
            { name: s.state, path },
          ]),
          webPage({ name: `${s.state} PG stipend, college by college`, description: copy.subtitle, path }),
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "MD/MS in India", href: "/md-ms-india" },
          { label: "Stipend", href: "/md-ms-india/stipend" },
          { label: s.state },
        ]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        image={heroImage}
        topic="money"
        // One block of numbers (2026-10-21): the government and private medians were a tile each and a card;
        // the state's median and its count of colleges lead the cards instead.
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_stipend_state"
        source={copy.source}
        visual={
          <HeroBars
            title={copy.visual_title}
            caption={copy.visual_caption}
            rows={s.list.slice(0, 7).map((c) => ({
              label: barName(c.name),
              value: c.y1,
              display: rupees(c.y1),
              href: `/md-ms-india/colleges/${c.slug}`,
              note: OWN[c.ownership] ?? c.ownership,
            }))}
          />
        }
        insights={[
          { icon: "people" as const, label: "Median / month", value: rupees(s.median), note: `first year · ${s.colleges} colleges & hospitals that publish a stipend` },
          ...(top ? [{ icon: "up" as const, label: "Highest", value: rupees(top.y1), note: top.name }] : []),
          ...(s.govtMedian && s.privateMedian
            ? [{ icon: "compare" as const, label: "Govt vs private", value: `${rupees(s.govtMedian)} vs ${rupees(s.privateMedian)}`, note: "medians, first year, a month" }]
            : s.govtMedian
              ? [{ icon: "authority" as const, label: "Govt median", value: rupees(s.govtMedian), note: "first year, a month" }]
              : s.privateMedian
                ? [{ icon: "college" as const, label: "Private median", value: rupees(s.privateMedian), note: "first year, a month" }]
                : []),
          ...(s.y3Median ? [{ icon: "spark" as const, label: "Year 3 median", value: rupees(s.y3Median), note: `year 1: ${rupees(s.median)}` }] : []),
          ...(showBond && bond!.govt.withBond > 0
            ? [{ icon: "authority" as const, label: "Govt colleges with a bond", value: `${bond!.govt.withBond} of ${bond!.govt.colleges}`, note: `usually ${years(bond!.govt.typicalYears)}` }]
            : []),
        ]}
      />

      {/* -------------------------- every college -------------------------- */}
      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="money" eyebrow={s.state} title={body.table_title} intro={body.table_intro} />
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="dt w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">College</th>
                <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Year 1</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Year 2</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Year 3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {s.list.map((c) => (
                <tr key={c.slug}>
                  <th scope="row" className="px-4 py-2.5 font-medium">
                    <Link href={`/md-ms-india/colleges/${c.slug}`} className="text-foreground hover:text-primary hover:underline">
                      {c.name}
                    </Link>
                  </th>
                  <td className="px-4 py-2.5 text-muted-foreground">{OWN[c.ownership] ?? c.ownership}</td>
                  <td className="tnum px-4 py-2.5 text-right font-semibold">{rupees(c.y1)}</td>
                  <td className="tnum px-4 py-2.5 text-right">{rupees(c.y2)}</td>
                  <td className="tnum px-4 py-2.5 text-right">{rupees(c.y3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <TelegramRoundAlert placement="round_alert_pg_stipend_state" className="pb-10 md:pb-14" />

      <section className="container-custom pb-10 md:pb-14">
        <DataPageCounsel kind="stipend" name={s.state} placement="counsel_stipend_state" />
      </section>

      {/* -------------------------- the bond -------------------------- */}
      {showBond && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="document" eyebrow="Service bond" title={body.bond_title} intro={body.bond_intro} />
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[
                { label: "Government colleges", value: String(bond!.govt.colleges) },
                { label: "With a bond", value: String(bond!.govt.withBond) },
                { label: "Usual length", value: bond!.govt.withBond ? years(bond!.govt.typicalYears) : "No bond listed" },
                { label: "Bond penalty", value: big(bond!.govt.penaltyMedian), sub: bond!.govt.penaltyMedian ? "middle value" : undefined },
                ...(bond!.govt.exitMedian ? [{ label: "Leaving the seat", value: big(bond!.govt.exitMedian), sub: "middle penalty" }] : []),
                ...(bond!.govt.debarYears ? [{ label: "Barred for", value: years(bond!.govt.debarYears), sub: "after leaving a seat" }] : []),
              ].map((f) => (
                <div key={f.label} className="rounded-2xl border border-border bg-card px-4 py-3.5">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{f.label}</dt>
                  <dd className="tnum font-heading mt-1 text-[1.15rem] font-extrabold text-foreground">{f.value}</dd>
                  {"sub" in f && f.sub && <dd className="mt-0.5 text-[12px] text-muted-foreground">{f.sub}</dd>}
                </div>
              ))}
            </dl>
            <p className="mt-4 flex gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-[13.5px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                {copy.source}{" "}
                <Link href={`/md-ms-india/bond#${bond!.anchor}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                  {body.bond_link}
                </Link>
              </span>
            </p>
          </div>
        </section>
      )}

      {/* -------------------------- FAQ -------------------------- */}
      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="help" eyebrow="FAQ" title={body.faq_title} />
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Also:{" "}
          <Link href={`/md-ms-india/states/${slug}`} className="font-semibold text-primary-strong hover:underline">
            MD/MS in {s.state}: colleges, cutoff and fees
          </Link>{" "}
          ·{" "}
          <Link href="/md-ms-india/stipend" className="font-semibold text-primary-strong hover:underline">
            PG stipend in every state
          </Link>{" "}
          ·{" "}
          <Link href="/md-ms-india/bond" className="font-semibold text-primary-strong hover:underline">
            PG bond by state
          </Link>
        </p>
      </section>

      <LeadCapture level="pg" source={`PG stipend page (${s.state})`} title={body.lead_title} body={body.lead_body} />
      <TelegramJoin placement="pg_stipend_state" />
    </main>
  );
}
