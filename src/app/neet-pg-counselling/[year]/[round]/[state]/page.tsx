import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, FileText } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { lines } from "@/lib/pgContent";
import { getPgAuthority } from "@/lib/pgAuthority";
import { getOfficialStateByName } from "@/lib/officialBond";
import { getCounselPgStates } from "@/lib/counselStates";
import { getStipends } from "@/lib/cutoffHubQueries";
import { getFeeStates } from "@/lib/pgFeeMatrix";
import { CATEGORY_LABEL } from "@/lib/stateRoundQueries";
import { getStateRoundPage, KIND_LABEL, type NoticeKind, type StateRoundPage } from "@/lib/stateRoundPages";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import StateAuthority from "@/components/states/StateAuthority";
import NoticeSummary from "@/components/states/NoticeSummary";
import DataPageEnd from "@/components/lead/DataPageEnd";
import { FaqList, LinkCards } from "@/components/counsel/CounselBlocks";
import ScheduleRevisionNote from "@/components/mcc/ScheduleRevisionNote";

/**
 * /neet-pg-counselling/<year>/<round-slug>/<state> (2026-11-24) — one round of one state's own NEET PG counselling, the
 * state twin of MCC's round page above it (owner: "jaise humne round wise MCC ka result page banaya hai aise sab states
 * ka banaye"). What it answers is searched by name — "haryana neet pg round 2 result", "maharashtra neet pg merit list
 * 2026", "wbmcc neet pg counselling round 3" — and had no page.
 *
 * Order (the data-page skeleton): hero → the authority's notices for the round, each linked to its own file → the
 * result in group figures, where the allotment list is loaded → the same round last year → what to do next →
 * DataPageEnd → FAQ → the state's other rounds, the round in other states, the state's other pages.
 * Every figure is a group figure over 3+ colleges; no college's own closing rank (lib/stateRoundPages.ts). A page
 * exists only where the round has a notice or figures, and is `noindex` while it has neither figures, a result notice
 * nor two notices. Words: Admin → Content → "Page: a state's NEET PG round (result, merit list, seat matrix)".
 */

type Props = { params: Promise<{ year: string; round: string; state: string }> };

