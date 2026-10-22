import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { getPgProcessContent } from "@/lib/pgProcessContent";
import { ROUNDS, getCounsellingYear, getCounsellingYears, getRoundResult, getRoundState, roundPath, roundSchedule } from "@/lib/mccResults";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroFacts from "@/components/hero/HeroFacts";
import SectionHead from "@/components/ui/SectionHead";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import TelegramRoundAlert from "@/components/engage/TelegramRoundAlert";

/**
 * /neet-pg-counselling/<year> (2026-10-21) — the year's NEET PG rounds, each with its state (awaited,
 * out, read) and, once read, its headline numbers; for the counselling now running, MCC's schedule
 * from the admin. Each round page builds itself from MCC's PDF (lib/mccResults.ts). Words from
 * Admin → Content ("Page: NEET PG counselling (year)").
 */

type Params = { year: string };
const n = (v: number) => v.toLocaleString("en-IN");
const DAY = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

async function load(params: Params) {
  if (!/^20\d\d$/.test(params.year)) return null;
  const year = Number(params.year);
  const [current, years] = await Promise.all([getCounsellingYear(), getCounsellingYears()]);
  if (year !== current && !years.includes(year)) return null;
  const schedule = year === current ? (await getPgProcessContent()).schedule : [];
  const rounds = (
    await Promise.all(
      ROUNDS.map(async (spec) => {
        const state = await getRoundState(year, spec.round);
        const result = state.status === "live" ? await getRoundResult(year, spec.round) : null;
        return { spec, state, result, when: roundSchedule(spec, year, schedule) };
      }),
    )
  ).filter((r) => r.state.status !== "pending" || (year === current && r.spec.order <= 4));
  if (!rounds.length) return null;
  return { year, current, years, schedule, rounds };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await load(params);
  if (!d) return { title: "Not found", robots: { index: false, follow: false } };
  const live = d.rounds.filter((r) => r.result);
  const allotted = live.reduce((a, r) => a + (r.result?.total ?? 0), 0);
  const latest = live[live.length - 1];
  return resolveMetadata(`/neet-pg-counselling/${d.year}`, {
    title: fitTitle(
      `NEET PG Counselling ${d.year}: Round Wise Result, Dates & Seats Allotted`,
      `NEET PG Counselling ${d.year}: Round Wise Result & Dates`,
      `NEET PG Counselling ${d.year}`,
    ),
    description: fitDescription(
      latest
        ? d.year === d.current
          ? `NEET PG counselling ${d.year}, round by round from MCC's result PDFs: ${n(allotted)} allotments so far, latest ${latest.spec.label.toLowerCase()}. Branch-wise last rank, quota and category for each round.`
          : `NEET PG counselling ${d.year}, round by round from MCC's result PDFs: ${n(allotted)} allotments over ${live.length} rounds. Branch-wise last rank, quota and category for each round.`
        : `NEET PG counselling ${d.year}: MCC's round dates and each round's result as soon as MCC publishes it — seats by branch, quota and category.`,
    ),
    keywords: `NEET PG counselling ${d.year}, NEET PG ${d.year} round 1 result, NEET PG counselling ${d.year} schedule, MCC PG counselling ${d.year}, NEET PG ${d.year} allotment result`,
  });
}

