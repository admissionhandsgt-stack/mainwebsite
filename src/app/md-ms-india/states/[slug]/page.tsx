import { fitTitle, count } from "@/lib/seoTitle";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";
import { getPgStatePage, getPgStates } from "@/lib/pgStateQueries";
import { getStipends } from "@/lib/cutoffHubQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";

/** One state's PG picture. See lib/pgStateQueries.ts for what it will and will not state. */

type Props = { params: { slug: string } };
const SITE = "https://www.admissionhands.com";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const money = (v: number | null) => {
  if (v == null) return "—";
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};
const span = (a: number | null, b: number | null, f: (v: number | null) => string) =>
  a == null && b == null ? "—" : a === b || b == null ? f(a) : a == null ? f(b) : `${f(a)} – ${f(b)}`;
const OWN: Record<string, string> = { government: "Government", private: "Private", deemed: "Deemed", other: "Other" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPgStatePage(params.slug);
  if (!p) return { title: "State not found", robots: { index: false } };
  return resolveMetadata(`/md-ms-india/states/${p.slug}`, {
    title: fitTitle(
      `MD/MS in ${p.name}: ${count(p.colleges.length, "PG College", "PG Colleges")}, NEET PG Cutoff & Fees`,
      `MD/MS in ${p.name}: NEET PG Cutoff & Fees`,
      `PG Seats in ${p.name}: NEET PG Cutoff`,
      `PG Seats in ${p.name}`,
    ),
    description: `${p.colleges.length} PG medical colleges in ${p.name} — NEET PG closing ranks and fees by quota${p.year ? ` (${p.year})` : ""}, the counselling that fills each seat, branches and stipend.`,
    keywords: `PG seats in ${p.name}, NEET PG cutoff ${p.name}, MD MS colleges in ${p.name}, ${p.name} PG counselling, ${p.name} NEET PG fees`,
  });
}