const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const short = (t: string, max = 150) => (t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…`);
const KIND_ORDER: NoticeKind[] = ["result", "merit", "matrix", "schedule", "registration", "notice"];

/** What the page can honestly say it has, for the title: only the kinds of notice the round really carries. */
function titleParts(p: StateRoundPage) {
  const kinds = new Set(p.notices.map((x) => x.kind));
  return {
    out: !!p.result || !!p.figures,
    merit: kinds.has("merit"),
    matrix: kinds.has("matrix"),
    schedule: kinds.has("schedule"),
    // MCC's schedule for the states' round, printed on the page while the result is not out.
    dates: !!p.when?.state,
    // This year's cut off only when this year's list is loaded; last year's is named as last year's.
    cut: p.figures ? "Cut Off" : p.lastYear && p.lastYear.rows.length >= 5 ? `${p.lastYear.year} Cut Off` : null,
  };
}

/** The main quota's own row: every "last general seat" figure names that quota beside it. */
const generalOf = (p: StateRoundPage) => p.figures?.byQuota.find((q) => q.quota === p.figures?.mainQuota) ?? p.figures?.byQuota[0] ?? null;
/** The same, for the round before this one (a page made ahead of the result). */
const prevGeneralOf = (p: StateRoundPage) => {
  const f = p.before?.figures;
  return f?.byQuota.find((q) => q.quota === f.mainQuota) ?? f?.byQuota[0] ?? null;
};

function metaFor(p: StateRoundPage) {
  const s = p.state.name;
  const r = p.spec.label;
  const t = titleParts(p);
  const tail = [t.merit ? "Merit List" : null, t.matrix ? "Seat Matrix" : null, t.cut].filter((x): x is string => !!x);
  // A page made ahead of the result is titled as the result is searched ("haryana neet pg round 3 result 2026"), as MCC's
  // awaited round page is, and says only what it carries: the schedule's date and last year's cut off.
  const head = t.out || p.entry.ahead ? `${s} NEET PG ${r} Result ${p.year}` : `${s} NEET PG ${r} Counselling ${p.year}`;
  const waitTail = [
    t.dates ? "Date" : t.schedule ? "Schedule" : null,
    t.matrix ? "Seat Matrix" : null,
    t.merit ? "Merit List" : null,
    t.cut,
  ].filter((x): x is string => !!x);
  const parts = t.out ? tail : waitTail;
  const join = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} & ${xs[xs.length - 1]}` : xs.join(""));
  const title = fitTitle(
    ...(parts.length ? [`${head}: ${join(parts)}`] : []),
    ...(parts.length > 1 ? [`${head}: ${join(parts.slice(0, 2))}`] : []),
    ...(parts.length ? [`${head}: ${parts[0]}`] : []),
    head,
    `${s} NEET PG ${r} ${p.year}`,
  );
  const who = p.authority ?? `${s}'s counselling authority`;
  const general = generalOf(p);
  const prevGeneral = prevGeneralOf(p);
  const facts = [
    p.result ? (p.result.exact ? `result posted ${day(p.result.on)}` : "result posted") : p.figures ? "allotment list out" : null,
    !p.result && !p.figures && p.when?.state ? `states' ${r.toLowerCase()} in MCC's schedule: ${p.when.state}` : null,
    general?.last ? `last general seat at AIR ${n(general.last)} (${general.quota})` : null,
    !general && prevGeneral?.last && p.before
      ? `${p.before.spec.label.toLowerCase()} ${p.year} last general seat at AIR ${n(prevGeneral.last)} (${prevGeneral.quota})`
      : null,
    p.lastYear ? `${p.lastYear.year}'s ${r.toLowerCase()} cut off for ${p.lastYear.rows.length} branches` : null,
  ].filter((x): x is string => !!x);
  const lead = `${s} NEET PG ${p.year} ${r.toLowerCase()}`;
  const linked = p.notices.length
    ? `${p.notices.length} official notice${p.notices.length === 1 ? "" : "s"} linked.`
    : p.figures
      ? "From the authority's allotment list."
      : "Notices are added as the authority posts them.";
  // Ahead of the result: what the page holds, in the order a searcher wants it — last year's cut off, this year's round
  // before, the schedule's window.
  if (p.entry.ahead && !p.result && !p.figures) {
    const yl = p.lastYear ? `${p.lastYear.year}'s ${r.toLowerCase()} cut off for ${p.lastYear.rows.length} branches` : null;
    const pv = prevGeneral?.last && p.before ? `${p.before.spec.label.toLowerCase()} ${p.year} last general seat at AIR ${n(prevGeneral.last)} (${prevGeneral.quota})` : null;
    const wn = p.when?.state ? `the states' window in MCC's schedule (${p.when.state})` : null;
    const has = [yl, pv, wn].filter((x): x is string => !!x);
    const andList = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs.join(""));
    // Never "not out": the authority may have posted it before a notice reaches this page (audit of 2026-11-24).
    const head = `${s} NEET PG ${r} result ${p.year}:`;
    const description = fitDescription(
      `${head} ${andList(has)}. ${linked}`,
      `${head} ${andList(has)}.`,
      `${head} ${andList([yl, wn].filter((x): x is string => !!x))}.`,
      `${head} ${andList(has.slice(0, 1))}.`,
      `${head} ${linked}`,
    );
    return { title, description, who };
  }
  // Longest that fits first: every fact with the authority, then without it, then fewer facts.
  const description = facts.length
    ? fitDescription(
        `${lead} by ${who}: ${facts.join(", ")}. ${linked}`,
        `${lead}: ${facts.join(", ")}. ${linked}`,
        `${lead}: ${facts.slice(0, 2).join(", ")}. ${linked}`,
        `${lead}: ${facts[0]}. ${linked}`,
        `${lead}: ${linked}`,
      )
    : fitDescription(`${lead} by ${who}: ${linked} Each opens the authority's own file.`, `${lead}: ${linked}`);
  return { title, description, who };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { year, round, state } = await props.params;
  const p = await getStateRoundPage(year, round, state);
  if (!p) return { title: "Round not found", robots: { index: false, follow: true } };
  const { title, description } = metaFor(p);
  const s = p.state.name;
  const r = p.spec.label;
  const meta = await resolveMetadata(p.entry.path, {
    title,
    description,
    keywords: `${s} NEET PG ${r} result ${p.year}, ${s} NEET PG ${r} allotment, ${s} NEET PG merit list ${p.year}, ${s} NEET PG ${r} seat matrix, ${s} PG counselling ${r}, ${s} NEET PG ${r} cut off`,
  });
  return p.entry.indexable ? meta : { ...meta, robots: { index: false, follow: true } };
}

