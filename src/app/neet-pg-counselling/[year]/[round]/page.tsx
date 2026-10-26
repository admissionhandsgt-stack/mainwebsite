import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, FileText } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { getPgProcessContent } from "@/lib/pgProcessContent";
import { getBranches } from "@/lib/branchQueries";
import { getPgStates } from "@/lib/pgStateQueries";
import {
  CUT_QUOTAS,
  ROUNDS,
  cueFor,
  getCounsellingYear,
  getRoundResult,
  getRoundState,
  roundBySlug,
  roundPath,
  roundSchedule,
  type CutCat,
  type CutQuota,
  type RoundResult,
  type RoundState,
} from "@/lib/mccResults";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import HeroFacts from "@/components/hero/HeroFacts";
import { type Insight } from "@/components/ui/InsightCards";
import SectionHead from "@/components/ui/SectionHead";
import CiteThis from "@/components/seo/CiteThis";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import TelegramRoundAlert from "@/components/engage/TelegramRoundAlert";
import RoundCuts from "@/components/mcc/RoundCuts";
import RoundWatch from "@/components/mcc/RoundWatch";
import CounselCard from "@/components/lead/CounselCard";
import { getSeatMatrixOverview } from "@/lib/pgSeatData";

/**
 * /neet-pg-counselling/<year>/<round> (2026-10-21) — one round of MCC's NEET PG counselling, built by
 * itself: the mcc-worker container watches MCC's page, reads the result PDF and publishes it here
 * (lib/mccResults.ts). Three states:
 *   - awaited: MCC's dates from the admin's schedule and last year's same round;
 *   - out: MCC's own PDF link at once, while the PDF is read (a few minutes);
 *   - read: seats by branch, quota, category and state, and per branch the last rank admitted —
 *     only where three or more colleges admitted, so no college's own cut is ever printed.
 * The page never says how it gets there — no "we check every two minutes", no "read automatically"
 * (owner's rule, 2026-10-21: visitors see the result, not our methods). The result-day card
 * (CounselCard) sits high, before the long tables, because the decision a result forces is when a
 * counsellor is worth a call. An open tab follows the state by itself (components/mcc/RoundWatch).
 * Words from Admin → Content ("Page: NEET PG round result").
 */

type Params = { year: string; round: string };

const n = (v: number) => v.toLocaleString("en-IN");
const IST = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const ist = (iso: string | null | undefined) => (iso ? `${IST.format(new Date(iso))} IST` : "");
const DAY = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const DAY_IST = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

async function load(params: Params) {
  if (!/^20\d\d$/.test(params.year)) return null;
  const year = Number(params.year);
  const spec = roundBySlug(params.round);
  if (!spec) return null;
  const current = await getCounsellingYear();
  if (year > current) return null;
  const state = await getRoundState(year, spec.round);
  // An earlier year's round we hold no result for, or a special stray round nobody has announced,
  // is not a page.
  if (state.status === "pending" && !(year === current && spec.order <= 4)) return null;
  const [result, prev, schedule] = await Promise.all([
    state.status === "live" ? getRoundResult(year, spec.round) : Promise.resolve(null),
    getRoundResult(year - 1, spec.round),
    year === current ? getPgProcessContent().then((c) => c.schedule) : Promise.resolve([]),
  ]);
  const when = roundSchedule(spec, year, schedule);
  // Of the rounds still awaited this year, only the next one is worth a search engine's time.
  let indexable = state.status !== "pending";
  if (!indexable) {
    const states = await Promise.all(ROUNDS.filter((r) => r.order <= 4).map((r) => getRoundState(year, r.round)));
    const next = ROUNDS.find((r, i) => r.order <= 4 && states[i]?.status === "pending");
    indexable = next?.slug === spec.slug;
  }
  return { year, spec, current, state, result: result && result.total ? result : null, prev, when, indexable };
}

