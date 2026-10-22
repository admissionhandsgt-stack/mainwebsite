import { fitDescription, fitTitle } from "@/lib/seoTitle";
import CiteThis from "@/components/seo/CiteThis";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getStipends } from "@/lib/cutoffHubQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import HeroBars from "@/components/hero/HeroBars";
import { getPgStates } from "@/lib/pgStateQueries";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";

/**
 * "NEET PG stipend state wise" — one of the most-searched PG money questions,
 * and the data was already here: a published first-year stipend for ~2,000 PG
 * colleges, which only ever appeared one college at a time. Monthly figures
 * only (see LATEST_STIPEND). Stipend is a college-level fact, not a seat, so
 * a state's median and range are honest summaries.
 */

const PATH = "/md-ms-india/stipend";
const inr = (v: number | null | undefined) => (v == null ? "—" : `₹${v.toLocaleString("en-IN")}`);
const OWN: Record<string, string> = { government: "Govt", private: "Private", deemed: "Deemed", other: "—" };

export async function generateMetadata(): Promise<Metadata> {
  const s = await getStipends();
  return resolveMetadata(PATH, {
    // Searched as "rajasthan pg stipend", "highest pg stipend in india", "stipend
    // for pg medical students state wise". No year: the figures are each
    // college's latest published stipend, not one year's.
    title: fitTitle(
      "NEET PG Stipend State Wise: Highest MD/MS Stipend in India",
      "PG Stipend State Wise: Highest MD/MS Stipend",
    ),
    description: fitDescription(
      ...(s.states[0]
        ? [
            `Highest PG stipend: ${s.states[0].state}, median ${inr(s.states[0].median)} a month. First-year MD/MS stipend state wise for ${s.states.length} states and ${s.colleges.toLocaleString("en-IN")} colleges, government vs private.`,
            `Highest PG stipend: ${s.states[0].state}, median ${inr(s.states[0].median)} a month. MD/MS stipend state wise for ${s.states.length} states, government vs private.`,
          ]
        : []),
      `Monthly first-year MD/MS stipend in ${s.states.length} states and ${s.colleges.toLocaleString("en-IN")} colleges — government against private, and the highest-paying colleges.`,
    ),
    keywords:
      "NEET PG stipend, PG stipend state wise, MD stipend, MS stipend, resident doctor stipend, PG stipend in private medical colleges, stipend in government medical colleges",
  });
}

