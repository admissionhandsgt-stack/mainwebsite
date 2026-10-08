import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { Search } from "lucide-react";
import { getBdsColleges, getUgAiqCuts, type YearCuts } from "@/lib/cutoffHubQueries";
import { resolveMetadata } from "@/lib/content";
import CategoryCutTable from "@/components/cutoffs/CategoryCutTable";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";

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
  const { colleges } = await getBdsColleges();
  return resolveMetadata(PATH, {
    title: `BDS Colleges in India 2026: ${colleges.length} Colleges, Cutoff & Counselling`,
    description: `All ${colleges.length} BDS colleges with published NEET closing ranks, state by state, and the All India Quota BDS cutoff by category. Published counselling data.`,
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
          webPage({ name: "BDS colleges in India", description: "Every BDS college with published closing ranks, and the BDS cutoff.", path: PATH }),
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

      <section className="relative overflow-hidden bg-slate-950">
        <div className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] opacity-50" aria-hidden="true" />
        <div className="container-custom relative py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-slate-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">BDS in India</span>
          </nav>
          <h1 className="font-heading max-w-[26ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            BDS colleges in India: <span className="text-cyan-300">cutoff and counselling</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            Every dental college with published NEET closing ranks, state by state — and where All India Quota BDS seats ran out
            in each category.
          </p>
          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { k: "BDS colleges", v: n(colleges.length) },
              { k: "States", v: n(states.length) },
              ...(ur ? [{ k: `General, last AIR ${year?.year}`, v: n(ur.widest) }] : []),
            ].map(({ k, v }) => (
              <div key={k}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="tnum mt-1 text-xl font-bold text-white md:text-2xl">{v}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/neet-college-predictor?course=bds"
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            <Search className="h-4 w-4" aria-hidden="true" /> Check which BDS seats your rank reaches
          </Link>
        </div>
      </section>

      {year && (
        <section className="container-custom py-10 md:py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            BDS cutoff {year.year} — All India Quota
          </h2>
          <p className="mt-2 max-w-[70ch] text-muted-foreground">
            15% of government dental college seats, filled by MCC on All India Rank. Every round of {year.year}.{" "}
            <Link href="/neet-ug-cutoff" className="font-semibold text-primary hover:underline">MBBS cutoff →</Link>
          </p>
          <div className="mt-5">
            <CategoryCutTable cuts={year.categories} />
          </div>
        </section>
      )}

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">BDS colleges, state by state</h2>
          <p className="mt-2 max-w-[70ch] text-muted-foreground">Open a college for its closing ranks by quota and category.</p>
          <div className="mt-6 space-y-8">
            {states.map(([state, list]) => (
              <div key={state}>
                <h3 className="text-lg font-semibold text-foreground">
                  BDS colleges in {state} <span className="tnum text-sm font-normal text-muted-foreground">· {list.length}</span>
                </h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">BDS: common questions</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <LeadCapture
        level="ug"
        source="BDS colleges page"
        title="Deciding between BDS seats?"
        body="A counsellor orders your BDS and MBBS choices against the published closing ranks and your budget, through every round."
      />
    </main>
  );
}
