import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { fitTitle, fitDescription } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { getScoreTables, type ScoreTable } from "@/lib/scoreRank";
import { CUT_CATS, getLatestLiveRound, roundPath } from "@/lib/mccResults";
import { NEET_PG_QUALIFYING } from "@/lib/neetPgQualifying";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import SectionHead from "@/components/ui/SectionHead";
import MarksRankLookup from "@/components/marks/MarksRankLookup";
import TelegramRoundAlert from "@/components/engage/TelegramRoundAlert";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import LeadCapture from "@/components/lead/LeadCapture";

/**
 * "neet pg marks vs rank 2026", "neet pg rank at 450 marks", "neet pg score vs rank", "neet pg marks vs rank vs
 * branch" (Google autocomplete, Oct 2026) — and nothing of ours answered them. NBEMS publishes every candidate's
 * score and rank (score_ranks, migration 0040), so this page prints that list: one row per 10 marks, both years,
 * a lookup for any score, and — from MCC's running round — the branches each rank reached in the All India Quota,
 * only where three or more colleges took the branch (no figure is one college's cut). One page, not a page per
 * score: a page per number would be the thin, mass-generated kind.
 */

const PATH = "/neet-pg-marks-vs-rank";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const BANDS = [600, 550, 500, 450, 400, 350, 300];

/** The row for a score, or the nearest lower score anybody had. */
function at(t: ScoreTable, score: number) {
  return t.rows.find((r) => r.score <= score) ?? null;
}
/** The score whose rank range holds a rank. */
function scoreForRank(t: ScoreTable, rank: number) {
  return t.rows.find((r) => r.rankMin <= rank && rank <= r.rankMax)?.score ?? null;
}

async function load() {
  const [tables, live] = await Promise.all([getScoreTables("pg"), getLatestLiveRound()]);
  const cur = tables[0] ?? null;
  const prev = tables[1] ?? null;
  // The round's branches only count when it is the same counselling as the score list.
  const round = live && cur && live.year === cur.year ? live : null;
  return { cur, prev, round };
}

export async function generateMetadata(): Promise<Metadata> {
  const { cur, prev } = await load();
  if (!cur) return resolveMetadata(PATH, { title: "NEET PG Marks vs Rank", description: "NEET PG score and rank, from NBEMS's published result." });
  const p = prev ? ` & ${prev.year}` : "";
  const s450 = at(cur, 450), s500 = at(cur, 500);
  return resolveMetadata(PATH, {
    title: fitTitle(
      `NEET PG Marks vs Rank ${cur.year}${p}: Score to Rank, Branch Wise`,
      `NEET PG Marks vs Rank ${cur.year}${p}: Score to Rank`,
      `NEET PG Marks vs Rank ${cur.year}`,
    ),
    description: fitDescription(
      `NEET PG ${cur.year} marks vs rank from NBEMS's result: 500 marks = AIR ${n(s500?.rankMin)}–${n(s500?.rankMax)}, 450 = ${n(s450?.rankMin)}–${n(s450?.rankMax)}. Every score${prev ? `, ${prev.year} beside it,` : ""} and the branches each rank reached.`,
      `NEET PG ${cur.year} marks vs rank from NBEMS's result: 450 marks = AIR ${n(s450?.rankMin)}–${n(s450?.rankMax)}. Every score, and the branches each rank reached.`,
    ),
    keywords: `NEET PG marks vs rank, NEET PG marks vs rank ${cur.year}, NEET PG score vs rank, NEET PG rank at 450 marks, NEET PG marks vs rank vs branch${prev ? `, NEET PG marks vs rank ${prev.year}` : ""}`,
  });
}

