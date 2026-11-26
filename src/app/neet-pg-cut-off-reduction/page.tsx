import type { Metadata } from "next";
import { ExternalLink, FileText } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { getScoreTables, type ScoreTable } from "@/lib/scoreRank";
import { NEET_PG_QUALIFYING, type QualifyingNotice } from "@/lib/neetPgQualifying";
import { getCutReduction, type CutNotice } from "@/lib/cutoffReduction";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import NoticeSummary from "@/components/states/NoticeSummary";
import DataPageEnd from "@/components/lead/DataPageEnd";
import { FaqList, LinkCards } from "@/components/counsel/CounselBlocks";

/**
 * /neet-pg-cut-off-reduction (2026-11-26) — "neet pg cut off reduction 2026", "neet pg percentile reduced", "will neet pg
 * cut off reduce". The owner's rule: no advance or false claim; last year's reduction from NBEMS's own notice; this year's
 * appears by itself when NBEMS (or MCC) posts it (lib/cutoffReduction.ts reads the site's notice lists).
 *
 * Order: hero (the year's status in one line) → is it reduced (the notice, when there is one) → the year's qualifying cut
 * off as declared with the result → last year's: original beside lowered, with how many candidates each covered → NEET MDS
 * this year (dental, a separate exam) → earlier NBEMS notices → DataPageEnd → FAQ → links.
 * Every figure is NBEMS's (its notices, its result list); no forecast of whether or when a reduction comes.
 */

