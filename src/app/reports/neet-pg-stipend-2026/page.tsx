import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { Download } from "lucide-react";
import { getStipends } from "@/lib/cutoffHubQueries";
import { embedCode, getDataset } from "@/lib/openData";
import { getContactInfo, resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb } from "@/components/seo/StructuredData";
import CiteThis from "@/components/seo/CiteThis";
import CopyCode from "@/components/seo/CopyCode";

/**
 * A press-ready report: the stipend data as a story an education desk can run.
 * Every number is computed from the same published figures as
 * /md-ms-india/stipend, at render — nothing here is typed in by hand, so it
 * cannot drift from the data. The point is to be the source a news story links.
 */

const PATH = "/reports/neet-pg-stipend-2026";
const inr = (v: number | null | undefined) => (v == null ? "—" : `₹${v.toLocaleString("en-IN")}`);

export async function generateMetadata(): Promise<Metadata> {
  const s = await getStipends();
  const top = s.states[0];
  const low = s.states[s.states.length - 1];
  return resolveMetadata(PATH, {
    title: "NEET PG Stipend Report 2026: What Residents Earn in Every State",
    description: `Median first-year PG stipend ${inr(s.median)}/month across ${s.colleges.toLocaleString("en-IN")} colleges${top && low ? ` — from ${inr(low.median)} in ${low.state} to ${inr(top.median)} in ${top.state}` : ""}.`,
    keywords: "NEET PG stipend report, PG resident stipend India, MD stipend state wise 2026, resident doctor salary India, PG stipend private vs government",
  });
}

export default async function StipendReportPage() {
  const [s, dataset, contact] = await Promise.all([getStipends(), getDataset("pg-stipend-by-state"), getContactInfo()]);
  const top = s.states[0];
  const low = s.states[s.states.length - 1];
  const gap = s.govtMedian && s.privateMedian ? Math.round(((s.govtMedian - s.privateMedian) / s.privateMedian) * 100) : null;
  const best = s.top[0];
  const below50k = s.states.filter((x) => x.median < 50_000).length;

  const findings = [
    `The median first-year MD/MS stipend in India is ${inr(s.median)} a month, across ${s.colleges.toLocaleString("en-IN")} colleges that publish one.`,
    ...(top && low
      ? [`${top.state} pays the most (median ${inr(top.median)}); ${low.state} the least (median ${inr(low.median)}) — a ${(top.median / low.median).toFixed(1)}× difference for the same year of residency.`]
      : []),
    ...(gap != null
      ? [`Government colleges' median (${inr(s.govtMedian)}) is ${gap >= 0 ? `${gap}% above` : `${Math.abs(gap)}% below`} private and deemed colleges' (${inr(s.privateMedian)}).`]
      : []),
    `In ${below50k} of ${s.states.length} states, the median resident earns under ₹50,000 a month.`,
    ...(best ? [`The highest published first-year stipend is ${inr(best.y1)} a month, at ${best.name}${best.state ? `, ${best.state}` : ""}.`] : []),
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "Open data", path: "/data" },
            { name: "NEET PG stipend report 2026", path: PATH },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Report",
            headline: "NEET PG Stipend Report 2026",
            description: findings[0],
            datePublished: "2026-10-08",
            author: { "@type": "Organization", name: "AdmissionHands", url: "https://www.admissionhands.com" },
            publisher: { "@type": "Organization", name: "AdmissionHands", url: "https://www.admissionhands.com" },
            url: `https://www.admissionhands.com${PATH}`,
          },
        ]}
      />
      <section className="relative overflow-hidden bg-slate-950">
        <div className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] opacity-50" aria-hidden="true" />
        <div className="container-custom relative py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-5 text-[13px] text-slate-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href="/data" className="hover:text-white">Open data</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-200">Stipend report</span>
          </nav>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-cyan-300">Report · October 2026</p>
          <h1 className="font-heading mt-2 max-w-[24ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            What a PG resident earns, <span className="text-cyan-300">state by state</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            First-year MD/MS stipends published by {s.colleges.toLocaleString("en-IN")} medical colleges, compiled across{" "}
            {s.states.length} states.
          </p>
          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "National median / month", v: inr(s.median) },
              { k: "Government median", v: inr(s.govtMedian) },
              { k: "Private / deemed median", v: inr(s.privateMedian) },
              { k: "Highest state median", v: top ? inr(top.median) : "—" },
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
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">Key findings</h2>
        <ol className="mt-5 max-w-[78ch] list-decimal space-y-3 pl-5 text-[15px] leading-relaxed text-foreground">
          {findings.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ol>
      </section>

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">Stipend by state</h2>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">State</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Median</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Government</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Private</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            College by college, with fees and seats:{" "}
            <Link href="/md-ms-india/stipend" className="font-semibold text-primary hover:underline">NEET PG stipend by state →</Link>
          </p>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">How this was compiled</h2>
        <ul className="mt-4 max-w-[78ch] list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground">
          <li>Each college&apos;s first-year PG stipend as it published it with the counselling, most recent year, monthly figures only.</li>
          <li>A state&apos;s figure is the median of its colleges; states with fewer than three publishing colleges are left out.</li>
          <li>&quot;Private&quot; includes deemed universities. Colleges that publish no stipend are not counted as paying none.</li>
        </ul>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <CiteThis title="NEET PG Stipend Report 2026" path={PATH} source="colleges' published PG stipends" />
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-heading text-lg font-bold text-foreground">Use the data</h2>
            <a
              href="/data/pg-stipend-by-state.csv"
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Download CSV
            </a>
            {dataset && (
              <div className="mt-4">
                <CopyCode code={embedCode(dataset)} label="Embed the table" />
              </div>
            )}
            {contact?.email && (
              <p className="mt-4 text-sm text-muted-foreground">
                Press and data questions:{" "}
                <a href={`mailto:${contact.email}`} className="font-semibold text-primary hover:underline">{contact.email}</a>
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
