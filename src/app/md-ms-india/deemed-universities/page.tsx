import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getDeemedPg } from "@/lib/pgFeeQueries";
import { resolveMetadata } from "@/lib/content";
import FeeBandTable, { lakh } from "@/components/cutoffs/FeeBandTable";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";

/**
 * "Deemed university PG fee structure", "NEET PG deemed cutoff". Per-college
 * fees are free on every college page, so listing them here gives nothing away;
 * which branch closed at which rank stays behind the gate on each college.
 */

const PATH = "/md-ms-india/deemed-universities";

export async function generateMetadata(): Promise<Metadata> {
  const d = await getDeemedPg();
  return resolveMetadata(PATH, {
    title: `Deemed University MD/MS Fees & NEET PG Cutoff ${d.year ?? ""}`,
    description: `PG fee structure at ${d.colleges.length} deemed universities — management and NRI quota, college by college — and where deemed seats closed in NEET PG ${d.year ?? ""} counselling.`,
    keywords:
      "deemed university PG fees, deemed university MD fees, NEET PG deemed university cutoff, deemed university fee structure PG, deemed NRI quota PG fees",
  });
}

export default async function DeemedPgPage() {
  const d = await getDeemedPg();
  const mng = d.national.find((b) => b.family === "Management");
  const nri = d.national.find((b) => b.family === "NRI");

  const faqs = [
    ...(mng
      ? [
          {
            question: "What is the MD/MS fee at a deemed university?",
            answer: `In ${d.year}, management-quota PG seats at deemed universities had a median fee of ${lakh(mng.median)} a year; most cost between ${lakh(mng.p10)} and ${lakh(mng.p90)}. Clinical branches cost more than non-clinical ones at the same university.`,
          },
        ]
      : []),
    ...(nri
      ? [
          {
            question: "What is the NRI quota fee at deemed universities?",
            answer: `NRI-quota PG seats at deemed universities had a median fee of ${lakh(nri.median)} a year in ${d.year}; most were between ${lakh(nri.p10)} and ${lakh(nri.p90)}.`,
          },
        ]
      : []),
    ...(d.mngRanks
      ? [
          {
            question: "What NEET PG rank is needed for a deemed university?",
            answer: `Deemed management seats are filled by MCC and open to every state. In ${d.year} they closed from rank ${d.mngRanks.bestR1?.toLocaleString("en-IN") ?? "—"} in round 1 to ${d.mngRanks.widest?.toLocaleString("en-IN") ?? "—"} at the furthest — for the right fee, a deemed seat stays open far down the list.`,
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
            { name: "Deemed universities", path: PATH },
          ]),
          webPage({ name: "Deemed university MD/MS fees", description: "PG fees and cutoffs at deemed universities.", path: PATH }),
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
            <span className="text-slate-200">Deemed universities</span>
          </nav>
          <h1 className="font-heading max-w-[26ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            Deemed universities: <span className="text-cyan-300">MD/MS fees and cutoff</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            {d.colleges.length} deemed universities with published PG fees — management and NRI quota, college by college — and
            how far down the NEET PG list their seats stayed open in {d.year}.
          </p>
          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
            {[
              { k: "Deemed universities", v: String(d.colleges.length) },
              ...(mng ? [{ k: "Management, median / yr", v: lakh(mng.median) }] : []),
              ...(d.mngRanks?.widest ? [{ k: `Last rank admitted, ${d.year}`, v: d.mngRanks.widest.toLocaleString("en-IN") }] : []),
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
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">Deemed PG fees by quota</h2>
        <p className="mt-2 max-w-[72ch] text-muted-foreground">&quot;Most seats&quot; is the middle 80% of published fees.</p>
        <div className="mt-5">
          <FeeBandTable bands={d.national} />
        </div>
      </section>

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">Every deemed university</h2>
          <p className="mt-2 max-w-[72ch] text-muted-foreground">
            Lowest median management fee first. The range is across the university&apos;s branches; open one for its fees and
            ranks branch by branch.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">University</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Branches</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Management, median</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Management, by branch</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">NRI, median</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.colleges.map((c) => (
                  <tr key={c.slug}>
                    <th scope="row" className="px-4 py-3 font-medium">
                      <Link href={`/md-ms-india/colleges/${c.slug}`} className="text-foreground hover:text-primary hover:underline">
                        {c.name}
                      </Link>
                      {c.state && <span className="block text-[12px] font-normal text-muted-foreground">{c.state}</span>}
                    </th>
                    <td className="tnum px-4 py-3 text-right text-muted-foreground">{c.branches}</td>
                    <td className="tnum px-4 py-3 text-right font-semibold">{lakh(c.mngMedian)}</td>
                    <td className="tnum px-4 py-3 text-right text-muted-foreground">
                      {c.mngLow == null ? "—" : c.mngLow === c.mngHigh ? lakh(c.mngLow) : `${lakh(c.mngLow)} – ${lakh(c.mngHigh)}`}
                    </td>
                    <td className="tnum px-4 py-3 text-right">{lakh(c.nriMedian)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">Common questions</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((q) => (
            <details key={q.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{q.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{q.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Also: <Link href="/md-ms-india/private-college-fees" className="font-semibold text-primary hover:underline">private college PG fees</Link> ·{" "}
          <Link href="/nri-quota/fees" className="font-semibold text-primary hover:underline">NRI quota fees</Link> ·{" "}
          <Link href="/mbbs-india/deemed-universities" className="font-semibold text-primary hover:underline">deemed universities for MBBS</Link>
        </p>
      </section>

      <LeadCapture
        level="pg"
        source="Deemed PG page"
        title="Considering a deemed seat?"
        body="Deemed rounds run on MCC's calendar with their own deposit and exit rules. A counsellor plans them beside your state and AIQ options so a deposit is never lost by accident."
      />
    </main>
  );
}