const PATH = "/neet-pg-cut-off-reduction";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const fmtDay = (iso: string | null) =>
  iso ? new Date(`${iso}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "";

/** How many candidates scored at or above a score: the lowest rank held by that score or any higher one. */
function atOrAbove(t: ScoreTable | undefined, score: number): number | null {
  if (!t) return null;
  const rows = t.rows.filter((r) => r.score >= score);
  return rows.length ? Math.max(...rows.map((r) => r.rankMax)) : null;
}

/** The result row and the lowered row of one year, from NBEMS's notices. */
function notices(year: number) {
  const ofYear = NEET_PG_QUALIFYING.filter((x) => x.year === year);
  return { result: ofYear.find((x) => /result/i.test(x.label)) ?? null, lowered: ofYear.find((x) => /lower/i.test(x.label)) ?? null };
}

async function load() {
  const [red, tables] = await Promise.all([getCutReduction(), getScoreTables("pg").catch(() => [] as ScoreTable[])]);
  const year = red.year;
  const cur = notices(year);
  // Last year with a lowered row in NBEMS's notices: the reduction this page shows as precedent.
  const prevYear = [...new Set(NEET_PG_QUALIFYING.filter((x) => x.year < year && /lower/i.test(x.label)).map((x) => x.year))].sort((a, b) => b - a)[0] ?? year - 1;
  const prev = notices(prevYear);
  const tCur = tables.find((t) => t.year === year);
  const tPrev = tables.find((t) => t.year === prevYear);
  const notice = red.current[0] ?? null;
  return { red, year, cur, prevYear, prev, tCur, tPrev, notice };
}

type Loaded = Awaited<ReturnType<typeof load>>;

function tokensOf(d: Loaded) {
  const r = d.cur.result;
  const p = d.prev.result;
  const l = d.prev.lowered;
  const row = (q: QualifyingNotice | null, i: number) => q?.rows[i] ?? null;
  const genFrom = row(p, 0)?.score ?? null;
  const genTo = row(l, 0)?.score ?? null;
  const reachFrom = genFrom != null ? atOrAbove(d.tPrev, genFrom) : null;
  const reachTo = genTo != null ? atOrAbove(d.tPrev, genTo) : null;
  return {
    year: d.year,
    session: `${d.year}-${String((d.year + 1) % 100).padStart(2, "0")}`,
    date: r?.date ?? "",
    out_of: r?.outOf ?? "",
    gen: row(r, 0)?.score ?? "",
    gen_pct: row(r, 0)?.percentile ?? "",
    pwd: row(r, 1)?.score ?? "",
    pwd_pct: row(r, 1)?.percentile ?? "",
    res: row(r, 2)?.score ?? "",
    res_pct: row(r, 2)?.percentile ?? "",
    gen_reach: row(r, 0) ? n(atOrAbove(d.tCur, row(r, 0)!.score)) : "",
    ranked: d.tCur ? n(d.tCur.ranked) : "",
    prev_year: d.prevYear,
    prev_date: l?.date ?? "",
    p_out_of: l?.outOf ?? p?.outOf ?? "",
    p_gen_from: genFrom ?? "",
    p_gen_to: genTo ?? "",
    p_gen_pct_from: row(p, 0)?.percentile ?? "",
    p_gen_pct_to: row(l, 0)?.percentile ?? "",
    p_pwd_from: row(p, 1)?.score ?? "",
    p_pwd_to: row(l, 1)?.score ?? "",
    p_res_from: row(p, 2)?.score ?? "",
    p_res_to: row(l, 2)?.score ?? "",
    p_reach_from: n(reachFrom),
    p_reach_to: n(reachTo),
    p_more: reachFrom != null && reachTo != null ? n(reachTo - reachFrom) : "",
    notice_title: d.notice?.title ?? "",
    notice_date: fmtDay(d.notice?.on ?? null),
    notice_by: d.notice?.by ?? "",
    mds_date: fmtDay(d.red.mds?.on ?? null),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const d = await load();
  const t = tokensOf(d);
  const out = !!d.notice;
  // As searched ("neet pg cut off reduction 2026"); "Notice Out" only with a notice on the page.
  const title = fitTitle(
    out ? `NEET PG Cut Off Reduction ${d.year}: Revised Percentile, Notice Out` : `NEET PG Cut Off Reduction ${d.year}: Qualifying Percentile & ${d.prevYear} Reduction`,
    out ? `NEET PG Cut Off Reduction ${d.year}: Notice Out` : `NEET PG Cut Off Reduction ${d.year}: Qualifying Percentile`,
    `NEET PG Cut Off Reduction ${d.year}`,
  );
  const description = out
    ? fitDescription(
        `NEET PG ${d.year} cut off reduction: ${t.notice_by}'s notice “${t.notice_title}” (${t.notice_date}), linked. The cut off declared with the result: ${t.gen}/${t.out_of} for General/EWS.`,
        `NEET PG ${d.year} cut off reduction: ${t.notice_by}'s notice of ${t.notice_date}, linked, beside the cut off declared with the result.`,
      )
    : fitDescription(
        `NEET PG ${d.year} qualifying cut off: ${t.gen}/${t.out_of} General/EWS (${t.gen_pct} percentile), ${t.pwd} PwBD, ${t.res} SC/ST/OBC. No reduction notice listed yet. ${d.prevYear}: lowered to ${t.p_gen_to}/${t.p_out_of} on ${t.prev_date}.`,
        `NEET PG ${d.year} qualifying cut off: ${t.gen}/${t.out_of} for General/EWS. No reduction notice listed yet; ${d.prevYear}'s was lowered on ${t.prev_date}, for round 3.`,
      );
  return resolveMetadata(PATH, {
    title,
    description,
    keywords: `NEET PG cut off reduction ${d.year}, NEET PG percentile reduction ${d.year}, NEET PG cut off reduced, NEET PG qualifying percentile ${d.year}, NEET PG cut off ${d.year} lowered, NEET PG ${d.prevYear} cut off reduction`,
  });
}

