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
import { resolveMetadata, getMediaAsset } from "@/lib/content";
import { getDataStats, inr } from "@/lib/dataStats";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import LeadCapture from "@/components/lead/LeadCapture";
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";
import RoundTimeline, { type RoundStep } from "@/components/neet-pg-process/RoundTimeline";

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

const ROUNDS: RoundStep[] = [
  {
    tag: "R1",
    title: "Round 1 — register, fill choices, lock",
    summary: "The only round where every seat is still on the table.",
    detail: [
      "Register separately for AIQ on mcc.nic.in and for your state on its own portal. They are different accounts, different fees and different deadlines — being registered for one does not register you for the other.",
      "Fill every college and branch you would genuinely accept, in true order of preference. Allotment walks your list from the top and stops at the first seat your rank reaches.",
      "Lock your choices before the deadline. An unlocked list is auto-locked as it stands, which is how people end up allotted to a choice they meant to delete.",
      "If allotted, report to the college within the reporting window with your originals. Miss it and the seat is gone — there is no extension.",
    ],
    watch:
      "Filling a short list. A list of ten choices means ten chances to be allotted; the candidates who go unallotted in round 1 are almost always the ones who filled only the colleges they wanted rather than every college they would accept.",
  },
  {
    tag: "R2",
    title: "Round 2 — upgrade, or hold what you have",
    summary: "The first point where a decision can cost you the seat in your hand.",
    detail: [
      "Candidates unallotted in round 1 get a fresh shot at everything still vacant.",
      "If you hold a round-1 seat you choose between keeping it and entering round 2 for something better. Entering means the round-1 seat goes back into the pool.",
      "Upgrades free seats further down, which is why a later round can reach much deeper than round 1 did.",
      "Fresh registration is normally open, so the competition is not only the people who were there in round 1.",
    ],
    watch:
      "Floating on the assumption that the cut always loosens. It usually does — but not everywhere, and a seat you give up is not held for you.",
  },
  {
    tag: "R3",
    title: "Round 3 / mop-up — the pool changes shape",
    summary: "Vacancies from every earlier round, opened up again.",
    detail: [
      "Seats surrendered, never reported to, or left vacant come back here.",
      "Deemed university seats in particular move a lot in this round, because candidates who were holding them for safety release them once they upgrade elsewhere.",
      "Rules on who may participate tighten as the rounds go on — read the current information bulletin rather than last year's advice.",
    ],
    watch:
      "Assuming mop-up is a formality for leftovers. Our data has round-3 cuts reaching far better ranks than round 2 in a meaningful slice of seats — for those, the best time to take the seat was earlier.",
  },
  {
    tag: "R4+",
    title: "Stray vacancy — the last call",
    summary: "Institute-level, fast, and effectively final.",
    detail: [
      "Whatever is still unfilled is allotted here, often by the institutes themselves under the authority's supervision.",
      "It moves quickly and the window is short. Decisions are made in days, not weeks.",
      "A seat accepted in a stray round is normally binding — the exits available earlier are not available now.",
    ],
    watch:
      "Treating this as a safety net for a whole strategy. By the time you reach it the choice is whatever nobody else took.",
  },
];

const DOCUMENTS = [
  "NEET PG scorecard and rank letter",
  "MBBS degree certificate and all mark sheets",
  "Internship completion certificate",
  "Permanent or provisional medical registration",
  "Class 10 certificate, for date of birth",
  "Category certificate (SC / ST / OBC-NCL / EWS), in the prescribed format",
  "PwBD certificate from a designated centre, if applicable",
  "Domicile or state-eligibility proof, for state counselling",
  "Photo ID, passport photographs, and the allotment letter",
];

const MISTAKES = [
  {
    title: "Registering for only one counselling",
    body: "AIQ and state quota run in parallel on separate portals. Registering for both is allowed and costs you nothing but the fee — skipping one halves your chances for no reason.",
  },
  {
    title: "Filling a short choice list",
    body: "Allotment can only give you a seat you asked for. Every college you would accept belongs on the list, in honest order.",
  },
  {
    title: "Reading the last round as the widest cut",
    body: "A final round can close far tighter than round 2, because upgrades free seats to much better ranks. Judging a college by its last round understates what it actually reached.",
  },
  {
    title: "Missing the reporting window",
    body: "The allotment is not the seat. Reporting with originals inside the window is the seat, and the deadline does not move.",
  },
];

/* ------------------------------------------------------------------ page */

