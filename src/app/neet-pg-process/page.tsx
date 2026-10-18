import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileText,
  Landmark,
  Search,
  TrendingDown,
} from "lucide-react";
import { pageCopy } from "@/lib/pageCopy";
import { getPgProcessContent } from "@/lib/pgProcessContent";
import { resolveMetadata, getMediaAsset } from "@/lib/content";
import { getDataStats, inr } from "@/lib/dataStats";
import { getRoundSpan, getTightenedTotal } from "@/lib/roundQueries";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";
import RoundTimeline from "@/components/neet-pg-process/RoundTimeline";

export const dynamic = "force-dynamic";

/**
 * How NEET PG counselling actually works.
 *
 * The site had a UG process page and nothing for PG — which is the side of the
 * business that earns, and the side where the process genuinely confuses
 * people. UG is mostly "fill choices and wait". PG has two authorities running
 * in parallel, a float-or-freeze decision that costs a year if you get it
 * wrong, and rounds that keep moving long after most people assume it is over.
 *
 * Everything quantified here is read from our own tables. Dates are not:
 * MCC publishes the schedule and it moves every cycle, so inventing one would
 * be the single most damaging thing this page could do.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata("/neet-pg-process", {
    title: "NEET PG Counselling Process 2026 — MCC & State, Round by Round",
    description:
      "How NEET PG counselling works: what MCC runs, what your state runs, every round in order, and when floating costs you the seat you already hold.",
    keywords: [
      "NEET PG counselling process",
      "NEET PG counselling 2026",
      "MCC PG counselling",
      "AIQ PG counselling",
      "NEET PG state quota",
      "NEET PG mop up round",
      "NEET PG stray vacancy",
      "MD MS admission process",
    ].join(", "),
  });
}

/* ------------------------------------------------------------------ data */

// Every word below is Admin → Content ("Page: NEET PG process"); the rounds, mistakes and
// MCC's schedule are the pg_process_rounds / pg_process_mistakes / pg_schedule collections
// (lib/pgProcessContent.ts), falling back to lib/pgProcessDefaults.ts and lib/neetPgSchedule.ts.
const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);
const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/* ------------------------------------------------------------------ page */