export default async function NeetPgMarksVsRankPage() {
  const { cur, prev, round } = await load();
  const tokens = { year: cur?.year ?? "", prev: prev?.year ?? "", ranked: n(cur?.ranked) };
  const [copy, body, heroImage] = await Promise.all([
    pageCopy("page.neet_pg_marks_rank.hero", tokens),
    pageCopy("page.neet_pg_marks_rank.body", { year: cur?.year ?? "", round: round?.spec.label ?? "" }),
    pageHeroImage("page.neet_pg_marks_rank.hero"),
  ]);
  if (!cur) {
    return (
      <main className="container-custom min-h-screen py-24">
        <p className="text-muted-foreground">NBEMS&apos;s score list is not available just now.</p>
      </main>
    );
  }

  const roundLabel = round ? `${round.final ? "the final " : ""}${round.spec.label.toLowerCase()} result` : "";
  // Category → [branch, last rank admitted], most competitive first.
  const cuts: Record<string, [string, number][]> = {};
  if (round) {
    for (const cat of CUT_CATS) {
      cuts[cat] = [...round.byCourse]
        .map(([course, last]) => [course, last[cat]] as [string, number | undefined])
        .filter((x): x is [string, number] => x[1] != null)
        .sort((a, b) => a[1] - b[1]);
    }
  }
  const open = cuts.Open ?? [];
  const tens = (t: ScoreTable) => t.rows.filter((r) => r.score % 10 === 0);
  const q = NEET_PG_QUALIFYING.find((x) => x.year === cur.year) ?? NEET_PG_QUALIFYING[0];
  const radio = open.find(([b]) => b === "MD Radio Diagnosis");
  const medicine = open.find(([b]) => b === "MD General Medicine");

  const faqs = [
    ...[500, 450, 400, 300]
      .map((s) => {
        const r = at(cur, s);
        const p = prev ? at(prev, s) : null;
        if (!r) return null;
        return {
          question: `What rank will ${s} marks get in NEET PG ${cur.year}?`,
          answer:
            `In NBEMS's NEET-PG ${cur.year} result, ${r.score} out of ${cur.outOf} was AIR ${n(r.rankMin)} to ${n(r.rankMax)}` +
            `${r.candidates != null ? ` — ${n(r.candidates)} candidates scored exactly ${r.score}` : ""}.` +
            (p && prev ? ` In ${prev.year} (out of ${prev.outOf}), ${p.score} was AIR ${n(p.rankMin)}–${n(p.rankMax)}.` : ""),
        };
      })
      .filter((x): x is { question: string; answer: string } => x != null),
    ...(radio && round
      ? [
          {
            question: `What NEET PG ${cur.year} score is needed for MD Radiology?`,
            answer: `In MCC's ${roundLabel} of NEET PG ${cur.year}, the last Open All India Quota seat in MD Radio Diagnosis went to AIR ${n(radio[1])} — about ${scoreForRank(cur, radio[1]) ?? "—"} marks out of ${cur.outOf} in NBEMS's list. Other categories, state quota and deemed seats close at different ranks.`,
          },
        ]
      : []),
    ...(medicine && round
      ? [
          {
            question: `What NEET PG ${cur.year} score is needed for MD General Medicine?`,
            answer: `In MCC's ${roundLabel}, Open All India Quota seats in MD General Medicine were taken up to AIR ${n(medicine[1])} — about ${scoreForRank(cur, medicine[1]) ?? "—"} marks out of ${cur.outOf}.`,
          },
        ]
      : []),
    {
      question: `How many candidates got a NEET PG ${cur.year} rank?`,
      answer: `${n(cur.ranked)}. Scores in NBEMS's result ran from ${cur.maxScore} down to ${cur.minScore}, out of ${cur.outOf}.${prev ? ` In ${prev.year}, ${n(prev.ranked)} candidates were ranked, out of ${prev.outOf}.` : ""}`,
    },
    {
      question: "Is the rank range for my score my rank?",
      answer: "No. Everyone with the same score shares the range, and NBEMS breaks the tie by its own rules; your exact All India Rank is on your scorecard. Use the range to check your rank is right, and your exact rank for counselling.",
    },
    {
      question: `What is the NEET PG ${q.year} qualifying score?`,
      answer: `NBEMS set it at ${q.rows.map((r) => `${r.score} for ${r.category}`).join(", ")} (out of ${q.outOf}), notified on ${q.date}. Clearing it makes you eligible for counselling; the rank decides the seat.`,
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "NEET PG marks vs rank", path: PATH },
          ]),
          webPage({ name: `NEET PG marks vs rank ${cur.year}`, description: "NEET PG score and All India Rank, from NBEMS's published result.", path: PATH }),
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "NEET PG marks vs rank" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "Ranked candidates", value: n(cur.ranked), note: `NEET PG ${cur.year}` },
          { label: "Top score", value: `${cur.maxScore}/${cur.outOf}`, note: "AIR 1" },
          { label: "450 marks", value: `AIR ${n(at(cur, 450)?.rankMin)}+`, note: `to ${n(at(cur, 450)?.rankMax)}` },
          { label: "Qualifying, general", value: `${q.rows[0]?.score ?? "—"}/${q.outOf}`, note: `NEET PG ${q.year}` },
        ]}
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_neet_pg_marks_rank"
        source={
          <>
            {copy.source}{" "}
            {cur.sourceUrl && (
              <a href={cur.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-strong underline-offset-2 hover:underline">
                NBEMS result (PDF)
              </a>
            )}
          </>
        }
        image={heroImage}
        topic="chart"
        visual={
          <HeroBars
            title={copy.visual_title}
            caption={`All India Rank range for the score, out of ${cur.outOf}`}
            rows={BANDS.map((s) => at(cur, s))
              .filter((r): r is NonNullable<typeof r> => r != null)
              .map((r) => ({ label: `${r.score} marks`, value: r.rankMax, display: `AIR ${n(r.rankMin)}–${n(r.rankMax)}`, note: r.candidates != null ? `${n(r.candidates)} at this score` : undefined }))}
            footnote="Every 10 marks, both years, are in the tables below."
          />
        }
      />

      <section className="container-custom pt-10 md:pt-14" id="lookup">
        <MarksRankLookup
          year={cur.year}
          outOf={cur.outOf}
          rows={cur.rows.map((r) => [r.score, r.rankMin, r.rankMax, r.candidates])}
          round={round ? `NEET PG ${round.year} ${round.spec.label}` : null}
          cuts={cuts}
          copy={{
            title: body.lookup_title,
            intro: body.lookup_intro,
            score: body.lookup_score.replace("{outof}", String(cur.outOf)),
            category: body.lookup_category,
            button: body.lookup_button,
            result: body.lookup_result,
            branches: body.lookup_branches,
            none: body.lookup_none,
            cta: body.lookup_cta,
          }}
        />
      </section>

      {round && open.length > 0 && (
        <section className="container-custom py-10 md:py-14" id="branches">
          <SectionHead icon="branch" eyebrow="Marks vs rank vs branch" title={body.branch_title} intro={body.branch_intro} />
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="dt w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Score</th>
                  <th scope="col" className="px-4 py-3 font-semibold">AIR range</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Branches reached, Open (AIQ, {round.spec.label.toLowerCase()})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {BANDS.map((s) => at(cur, s))
                  .filter((r): r is NonNullable<typeof r> => r != null)
                  .map((r) => {
                    const reached = open.filter(([, last]) => last >= r.rankMax);
                    return (
                      <tr key={r.score} className="align-top">
                        <th scope="row" className="tnum px-4 py-3 font-semibold text-foreground">{r.score}</th>
                        <td className="tnum px-4 py-3 text-muted-foreground">{n(r.rankMin)}–{n(r.rankMax)}</td>
                        <td className="px-4 py-3">
                          <span className="tnum font-semibold text-foreground">{reached.length}</span>{" "}
                          <span className="text-muted-foreground">branches</span>
                          {reached.length > 0 && (
                            <ul className="mt-1.5 flex flex-wrap gap-1.5">
                              {reached.map(([b]) => (
                                <li key={b} className="rounded-full bg-surface-1 px-2.5 py-0.5 text-[12.5px] text-foreground">{b.replace(/^(MD|MS) /, "")}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Every branch and category of the {round.spec.label.toLowerCase()}:{" "}
            <Link href={roundPath(round.year, round.spec.slug)} className="font-semibold text-primary-strong hover:underline">
              NEET PG {round.year} {round.spec.label} result
            </Link>{" "}
            ·{" "}
            <Link href="/neet-pg-cutoff" className="font-semibold text-primary-strong hover:underline">
              NEET PG cutoff branch wise
            </Link>
          </p>
        </section>
      )}

      <section className="border-t border-border bg-surface-1 py-10 md:py-14" id="table">
        <div className="container-custom">
          <SectionHead icon="chart" eyebrow="Score to rank" title={body.table_title.replace("{outof}", String(cur.outOf))} intro={body.table_intro} />
          {/* Both years in CSS columns: two long lists, not a grid row as tall as the longer one. */}
          <div className="mt-5 gap-6 lg:columns-2 [&>div]:mb-6 [&>div]:break-inside-avoid">
            {[cur, prev].filter((t): t is ScoreTable => t != null).map((t) => (
              <div key={t.year} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <h3 className="border-b border-border bg-surface-1 px-4 py-3 font-semibold text-foreground">
                  NEET PG {t.year} · out of {t.outOf}
                </h3>
                <table className="dt w-full text-left text-sm">
                  <thead className="text-[12px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-semibold">Marks</th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">AIR from</th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">AIR to</th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">Candidates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tens(t).map((r) => (
                      <tr key={r.score} id={t === cur ? `score-${r.score}` : undefined}>
                        <th scope="row" className="tnum px-4 py-1.5 font-semibold text-foreground">{r.score}</th>
                        <td className="tnum px-4 py-1.5 text-right">{n(r.rankMin)}</td>
                        <td className="tnum px-4 py-1.5 text-right">{n(r.rankMax)}</td>
                        <td className="tnum px-4 py-1.5 text-right text-muted-foreground">{n(r.candidates)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="border-t border-border px-4 py-3 text-[12.5px] text-muted-foreground">
                  {t.source}
                  {t.sourceUrl && (
                    <>
                      {" "}
                      <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-strong hover:underline">
                        Source
                      </a>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TelegramRoundAlert placement="round_alert_marks_rank" className="pt-10 md:pt-14" />

      <section className="container-custom pt-10 md:pt-14">
        <DataPageCounsel kind="cutoff" placement="counsel_marks_rank" />
      </section>

      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="help" eyebrow="FAQ" title={body.faq_title} />
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <LeadCapture
        level="pg"
        source="NEET PG marks vs rank page"
        title="Got your rank? Get a choice list built for it"
        body="A counsellor orders your branches and colleges against the published closing ranks — AIQ, state and deemed — and stays with you through every round."
      />
    </main>
  );
}
