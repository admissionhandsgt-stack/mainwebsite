import CiteThis from "@/components/seo/CiteThis";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { Search } from "lucide-react";
import { getPgAiqBranches, getPgAiqCuts, type YearCuts } from "@/lib/cutoffHubQueries";
import { resolveMetadata } from "@/lib/content";
import CategoryCutTable from "@/components/cutoffs/CategoryCutTable";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";

/**
 * "NEET PG cutoff branch wise", "NEET PG cutoff 2025 OBC", "MD radiology
 * cutoff rank" — the All India Quota by category, then branch by branch for
 * the category chosen. The category is in the URL (chosen, never averaged —
 * the branch pages' rule), so every category's table is its own indexable,
 * shareable view.
 */

const PATH = "/neet-pg-cutoff";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const complete = (years: YearCuts[]) => years.find((y) => y.rounds.includes("R3")) ?? years[0];

type Props = { searchParams: { category?: string } };

async function chosen(searchParams: Props["searchParams"]) {
  const year = complete(await getPgAiqCuts());
  const codes = year?.categories.map((c) => c.category) ?? [];
  const category = codes.includes(String(searchParams.category ?? "")) ? String(searchParams.category) : "GEN";
  return { year, codes, category };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { year, category } = await chosen(searchParams);
  const base = await resolveMetadata(PATH, {
    title: `NEET PG Cutoff ${year?.year ?? ""} Branch Wise: AIQ Closing Ranks by Category`,
    description: `NEET PG ${year?.year ?? ""} All India Quota closing ranks for every MD, MS and diploma branch, by category — round 1 and the last rank admitted, from MCC's published results.`,
    keywords:
      "NEET PG cutoff, NEET PG cutoff branch wise, NEET PG cutoff 2025, MD radiology cutoff, NEET PG cutoff OBC, NEET PG cutoff SC, AIQ PG cutoff, NEET PG closing rank",
  });
  if (category === "GEN") return base;
  // A category view is its own page for the searches that name the category.
  return {
    ...base,
    title: `NEET PG Cutoff ${year?.year ?? ""} for ${category}: Branch-wise AIQ Ranks`,
    alternates: { canonical: `${PATH}?category=${encodeURIComponent(category)}` },
  };
}