export default async function NeetPgProcessPage() {
  const [stats, hero] = await Promise.all([getDataStats(), getMediaAsset("neet_hero")]);

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
        eyebrow="NEET PG counselling"
        eyebrowIcon="shield"
        title="NEET PG counselling,"
        titleAccent="explained in the order it happens."
        subtitle="Two authorities run at once, the rounds go further than most people expect, and one decision in round 2 can cost the seat you already hold. Here is the whole process, with the numbers from the published results rather than from advice."
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
              Two counsellings, running at the same time
            </h2>
            <p className="mt-2.5 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground md:text-base">
              This is the part that catches people out. There is no single queue for PG seats — your
              rank is being used by two different authorities, on two different portals, with two
              different deadlines. You may take part in both.
            </p>

            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              {[
                {
                  icon: Landmark,
                  who: "MCC — mcc.nic.in",
                  tone: "primary" as const,
                  runs: [
                    "50% All India Quota in state government colleges",
                    "All seats in central universities and central institutes",
                    "All deemed university seats",
                    "ESIC and armed forces seats",
                  ],
                  note: "No domicile requirement. Any qualified candidate from any state can take part.",
                },
                {
                  icon: Building2,
                  who: "Your state authority",
                  tone: "accent" as const,
                  runs: [
                    "The other 50% of government seats in that state",
                    "Most private medical college seats in that state",
                    "State-specific quotas and reservations",
                  ],
                  note: "Domicile or state-eligibility rules apply, and they differ from state to state.",
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

            <p className="mt-5 flex gap-3 rounded-2xl border border-border bg-surface-2 px-5 py-4 text-[14.5px] leading-relaxed text-muted-foreground">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="font-semibold text-foreground">We do not publish dates here.</span>{" "}
                MCC and each state release their own schedule every cycle and it shifts. Anything on
                this site with a date on it comes from the authority&rsquo;s own notice.
              </span>
            </p>
          </section>
        </Reveal>

        {/* ---------------------------- the rounds ---------------------------- */}
        <Reveal>
          <section>
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
              The rounds, in the order they happen
            </h2>
            <p className="mt-2.5 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground md:text-base">
              Each round changes what the next one can offer you, so the order matters more than any
              single round does.
            </p>
            <div className="mt-7">
              <RoundTimeline steps={ROUNDS} />
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
                  The decision that costs a year
                </span>
                <h2 className="font-heading mt-4 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
                  Float or freeze
                </h2>
                <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground md:text-base">
                  You hold a seat from round 1 and have to decide whether to chase something better.
                  Everyone will tell you the cut always loosens. Usually it does — and for a real
                  slice of seats it does the opposite, closing at <em>better</em> ranks in later
                  rounds than it did in round 1. Give one of those up and you cannot take it back.
                </p>
                <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground md:text-base">
                  There is no honest way to answer this with an opinion. The only answer is what
                  actually happened, at your rank, in your category — which is what we publish.
                </p>

                <Link
                  href="/neet-college-predictor?course=pg"
                  className="mt-7 inline-flex h-14 items-center justify-center gap-2.5 rounded-xl bg-gradient-brand px-7 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow-lg"
                >
                  <Search className="h-5 w-5" aria-hidden="true" />
                  See what moved at your rank
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="border-t border-border bg-card p-6 md:p-9 lg:border-l lg:border-t-0">
                <h3 className="font-heading text-[15px] font-bold uppercase tracking-wide text-muted-foreground">
                  What the published results hold
                </h3>
                <dl className="mt-5 space-y-5">
                  {[
                    {
                      value: inr(stats.pgRanks),
                      label: "PG closing ranks, round by round",
                      note: `Across ${inr(stats.pgColleges)} colleges and ${inr(stats.pgBranches)} branches.`,
                    },
                    {
                      value: "R1 – R5",
                      label: "Rounds our PG data covers",
                      note: "Counselling does not stop after round 2, and the numbers show it.",
                    },
                    {
                      // Counted, not quoted: seats whose every later round
                      // closed at a *better* rank than round 1 did, across
                      // 2024-25. CLAUDE.md carried 2,795 for this; the query
                      // says 2,595, and the query is the thing that is true.
                      value: "2,595",
                      label: "PG seats that tightened after round 1",
                      note: "Every later round closed at a better rank than round 1 did. Give one of those up and it is gone.",
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
                What to have ready
              </h2>
              <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground md:text-base">
                Originals, at reporting. A missing certificate on the day is the most avoidable way
                to lose an allotted seat, and the reporting window is too short to arrange one.
              </p>
              <p className="mt-4 flex gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3.5 text-[14px] leading-relaxed text-muted-foreground">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                Category and PwBD certificates must be in the format the authority prescribes. The
                right document in the wrong format is treated as a missing document.
              </p>
            </div>

            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {DOCUMENTS.map((d) => (
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
              Four mistakes that cost people a seat
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {MISTAKES.map(({ title, body }) => (
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
    </main>
  );
}
