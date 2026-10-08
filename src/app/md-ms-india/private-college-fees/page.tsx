import type { Metadata } from "next";
import Link from "next/link";
import { getPrivatePgFees } from "@/lib/pgFeeQueries";
import { resolveMetadata } from "@/lib/content";
import FeeBandTable, { lakh } from "@/components/cutoffs/FeeBandTable";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";

/** "MD fees in private colleges" — by quota family, nationally and per state. See lib/pgFeeQueries.ts. */

const PATH = "/md-ms-india/private-college-fees";

export async function generateMetadata(): Promise<Metadata> {
  const f = await getPrivatePgFees();
  const mng = f.national.find((b) => b.family === "Management");
  return resolveMetadata(PATH, {
    title: `MD/MS Fees in Private Medical Colleges ${f.year ?? ""}: State-wise`,
    description: `MD/MS fees in private medical colleges, state by state, for state quota, management and NRI seats${mng ? ` — management mostly ${lakh(mng.p10)}–${lakh(mng.p90)} a year` : ""}.`,
    keywords:
      "MD fees in private colleges, MS fees in private medical colleges, PG fees private medical college, management quota PG fees, NRI quota PG fees, private medical college fees state wise",
  });
}

export default async function PrivateFeesPage() {
  const f = await getPrivatePgFees();
  const mng = f.national.find((b) => b.family === "Management");
  const sq = f.national.find((b) => b.family === "State / government quota");
  const nri = f.national.find((b) => b.family === "NRI");

  const faqs = [
    ...(mng
      ? [
          {
            question: "What is the MD/MS fee in a private medical college?",
            answer: `It depends on the quota more than the college. In ${f.year}, management-quota seats in private colleges had a median fee of ${lakh(mng.median)} a year, and most cost between ${lakh(mng.p10)} and ${lakh(mng.p90)}.${sq ? ` State-quota seats in the same colleges are far cheaper: median ${lakh(sq.median)}.` : ""}`,
          },
        ]
      : []),
    ...(nri
      ? [
          {
            question: "What is the NRI quota fee for MD/MS?",
            answer: `NRI-quota PG seats in private colleges had a median fee of ${lakh(nri.median)} a year in ${f.year}; most fell between ${lakh(nri.p10)} and ${lakh(nri.p90)}.`,
          },
        ]
      : []),
    {
      question: "Why are the ranges not the cheapest and dearest seat?",
      answer:
        "Because the extremes of published fee lists include slips — a ₹1,000 private PG fee, for one — and a headline built on them would mislead. The ranges here cover the middle 80% of seats: 10% cost less and 10% more. Each college's own page lists its fees seat by seat.",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "Private college fees", path: PATH },
          ]),
          webPage({ name: "MD/MS fees in private medical colleges", description: "PG fees by quota, state by state.", path: PATH }),
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
            <span className="text-slate-200">Private college fees</span>
          </nav>
          <h1 className="font-heading max-w-[26ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            MD/MS fees in private colleges, <span className="text-cyan-300">quota by quota</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            The same college charges very different fees on a state-quota, management or NRI seat. Here is what each costs,
            nationally and in every state, from the fees published with the {f.year} counselling.
          </p>
          {mng && (
            <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                ...(sq ? [{ k: "State quota, median / yr", v: lakh(sq.median) }] : []),
                { k: "Management, median / yr", v: lakh(mng.median) },
                ...(nri ? [{ k: "NRI, median / yr", v: lakh(nri.median) }] : []),
              ].map(({ k, v }) => (
                <div key={k}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                  <dd className="tnum mt-1 text-xl font-bold text-white md:text-2xl">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">All India, private colleges</h2>
        <p className="mt-2 max-w-[72ch] text-muted-foreground">
          &quot;Most seats&quot; is the middle 80% of published fees — the 10th to the 90th percentile.
        </p>
        <div className="mt-5">
          <FeeBandTable bands={f.national} />
        </div>
      </section>

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">State by state</h2>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            {f.states.map((s) => (
              <div key={s.state}>
                <h3 className="text-lg font-semibold text-foreground">
                  {s.state} <span className="tnum text-sm font-normal text-muted-foreground">· {s.colleges} private colleges</span>
                </h3>
                <div className="mt-3">
                  <FeeBandTable bands={s.bands} />
                </div>
              </div>
            ))}
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
          Also: <Link href="/md-ms-india/deemed-universities" className="font-semibold text-primary hover:underline">deemed university PG fees</Link> ·{" "}
          <Link href="/md-ms-india/stipend" className="font-semibold text-primary hover:underline">stipend by state</Link> ·{" "}
          <Link href="/management-quota" className="font-semibold text-primary hover:underline">management quota ranks</Link>
        </p>
      </section>

      <LeadCapture
        level="pg"
        source="Private PG fees page"
        title="Fee, rank and budget — in one list"
        body="A counsellor builds your PG choice list against the fee of each seat, its stipend and your budget for three years — not just the rank."
      />
    </main>
  );
}
