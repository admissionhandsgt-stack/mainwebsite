import type { Metadata } from "next";
import Link from "next/link";
import { getBranches } from "@/lib/branchQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";
import CtaBand from "@/components/ui/CtaBand";

export const revalidate = 86400;

/**
 * The hub for the branch pages.
 *
 * Its job is mostly structural: 101 branch pages need somewhere that links to
 * all of them, or they are reachable only from the sitemap and sit at the far
 * edge of the crawl. It is also the page for "NEET PG branches" and "MD MS
 * specialisation list", which are real queries on the way to a specific one.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/md-ms-india/branches", {
    title: "NEET PG Branches — Cutoffs & Seats by Specialisation",
    description:
      "Every MD, MS and diploma branch with its closing ranks, seat count and the colleges offering it, from published counselling results.",
    keywords:
      "NEET PG branches, MD MS specialisation list, PG branch wise cutoff, NEET PG branch seats, MD branches India",
  });
}

const inr = (v: number | null) => (v == null ? "—" : v.toLocaleString("en-IN"));

export default async function BranchesPage() {
  const branches = await getBranches();

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          webPage({
            name: "NEET PG branches",
            description: "Every MD, MS and diploma branch with its cutoffs, seats and colleges.",
            path: "/md-ms-india/branches",
          }),
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS", path: "/md-ms-india" },
            { name: "Branches", path: "/md-ms-india/branches" },
          ]),
        ]}
      />

      <section className="relative overflow-hidden bg-slate-950">
        <div className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] opacity-50" aria-hidden="true" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true" />
        <div className="container-custom relative py-12 md:py-16">
          <h1 className="font-heading max-w-[20ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            Every MD/MS branch, and what it closed at
          </h1>
          <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            {branches.length} branches, with the colleges offering each one and the ranks they
            actually reached. Pick a branch to see where it is within reach.
          </p>
        </div>
      </section>

      <div className="container-custom py-10 md:py-14">
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[620px] table-fixed border-collapse">
            <thead>
              <tr className="bg-surface-2">
                {[
                  ["Branch", "w-[40%] text-left"],
                  ["Colleges", "w-[15%] text-right"],
                  ["Seats", "w-[15%] text-right"],
                  ["Best R1 (GEN)", "w-[15%] text-right"],
                  ["Widest (GEN)", "w-[15%] text-right"],
                ].map(([h, cls]) => (
                  <th
                    key={h}
                    scope="col"
                    className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${cls}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.slug} className="border-t border-border hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <Link
                      href={`/md-ms-india/branches/${b.slug}`}
                      className="text-[14.5px] font-semibold text-foreground hover:text-primary"
                    >
                      {b.name}
                    </Link>
                  </td>
                  <td className="tnum px-4 py-3 text-right text-[14px] text-muted-foreground">{inr(b.colleges)}</td>
                  <td className="tnum px-4 py-3 text-right text-[14px] text-foreground">{inr(b.seats)}</td>
                  <td className="tnum px-4 py-3 text-right text-[14px] text-muted-foreground">{inr(b.bestRank)}</td>
                  <td className="tnum px-4 py-3 text-right text-[14px] font-semibold text-foreground">
                    {inr(b.widestRank)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 max-w-[74ch] text-[13.5px] leading-relaxed text-muted-foreground">
          Both rank columns are the <strong>general category</strong> only. Mixing a general rank
          with a reserved one in the same figure would compare two seats nobody can hold at once —
          open a branch to pick your own category, and to see each seat&rsquo;s quota and fee
          beside its rank.
        </p>
      </div>

      <CtaBand
        title="Not sure which branch your rank can reach?"
        body="Every branch above is on this list for somebody. Bring your rank and category and we will tell you which ones are genuinely in range for you."
        image="/assets/images/hero/medical-admission-counselling-session.avif"
        primaryLabel="Ask a counsellor"
      />
    </main>
  );
}