function NoticeRow({ x }: { x: CutNotice }) {
  return (
    <li className="flex gap-3 px-4 py-3.5">
      <FileText className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        {x.url ? (
          <a href={x.url} target="_blank" rel="noopener noreferrer" data-placement="cut_reduction_notice" className="break-words text-[14.5px] font-semibold leading-snug text-foreground hover:text-primary hover:underline">
            {x.title}
            <ExternalLink className="ml-1 inline h-3.5 w-3.5 align-[-2px] text-muted-foreground" aria-hidden="true" />
          </a>
        ) : (
          <span className="break-words text-[14.5px] font-semibold leading-snug text-foreground">{x.title}</span>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11.5px] font-semibold text-primary-strong">{x.by}</span>
          {x.on && <time dateTime={x.on}>{fmtDay(x.on)}</time>}
        </p>
        <NoticeSummary brief={x.brief} points={x.points} />
      </div>
    </li>
  );
}

export default async function NeetPgCutOffReductionPage() {
  const d = await load();
  const t = tokensOf(d);
  const out = !!d.notice;
  const [c, heroImage] = await Promise.all([pageCopy("page.pg_cut_reduction", t), pageHeroImage("page.pg_cut_reduction.hero", "page.neet_pg_marks_rank.hero")]);
  const r = d.cur.result;

  const faqs = [
    { question: c.faq_will_q, answer: out ? c.faq_will_out_a : c.faq_will_a },
    r ? { question: c.faq_what_q, answer: c.faq_what_a } : null,
    d.prev.lowered && d.prev.result ? { question: c.faq_prev_q, answer: c.faq_prev_a } : null,
    { question: c.faq_rank_q, answer: c.faq_rank_a },
    { question: c.faq_who_q, answer: c.faq_who_a },
    d.red.mds ? { question: c.faq_mds_q, answer: c.faq_mds_a } : null,
  ].filter((f): f is { question: string; answer: string } => !!f && !!f.question && !!f.answer);

  const links = [
    { label: `NEET PG ${d.year} marks vs rank`, href: "/neet-pg-marks-vs-rank", note: "Every score with its rank, from NBEMS's result" },
    { label: "NEET PG cut off, branch wise", href: "/neet-pg-cutoff", note: "The rank each branch closed at, round by round" },
    { label: "Clinical branches at a low rank", href: "/neet-pg-low-score-clinical-branches", note: "Where low ranks were admitted, and how" },
    { label: `NEET PG counselling ${d.year}`, href: `/neet-pg-counselling/${d.year}`, note: "MCC's rounds and results, and each state's" },
    { label: "NEET PG choice filling", href: "/neet-pg-choice-filling", note: "Rounds, upgrades, deposits — MCC's rules" },
    { label: "Every authority's latest notices", href: "/neet-counselling-updates", note: "NBEMS, MCC and each state, newest first" },
  ];

  const table = (q: QualifyingNotice, reach: ScoreTable | undefined, caption: string) => (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[460px] text-left text-sm">
        <caption className="px-4 pt-3 text-left text-[13px] font-semibold text-foreground">{caption}</caption>
        <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Category</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Percentile</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Marks (out of {q.outOf})</th>
            {reach && <th scope="col" className="px-4 py-3 text-right font-semibold">Candidates at or above</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {q.rows.map((x) => (
            <tr key={x.category}>
              <th scope="row" className="px-4 py-3 font-medium text-foreground">{x.category}</th>
              <td className="tnum px-4 py-3 text-right text-muted-foreground">{x.percentile}</td>
              <td className="tnum px-4 py-3 text-right font-semibold">{x.score}</td>
              {reach && <td className="tnum px-4 py-3 text-right">{n(atOrAbove(reach, x.score))}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET PG cut off", path: "/neet-pg-cutoff" },
            { name: "Cut off reduction", path: PATH },
          ]),
          webPage({ name: `NEET PG cut off reduction ${d.year}`, description: out ? c.subtitle_out : c.subtitle_wait, path: PATH }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "NEET PG cut off", href: "/neet-pg-cutoff" }, { label: "Cut off reduction" }]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={out ? c.accent_out : c.accent_wait}
        subtitle={out ? c.subtitle_out : c.subtitle_wait}
        image={heroImage}
        topic="document"
        cta={{ label: c.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_cut_reduction"
        source={c.source}
        insights={[
          { icon: "spark" as const, label: c.tile_status, value: out ? c.tile_status_out : c.tile_status_wait, note: out ? t.notice_date : "no notice listed yet" },
          ...(r ? [{ icon: "authority" as const, label: c.tile_cur, value: `${r.rows[0].score}/${r.outOf}`, note: `General/EWS, ${r.rows[0].percentile} percentile` }] : []),
          ...(d.prev.lowered ? [{ icon: "down" as const, label: c.tile_prev, value: `${d.prev.lowered.rows[0].score}/${d.prev.lowered.outOf}`, note: `General/EWS, ${d.prev.lowered.rows[0].percentile} percentile` }] : []),
          ...(t.p_more ? [{ icon: "people" as const, label: c.tile_more, value: t.p_more, note: `more candidates at or above, ${d.prevYear}` }] : []),
        ]}
      />

      {/* ------------------------------------------------------- is it reduced */}
      <section className="container-custom pt-10 md:pt-14" id="status">
        <SectionHead icon="document" title={c.status_title} intro={out ? c.status_out : c.status_wait} />
        {d.red.current.length > 0 && (
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {d.red.current.map((x) => (
              <NoticeRow key={`${x.url}-${x.title}`} x={x} />
            ))}
          </ul>
        )}
        {d.red.states.length > 0 && (
          <>
            <h3 className="font-heading mt-6 text-[16px] font-bold text-foreground">{c.states_title}</h3>
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {d.red.states.map((x) => (
                <NoticeRow key={`${x.url}-${x.title}`} x={x} />
              ))}
            </ul>
          </>
        )}
      </section>

      {/* ------------------------------------------------------- this year's cut off, as declared */}
      {r && (
        <section className="container-custom pt-10 md:pt-14" id="qualifying">
          <SectionHead icon="chart" title={c.cur_title} intro={c.cur_intro} />
          <div className="mt-5">{table(r, d.tCur, `NEET PG ${d.year} — ${r.label.replace(/^NEET PG \d{4} — /, "")}, ${r.date}`)}</div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            {c.cur_note}{" "}
            <a href={r.source} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-strong hover:underline dark:text-primary">
              NBEMS's notice →
            </a>
          </p>
        </section>
      )}

      {/* ------------------------------------------------------- last year's reduction */}
      {d.prev.lowered && d.prev.result && (
        <section className="container-custom pt-10 md:pt-14" id="last-year">
          <SectionHead icon="trend" title={c.prev_title} intro={c.prev_intro} />
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {table(d.prev.result, d.tPrev, `NEET PG ${d.prevYear} — declared with the result, ${d.prev.result.date}`)}
            {table(d.prev.lowered, d.tPrev, `NEET PG ${d.prevYear} — lowered, ${d.prev.lowered.date}`)}
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            {c.prev_note}{" "}
            <a href={d.prev.lowered.source} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-strong hover:underline dark:text-primary">
              NBEMS's notice →
            </a>
          </p>
        </section>
      )}

      {/* ------------------------------------------------------- NEET MDS this year (dental PG) */}
      {d.red.mds && (
        <section className="container-custom pt-10 md:pt-14" id="mds">
          <SectionHead icon="document" title={c.mds_title} intro={c.mds_intro} />
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            <NoticeRow x={d.red.mds} />
          </ul>
          <p className="mt-2 text-[13px]">
            <Link href="/neet-mds-cutoff" className="font-semibold text-primary-strong hover:underline dark:text-primary">
              NEET MDS cut off, round by round →
            </Link>
          </p>
        </section>
      )}

      {/* ------------------------------------------------------- earlier NBEMS notices */}
      {d.red.earlier.length > 0 && (
        <section className="container-custom pt-10 md:pt-14" id="earlier">
          <SectionHead icon="route" title={c.earlier_title} intro={c.earlier_intro} />
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {d.red.earlier.map((x) => (
              <NoticeRow key={`${x.year}-${x.url}`} x={x} />
            ))}
          </ul>
        </section>
      )}

      <DataPageEnd
        telegram={{ placement: "pg_cut_reduction" }}
        playbook={{ kind: "cutoff", placement: "cut_reduction" }}
        lead={{ level: "pg", source: "Cut off reduction page", title: c.lead_title, body: c.lead_body }}
      />

      {faqs.length > 0 && <FaqList title={c.faq_title} faqs={faqs} />}

      <LinkCards title={c.links_title} links={links} />
    </main>
  );
}