function kindOf(state: RoundState, body: { status_final: string; status_provisional: string; status_result: string; status_out: string; status_pending: string }) {
  if (state.status === "pending") return { word: "", label: body.status_pending };
  if (state.status !== "live") return { word: state.kind === "result" ? "" : state.kind ?? "", label: body.status_out };
  const k = state.kind ?? "result";
  return { word: k === "result" ? "" : k, label: k === "final" ? body.status_final : k === "provisional" ? body.status_provisional : body.status_result };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await load(params);
  if (!d) return { title: "Not found", robots: { index: false, follow: false } };
  const { year, spec, state, result, prev, when } = d;
  const path = roundPath(year, spec.slug);
  const lc = spec.label.toLowerCase();
  const T = spec.round; // "Round 1", "Stray Vacancy Round"
  const keywords = `NEET PG ${year} ${lc} result, NEET PG ${lc} result, NEET PG ${lc} cutoff ${year}, MCC PG ${lc} allotment result, NEET PG ${year} counselling result`;
  let meta: Metadata;
  if (result) {
    const split = result.upgraded ? ` (${n(result.fresh)} fresh, ${n(result.upgraded)} upgraded)` : "";
    const final = state.kind === "final" ? "final " : "";
    // Searched as "neet pg round 1 result 2026", "neet pg 2026 round 1 result", "neet pg round 1 counselling
    // result 2026", "neet pg cut off rank branch wise" (Search Console, 21–25 Oct 2026) — the result first,
    // then the cut off and closing rank people open it for.
    meta = await resolveMetadata(path, {
      title: fitTitle(
        `NEET PG ${T} Result ${year}: Branch Wise Cut Off & Closing Rank`,
        `NEET PG ${T} Result ${year}: Branch Wise Cut Off`,
        `NEET PG ${year} ${T} Result: Branch Wise Last Rank`,
        `NEET PG ${year} ${T} Result`,
      ),
      description: fitDescription(
        `MCC's ${final}NEET PG ${year} ${lc} counselling result: ${n(result.total)} seats allotted${split}. Branch-wise cut off — the last rank admitted — by category, for AIQ, deemed and DNB seats.`,
        `MCC's ${final}NEET PG ${year} ${lc} result: ${n(result.total)} seats allotted. Branch-wise cut off (last rank admitted) by category, for AIQ, deemed and DNB seats.`,
        `MCC's NEET PG ${year} ${lc} result: ${n(result.total)} seats allotted. Branch-wise last rank admitted by category, for AIQ, deemed and DNB seats.`,
      ),
      keywords,
    });
  } else if (state.status !== "pending") {
    meta = await resolveMetadata(path, {
      title: fitTitle(`NEET PG ${year} ${T} Result Out: MCC Allotment PDF`, `NEET PG ${year} ${T} Result Out`),
      description: fitDescription(
        `MCC has published the NEET PG ${year} ${lc} result. MCC's own PDF link here, with seats by branch, quota and category and the branch-wise last rank.`,
      ),
      keywords,
    });
  } else {
    const expected = when?.expected ? DAY.format(when.expected) : null;
    meta = await resolveMetadata(path, {
      // "neet pg round 2 result 2026", "neet pg round 2 date", "neet pg round 2 cut off 2025" (autocomplete,
      // Oct 2026): before the result, the page shows MCC's dates and last year's same round — its cut off.
      title: fitTitle(
        ...(prev ? [`NEET PG ${T} Result ${year}: Date, Seat Allotment & Cut Off`] : []),
        `NEET PG ${T} Result ${year}: Date & Seat Allotment`,
        `NEET PG ${year} ${T} Result: Date & Seat Allotment`,
        `NEET PG ${year} ${T} Result`,
      ),
      description: fitDescription(
        `NEET PG ${year} ${lc} result${expected ? `, expected around ${expected} as per MCC's schedule` : ""}: MCC's PDF, seat allotment and branch-wise last rank, here the moment it is out${prev ? `. ${prev.year}'s figures meanwhile` : ""}.`,
      ),
      keywords,
    });
  }
  return d.indexable ? meta : { ...meta, robots: { index: false, follow: true } };
}

/** Last year's ranks by family and course, for the line under each rank. */
function prevCuts(r: RoundResult | null) {
  if (!r) return null;
  const out: Partial<Record<CutQuota, Record<string, Partial<Record<CutCat, number>>>>> = {};
  for (const q of CUT_QUOTAS) out[q.key] = Object.fromEntries(r.cuts[q.key].map((b) => [b.course, b.last]));
  return out;
}

export default async function RoundResultPage({ params }: { params: Params }) {
  const d = await load(params);
  if (!d) notFound();
  const { year, spec, current, state, result, prev, when } = d;
  const path = roundPath(year, spec.slug);
  const [branchPages, pgStates, matrix] = await Promise.all([
    getBranches(),
    getPgStates(),
    year === current ? getSeatMatrixOverview() : Promise.resolve(null),
  ]);
  const stateSlug = new Map(pgStates.map((s) => [s.name, s.slug]));
  const branchSlugs = branchPages.map((b) => b.slug);
  const hasBranch = new Set(branchSlugs);

  // The year before, for "last year" lines — and the one before that, for its own comparison line.
  const prevPrev = !result && prev ? await getRoundResult(year - 2, spec.round) : null;
  const shown = result ?? prev; // what the branch table shows: this year's result, else last year's
  const shownPrev = result ? prev : prevPrev;

  // The round after this one — what a seat holder can still try for — and how many moved up in it last year.
  const nextSpec = ROUNDS.find((r) => r.order === spec.order + 1 && r.order <= 4) ?? null;
  const nextLastYear = nextSpec ? await getRoundResult(year - 1, nextSpec.round) : null;

  const body0 = await pageCopy("page.pg_round.body", {});
  const kind = kindOf(state, body0);
  const expected = when?.expected ? DAY.format(when.expected) : null;
  const lc = spec.label.toLowerCase();
  const tokens = {
    year,
    round: spec.label,
    round_lc: lc,
    kind: kind.word,
    kind_label: kind.label,
    total: result ? n(result.total) : undefined,
    fresh: result ? n(result.fresh) : undefined,
    upgraded: result ? n(result.upgraded) : undefined,
    aiq_colleges_all: result ? n(result.colleges.aiq) : undefined,
    split: result && result.upgraded ? ` (${n(result.fresh)} fresh, ${n(result.upgraded)} upgraded)` : "",
    aiq_open_last: result?.aiqOpenLast ? n(result.aiqOpenLast) : undefined,
    aiq_colleges: result ? n(result.aiqOpenColleges) : undefined,
    prev_year: prev ? prev.year : year - 1,
    prev_total: prev ? n(prev.total) : undefined,
    expected: expected ?? undefined,
    window: when?.window,
    join_by: when?.joinBy ?? undefined,
    detected: ist(state.detectedAt),
    detected_day: state.detectedAt ? DAY_IST.format(new Date(state.detectedAt)) : undefined,
    published: ist(state.publishedAt ?? state.detectedAt),
    source_title: (result?.sourceTitle ?? state.sourceTitle ?? "").trim(),
    next_round: nextSpec ? nextSpec.label.toLowerCase() : "the next round",
    next_upgrades: nextLastYear?.upgraded ? n(nextLastYear.upgraded) : undefined,
  };
  const [copy, body, heroImage, shownBody] = await Promise.all([
    pageCopy("page.pg_round.hero", tokens),
    pageCopy("page.pg_round.body", tokens),
    pageHeroImage(`page.pg_round.${spec.slug}.hero`, "page.pg_round.hero"),
    // The branch table's comparison line names the year it compares with, which is two back while
    // this year's result is awaited and last year's is shown.
    pageCopy("page.pg_round.body", { ...tokens, prev_year: shownPrev?.year }),
  ]);

  const live = !!result;
  const out = !live && (state.status === "detected" || state.status === "failed");
  const accent = live ? copy.accent_live : out ? copy.accent_out : expected ? copy.accent_pending : copy.accent_pending_nodate;
  const subtitle = live
    ? copy.subtitle_live
    : state.status === "failed"
      ? copy.subtitle_failed
      : out
        ? copy.subtitle_out
        : when
          ? copy.subtitle_pending
          : copy.subtitle_pending_nodate;
  const source = live ? (state.publishedAt ? copy.source_live : copy.source_archive) : copy.source_pending;

  // With a result, its figures are the insight cards under the words (2026-10-21) — the tiles repeated
  // three of them; before one, last year's figures are tiles.
  const stats = result
    ? []
    : prev
      ? [
          { label: body.stat_prev_total, value: n(prev.total), note: `${spec.label}, MCC` },
          ...(prev.upgraded ? [{ label: body.stat_prev_upgrades, value: n(prev.upgraded) }] : []),
          ...(prev.aiqOpenLast ? [{ label: body.stat_prev_aiq, value: n(prev.aiqOpenLast) }] : []),
        ]
      : [];

  const visual = result ? (
    <HeroBars
      title={copy.visual_title}
      caption={copy.visual_caption}
      rows={result.branches.slice(0, 7).map((b) => ({
        label: b.course,
        value: b.seats,
        display: n(b.seats),
        href: hasBranch.has(b.slug) ? `/md-ms-india/branches/${b.slug}` : undefined,
        note: `${n(b.colleges)} colleges`,
      }))}
    />
  ) : (
    <HeroFacts
      title={copy.visual_title_waiting}
      facts={[
        ...(out
          ? [
              { label: body.fact_published, value: ist(state.detectedAt), wide: true },
              { label: body.fact_reading, value: state.status === "failed" ? body.fact_reading_failed : body.fact_reading_now, wide: true },
            ]
          : []),
        ...(when ? [{ label: body.fact_window, value: when.window }] : []),
        ...(when?.joinBy ? [{ label: body.fact_join, value: when.joinBy }] : []),
        ...(matrix && matrix.year === year ? [{ label: body.fact_matrix, value: n(matrix.total), wide: true }] : []),
      ]}
    />
  );

  const insights: Insight[] = result
    ? [
        { icon: "people", label: body.insight_total, value: n(result.total), note: body.insight_total_note },
        result.upgraded
          ? { icon: "college" as const, label: body.insight_fresh, value: n(result.fresh), note: `MCC, ${year}` }
          : { icon: "college" as const, label: body.stat_colleges, value: n(result.colleges.aiq), note: `MCC, ${year}` },
        ...(result.upgraded ? [{ icon: "spark" as const, label: body.insight_upgraded, value: n(result.upgraded), note: body.insight_upgraded_note }] : []),
        ...(result.aiqOpenLast ? [{ icon: "authority" as const, label: body.insight_aiq, value: n(result.aiqOpenLast), note: body.insight_aiq_note }] : []),
        ...(prev ? [{ icon: "compare" as const, label: body.insight_prev, value: n(prev.total), note: body.insight_prev_note }] : []),
      ]
    : [];

  const faqs = [
    ...(result ? [{ question: body.faq1_q, answer: body.faq1_a }] : []),
    ...(result?.aiqOpenLast ? [{ question: body.faq2_q, answer: body.faq2_a }] : []),
    ...(result && state.detectedAt ? [{ question: body.faq3_live_q, answer: body.faq3_live_a }] : []),
    ...(!result && when?.joinBy ? [{ question: body.faq3_q, answer: body.faq3_a }] : []),
    { question: body.faq4_q, answer: body.faq4_a },
    ...(result && prev ? [{ question: body.faq5_q, answer: body.faq5_a }] : []),
  ];
  const nextSteps = (when?.joinBy ? body.next_items : body.next_items_nodate).split("\n").map((s) => s.trim()).filter(Boolean);
  const otherRounds = await Promise.all(
    ROUNDS.filter((r) => r.slug !== spec.slug).map(async (r) => ({ r, s: await getRoundState(year, r.round) })),
  );
  const roundLinks = otherRounds.filter(({ r, s }) => s.status !== "pending" || (year === current && r.order <= 4));

  // The result alert on Telegram (2026-10-22): this round's while its result is awaited — the first thing to
  // do then, so before the counsellor card — and the next round's once it is out, after the card. An earlier
  // year's page invites to the counselling's next result (the shell's cue); the last round invites to nothing.
  const awaited = year === current && state.status === "pending";
  const alertRound = year === current ? (awaited ? cueFor(year, spec) : nextSpec ? cueFor(year, nextSpec) : null) : undefined;
  const topGap = state.sourceUrl ? "pt-8" : "pt-10";
  const roundAlert = (first: boolean) => (
    <TelegramRoundAlert
      round={alertRound}
      withYear={year !== current}
      placement={`round_alert_${spec.slug}`}
      className={first ? topGap : year === current ? "pt-6" : topGap}
    />
  );

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: `NEET PG counselling ${year}`, path: `/neet-pg-counselling/${year}` },
            { name: `${spec.label} result`, path },
          ]),
          webPage({
            name: `NEET PG ${year} ${spec.label} result`,
            description: subtitle,
            path,
            ...(state.publishedAt ? { datePublished: state.publishedAt } : {}),
            ...(state.updatedAt ? { dateModified: state.updatedAt } : {}),
          }),
          faqPage(faqs),
        ]}
      />
      <RoundWatch year={year} round={spec.round} status={live ? "live" : state.status} updating={state.updating} label={body.watch_reload} />

      <DataHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: `NEET PG counselling ${year}`, href: `/neet-pg-counselling/${year}` },
          { label: `${spec.label} result` },
        ]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={accent}
        subtitle={subtitle}
        image={heroImage}
        topic="document"
        stats={stats}
        cta={{ label: live && nextSpec ? copy.cta_live : copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_round"
        source={source}
        visual={visual}
        insights={insights}
      />

      {/* MCC's own PDF — the first thing anybody wants on result day. */}
      {state.sourceUrl && (
        <section className="container-custom relative z-10 -mt-8">
          <div className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-card p-5 shadow-lift sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong dark:text-primary" aria-hidden="true">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">{copy.mcc_box_title}</p>
                <p className="mt-0.5 font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">{state.sourceTitle}</p>
                {state.detectedAt && <p className="mt-0.5 text-[13px] text-muted-foreground">{ist(state.detectedAt)}</p>}
              </div>
            </div>
            <a
              href={state.sourceUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {copy.mcc_link} <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          {state.updating && (
            <p className="mt-3 rounded-2xl border border-border bg-surface-2 px-5 py-3 text-[14px] text-muted-foreground">{body.updating_note}</p>
          )}
        </section>
      )}

      {awaited && roundAlert(true)}

      {/* ------------------------------ what to do now (this year's counselling) ------------------------------ */}
      {year === current && (
        <section className={`container-custom ${awaited ? "pt-6" : topGap}`}>
          <CounselCard
            id="round-decision"
            eyebrow={body.decide_eyebrow}
            title={live || out ? body.decide_title_live : body.decide_title_pending}
            body={live || out ? body.decide_body_live : body.decide_body_pending}
            fact={nextSpec && nextLastYear?.upgraded ? body.decide_fact : undefined}
            join={when?.joinBy ? body.decide_join : undefined}
            waLabel={body.decide_wa}
            waText={body.decide_wa_text}
            callLabel={body.decide_call}
            predictorLabel={body.decide_predictor}
            predictorHref="/neet-college-predictor?course=pg"
            placement={`round_decision_${spec.slug}`}
          />
        </section>
      )}

      {!awaited && roundAlert(false)}

      {/* ------------------------------ branch table ------------------------------ */}
      {shown && (
        <section className="container-custom py-10 md:py-14">
          <SectionHead
            icon="branch"
            eyebrow={`MCC · ${shown.year} · ${spec.label}`}
            title={live ? body.cuts_title : body.prev_title}
            intro={live ? body.cuts_intro : `${body.prev_intro} ${body.cuts_intro}`}
          />
          <RoundCuts
            cuts={shown.cuts}
            prev={prevCuts(shownPrev)}
            prevYear={shownPrev?.year ?? null}
            branchPages={branchSlugs}
            labels={{
              search: body.cuts_search,
              none: body.cuts_none,
              note: shownPrev ? `${body.cuts_note} ${shownBody.cuts_note_prev}` : body.cuts_note,
              more: body.cuts_more,
            }}
          />
        </section>
      )}

      {/* ------------------------------ quota, category, programme, state ------------------------------ */}
      {shown && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14">
          {/* Columns, not a 2×2 grid (2026-10-21): the browser balances the four tables between two columns,
              where the grid sat the five-row programme table beside the long state table and left the
              difference empty. */}
          <div className="container-custom gap-8 lg:columns-2 [&>div]:mb-8 [&>div]:break-inside-avoid [&>div:last-child]:mb-0">
            <div>
              <SectionHead icon="list" eyebrow={`${shown.year}`} title={body.quota_title} intro={body.quota_intro} />
              <CountTable rows={shown.byQuota.map((q) => ({ label: q.quota, seats: q.seats }))} total={shown.total} head="Quota" />
            </div>
            <div>
              <SectionHead icon="people" eyebrow={`${shown.year}`} title={body.category_title} intro={body.category_intro} />
              <CountTable rows={shown.byCategory.map((c) => ({ label: c.category, seats: c.seats }))} total={shown.total} head="Allotted category" />
            </div>
            <div>
              <SectionHead icon="course" eyebrow={`${shown.year}`} title={body.programme_title} />
              <CountTable rows={shown.byProgramme.map((p) => ({ label: p.programme, seats: p.seats }))} total={shown.total} head="Programme" />
            </div>
            <div>
              <SectionHead icon="map" eyebrow={`${shown.byState.length} states`} title={body.state_title} intro={body.state_intro} />
              <CountTable
                rows={shown.byState.map((s) => ({ label: s.state, seats: s.seats, href: stateSlug.get(s.state) ? `/md-ms-india/states/${stateSlug.get(s.state)}` : undefined }))}
                total={shown.total}
                head="State"
                scroll
              />
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------ next steps (this year's counselling only) ------------------------------ */}
      {year === current && (live || out) && nextSteps.length > 0 && (
        <section className="container-custom py-10 md:py-14">
          <SectionHead icon="route" eyebrow={`${spec.label}, ${year}`} title={body.next_title} />
          <ol className="mt-6 grid gap-3 md:grid-cols-2">
            {nextSteps.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border border-border bg-card p-5">
                <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-soft text-[13px] font-bold text-primary-strong dark:text-primary">
                  {i + 1}
                </span>
                <span className="text-[15px] leading-relaxed text-foreground">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">
            <Link href="/neet-pg-process" className="font-semibold text-primary-strong hover:underline dark:text-primary">
              {body.process_link}
            </Link>{" "}
            ·{" "}
            <Link href="/neet-college-predictor?course=pg" className="font-semibold text-primary-strong hover:underline dark:text-primary">
              {copy.cta}
            </Link>
          </p>
        </section>
      )}

      {/* ------------------------------ FAQ ------------------------------ */}
      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <SectionHead icon="help" eyebrow="FAQ" title={copy.faq_title} />
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
                <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
          <nav aria-label="Other rounds" className="mt-8">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">NEET PG {year}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link href={`/neet-pg-counselling/${year}`} className="rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary">
                {body.nav_all}
              </Link>
              {roundLinks.map(({ r }) => (
                <Link key={r.slug} href={roundPath(year, r.slug)} className="rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary">
                  {r.label}
                </Link>
              ))}
              {prev && (
                <Link href={roundPath(prev.year, spec.slug)} className="rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary">
                  {spec.label}, {prev.year}
                </Link>
              )}
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Also:{" "}
              <Link href="/neet-pg-seat-matrix" className="font-semibold text-primary-strong hover:underline">NEET PG seat matrix</Link> ·{" "}
              <Link href="/neet-pg-cutoff" className="font-semibold text-primary-strong hover:underline">NEET PG cutoff, branch wise</Link> ·{" "}
              <Link href="/md-ms-india/branches" className="font-semibold text-primary-strong hover:underline">every PG branch</Link>
            </p>
          </nav>
        </div>
      </section>

      {live && (
        <section className="container-custom py-10">
          <CiteThis title={`NEET PG ${year} ${spec.label} result`} path={path} source="MCC's published NEET PG result" openData={false} />
        </section>
      )}

      <LeadCapture level="pg" source={`NEET PG ${year} ${spec.label} result page`} title={body.lead_title} body={body.lead_body} />
      <TelegramJoin placement="pg_round_result" />
    </main>
  );
}

function CountTable({
  rows,
  total,
  head,
  scroll = false,
}: {
  rows: { label: string; seats: number; href?: string }[];
  total: number;
  head: string;
  scroll?: boolean;
}) {
  return (
    <div className={`mt-5 overflow-x-auto rounded-2xl border border-border bg-card ${scroll ? "max-h-[28rem] overflow-y-auto" : ""}`}>
      <table className="dt w-full min-w-[420px] text-left text-sm">
        <thead className="sticky top-0 border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">{head}</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Seats</th>
            <th scope="col" className="w-2/5 px-4 py-3 font-semibold">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const pct = total ? (r.seats / total) * 100 : 0;
            return (
              <tr key={r.label}>
                <th scope="row" className="px-4 py-2.5 font-medium">
                  {r.href ? (
                    <Link href={r.href} className="text-foreground hover:text-primary hover:underline">
                      {r.label}
                    </Link>
                  ) : (
                    <span className="text-foreground">{r.label}</span>
                  )}
                </th>
                <td className="tnum px-4 py-2.5 text-right font-semibold">{n(r.seats)}</td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-3">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(1, pct)}%` }} />
                    </span>
                    <span className="tnum w-12 shrink-0 text-right text-[13px] text-muted-foreground">{pct.toFixed(1)}%</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
