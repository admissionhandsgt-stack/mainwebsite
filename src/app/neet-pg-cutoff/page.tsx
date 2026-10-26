import CiteThis from "@/components/seo/CiteThis";
import { NEET_PG_QUALIFYING } from "@/lib/neetPgQualifying";
import type { Metadata } from "next";
import { fitTitle, fitDescription } from "@/lib/seoTitle";
import Link from "@/components/ui/Link";
import { getPgAiqBranches, getPgAiqCuts, type YearCuts } from "@/lib/cutoffHubQueries";
import { resolveMetadata } from "@/lib/content";
import CategoryCutTable from "@/components/cutoffs/CategoryCutTable";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import SectionHead from "@/components/ui/SectionHead";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import TelegramRoundAlert from "@/components/engage/TelegramRoundAlert";
import { ROUNDS, getCounsellingYear, getRoundResult, getRoundState, roundPath, type CutCat } from "@/lib/mccResults";

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

// Our closing-rank data says GEN where MCC's allotment lists say Open; the other codes are the same.
const MCC_CAT: Record<string, CutCat> = { GEN: "Open", OBC: "OBC", EWS: "EWS", SC: "SC", ST: "ST" };

/**
 * The running counselling's latest MCC round with a result ("neet pg 2026 cutoff" is searched from the day
 * round 1 is out): its All India Quota last rank admitted per branch, by category — only where three or more
 * colleges took part (the round pages' rule, so no figure is one college's cut).
 */
async function latestRound() {
  const cy = await getCounsellingYear();
  for (const spec of [...ROUNDS].reverse()) {
    const state = await getRoundState(cy, spec.round);
    if (state.status !== "live") continue;
    const result = await getRoundResult(cy, spec.round);
    if (!result) continue;
    const byCourse = new Map(result.cuts.aiq.map((b) => [b.course, b.last]));
    return { year: cy, spec, final: state.kind === "final", total: result.total, byCourse };
  }
  return null;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [{ year, category }, live] = await Promise.all([chosen(searchParams), latestRound()]);
  // How it is searched (Search Console, Oct 2026): "neet pg cut off rank branch
  // wise", "neet pg 2025 cut off branch wise", "neet pg closing rank 2025" — and,
  // from the day round 1 is out, the running year's "neet pg 2026 cutoff".
  const y = year?.year ? ` ${year.year}` : "";
  // "NEET PG Cutoff 2026 Round 1 & 2025": the running round first, the complete year beside it.
  const lead = live && live.year !== year?.year ? ` ${live.year} ${live.spec.label} &` : "";
  const leadD = live && live.year !== year?.year ? ` ${live.year} ${live.spec.label.toLowerCase()} (MCC's ${live.final ? "final " : ""}result) and${y}` : y;
  const q = NEET_PG_QUALIFYING[0];
  const scores = q.rows.map((r) => r.score).join("/");
  const base = await resolveMetadata(PATH, {
    title: fitTitle(
      `NEET PG Cutoff${lead}${y} Branch Wise: AIQ Closing Rank`,
      `NEET PG Cutoff${lead}${y} Branch Wise (AIQ)`,
      `NEET PG Cutoff${y} Branch Wise: AIQ Closing Ranks by Category`,
      `NEET PG Cutoff${y} Branch Wise`,
    ),
    description: fitDescription(
      `NEET PG cutoff${leadD} branch wise: All India Quota closing ranks for every MD/MS branch by category. NEET PG ${q.year} qualifying score: ${scores}.`,
      `NEET PG cutoff${leadD} branch wise: AIQ closing ranks for every MD/MS branch by category.`,
      `NEET PG${y} cutoff branch wise: AIQ closing ranks for every MD/MS branch by category, round 1 and the last round.`,
    ),
    keywords:
      `NEET PG cutoff, NEET PG cutoff branch wise, NEET PG cutoff 2025, ${live ? `NEET PG cutoff ${live.year}, NEET PG ${live.year} ${live.spec.label.toLowerCase()} cutoff, ` : ""}MD radiology cutoff, NEET PG cutoff OBC, NEET PG cutoff SC, AIQ PG cutoff, NEET PG closing rank`,
  });
  if (category === "GEN") return base;
  // A category view is its own page for the searches that name the category.
  return {
    ...base,
    title: fitTitle(
      `NEET PG Cutoff${lead}${y} ${category}: Branch Wise AIQ Rank`,
      `NEET PG Cutoff${y} ${category}: Branch Wise AIQ Closing Ranks`,
      `NEET PG Cutoff${y} ${category}: Branch Wise AIQ Ranks`,
      `NEET PG ${category} Cutoff${y} Branch Wise`,
    ),
    description: fitDescription(
      `NEET PG ${category} cutoff${leadD} branch wise: All India Quota closing ranks for every MD/MS branch in the ${category} category. Published MCC results.`,
      `NEET PG ${category} cutoff${leadD} branch wise: AIQ closing ranks for every MD/MS branch.`,
      `NEET PG${y} ${category} cutoff branch wise: AIQ closing ranks for every MD/MS branch, round 1 and the last round.`,
    ),
    alternates: { canonical: `${PATH}?category=${encodeURIComponent(category)}` },
  };
}

