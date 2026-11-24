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
    cut: !!p.figures || !!p.lastYear,
  };
}

function metaFor(p: StateRoundPage) {
  const s = p.state.name;
  const r = p.spec.label;
  const t = titleParts(p);
  const tail = [t.merit ? "Merit List" : null, t.matrix ? "Seat Matrix" : null, t.cut ? "Cut Off" : null].filter((x): x is string => !!x);
  const head = t.out ? `${s} NEET PG ${r} Result ${p.year}` : `${s} NEET PG ${r} Counselling ${p.year}`;
  const waitTail = [t.schedule ? "Schedule" : null, t.matrix ? "Seat Matrix" : null, t.merit ? "Merit List" : null, t.cut ? "Cut Off" : null].filter((x): x is string => !!x);
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
  const general = p.figures?.byQuota[0];
  const facts = [
    p.result ? `result posted ${day(p.result.on)}` : p.figures ? "allotment list out" : p.notices.length ? `latest notice ${day(p.notices[0].on)}` : null,
    general?.last ? `last general seat at AIR ${n(general.last)}` : null,
    p.lastYear ? `${p.lastYear.year}'s ${r.toLowerCase()} cut off for ${p.lastYear.rows.length} branches` : null,
  ].filter((x): x is string => !!x);
  const lead = `${s} NEET PG ${p.year} ${r.toLowerCase()}`;
  const linked = p.notices.length ? `${p.notices.length} official notice${p.notices.length === 1 ? "" : "s"} linked.` : "From the authority's allotment list.";
  // Longest that fits first: every fact with the authority, then without it, then fewer facts.
  const description = fitDescription(
    `${lead} by ${who}: ${facts.join(", ")}. ${linked}`,
    `${lead}: ${facts.join(", ")}. ${linked}`,
    `${lead}: ${facts.slice(0, 2).join(", ")}. ${linked}`,
    `${lead}: ${facts[0] ?? "official notices"}. ${linked}`,
    `${lead}: official notices, result and cut off.`,
  );
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

  const general = figures?.byQuota[0] ?? null;
  const matrix = notices.find((x) => x.kind === "matrix") ?? null;
  const kindsHeld = KIND_ORDER.filter((k) => notices.some((x) => x.kind === k));
  const top = lastYear?.rows[0];
  const deep = lastYear?.rows[lastYear.rows.length - 1];

  const [c, heroImage, authority, bondState, counsel, stipends, fees] = await Promise.all([
    pageCopy("page.pg_state_round", {
      state: s,
      round: r,
      year,
      authority: who,
      result_date: result ? day(result.on) : "",
      result_title: result ? short(result.title) : "",
      latest_date: notices[0] ? day(notices[0].on) : "",
      latest_title: notices[0] ? short(notices[0].title) : "",
      count: `${notices.length} official notice${notices.length === 1 ? "" : "s"}`,
      printed: figures?.roundPrinted ?? "",
      quota: figures?.mainQuota ?? lastYear?.quota ?? "",
      last: general?.last ? n(general.last) : "",
      colleges: general?.colleges ? n(general.colleges) : lastYear ? n(lastYear.colleges) : "",
      last_year: lastYear?.year ?? "",
      top_branch: top?.name ?? "",
      top_rank: top ? n(top.last) : "",
      deep_branch: deep?.name ?? "",
      deep_rank: deep ? n(deep.last) : "",
      n: lastYear ? lastYear.rows.length : "",
      kinds: list(kindsHeld.map((k) => KIND_LABEL[k].toLowerCase())),
      matrix_date: matrix ? day(matrix.on) : "",
      matrix_title: matrix ? short(matrix.title) : "",
    }),
    pageHeroImage(`page.pg_state.${state.slug}.hero`, "page.pg_state.hero"),
    getPgAuthority(s).catch(() => null),
    getOfficialStateByName(s).catch(() => null),
    getCounselPgStates().catch(() => [] as { name: string; slug: string }[]),
    getStipends().catch(() => null),
    getFeeStates().catch(() => null),
  ]);
  // Last year's figures speak of last year's quota and college count: their own words, not this year's.
  const cLast = lastYear ? await pageCopy("page.pg_state_round", { state: s, round: r, year, last_year: lastYear.year, quota: lastYear.quota, colleges: n(lastYear.colleges) }) : null;

  // Out: the authority's result notice is here, or its allotment list is loaded (a list read before its notice was).
  const out = !!result || !!figures;
  const subtitle =
    (result ? c.subtitle_out : figures ? c.subtitle_figures_only : c.subtitle_wait) +
    (figures && result ? ` ${c.subtitle_figures.trim()}` : "") +
    (lastYear ? ` ${c.subtitle_last.trim()}` : "");

  const faqs = [
    { question: c.faq_out_q, answer: result ? c.faq_out_a : figures ? c.faq_out_figures_a : c.faq_wait_a },
    notices.some((x) => x.kind === "result" || x.kind === "merit") ? { question: c.faq_where_q, answer: c.faq_where_a } : null,
    general?.last ? { question: c.faq_cut_q, answer: c.faq_cut_a } : null,
    lastYear && top && deep && top !== deep ? { question: c.faq_last_q, answer: c.faq_last_a } : null,
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
        accent={out ? c.accent_out : c.accent_wait}
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
            note: result ? day(result.on) : figures ? "allotment list" : `latest notice ${day(notices[0].on)}`,
          },
          ...(notices.length ? [{ icon: "authority" as const, label: c.tile_notices, value: n(notices.length), note: list(kindsHeld.slice(0, 3).map((k) => KIND_LABEL[k].toLowerCase())) }] : []),
          ...(general?.last ? [{ icon: "down" as const, label: c.tile_last, value: `AIR ${n(general.last)}`, note: `${r.toLowerCase()}, ${n(general.colleges)} colleges` }] : []),
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
                    <time dateTime={x.on.slice(0, 10)}>{day(x.on)}</time>
                    {x.authority && <span>{x.authority}</span>}
                  </p>
                  <NoticeSummary brief={x.brief} points={x.points} />
                </div>
              </li>
            ))}
          </ul>
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
      {lastYear && cLast && (
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
