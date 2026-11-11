import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getBranches } from "@/lib/branchQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { webPage, breadcrumb, faqPage } from "@/components/seo/StructuredData";
import SectionHead from "@/components/ui/SectionHead";
import CtaBand from "@/components/ui/CtaBand";
import BranchStateIndex from "@/components/cutoffs/BranchStateIndex";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import DataTools from "@/components/ui/DataTools";
import { toolLabels } from "@/lib/dataToolLabels";
import { branchAliases, branchKind } from "@/lib/branchKinds";

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
  // Words from Admin → Content → Text & numbers ("Page: PG branches"); photo from Admin → Media.
  const [copy, heroImage, labels] = await Promise.all([
    pageCopy("page.pg_branches.hero", { count: branches.length }),
    pageHeroImage("page.pg_branches.hero"),
    toolLabels("branch_search"),
  ]);
  // "how many branches in neet pg" (GSC, position ~7, no clicks): counted from the branches on this page.
  const kind = (n: string) => (/^MD\s/.test(n) ? "MD" : /^MS\s/.test(n) ? "MS" : /^(DNB|DrNB)\s/.test(n) ? "DNB" : /diploma/i.test(n) ? "Diploma" : "Other");
  const byKind = branches.reduce<Record<string, number>>((a, b) => ((a[kind(b.name)] = (a[kind(b.name)] ?? 0) + 1), a), {});
  const kindsText = ["MD", "MS", "Diploma", "DNB"].filter((k) => byKind[k]).map((k) => `${byKind[k]} ${k === "Diploma" ? "diploma" : k}`).join(", ");
  const faqs = [
    {
      question: "How many branches are there in NEET PG?",
      answer: `${branches.length} branches have published NEET PG closing ranks: ${kindsText}. Each opens to its own page with seats, colleges and the cut off by category.`,
    },
    {
      question: "Which branches are clinical in NEET PG?",
      answer: "General Medicine, General Surgery, Orthopaedics, Obstetrics & Gynaecology, Paediatrics, Radio Diagnosis, Dermatology, ENT, Ophthalmology, Psychiatry, Anaesthesiology, Respiratory Medicine and Emergency Medicine are the ones asked about most. Pathology, Microbiology, Pharmacology, Forensic and Community Medicine are para-clinical; Anatomy, Physiology and Biochemistry pre-clinical.",
    },
  ];

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
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "Branches" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "Branches", value: branches.length.toLocaleString("en-IN") },
          { label: "Seat options", value: branches.reduce((a, b) => a + b.seats, 0).toLocaleString("en-IN"), note: "college × quota × category" },
          { label: "Most seat options", value: branches[0]?.name ?? "—", note: branches[0] ? `at ${branches[0].colleges} colleges` : undefined },
        ]}
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_branches"
        source={copy.source}
        image={heroImage}
        topic="branch"
        visual={
          <HeroBars
            title={copy.visual_title}
            caption="Colleges offering each branch"
            rows={[...branches]
              .sort((a, b) => b.colleges - a.colleges)
              .slice(0, 7)
              .map((b) => ({ label: b.name, value: b.colleges, display: `${b.colleges} colleges`, href: `/md-ms-india/branches/${b.slug}` }))}
            footnote="Every branch is in the table below, most competitive first."
          />
        }
      />

      <div className="container-custom py-10 md:py-14">
        {branches.length >= 8 && (
          <DataTools
            id="branch-index-tools"
            className="mb-5"
            targets={["branch-index"]}
            total={branches.length}
            placement="pg_branches"
            labels={labels}
            chips={[
              {
                key: "type",
                label: "Course",
                options: ["MD", "MS", "Diploma", "DNB"].filter((k) => byKind[k]).map((k) => ({ value: k.toLowerCase(), label: k })),
              },
              {
                key: "kind",
                label: "Kind",
                options: (
                  [
                    ["clinical", "Clinical"],
                    ["para", "Para-clinical"],
                    ["pre", "Pre-clinical"],
                  ] as const
                )
                  .filter(([k]) => branches.some((b) => branchKind(b.name) === k))
                  .map(([value, label]) => ({ value, label })),
              },
            ]}
            sorts={[
              { key: "col", label: "Most colleges first", dir: "desc" },
              { key: "seats", label: "Most seat options first", dir: "desc" },
              { key: "r1", label: "Best round 1 (GEN), most competitive first", dir: "asc" },
              { key: "last", label: "Widest (GEN), highest rank first", dir: "desc" },
              { key: "name", label: "Branch, A–Z", text: true },
            ]}
          />
        )}
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table id="branch-index" className="w-full min-w-[620px] table-fixed border-collapse">
            <thead>
              <tr className="bg-surface-2">
                {[
                  ["Branch", "w-[40%] text-left"],
                  ["Colleges", "w-[15%] text-right"],
                  ["Seat options", "w-[15%] text-right"],
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
                <tr
                  key={b.slug}
                  className="border-t border-border hover:bg-surface-2"
                  data-row=""
                  data-f-type={kind(b.name).toLowerCase()}
                  data-f-kind={branchKind(b.name)}
                  data-q={branchAliases(b.name) || undefined}
                  data-s-name={b.name.toLowerCase()}
                  {...(b.colleges != null ? { "data-s-col": b.colleges } : {})}
                  {...(b.seats != null ? { "data-s-seats": b.seats } : {})}
                  {...(b.bestRank != null ? { "data-s-r1": b.bestRank } : {})}
                  {...(b.widestRank != null ? { "data-s-last": b.widestRank } : {})}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/md-ms-india/branches/${b.slug}`}
                      className="-my-2 block py-2 text-[14.5px] font-semibold text-foreground hover:text-primary"
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

      <BranchStateIndex className="pb-10 md:pb-14" />

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <SectionHead icon="help" eyebrow="FAQ" title="NEET PG branches: questions" />
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
                <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            A clinical branch at a low rank:{" "}
            <Link href="/neet-pg-low-score-clinical-branches" className="font-semibold text-primary-strong hover:underline">rank vs clinical branch</Link>.
          </p>
        </div>
      </section>

      <CtaBand
        title="Not sure which branch your rank can reach?"
        body="Every branch above is on this list for somebody. Bring your rank and category and we will tell you which ones are genuinely in range for you."
        image="/assets/images/hero/medical-admission-counselling-session.avif"
        primaryLabel="Ask a counsellor"
      />
    </main>
  );
}