export default async function StateRoundResultPage(props: Props) {
  const { year: yearText, round: roundSlug, state: stateSlug } = await props.params;
  const p = await getStateRoundPage(yearText, roundSlug, stateSlug);
  if (!p) notFound();
  const { year, spec, state, notices, result, figures, lastYear } = p;
  const s = state.name;
  const r = spec.label;
  const path = p.entry.path;
  const { description, who } = metaFor(p);

  const general = generalOf(p);
  const matrix = notices.find((x) => x.kind === "matrix") ?? null;
  const t = titleParts(p);
  // The H1's second half, from what the page carries: never "merit list" or "seat matrix" without that notice.
  const ahead = p.entry.ahead && !t.out;
  const has = t.out
    ? list(["result", t.merit ? "merit list" : null, t.matrix ? "seat matrix" : null, figures ? "cut off" : null].filter((x): x is string => !!x))
    : ahead
      ? list(
          [
            t.dates ? "dates" : t.schedule ? "schedule" : null,
            t.matrix ? "seat matrix" : null,
            t.merit ? "merit list" : null,
            lastYear ? `${lastYear.year} cut off` : null,
          ].filter((x): x is string => !!x),
        ) || "official notices"
      : list([t.schedule ? "schedule" : null, t.matrix ? "seat matrix" : null, t.merit ? "merit list" : null].filter((x): x is string => !!x)) || "official notices";
  const kindsHeld = KIND_ORDER.filter((k) => notices.some((x) => x.kind === k));
  const top = lastYear?.rows[0];
  const deep = lastYear?.rows[lastYear.rows.length - 1];
  const before = p.before;
  const when = p.when;
  const prevGeneral = prevGeneralOf(p);
  // Last year's round before and this round, beside this year's round before, branch by branch (one quota, open category).
  const compare = ahead && before && before.compare.length >= 3 ? before.compare : null;
  const compareNow = !!compare && before!.sameQuota && compare.some((x) => x.now != null);
  // One branch for the "how did it go last year" answer: General Medicine where it is listed, else the first.
  const move = compare?.find((x) => x.prevLast != null && /general medicine/i.test(x.name)) ?? compare?.find((x) => x.prevLast != null) ?? null;

  const [c, heroImage, authority, bondState, counsel, stipends, fees] = await Promise.all([
    pageCopy("page.pg_state_round", {
      state: s,
      round: r,
      year,
      authority: who,
      has,
      result_date: result ? day(result.on) : "",
      result_title: result ? short(result.title) : "",
      latest_date: notices[0] ? day(notices[0].on) : "",
      latest_title: notices[0] ? short(notices[0].title) : "",
      count: `${notices.length} official notice${notices.length === 1 ? "" : "s"}`,
      printed: figures?.roundPrinted ?? "",
      quota: figures?.mainQuota ?? lastYear?.quota ?? "",
      last: general?.last ? n(general.last) : "",
      colleges: general?.colleges ? n(general.colleges) : "",
      last_year: lastYear?.year ?? "",
      top_branch: top?.name ?? "",
      top_rank: top ? n(top.last) : "",
      deep_branch: deep?.name ?? "",
      deep_rank: deep ? n(deep.last) : "",
      n: lastYear ? lastYear.rows.length : "",
      kinds: list(kindsHeld.map((k) => KIND_LABEL[k].toLowerCase())),
      matrix_date: matrix ? day(matrix.on) : "",
      matrix_title: matrix ? short(matrix.title) : "",
      prev_round: before?.spec.label ?? "",
      window: when?.state ?? "",
      join: when?.stateJoinBy ?? "",
      aiq_window: when?.aiq ?? "",
      prev_printed: before?.figures?.roundPrinted ?? "",
      prev_quota: prevGeneral?.quota ?? "",
      prev_last: prevGeneral?.last ? n(prevGeneral.last) : "",
    }),
    pageHeroImage(`page.pg_state.${state.slug}.hero`, "page.pg_state.hero"),
    getPgAuthority(s).catch(() => null),
    getOfficialStateByName(s).catch(() => null),
    getCounselPgStates().catch(() => [] as { name: string; slug: string }[]),
    getStipends().catch(() => null),
    getFeeStates().catch(() => null),
  ]);
  // Last year's figures speak of last year's quota and college count: their own words, not this year's.
  const cLast = lastYear
    ? await pageCopy("page.pg_state_round", {
        state: s,
        round: r,
        year,
        last_year: lastYear.year,
        quota: lastYear.quota,
        colleges: n(lastYear.colleges),
        prev_round: before?.spec.label ?? "",
        move_branch: move?.name ?? "",
        move_from: move?.prevLast != null ? n(move.prevLast) : "",
        move_to: move ? n(move.last) : "",
      })
    : null;

  // Out: the authority's result notice is here, or its allotment list is loaded (a list read before its notice was).
  const out = !!result || !!figures;
  const subtitle = ahead
    ? (notices.length ? c.subtitle_wait : c.subtitle_ahead) +
      (when?.state && c.subtitle_when ? ` ${c.subtitle_when.trim()}` : "") +
      (compare && cLast ? ` ${cLast.subtitle_compare.trim()}` : lastYear ? ` ${c.subtitle_last.trim()}` : "")
    : (result ? (result.exact ? c.subtitle_out : c.subtitle_out_nodate) : figures ? c.subtitle_figures_only : c.subtitle_wait) +
      (figures && result ? ` ${c.subtitle_figures.trim()}` : "") +
      (lastYear ? ` ${c.subtitle_last.trim()}` : "");

  const faqs = [
    {
      question: c.faq_out_q,
      answer: result
        ? result.exact
          ? c.faq_out_a
          : c.faq_out_nodate_a
        : figures
          ? c.faq_out_figures_a
          : !notices.length
            ? c.faq_ahead_a
            : c.faq_wait_a,
    },
    !out ? { question: c.faq_when_q, answer: when?.state ? (when.stateJoinBy ? c.faq_when_a : c.faq_when_nojoin_a) : c.faq_when_nodate_a } : null,
    move && cLast ? { question: cLast.faq_move_q, answer: cLast.faq_move_a } : null,
    notices.some((x) => x.kind === "result" || x.kind === "merit") ? { question: c.faq_where_q, answer: c.faq_where_a } : null,
    general?.last ? { question: c.faq_cut_q, answer: c.faq_cut_a } : null,
    !move && lastYear && top && deep && top !== deep ? { question: c.faq_last_q, answer: c.faq_last_a } : null,
    matrix ? { question: c.faq_matrix_q, answer: c.faq_matrix_a } : null,
    { question: c.faq_next_q, answer: c.faq_next_a },
  ].filter((f): f is { question: string; answer: string } => !!f && !!f.question && !!f.answer);

  const next = lines(c.next_points)
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((x) => x.length === 2 && x[0] && x[1]);

  const counselState = counsel.find((x) => x.name === s);
  const hasStipend = stipends?.states.some((x) => x.state === s);
  const hasFees = fees?.states.some((x) => x.slug === state.slug);
  const links = [
    { label: `NEET PG cut off and colleges in ${s}`, href: `/md-ms-india/states/${state.slug}`, note: "By quota and branch, with every college" },
    ...(counselState ? [{ label: `NEET PG counselling in ${s}`, href: `/counselling/neet-pg/${counselState.slug}`, note: "Who runs it and how we plan it with you" }] : []),
    ...(bondState ? [{ label: `PG bond and seat leaving rules in ${s}`, href: `/md-ms-india/bond/${state.slug}`, note: "What leaving a seat costs, round by round" }] : []),
    ...(hasStipend ? [{ label: `PG stipend in ${s}`, href: `/md-ms-india/stipend/${state.slug}`, note: "Government and private colleges" }] : []),
    ...(hasFees ? [{ label: `PG fees in ${s}`, href: `/md-ms-india/fees/${state.slug}`, note: "College by college, by seat type" }] : []),
    { label: `MCC's ${r} result ${year}`, href: `/neet-pg-counselling/${year}/${spec.slug}`, note: "All India Quota, deemed and DNB seats" },
    { label: "NEET PG documents", href: "/neet-pg-documents", note: "What to carry at reporting" },
    { label: "Every authority's latest notices", href: "/neet-counselling-updates", note: "MCC and each state, newest first" },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: `NEET PG counselling ${year}`, path: `/neet-pg-counselling/${year}` },
            { name: r, path: `/neet-pg-counselling/${year}/${spec.slug}` },
            { name: s, path },
          ]),
          webPage({ name: `${s} NEET PG ${r} ${year}`, description, path }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />

      <DataHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: `NEET PG counselling ${year}`, href: `/neet-pg-counselling/${year}` },
          { label: r, href: `/neet-pg-counselling/${year}/${spec.slug}` },
          { label: s },
        ]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={out ? c.accent_out : ahead ? c.accent_ahead : c.accent_wait}
        subtitle={subtitle}
        image={heroImage}
        topic="document"
        cta={{ label: c.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_state_round"
        source={c.source}
        insights={[
          {
            icon: "spark" as const,
            label: c.tile_result,
            value: out ? c.tile_result_out : c.tile_result_wait,
            note: result ? (result.exact ? day(result.on) : "official notice") : figures ? "allotment list" : "no result notice here yet",
          },
          ...(notices.length ? [{ icon: "authority" as const, label: c.tile_notices, value: n(notices.length), note: list(kindsHeld.slice(0, 3).map((k) => KIND_LABEL[k].toLowerCase())) }] : []),
          ...(general?.last ? [{ icon: "down" as const, label: c.tile_last, value: `AIR ${n(general.last)}`, note: `${general.quota}, ${n(general.colleges)} colleges` }] : []),
          ...(ahead && when?.state ? [{ icon: "calendar" as const, label: c.tile_when, value: when.state, note: when.stateJoinBy ? `joining by ${when.stateJoinBy}` : "MCC's schedule" }] : []),
          ...(ahead && !general && prevGeneral?.last
            ? [{ icon: "down" as const, label: c.tile_prev, value: `AIR ${n(prevGeneral.last)}`, note: `${prevGeneral.quota}, ${n(prevGeneral.colleges)} colleges` }]
            : []),
          ...(lastYear ? [{ icon: "compare" as const, label: (cLast ?? c).tile_branches, value: n(lastYear.rows.length), note: `${r.toLowerCase()}, branch by branch` }] : []),
        ]}
        aside={authority ? <StateAuthority a={authority} state={s} level="pg" /> : undefined}
      />

      {/* ------------------------------------------------------- the authority's notices for this round */}
      {notices.length > 0 && (
        <section className="container-custom pt-10 md:pt-14" id="notices">
          <SectionHead icon="document" title={c.notices_title} intro={c.notices_intro} />
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {notices.map((x) => (
              <li key={`${x.url}-${x.title}`} className="flex gap-3 px-4 py-3.5">
                <FileText className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  {x.url ? (
                    <a
                      href={x.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-placement="state_round_notice"
                      className="break-words text-[14.5px] font-semibold leading-snug text-foreground hover:text-primary hover:underline"
                    >
                      {x.title}
                      <ExternalLink className="ml-1 inline h-3.5 w-3.5 align-[-2px] text-muted-foreground" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="break-words text-[14.5px] font-semibold leading-snug text-foreground">{x.title}</span>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground">
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11.5px] font-semibold text-primary-strong">{KIND_LABEL[x.kind]}</span>
                    <time dateTime={x.on.slice(0, 10)}>{x.exact ? day(x.on) : `listed ${day(x.on)}`}</time>
                    {x.authority && <span>{x.authority}</span>}
                  </p>
                  <NoticeSummary brief={x.brief} points={x.points} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------- the round's dates, MCC's schedule for the state rounds */}
      {!out && when && (when.state || when.aiq) && (
        <section className="container-custom pt-10 md:pt-14 scroll-mt-[calc(var(--site-top,112px)_+_1rem)]" id="dates">
          <SectionHead icon="route" title={c.dates_title} intro={c.dates_intro} />
          {when.row.revision && (
            <div className="mt-4">
              <ScheduleRevisionNote rows={[when.row]} />
            </div>
          )}
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[360px] text-left text-sm">
              <tbody className="divide-y divide-border">
                {(
                  [
                    [c.dates_state_window, when.state],
                    [c.dates_state_join, when.stateJoinBy],
                    [c.dates_aiq, when.aiq],
                  ] as const
                )
                  .filter(([label, v]) => label && v)
                  .map(([label, v]) => (
                    <tr key={label}>
                      <th scope="row" className="w-[46%] px-4 py-3 font-medium text-foreground">{label}</th>
                      <td className="tnum px-4 py-3">{v}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            <a href={when.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-strong hover:underline dark:text-primary">
              {c.dates_source}
              <ExternalLink className="ml-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
            </a>
          </p>
        </section>
      )}

      {/* ------------------------------------------------------- the round before, this year: in figures, when its list is loaded */}
      {ahead && before?.figures && !compareNow && before.figures.byQuota.length > 0 && (
        <section className="container-custom pt-10 md:pt-14 scroll-mt-[calc(var(--site-top,112px)_+_1rem)]" id="before">
          <SectionHead icon="chart" title={c.prev_title} intro={c.prev_intro} />
          {before.figures.note && (
            <p className="mt-4 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-[14px] leading-relaxed text-foreground">
              {before.figures.note}{" "}
              {before.figures.noteUrl && (
                <a href={before.figures.noteUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-strong hover:underline">
                  The notice →
                </a>
              )}
            </p>
          )}
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Quota</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Last admitted (AIR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {before.figures.byQuota.map((q) => (
                  <tr key={q.quota}>
                    <th scope="row" className="px-4 py-3 font-medium text-foreground">{q.quota}</th>
                    <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(q.colleges)}</td>
                    <td className="tnum px-4 py-3 text-right font-semibold">{n(q.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[14px]">
            <Link href={before.path} className="font-semibold text-primary-strong hover:underline dark:text-primary">
              {c.prev_link}
            </Link>
          </p>
        </section>
      )}

      {/* ------------------------------------------------------- the result, in group figures */}
      {figures && (figures.byQuota.length > 0 || figures.byBranch.length > 0) && (
        <section className="container-custom pt-10 md:pt-14 scroll-mt-[calc(var(--site-top,112px)_+_1rem)]" id="result">
          <SectionHead icon="chart" title={c.figures_title} intro={c.figures_intro} />
          {figures.note && (
            <p className="mt-4 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-[14px] leading-relaxed text-foreground">
              {figures.note}{" "}
              {figures.noteUrl && (
                <a href={figures.noteUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-strong hover:underline">
                  The notice →
                </a>
              )}
            </p>
          )}
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            {figures.byQuota.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <caption className="px-4 pt-3 text-left text-[13px] font-semibold text-foreground">{c.quota_title}</caption>
                  <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Quota</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Tightest close</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Last admitted (AIR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {figures.byQuota.map((q) => (
                      <tr key={q.quota}>
                        <th scope="row" className="px-4 py-3 font-medium text-foreground">{q.quota}</th>
                        <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(q.colleges)}</td>
                        <td className="tnum px-4 py-3 text-right">{n(q.tightest)}</td>
                        <td className="tnum px-4 py-3 text-right font-semibold">{n(q.last)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {figures.byCategory.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <caption className="px-4 pt-3 text-left text-[13px] font-semibold text-foreground">{c.category_title}</caption>
                  <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Last admitted (AIR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {figures.byCategory.map((x) => (
                      <tr key={x.category}>
                        <th scope="row" className="px-4 py-3 font-medium text-foreground">{CATEGORY_LABEL[x.category] ?? x.category}</th>
                        <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(x.colleges)}</td>
                        <td className="tnum px-4 py-3 text-right font-semibold">{n(x.last)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {figures.byBranch.length > 0 && (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[420px] text-left text-sm">
                <caption className="px-4 pt-3 text-left text-[13px] font-semibold text-foreground">{c.branch_title}</caption>
                <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Branch</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Last admitted (AIR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {figures.byBranch.map((b) => (
                    <tr key={b.course}>
                      <th scope="row" className="px-4 py-2.5 font-medium text-foreground">
                        {b.slug ? (
                          <Link href={`/md-ms-india/branches/${b.slug}`} className="hover:text-primary hover:underline">
                            {b.course}
                          </Link>
                        ) : (
                          b.course
                        )}
                      </th>
                      <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{n(b.colleges)}</td>
                      <td className="tnum px-4 py-2.5 text-right font-semibold">{n(b.last)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------- the same round last year */}
      {compare && cLast && before && (
        <section className="container-custom pt-10 md:pt-14 scroll-mt-[calc(var(--site-top,112px)_+_1rem)]" id="last-year">
          <SectionHead icon="trend" title={cLast.compare_title} intro={compareNow ? cLast.compare_intro : cLast.compare_intro_last} />
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Branch</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    {lastYear!.year} {before.spec.label.toLowerCase()}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    {lastYear!.year} {r.toLowerCase()}
                  </th>
                  {compareNow && (
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      {year} {before.spec.label.toLowerCase()}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {compare.map((b) => (
                  <tr key={b.name}>
                    <th scope="row" className="px-4 py-2.5 font-medium text-foreground">
                      <Link href={`/md-ms-india/branches/${b.slug}`} className="hover:text-primary hover:underline">
                        {b.name}
                      </Link>
                    </th>
                    <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{n(b.prevLast)}</td>
                    <td className="tnum px-4 py-2.5 text-right font-semibold">{n(b.last)}</td>
                    {compareNow && <td className="tnum px-4 py-2.5 text-right">{n(b.now)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
            {cLast.compare_note}{" "}
            {compareNow && (
              <Link href={before.path} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                {c.prev_link}
              </Link>
            )}
          </p>
        </section>
      )}

      {!compare && lastYear && cLast && (
        <section className="container-custom pt-10 md:pt-14 scroll-mt-[calc(var(--site-top,112px)_+_1rem)]" id="last-year">
          <SectionHead icon="trend" title={cLast.last_title} intro={cLast.last_intro} />
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Branch</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Last admitted, {lastYear.year} {r.toLowerCase()} (AIR)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lastYear.rows.map((b) => (
                  <tr key={b.name}>
                    <th scope="row" className="px-4 py-2.5 font-medium text-foreground">
                      <Link href={`/md-ms-india/branches/${b.slug}`} className="hover:text-primary hover:underline">
                        {b.name}
                      </Link>
                    </th>
                    <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{n(b.colleges)}</td>
                    <td className="tnum px-4 py-2.5 text-right font-semibold">{n(b.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cLast.last_note && <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">{cLast.last_note}</p>}
        </section>
      )}

      {/* ------------------------------------------------------- what to do next */}
      {next.length > 0 && (
        <section className="container-custom pt-10 md:pt-14" id="next">
          <SectionHead icon="route" title={c.next_title} />
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {next.map(([title, text], i) => (
              <li key={title} className="rounded-2xl border border-border bg-card p-5">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-primary-strong">Step {i + 1}</p>
                <h3 className="font-heading mt-1 text-[16px] font-bold text-foreground">{title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <DataPageEnd
        telegram={{ placement: "pg_state_round" }}
        playbook={{ kind: "state", name: s, placement: "state_round" }}
        lead={{ level: "pg", source: `State round page: ${s} ${r}`, title: c.lead_title, body: c.lead_body }}
      />

      {faqs.length > 0 && <FaqList title={c.faq_title} faqs={faqs} />}

      {/* ------------------------------------------------------- this state's other rounds, this round elsewhere */}
      {(p.otherRounds.length > 0 || p.otherStates.length > 0) && (
        <section className="container-custom border-t border-border py-10">
          {p.otherRounds.length > 0 && (
            <>
              <h2 className="font-heading text-xl font-bold text-foreground">{c.other_rounds_title}</h2>
              <p className="mt-3 text-[14.5px] leading-relaxed">
                {p.otherRounds.map((e, i) => (
                  <span key={e.path}>
                    {i > 0 && <span className="text-muted-foreground"> · </span>}
                    <Link href={e.path} className="text-primary-strong hover:underline dark:text-primary">
                      {s} NEET PG {STATE_ROUND_LABEL[e.order]} {year}
                    </Link>
                  </span>
                ))}
              </p>
            </>
          )}
          {p.otherStates.length > 0 && (
            <>
              <h2 className={`font-heading text-xl font-bold text-foreground ${p.otherRounds.length ? "mt-8" : ""}`}>{c.other_states_title}</h2>
              <p className="mt-3 text-[14.5px] leading-relaxed">
                {p.otherStates.map((e, i) => (
                  <span key={e.path}>
                    {i > 0 && <span className="text-muted-foreground"> · </span>}
                    <Link href={e.path} className="text-primary-strong hover:underline dark:text-primary">
                      {e.state} {r.toLowerCase()}
                    </Link>
                  </span>
                ))}
              </p>
            </>
          )}
        </section>
      )}

      <LinkCards title={c.links_title} links={links} />
    </main>
  );
}

const STATE_ROUND_LABEL: Record<number, string> = { 1: "Round 1", 2: "Round 2", 3: "Round 3", 4: "stray vacancy round" };