export default async function PgStatePage({ params }: Props) {
  const [p, stipends, all] = await Promise.all([getPgStatePage(params.slug), getStipends(), getPgStates()]);
  if (!p) notFound();
  const path = `/md-ms-india/states/${p.slug}`;
  const stipend = stipends.states.find((s) => s.state === p.name);
  const own = Object.entries(p.ownership).sort((a, b) => b[1] - a[1]);
  const stateQuota = p.quotas.find((q) => !/^(AIQ|DNB|NBE|MNG|MM|AFMS|NRI)/i.test(q.quota) && !/all india/i.test(q.counselling));

  const faqs = [
    {
      question: `How many PG medical colleges are there in ${p.name}?`,
      answer: `${p.colleges.length} colleges in ${p.name} have published NEET PG closing ranks: ${own.map(([k, v]) => `${v} ${OWN[k]?.toLowerCase() ?? k}`).join(", ")}.`,
    },
    {
      question: `Which counselling fills PG seats in ${p.name}?`,
      answer: `In the published results: ${p.counsellings.slice(0, 5).map((c) => `${c.name} (${c.colleges} colleges)`).join(", ")}. MCC fills the All India Quota, deemed and central seats; the state fills its own quota and its private colleges.`,
    },
    ...(stateQuota && p.year
      ? [
          {
            question: `What was the NEET PG ${p.year} cutoff for ${p.name} state quota?`,
            answer: `For ${stateQuota.quota}, open / general merit, seats closed from rank ${n(stateQuota.bestR1)} in round 1 to ${n(stateQuota.widest)} at the furthest, across ${stateQuota.colleges} colleges. Each college and branch closed somewhere in between — its own page shows where.`,
          },
        ]
      : []),
    ...(stipend
      ? [
          {
            question: `What is the PG stipend in ${p.name}?`,
            answer: `The median first-year stipend among ${p.name}'s PG colleges that publish one is ₹${stipend.median.toLocaleString("en-IN")} a month${stipend.govtMedian ? ` (government ₹${stipend.govtMedian.toLocaleString("en-IN")})` : ""}${stipend.privateMedian ? `, private ₹${stipend.privateMedian.toLocaleString("en-IN")}` : ""}.`,
          },
        ]
      : []),
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "PG by state", path: "/md-ms-india/states" },
            { name: p.name, path },
          ]),
          webPage({ name: `MD/MS in ${p.name}`, description: `PG medical colleges, cutoffs and fees in ${p.name}.`, path }),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `PG medical colleges in ${p.name}`,
            numberOfItems: p.colleges.length,
            itemListElement: p.colleges.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.name,
              url: `${SITE}/md-ms-india/colleges/${c.slug}`,
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
            <Link href="/md-ms-india/states" className="hover:text-white">PG by state</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">{p.name}</span>
          </nav>
          <h1 className="font-heading max-w-[26ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            MD/MS in {p.name}: <span className="text-cyan-300">seats, cutoff and fees</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            Every PG medical college in {p.name} with published NEET PG closing ranks, the counselling that fills its seats,
            and where each quota closed{p.year ? ` in ${p.year}` : ""}.
          </p>
          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "PG colleges", v: n(p.colleges.length) },
              ...own.slice(0, 2).map(([k, v]) => ({ k: OWN[k] ?? k, v: n(v) })),
              { k: "Stipend, median / month", v: stipend ? `₹${stipend.median.toLocaleString("en-IN")}` : "—" },
            ].map(({ k, v }) => (
              <div key={k}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="tnum mt-1 text-xl font-bold text-white md:text-2xl">{v}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/neet-college-predictor?course=pg"
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            <Search className="h-4 w-4" aria-hidden="true" /> Enter your PG rank — see every seat it reaches
          </Link>
        </div>
      </section>

      {p.quotas.length > 0 && (
        <section className="container-custom py-10 md:py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            NEET PG {p.year} cutoff in {p.name}, by quota
          </h2>
          <p className="mt-2 max-w-[72ch] text-muted-foreground">
            Open / general merit, in each counselling&apos;s own category code. The rank range and the fee range are separate:
            each is the lowest and highest across the quota&apos;s colleges, so the cheapest fee is not the seat with the furthest rank.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Quota</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Round 1 close</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Last admitted</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Fee a year, range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {p.quotas.map((q) => (
                  <tr key={q.quota}>
                    <th scope="row" className="px-4 py-3 font-medium text-foreground">
                      {q.quota}
                      <span className="block text-[12px] font-normal text-muted-foreground">{q.counselling}</span>
                    </th>
                    <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(q.colleges)}</td>
                    <td className="tnum px-4 py-3 text-right">{n(q.bestR1)}</td>
                    <td className="tnum px-4 py-3 text-right font-semibold">{n(q.widest)}</td>
                    <td className="tnum px-4 py-3 text-right text-muted-foreground">{span(q.feeFrom, q.feeTo, money)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">
            Which college closed where is on each college&apos;s own page.{" "}
            <Link href="/neet-pg-cutoff" className="font-semibold text-primary hover:underline">All-India cutoff, branch wise →</Link>
          </p>
        </section>
      )}

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">PG branches in {p.name}</h2>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {p.branches.map((b) => (
              <li key={b.name}>
                <Link
                  href={`/md-ms-india/branches/${b.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary"
                >
                  <span className="font-medium text-foreground">{b.name}</span>
                  <span className="tnum shrink-0 text-[12px] text-muted-foreground">{b.colleges} colleges</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">PG medical colleges in {p.name}</h2>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {p.colleges.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/md-ms-india/colleges/${c.slug}`}
                className="flex h-full flex-col rounded-xl border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary"
              >
                <span className="font-medium text-foreground">{c.name}</span>
                <span className="text-[12px] text-muted-foreground">{OWN[c.ownership] ?? c.ownership}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">MD/MS in {p.name}: common questions</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
                <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <LeadCapture
        level="pg"
        source={`PG in ${p.name}`}
        title={`Planning MD/MS in ${p.name}?`}
        body="A counsellor orders your branch and college choices across the state quota, AIQ and deemed rounds, against the published closing ranks and your budget."
      />

      <section className="container-custom border-t border-border py-10">
        <h2 className="font-heading text-xl font-bold text-foreground">PG in other states</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {all
            .filter((s) => s.slug !== p.slug)
            .map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/md-ms-india/states/${s.slug}`}
                  className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {s.name}
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </main>
  );
}
