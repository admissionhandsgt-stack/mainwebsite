import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getStipends } from "@/lib/cutoffHubQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";

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
    title: "NEET PG Stipend State Wise 2026: MD/MS Stipend in Every State",
    description: `Monthly first-year MD/MS stipend in ${s.states.length} states and ${s.colleges.toLocaleString("en-IN")} colleges — government against private, state by state, and the highest-paying colleges. Published figures.`,
    keywords:
      "NEET PG stipend, PG stipend state wise, MD stipend, MS stipend, resident doctor stipend, PG stipend in private medical colleges, stipend in government medical colleges",
  });
}

export default async function StipendPage() {
  const s = await getStipends();
  const top = s.states[0];
  const low = s.states[s.states.length - 1];

  const faqs = [
    {
      question: "What is the NEET PG stipend in India?",
      answer: `Across the ${s.colleges.toLocaleString("en-IN")} PG colleges that publish one, the median first-year stipend is ${inr(s.median)} a month. It varies widely by state and between government and private colleges — the table on this page lists each state.`,
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

      <section className="relative overflow-hidden bg-slate-950">
        <div className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] opacity-50" aria-hidden="true" />
        <div className="container-custom relative py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-slate-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href="/md-ms-india" className="hover:text-white">MD/MS in India</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">Stipend</span>
          </nav>
          <h1 className="font-heading max-w-[26ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            NEET PG stipend, <span className="text-cyan-300">state by state</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            The monthly first-year stipend MD/MS residents are paid, as each college publishes it — government against private,
            in every state.
          </p>
          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { k: "Median, first year / month", v: inr(s.median) },
              { k: "Colleges with a stipend", v: s.colleges.toLocaleString("en-IN") },
              { k: "States", v: String(s.states.length) },
            ].map(({ k, v }) => (
              <div key={k}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="tnum mt-1 text-xl font-bold text-white md:text-2xl">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">PG stipend by state</h2>
        <p className="mt-2 max-w-[70ch] text-muted-foreground">
          First-year stipend per month, median across the state&apos;s colleges that publish one, highest first. States with
          fewer than three such colleges are left out.
        </p>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
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
                  <th scope="row" className="px-4 py-3 font-semibold text-foreground">{r.state}</th>
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

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">Highest PG stipends</h2>
          <p className="mt-2 max-w-[70ch] text-muted-foreground">
            The 25 colleges paying the most in the first year, per month. Open one for its fee, seats and closing ranks.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-left text-sm">
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
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">PG stipend: common questions</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Also: <Link href="/neet-pg-cutoff" className="font-semibold text-primary hover:underline">NEET PG cutoff, branch wise</Link> ·{" "}
          <Link href="/management-quota" className="font-semibold text-primary hover:underline">management quota fees</Link>
        </p>
      </section>

      <LeadCapture
        level="pg"
        source="PG stipend page"
        title="Weighing fee against stipend?"
        body="A counsellor sets each seat's fee, stipend and bond against your rank and budget, so the shortlist is one you can afford for three years."
      />
    </main>
  );
}