export default async function NeetPgProcessPage() {
  const [stats, hero, tightened, span, copy, content] = await Promise.all([
    getDataStats(),
    getMediaAsset("neet_hero"),
    getTightenedTotal("pg"),
    getRoundSpan("pg"),
    pageCopy("page.neet_pg_process"),
    getPgProcessContent(),
  ]);
  const sources = [
    { label: copy.schedule_source_1_label, url: copy.schedule_source_1_url },
    { label: copy.schedule_source_2_label, url: copy.schedule_source_2_url },
  ].filter((x) => x.label && /^https?:\/\//i.test(x.url));

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          webPage({
            name: "NEET PG Counselling Process",
            description:
              "What MCC runs, what your state runs, every counselling round in order, and the float-or-freeze decision.",
            path: "/neet-pg-process",
          }),
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS", path: "/md-ms-india" },
            { name: "NEET PG process", path: "/neet-pg-process" },
          ]),
          // No HowTo: Google retired HowTo rich results in 2023 and audit tools
          // now count the markup invalid. The steps are in the page itself.
        ]}
      />

      <PageHero
        eyebrow={copy.hero_eyebrow}
        eyebrowIcon="shield"
        title={copy.hero_title}
        titleAccent={copy.hero_accent}
        subtitle={copy.hero_subtitle}
        image={hero?.imageUrl && hero.imageUrl !== "none" ? hero.imageUrl : undefined}
        imageSubject={hero?.subject}
        imageCredit={hero?.attribution}
        imageLicense={hero?.license}
        tone="dark"
        stats={[
          { value: inr(stats.pgColleges), label: "PG colleges" },
          { value: inr(stats.pgBranches), label: "Branches" },
          { value: inr(stats.pgRanks), label: "Published cutoffs" },
        ]}
      />

      <div className="container-custom space-y-14 py-12 md:space-y-20 md:py-16">
        {/* ------------------------- who runs what ------------------------- */}
        <Reveal>
          <section>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              {copy.who_title}
            </h2>
            <p className="mt-2.5 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground md:text-base">
              {copy.who_intro}
            </p>

            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              {[
                {
                  icon: Landmark,
                  who: copy.mcc_name,
                  tone: "primary" as const,
                  runs: lines(copy.mcc_runs),
                  note: copy.mcc_note,
                },
                {
                  icon: Building2,
                  who: copy.state_name,
                  tone: "accent" as const,
                  runs: lines(copy.state_runs),
                  note: copy.state_note,
                },
              ].map(({ icon: Icon, who, tone, runs, note }) => (
                <div key={who} className="rounded-2xl border border-border bg-card p-6">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${
                      tone === "primary" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-heading mt-4 text-lg font-bold text-foreground">{who}</h3>
                  <ul className="mt-3.5 space-y-2">
                    {runs.map((r) => (
                      <li key={r} className="flex gap-2.5 text-[14.5px] leading-relaxed text-foreground/90">
                        <CheckCircle2
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            tone === "primary" ? "text-primary" : "text-accent"
                          }`}
                          aria-hidden="true"
                        />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 border-t border-border pt-3.5 text-[13.5px] leading-relaxed text-muted-foreground">
                    {note}
                  </p>
                </div>
              ))}
            </div>

            <div id="schedule" className="mt-6 rounded-2xl border border-border bg-surface-2 p-5">
              <h3 className="flex items-center gap-2.5 font-heading text-lg font-bold text-foreground">
                <CalendarClock className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                NEET PG {copy.schedule_year} counselling schedule
              </h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                MCC&rsquo;s tentative schedule, notified {copy.schedule_notified}. It is usually revised during the
                cycle — the notice is the authority, not this table. Academic session begins{" "}
                {copy.schedule_session}.
              </p>
              <p className="mt-3 text-[12px] text-muted-foreground sm:hidden" aria-hidden="true">
                Swipe the table sideways for every column →
              </p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-[12px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-semibold">Round</th>
                      <th scope="col" className="py-2 pr-3 font-semibold">AIQ / deemed (MCC)</th>
                      <th scope="col" className="py-2 pr-3 font-semibold">Join by</th>
                      <th scope="col" className="py-2 pr-3 font-semibold">State quota</th>
                      <th scope="col" className="py-2 font-semibold">Join by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.schedule.map((r) => (
                      <tr key={r.round} className="border-t border-border text-foreground">
                        <th scope="row" className="py-2.5 pr-3 font-semibold">{r.round}</th>
                        <td className="tnum py-2.5 pr-3">{r.aiq}</td>
                        <td className="tnum py-2.5 pr-3">{r.aiqJoinBy}</td>
                        <td className="tnum py-2.5 pr-3">{r.state}</td>
                        <td className="tnum py-2.5">{r.stateJoinBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="mt-3 space-y-1 text-[13px]">
                {sources.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary-strong underline-offset-2 hover:underline"
                    >
                      {s.label} (PDF)
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </Reveal>

        {/* ---------------------------- the rounds ---------------------------- */}
        <Reveal>
          <section>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              {copy.rounds_title}
            </h2>
            <p className="mt-2.5 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground md:text-base">
              {copy.rounds_intro}
            </p>
            <div className="mt-7">
              <RoundTimeline steps={content.rounds} />
            </div>
          </section>
        </Reveal>

        {/* ------------------------ float or freeze ------------------------ */}
        <Reveal>
          <section className="overflow-hidden rounded-3xl border border-border bg-surface-2">
            <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
              <div className="p-6 md:p-9">
                <span className="inline-flex items-center gap-2 rounded-full border border-signal-borderline/30 bg-signal-borderline/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-signal-borderline">
                  <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.float_badge}
                </span>
                <h2 className="font-heading mt-4 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                  {copy.float_title}
                </h2>
                <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground md:text-base">
                  {copy.float_p1}
                </p>
                <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground md:text-base">
                  {copy.float_p2}
                </p>

                <Link
                  href="/neet-college-predictor?course=pg"
                  className="mt-7 inline-flex h-14 items-center justify-center gap-2.5 rounded-xl bg-gradient-brand px-7 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow-lg"
                >
                  <Search className="h-5 w-5" aria-hidden="true" />
                  {copy.float_cta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="border-t border-border bg-card p-6 md:p-9 lg:border-l lg:border-t-0">
                <h3 className="font-heading text-[15px] font-bold uppercase tracking-wide text-muted-foreground">
                  {copy.held_title}
                </h3>
                <dl className="mt-5 space-y-5">
                  {[
                    {
                      value: inr(stats.pgRanks),
                      label: copy.held_ranks_label,
                      note: copy.held_ranks_note.replace("{colleges}", inr(stats.pgColleges)).replace("{branches}", inr(stats.pgBranches)),
                    },
                    {
                      // Counted: the furthest round the PG data reaches, mock rounds aside.
                      value: span ?? "—",
                      label: copy.held_rounds_label,
                      note: copy.held_rounds_note,
                    },
                    {
                      // Counted live (getTightenedTotal): seats whose every later
                      // round closed at a *better* rank than round 1 did, per year,
                      // grouped as the after-round-1 tab groups them. Typed as 2,595
                      // until 2026-10-18, which counted KEA's mock rounds as "later".
                      value: tightened != null ? inr(tightened) : "—",
                      label: copy.held_tight_label,
                      note: copy.held_tight_note,
                    },
                  ].map(({ value, label, note }) => (
                    <div key={label}>
                      <dt className="sr-only">{label}</dt>
                      <dd>
                        <span className="tnum font-heading block text-3xl font-extrabold leading-none text-foreground">
                          {value}
                        </span>
                        <span className="mt-1.5 block text-[14px] font-semibold text-foreground">
                          {label}
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
                          {note}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ----------------------------- documents ----------------------------- */}
        <Reveal>
          <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                {copy.docs_title}
              </h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground md:text-base">
                {copy.docs_intro}
              </p>
              <p className="mt-4 flex gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-[14px] leading-relaxed text-muted-foreground">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {copy.docs_note}
              </p>
            </div>

            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {lines(copy.docs_list).map((d) => (
                <li
                  key={d}
                  className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3 text-[14px] leading-relaxed text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  {d}
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        {/* ----------------------------- mistakes ----------------------------- */}
        <Reveal>
          <section>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              {copy.mistakes_title.replace("{count}", WORDS[content.mistakes.length] ?? String(content.mistakes.length))}
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {content.mistakes.map(({ title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-border bg-card p-5 md:p-6"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-signal-stretch/10">
                    <AlertTriangle className="h-5 w-5 text-signal-stretch" aria-hidden="true" />
                  </span>
                  <h3 className="font-heading mt-3.5 text-[16px] font-bold leading-snug text-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      </div>

      <LeadCapture level="pg" source="NEET PG process page" />
      <TelegramJoin placement="neet_pg_process" />
    </main>
  );
}