export default async function NeetPgCutoffPage({ searchParams }: Props) {
  const { year, codes, category } = await chosen(searchParams);
  const branches = year ? await getPgAiqBranches(category, year.year) : [];
  const gen = year?.categories.find((c) => c.category === "GEN");
  const radiology = branches.find((b) => /radio ?diagnosis/i.test(b.branch) && b.branch.startsWith("MD"));
  const medicine = branches.find((b) => b.branch === "MD General Medicine");

  const faqs = [
    ...(gen && year
      ? [
          {
            question: `What was the NEET PG ${year.year} cutoff rank for a government MD/MS seat (general)?`,
            answer: `In the All India Quota, general-category seats closed from AIR ${n(gen.bestR1)} in round 1 (the most sought-after) to AIR ${n(gen.widest)} (the last admitted, any round). Where a branch closes depends on the branch — the table on this page lists each one.`,
          },
        ]
      : []),
    ...(radiology && year
      ? [
          {
            question: `What NEET PG rank is needed for MD Radiology?`,
            answer: `In ${year.year}, the last ${category} All India Quota seat in ${radiology.branch} was taken at AIR ${n(radiology.widest)}; the tightest round-1 close was AIR ${n(radiology.bestR1)}. It is consistently among the first branches to fill.`,
          },
        ]
      : []),
    ...(medicine && year
      ? [
          {
            question: `What NEET PG rank is needed for MD General Medicine?`,
            answer: `In ${year.year}, ${category} All India Quota seats in MD General Medicine were taken up to AIR ${n(medicine.widest)} across all rounds, in ${medicine.colleges} colleges.`,
          },
        ]
      : []),
    {
      question: "Is the NEET PG qualifying percentile the same as the cutoff rank?",
      answer:
        "No. The qualifying percentile only makes you eligible for counselling, and it is set — and has been lowered — each year. The cutoff that decides a seat is the rank at which that branch and college ran out, which is what this page shows.",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "NEET PG cutoff", path: PATH },
          ]),
          webPage({ name: `NEET PG cutoff ${year?.year ?? ""}`, description: "All India Quota closing ranks by category and branch.", path: PATH }),
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
            <span className="text-slate-200">NEET PG cutoff</span>
          </nav>
          <h1 className="font-heading max-w-[26ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            NEET PG cutoff {year?.year}: <span className="text-cyan-300">branch wise, by category</span>
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            Where All India Quota MD, MS and diploma seats actually ran out, from MCC&apos;s published round results. Ranks are AIR.
          </p>
          {gen && (
            <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { k: "General, last AIR admitted", v: n(gen.widest) },
                { k: "Colleges (AIQ)", v: n(gen.colleges) },
                { k: "Branches", v: n(branches.length) },
              ].map(({ k, v }) => (
                <div key={k}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                  <dd className="tnum mt-1 text-xl font-bold text-white md:text-2xl">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <Link
            href="/neet-college-predictor?course=pg"
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            <Search className="h-4 w-4" aria-hidden="true" /> Enter your PG rank — see every seat it reaches
          </Link>
        </div>
      </section>

      {year && (
        <section className="container-custom py-10 md:py-14">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            NEET PG {year.year} cutoff by category — All India Quota
          </h2>
          <p className="mt-2 max-w-[70ch] text-muted-foreground">All branches together, every round of {year.year}.</p>
          <div className="mt-5">
            <CategoryCutTable cuts={year.categories} />
          </div>
        </section>
      )}

      <section className="border-t border-border bg-surface-1 py-10 md:py-14" id="branches">
        <div className="container-custom">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Branch-wise cutoff, {category} — {year?.year}
          </h2>
          <p className="mt-2 max-w-[70ch] text-muted-foreground">
            Most competitive first. Pick a category; open a branch for its colleges, quota by quota.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Category">
            {codes.map((c) => (
              <li key={c}>
                <Link
                  href={c === "GEN" ? `${PATH}#branches` : `${PATH}?category=${encodeURIComponent(c)}#branches`}
                  aria-current={c === category ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm transition-colors ${
                    c === category
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Branch</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Round 1 close</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Last admitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {branches.map((b) => (
                  <tr key={b.branch}>
                    <th scope="row" className="px-4 py-3 font-medium">
                      <Link href={`/md-ms-india/branches/${b.slug}`} className="text-foreground hover:text-primary hover:underline">
                        {b.branch}
                      </Link>
                    </th>
                    <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(b.colleges)}</td>
                    <td className="tnum px-4 py-3 text-right">{n(b.bestR1)}</td>
                    <td className="tnum px-4 py-3 text-right font-semibold">{n(b.widest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl">NEET PG cutoff: common questions</h2>
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Also: <Link href="/md-ms-india/stipend" className="font-semibold text-primary-strong hover:underline">NEET PG stipend, state by state</Link> ·{" "}
          <Link href="/management-quota" className="font-semibold text-primary-strong hover:underline">management quota fees</Link> ·{" "}
          <Link href="/nri-quota/fees" className="font-semibold text-primary-strong hover:underline">NRI quota fees</Link>
        </p>
      </section>

      <section className="container-custom pb-10">
        <CiteThis title={`NEET PG cutoff ${year?.year ?? ""} — branch wise, by category`} path="/neet-pg-cutoff" source={"MCC's All India Quota results"} />
      </section>

      <LeadCapture
        level="pg"
        source="NEET PG cutoff page"
        title="Have your PG rank? Get a choice list built on these numbers"
        body="A counsellor orders your branches and colleges against the published closing ranks — AIQ, state and deemed — and stays with you through every round."
      />
    </main>
  );
}