export default async function NeetPgCutoffPage({ searchParams }: Props) {
  const [{ year, codes, category }, latest] = await Promise.all([chosen(searchParams), latestRound()]);
  const branches = year ? await getPgAiqBranches(category, year.year) : [];
  // The running year's round beside the complete year — only when it is a different year.
  const live = latest && latest.year !== year?.year ? latest : null;
  const liveCat = MCC_CAT[category];
  const liveLast = (course: string) => (live && liveCat ? live.byCourse.get(course)?.[liveCat] ?? null : null);
  const liveRadio = branches.find((b) => /radio ?diagnosis/i.test(b.branch) && b.branch.startsWith("MD"));
  const gen = year?.categories.find((c) => c.category === "GEN");
  const radiology = branches.find((b) => /radio ?diagnosis/i.test(b.branch) && b.branch.startsWith("MD"));
  const medicine = branches.find((b) => b.branch === "MD General Medicine");

  const latestQ = NEET_PG_QUALIFYING[0];
  // Words from Admin → Content → Text & numbers ("Page: NEET PG cutoff"); photo from Admin → Media.
  const [copy, heroImage] = await Promise.all([
    pageCopy("page.neet_pg_cutoff.hero", { year: year?.year ?? "" }),
    pageHeroImage("page.neet_pg_cutoff.hero"),
  ]);
  const lowered2025 = NEET_PG_QUALIFYING.find((n) => n.year === 2025 && n.label.includes("lowered"))!;
  const faqs = [
    ...(live && liveRadio && liveLast(liveRadio.branch)
      ? [
          {
            question: `What is the NEET PG ${live.year} ${live.spec.label.toLowerCase()} cutoff for MD Radiology?`,
            answer: `In MCC's ${live.final ? "final " : ""}${live.spec.label.toLowerCase()} result of NEET PG ${live.year}, the last ${category} All India Quota seat in ${liveRadio.branch} went to AIR ${n(liveLast(liveRadio.branch))}. Every branch's ${live.year} figure is in the table on this page, beside ${year?.year}'s.`,
          },
        ]
      : []),
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
      question: `What is the NEET PG ${latestQ.year} qualifying cutoff score?`,
      answer:
        `NBEMS set it at the ${latestQ.rows.map((r) => `${r.percentile} percentile for ${r.category} (${r.score} out of ${latestQ.outOf})`).join(", ")}, ` +
        `notified on ${latestQ.date}. In 2025 the percentile was later lowered for round 3 — to ` +
        `${lowered2025.rows.map((r) => `${r.percentile} (${r.score})`).join(", ")} — so it can change after the result.`,
    },
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

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "NEET PG cutoff" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={
          gen
            ? [
                { label: "General, last AIR", value: n(gen.widest), note: "admitted, any round" },
                { label: "Colleges (AIQ)", value: n(gen.colleges) },
                { label: "Branches", value: n(branches.length) },
                { label: "Qualifying, general", value: `${latestQ.rows[0]?.score ?? "—"}/${latestQ.outOf}`, note: `NEET PG ${latestQ.year}` },
              ]
            : []
        }
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_neet_pg_cutoff"
        source={copy.source}
        image={heroImage}
        topic="chart"
        visual={
          year && year.categories.length > 0 ? (
            <HeroBars
              title={copy.visual_title}
              caption="All India Quota, last rank admitted in any round"
              rows={[...year.categories]
                .filter((c) => c.widest != null)
                .sort((a, b) => (a.widest ?? 0) - (b.widest ?? 0))
                .slice(0, 7)
                .map((c) => ({
                  label: c.category,
                  value: c.widest ?? 0,
                  display: `AIR ${n(c.widest)}`,
                  note: `${n(c.colleges)} colleges · round 1 from AIR ${n(c.bestR1)}`,
                }))}
              footnote="A range over hundreds of colleges and every branch. Each branch is in the table below."
            />
          ) : undefined
        }
      />

      <section className="container-custom pt-10 md:pt-14" id="qualifying">
        <SectionHead
          icon="document"
          eyebrow="Eligibility · NBEMS"
          title="NEET PG qualifying cutoff — the score you need to be eligible"
          intro="Set by NBEMS as a percentile and published as a score. Clearing it makes you eligible for counselling; the rank a seat closed at, below, decides whether you get one."
        />
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {NEET_PG_QUALIFYING.map((n) => (
            <div key={n.label} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold text-foreground">{n.label}</h3>
              <p className="text-[12px] text-muted-foreground">
                Notified {n.date} · score out of {n.outOf}
              </p>
              <table className="mt-3 w-full text-left text-sm">
                <thead className="text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="pb-1.5 font-semibold">Category</th>
                    <th scope="col" className="pb-1.5 text-right font-semibold">Percentile</th>
                    <th scope="col" className="pb-1.5 text-right font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {n.rows.map((r) => (
                    <tr key={r.category} className="border-t border-border">
                      <td className="py-2 pr-2 text-foreground">{r.category}</td>
                      <td className="tnum py-2 text-right text-foreground">{r.percentile}</td>
                      <td className="tnum py-2 text-right font-semibold text-foreground">{r.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <a
                href={n.source}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary-strong underline-offset-2 hover:underline"
              >
                NBEMS notice (PDF)
              </a>
            </div>
          ))}
        </div>
      </section>

      {year && (
        <section className="container-custom py-10 md:py-14">
          <SectionHead
            icon="people"
            eyebrow="By category"
            title={`NEET PG ${year.year} cutoff by category — All India Quota`}
            intro={`All branches together, every round of ${year.year}.`}
          />
          <div className="mt-5">
            <CategoryCutTable cuts={year.categories} />
          </div>
        </section>
      )}

      <section className="border-t border-border bg-surface-1 py-10 md:py-14" id="branches">
        <div className="container-custom">
          <SectionHead
            icon="branch"
            eyebrow="Branch wise"
            title={`Branch-wise cutoff, ${category} — ${live ? `${live.year} ${live.spec.label} and ` : ""}${year?.year ?? ""}`}
            intro={
              live
                ? `Most competitive first. ${live.year} ${live.spec.label.toLowerCase()}: the last rank admitted in MCC's ${live.final ? "final " : ""}result, All India Quota, shown where three or more colleges took the branch. Pick a category; open a branch for its colleges, quota by quota.`
                : "Most competitive first. Pick a category; open a branch for its colleges, quota by quota."
            }
          />
          {live && (
            <p className="mt-3 text-sm text-muted-foreground">
              Seats, quotas and every branch of the {live.year} {live.spec.label.toLowerCase()}:{" "}
              <Link href={roundPath(live.year, live.spec.slug)} className="font-semibold text-primary-strong hover:underline">
                NEET PG {live.year} {live.spec.label} result
              </Link>
            </p>
          )}
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
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className={`dt w-full text-left text-sm ${live ? "min-w-[680px]" : "min-w-[560px]"}`}>
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Branch</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                  {live && (
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      {live.year} {live.spec.label}
                      <span className="block text-[11px] font-normal normal-case tracking-normal">last admitted</span>
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    {live ? `${year?.year} round 1` : "Round 1 close"}
                    {live && <span className="block text-[11px] font-normal normal-case tracking-normal">close</span>}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    {live ? `${year?.year} last` : "Last admitted"}
                    {live && <span className="block text-[11px] font-normal normal-case tracking-normal">admitted</span>}
                  </th>
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
                    {live && <td className="tnum px-4 py-3 text-right font-semibold text-primary-strong">{n(liveLast(b.branch))}</td>}
                    <td className="tnum px-4 py-3 text-right">{n(b.bestR1)}</td>
                    <td className="tnum px-4 py-3 text-right font-semibold">{n(b.widest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* The next MCC result is the strongest reason a cutoff reader has to join the channel. */}
      <TelegramRoundAlert placement="round_alert_neet_pg_cutoff" className="pt-10 md:pt-14" />

      <section className="container-custom pt-10 md:pt-14">
        <DataPageCounsel kind="cutoff" placement="counsel_neet_pg_cutoff" />
      </section>

      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="help" eyebrow="FAQ" title="NEET PG cutoff: common questions" />
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
      <TelegramJoin placement="neet_pg_cutoff" />
    </main>
  );
}
