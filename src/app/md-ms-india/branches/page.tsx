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
import { getLatestLiveRound, roundPath } from "@/lib/mccResults";
import { getScoreTables, type ScoreTable } from "@/lib/scoreRank";

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
  const [copy, heroImage, labels, live, scoreTables] = await Promise.all([
    pageCopy("page.pg_branches.hero", { count: branches.length }),
    pageHeroImage("page.pg_branches.hero"),
    toolLabels("branch_search"),
    getLatestLiveRound().catch(() => null),
    getScoreTables("pg").catch((): ScoreTable[] => []),
  ]);
  // The running round's order of branches: MD/MS, All India Quota, open category, last rank admitted over 3+ colleges
  // (the round page's own figures). A group figure, never one college's close.
  const scores = live ? scoreTables.find((t) => t.year === live.year) ?? null : null;
  const top = live
    ? [...live.byCourse]
        .map(([course, last]) => ({ course, rank: last.Open }))
        .filter((x): x is { course: string; rank: number } => x.rank != null && /^(MD|MS)\s/.test(x.course))
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 10)
        .map((x) => ({
          ...x,
          slug: branches.find((b) => b.name === x.course)?.slug ?? null,
          score: scores?.rows.find((r) => r.rankMin <= x.rank && x.rank <= r.rankMax)?.score ?? null,
        }))
    : [];
  const topCopy =
    live && top.length >= 5
      ? await pageCopy("page.pg_branches.top", {
          year: live.year,
          round: live.spec.label,
          out_of: scores?.outOf ?? "",
          list: top.slice(0, 5).map((t) => `${t.course} (AIR ${t.rank.toLocaleString("en-IN")})`).join(", "),
        })
      : null;
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
    ...(topCopy?.faq_q && topCopy.faq_a ? [{ question: topCopy.faq_q, answer: topCopy.faq_a }] : []),
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

      {live && topCopy && (
        <section id="top-branches" className="container-custom pt-10 md:pt-14" aria-labelledby="top-branches-title">
          <SectionHead id="top-branches-title" icon="list" eyebrow={topCopy.eyebrow} title={topCopy.title} />
          <p className="mt-3 max-w-[78ch] text-[14.5px] leading-relaxed text-muted-foreground">{topCopy.intro}</p>
          <ol className="mt-5 grid gap-2 sm:grid-cols-2">
            {top.map((t, i) => (
              <li key={t.course} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <span className="tnum flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[14px] font-bold text-primary-strong">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  {t.slug ? (
                    <Link href={`/md-ms-india/branches/${t.slug}`} className="block font-semibold text-foreground hover:text-primary">
                      {t.course}
                    </Link>
                  ) : (
                    <span className="block font-semibold text-foreground">{t.course}</span>
                  )}
                  <span className="tnum block text-[13px] text-muted-foreground">
                    {topCopy.closed?.replace("{rank}", t.rank.toLocaleString("en-IN"))}
                    {t.score != null && scores && topCopy.marks
                      ? ` · ${topCopy.marks.replace("{score}", String(t.score)).replace("{out_of}", String(scores.outOf))}`
                      : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 max-w-[78ch] text-[13.5px] leading-relaxed text-muted-foreground">
            {topCopy.note}{" "}
            <Link href={roundPath(live.year, live.spec.slug)} className="font-semibold text-primary-strong hover:underline">
              {topCopy.link}
            </Link>
            .
          </p>
        </section>
      )}

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