export default async function CounsellingYearPage({ params }: { params: Params }) {
  const d = await load(params);
  if (!d) notFound();
  const { year, current, years, schedule, rounds } = d;
  const path = `/neet-pg-counselling/${year}`;
  const live = rounds.filter((r) => r.result);
  const allotted = live.reduce((a, r) => a + (r.result?.total ?? 0), 0);
  const scheduled = year === current ? schedule.filter((s) => s.round && s.aiq !== "—") : [];
  const listed = (year === current ? scheduled.map((s) => s.round) : rounds.map((r) => r.spec.label)).map((s) => s.toLowerCase());
  const tokens = {
    year,
    rounds_count: listed.length,
    rounds_list: listed.length > 1 ? `${listed.slice(0, -1).join(", ")} and ${listed[listed.length - 1]}` : listed[0],
    allotted_so_far: n(allotted),
    live_rounds: live.map((r) => r.spec.label.toLowerCase()).join(", "),
  };
  const [copy, body, heroImage] = await Promise.all([
    pageCopy("page.pg_counselling.hero", tokens),
    pageCopy("page.pg_counselling.body", tokens),
    pageHeroImage(`page.pg_counselling.${year}.hero`, "page.pg_counselling.hero"),
  ]);
  const faqs = [
    ...(listed.length ? [{ question: body.faq1_q, answer: body.faq1_a }] : []),
    ...(live.length ? [year === current ? { question: body.faq2_q, answer: body.faq2_a } : { question: body.faq2_done_q, answer: body.faq2_done_a }] : []),
  ];
  const chip = (r: (typeof rounds)[number]) => {
    if (r.result) return { text: body.chip_live, tone: "live" as const };
    if (r.state.status === "detected") return { text: body.chip_out, tone: "out" as const };
    if (r.state.status === "failed") return { text: body.chip_failed, tone: "out" as const };
    return {
      text: r.when?.expected ? body.chip_pending.replace("{expected}", DAY.format(r.when.expected)) : body.chip_pending_nodate,
      tone: "pending" as const,
    };
  };
  const TONE = {
    // Green-600 text on its own tint is 3:1; the darker step reads at 11px.
    live: "border-accent/30 bg-accent-soft text-emerald-800 dark:text-emerald-300",
    out: "border-primary/30 bg-primary-soft text-primary-strong dark:text-primary",
    pending: "border-border bg-surface-2 text-muted-foreground",
  };

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: `NEET PG counselling ${year}`, path },
          ]),
          webPage({ name: `NEET PG counselling ${year}`, description: copy.subtitle, path }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: `NEET PG counselling ${year}` }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        image={heroImage}
        topic="document"
        stats={
          live.length
            ? [
                { label: year === current ? body.stat_allotted : body.stat_allotted_done, value: n(allotted), note: `${live.length} / ${rounds.length}` },
                ...live.slice(-1).map((r) => ({ label: `${r.spec.label}`, value: n(r.result?.total ?? 0), note: body.unit_seats })),
              ]
            : []
        }
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_counselling"
        source={copy.source}
        visual={
          <HeroFacts
            title={copy.visual_title}
            facts={rounds.map((r) => ({
              label: r.spec.label,
              value: r.result ? n(r.result.total) : chip(r).text,
              sub: r.result ? body.unit_seats : undefined,
            }))}
          />
        }
      />

      {/* The next result's alert on Telegram (2026-10-22) — nothing between counsellings. */}
      <TelegramRoundAlert placement="round_alert_hub" className="pt-10" />

      {/* ------------------------------ rounds ------------------------------ */}
      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="route" eyebrow={`MCC · ${year}`} title={body.rounds_title} intro={body.rounds_intro} />
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rounds.map((r) => {
            const c = chip(r);
            return (
              <li key={r.spec.slug}>
                <Link
                  href={roundPath(year, r.spec.slug)}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-heading text-lg font-bold text-foreground">{r.spec.label}</span>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${TONE[c.tone]}`}>{c.text}</span>
                  </span>
                  {r.result ? (
                    <span className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <span>
                        <span className="tnum block font-heading text-xl font-extrabold text-foreground">{n(r.result.total)}</span>
                        <span className="text-muted-foreground">{body.unit_seats}</span>
                      </span>
                      {r.result.upgraded ? (
                        <span>
                          <span className="tnum block font-heading text-xl font-extrabold text-foreground">{n(r.result.upgraded)}</span>
                          <span className="text-muted-foreground">{body.unit_upgrades}</span>
                        </span>
                      ) : (
                        <span>
                          <span className="tnum block font-heading text-xl font-extrabold text-foreground">{n(r.result.colleges.aiq)}</span>
                          <span className="text-muted-foreground">{body.unit_colleges}</span>
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="mt-3 text-sm text-muted-foreground">{r.when?.window ? `MCC: ${r.when.window}` : r.state.sourceTitle ?? ""}</span>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-primary-strong group-hover:underline dark:text-primary">
                    {r.spec.label} result <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ------------------------------ schedule (the counselling now running) ------------------------------ */}
      {scheduled.length > 0 && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="list" eyebrow={`MCC · ${year}`} title={body.schedule_title} intro={body.schedule_intro} />
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="dt w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Round</th>
                    <th scope="col" className="px-4 py-3 font-semibold">MCC (AIQ, deemed, central)</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Join by</th>
                    <th scope="col" className="px-4 py-3 font-semibold">State counselling</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Join by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scheduled.map((s) => (
                    <tr key={s.round}>
                      <th scope="row" className="px-4 py-2.5 font-semibold text-foreground">{s.round}</th>
                      <td className="px-4 py-2.5">{s.aiq}</td>
                      <td className="px-4 py-2.5">{s.aiqJoinBy}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{s.state}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{s.stateJoinBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------ FAQ ------------------------------ */}
      {faqs.length > 0 && (
        <section className="container-custom py-10 md:py-14">
          <SectionHead icon="help" eyebrow="FAQ" title={copy.faq_title} />
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
                <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {years.length > 1 && (
        <section className="container-custom pb-10">
          <nav aria-label="Other years" className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{body.other_years}</span>
            {years
              .filter((y) => y !== year)
              .map((y) => (
                <Link key={y} href={`/neet-pg-counselling/${y}`} className="rounded-full border border-border bg-card px-3.5 py-2 font-semibold text-foreground hover:border-primary/40 hover:text-primary">
                  NEET PG counselling {y}
                </Link>
              ))}
            <Link href="/neet-pg-process" className="ml-1 font-semibold text-primary-strong hover:underline dark:text-primary">
              {body.process_link}
            </Link>
          </nav>
        </section>
      )}

      <LeadCapture level="pg" source={`NEET PG counselling ${year} page`} title={body.lead_title} body={body.lead_body} />
      <TelegramJoin placement="pg_counselling_year" />
    </main>
  );
}