export default async function StipendPage() {
  const [s, pgStates] = await Promise.all([getStipends(), getPgStates()]);
  const stateSlug = new Map(pgStates.map((p) => [p.name, p.slug]));
  const top = s.states[0];
  const low = s.states[s.states.length - 1];
  // Words from Admin → Content → Text & numbers ("Page: PG stipend"); photo from Admin → Media.
  const [copy, heroImage] = await Promise.all([
    pageCopy("page.pg_stipend.hero"),
    pageHeroImage("page.pg_stipend.hero"),
  ]);

  const faqs = [
    {
      question: "What is the NEET PG stipend in India?",
      answer: `Across the ${s.colleges.toLocaleString("en-IN")} colleges and DNB hospitals that publish one, the median first-year stipend is ${inr(s.median)} a month. It varies widely by state and between government and private colleges — the table on this page lists each state.`,
    },
    ...(top && low
      ? [
          {
            question: "Which state pays the highest PG stipend?",
            answer: `By median first-year stipend among colleges that publish one, ${top.state} is highest at ${inr(top.median)} a month and ${low.state} lowest at ${inr(low.median)}. A state's government and private colleges often differ widely, so compare the two columns.`,
          },
        ]
      : []),
    {
      question: "Do private medical colleges pay a PG stipend?",
      answer:
        "Many do, but less consistently than government colleges, and some publish none. Where a private college publishes its stipend it is on its own page here, beside its fee — set the two against each other before choosing a seat.",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "PG stipend by state", path: PATH },
          ]),
          webPage({ name: "NEET PG stipend, state wise", description: "Monthly first-year MD/MS stipend by state.", path: PATH }),
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "Stipend" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        image={heroImage}
        topic="money"
        // One block of numbers (2026-10-21): the stat tiles repeated the highest state, so the national median
        // and its counts lead the insight cards instead.
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_stipend"
        source={copy.source}
        visual={
          <HeroBars
            title={copy.visual_title}
            caption="Median first-year stipend a month"
            rows={s.states.slice(0, 7).map((r) => ({
              label: r.state,
              value: r.median,
              display: inr(r.median),
              href: stateSlug.get(r.state) ? `/md-ms-india/stipend/${stateSlug.get(r.state)}` : undefined,
              note: `${r.colleges} colleges${r.govtMedian ? ` · govt ${inr(r.govtMedian)}` : ""}`,
            }))}
            footnote={low ? `Lowest: ${low.state}, ${inr(low.median)} a month. Every state is in the table below.` : undefined}
          />
        }
        insights={[
          {
            icon: "people" as const,
            label: "Median / month, all India",
            value: inr(s.median),
            note: `first year · ${s.colleges.toLocaleString("en-IN")} colleges & hospitals that publish a stipend, in ${s.states.length} states`,
          },
          ...(top ? [{ icon: "up" as const, label: "Highest median", value: inr(top.median), note: `${top.state} · ${top.colleges} colleges` }] : []),
          ...(s.govtMedian && s.privateMedian
            ? [{ icon: "compare" as const, label: "Govt vs private", value: `${inr(s.govtMedian)} vs ${inr(s.privateMedian)}`, note: "All-India medians, first year, a month" }]
            : []),
          ...(low ? [{ icon: "down" as const, label: "Lowest median", value: inr(low.median), note: `${low.state} · ${low.colleges} colleges` }] : []),
        ]}
      />

      <section className="container-custom py-10 md:py-14">
        <SectionHead
          icon="money"
          eyebrow="State by state"
          title="PG stipend by state"
          intro="First-year stipend per month, median across the state's colleges that publish one, highest first. States with fewer than three such colleges are left out."
        />
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="dt w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">State</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Median</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Govt median</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Private median</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {s.states.map((r) => (
                <tr key={r.state}>
                  <th scope="row" className="px-4 py-3 font-semibold text-foreground">
                    {/* Each state's own page lists every college in it (2026-10-20). */}
                    {stateSlug.get(r.state) ? (
                      <Link href={`/md-ms-india/stipend/${stateSlug.get(r.state)}`} className="hover:text-primary hover:underline">
                        {r.state}
                      </Link>
                    ) : (
                      r.state
                    )}
                  </th>
                  <td className="tnum px-4 py-3 text-right text-muted-foreground">{r.colleges}</td>
                  <td className="tnum px-4 py-3 text-right font-semibold">{inr(r.median)}</td>
                  <td className="tnum px-4 py-3 text-right">{inr(r.govtMedian)}</td>
                  <td className="tnum px-4 py-3 text-right">{inr(r.privateMedian)}</td>
                  <td className="tnum px-4 py-3 text-right text-muted-foreground">
                    {inr(r.min)} – {inr(r.max)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="container-custom pb-10 md:pb-14">
        <DataPageCounsel kind="stipend" placement="counsel_stipend" />
      </section>

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <SectionHead icon="trend" eyebrow="Top 25" title="Highest PG stipends" />
          <p className="mt-2 max-w-[70ch] text-muted-foreground">
            The 25 colleges paying the most in the first year, per month. Open one for its fee, seats and closing ranks.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
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
                {s.top.map((c) => (
                  <tr key={c.slug}>
                    <th scope="row" className="px-4 py-3 font-medium">
                      <Link href={`/md-ms-india/colleges/${c.slug}`} className="text-foreground hover:text-primary hover:underline">
                        {c.name}
                      </Link>
                      {c.state && <span className="block text-[12px] font-normal text-muted-foreground">{c.state}</span>}
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">{OWN[c.ownership] ?? c.ownership}</td>
                    <td className="tnum px-4 py-3 text-right font-semibold">{inr(c.y1)}</td>
                    <td className="tnum px-4 py-3 text-right">{inr(c.y2)}</td>
                    <td className="tnum px-4 py-3 text-right">{inr(c.y3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="help" eyebrow="FAQ" title="PG stipend: common questions" />
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Also: <Link href="/neet-pg-cutoff" className="font-semibold text-primary-strong hover:underline">NEET PG cutoff, branch wise</Link> ·{" "}
          <Link href="/management-quota" className="font-semibold text-primary-strong hover:underline">management quota fees</Link>
        </p>
      </section>

      <section className="container-custom pb-10">
        <CiteThis title={"NEET PG stipend by state"} path="/md-ms-india/stipend" source={"colleges' published PG stipends"} />
      </section>

      <LeadCapture
        level="pg"
        source="PG stipend page"
        title="Weighing fee against stipend?"
        body="A counsellor sets each seat's fee, stipend and bond against your rank and budget, so the shortlist is one you can afford for three years."
      />
      <TelegramJoin placement="pg_stipend" />
    </main>
  );
}
