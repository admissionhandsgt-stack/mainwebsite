import type { Metadata } from "next";
import { resolveMetadata } from "@/lib/content";
import { getAllFacets } from "@/lib/predictorFacets";
import ChanceFinder from "@/components/predictor/ChanceFinder";
import PredictorHero from "@/components/predictor/PredictorHero";
import TrustShield from "@/components/home/TrustShield";
import CounsellorEdge from "@/components/home/CounsellorEdge";
import TelegramJoin from "@/components/engage/TelegramJoin";
import StructuredData, { webPage, breadcrumb, faqPage } from "@/components/seo/StructuredData";
import { getLiveFigures } from "@/lib/liveFigures";
import { getDataStats, approxLakh, inr, yearSpan } from "@/lib/dataStats";
import { CHANCE, CHANCE_ORDER } from "@/lib/chance";
import { fitTitle, fitDescription } from "@/lib/seoTitle";
import { currentUser } from "@/lib/userAuth";
import { getProfile } from "@/lib/counsellingProfile";
import type { Viewer } from "@/components/predictor/chanceTypes";

export const dynamic = "force-dynamic";

/**
 * One tool for every NEET stream — the Admission Chance flow (2026-10-12).
 *
 * The URL is the search term ("NEET college predictor"); what it does changed:
 * a rank gets a free possibility report, and the colleges themselves — in
 * chance words, never closing ranks — come after a verified sign-in and the
 * questions a counsellor needs. See ChanceFinder for the stages.
 */
/** The counselling year the tool serves: the newest year in the data it reads. */
const yearOf = (stats: Awaited<ReturnType<typeof getDataStats>>) => Math.max(0, ...stats.ugYears, ...stats.pgYears) || null;

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getDataStats();
  const year = yearOf(stats);
  const y = year ? ` ${year}` : "";
  return resolveMetadata("/neet-college-predictor", {
    title: fitTitle(`NEET College Predictor${y} — MBBS, BDS & MD/MS Chances by Rank`, `NEET College Predictor${y}: MBBS, BDS & MD/MS by Rank`, `NEET College Predictor${y}`),
    description: fitDescription(
      `Free NEET college predictor${y}: enter your NEET UG or PG rank and see the seats and colleges it reached, by chance — MBBS, BDS, MD/MS and DNB — from ${approxLakh(stats.totalRanks)} published closing ranks.`,
      `Free NEET college predictor${y}: enter your NEET rank and see the MBBS, BDS and MD/MS seats it reached, by chance, from ${approxLakh(stats.totalRanks)} published closing ranks.`,
    ),
    keywords: [
      "NEET college predictor",
      "NEET UG college predictor",
      "NEET PG college predictor",
      "MBBS college predictor",
      "BDS college predictor",
      "MD MS seat predictor",
      "NEET rank wise college",
      "medical college predictor India",
    ].join(", "),
  });
}

export default async function NeetCollegePredictorPage() {
  const [facets, user, stats, live] = await Promise.all([getAllFacets(), currentUser(), getDataStats(), getLiveFigures()]);
  const profile = user ? await getProfile(user.id).catch(() => null) : null;

  const viewer: Viewer = {
    signedIn: Boolean(user),
    verified: Boolean(user?.verified),
    name: user?.name ?? null,
    profile,
  };

  // Only what the client needs from the facets.
  const slim = (f: (typeof facets)["mbbs"]) => ({
    states: f.states,
    categories: f.categories,
    branches: f.branches,
    ownerships: f.ownerships,
  });
  const faqs = predictorFaqs(stats);
  const allStates = Array.from(new Set([...facets.mbbs.states, ...facets.pg.states, ...facets.bds.states])).sort(
    (a, b) => a.localeCompare(b),
  );

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          webPage({
            name: "NEET College Predictor",
            description:
              "A free possibility report for a NEET rank — seats and colleges reached, by chance — for MBBS, BDS and MD/MS.",
            path: "/neet-college-predictor",
          }),
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET College Predictor", path: "/neet-college-predictor" },
          ]),
          faqPage(faqs),
        ]}
      />

      <section className="relative overflow-hidden border-b border-border bg-surface-2">
        <div className="ambient-blob animate-drift pointer-events-none absolute -right-24 -top-32 h-[24rem] w-[24rem] bg-primary/20" aria-hidden="true" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden="true" />
        <div className="relative">
      <ChanceFinder
        facets={{ mbbs: slim(facets.mbbs), bds: slim(facets.bds), pg: slim(facets.pg) }}
        allStates={allStates}
        viewer={viewer}
        hero={<PredictorHero />}
      />
        </div>
      </section>

      <HowItWorks stats={stats} faqs={faqs} nmcColleges={live.nmc_colleges} />

      <div className="border-t border-border">
        <CounsellorEdge />
      </div>

      <TelegramJoin placement="predictor" />

      <div className="border-t border-border bg-surface-2">
        <TrustShield />
      </div>
    </main>
  );
}

type Stats = Awaited<ReturnType<typeof getDataStats>>;

/** The questions people ask about the tool, answered from what it actually does and reads. */
function predictorFaqs(stats: Stats) {
  return [
    {
      question: "Is the NEET college predictor free?",
      answer:
        "Yes. The possibility report — how many seats and colleges your rank reached, by chance — is free for anyone. Your own list of colleges appears after a free sign-in with your mobile number, for up to three rank checks a day.",
    },
    {
      question: "Which data does the NEET college predictor use?",
      answer: `The closing ranks MCC and the state counselling authorities publish: ${approxLakh(stats.totalRanks)} rank records across ${inr(stats.seatOptions)} seat options and ${inr(stats.counsellings)} counsellings — NEET UG ${yearSpan(stats.ugYears)} and NEET PG ${yearSpan(stats.pgYears)}, every round including mop-up and stray.`,
    },
    {
      question: "What do High chance, Good chance, Possible and Reach mean?",
      answer: CHANCE_ORDER.map((b) => `${CHANCE[b].label}: ${CHANCE[b].hint}`).join(" "),
    },
    {
      question: "Does it work for NEET PG, DNB and BDS?",
      answer:
        "Yes. One tool covers MBBS and BDS for NEET UG, and MD, MS, DNB and diploma branches for NEET PG, from the same published results. Choose the course before you enter your rank.",
    },
    {
      question: "Why does it show chances instead of exact closing ranks?",
      answer:
        "Because one closing rank on its own misleads: the same college closes at very different ranks for each quota, category and round. The predictor reads all of them for your rank and category and gives you the chance in words; a counsellor takes you through the round-by-round detail.",
    },
    {
      question: "How accurate is the NEET college predictor?",
      answer:
        "It is a record of where seats actually closed, not a forecast. Seat matrices, cutoffs and candidate numbers change every year, so a High chance seat is likely, not guaranteed — which is why a counsellor checks your list against this year's rounds before you fill choices.",
    },
  ];
}

/** What the tool does and what it reads — in words, on the page, for people and for search. */
function HowItWorks({ stats, faqs, nmcColleges }: { stats: Stats; faqs: { question: string; answer: string }[]; nmcColleges: string }) {
  const steps = [
    "Choose MBBS, BDS or MD/MS, then enter your NEET rank and category.",
    "Get a free possibility report at once: how many seat options, colleges and states your rank reached in past rounds, grouped by chance, and where your rank stands among everyone who sat the paper.",
    "Sign in with a code sent to your WhatsApp, and answer the questions a counsellor would ask — domicile, budget, seat types, and branches for PG.",
    "See your colleges in plain words — High chance, Good chance, Possible or Reach — with an approximate fee bracket. A counsellor then helps you put them in order.",
  ];
  return (
    <section className="border-t border-border bg-background">
      <div className="container-custom grid gap-10 py-14 lg:grid-cols-2 lg:gap-14">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground md:text-[28px]">How the NEET college predictor works</h2>
          <ol className="mt-5 space-y-3">
            {steps.map((t, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-muted-foreground">
                <span className="tnum mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12.5px] font-bold text-primary-strong dark:text-primary">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>

          <h2 className="font-heading mt-10 text-xl font-bold text-foreground">What it is built on</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Published closing ranks from MCC and the state counselling authorities:{" "}
            <b className="tnum text-foreground">{approxLakh(stats.totalRanks)}</b> rank records across{" "}
            <b className="tnum text-foreground">{inr(stats.seatOptions)}</b> seat options at the{" "}
            <b className="tnum text-foreground">{nmcColleges}</b> medical colleges on NMC&apos;s register, the BDS colleges
            and the DNB hospitals, in <b className="tnum text-foreground">{inr(stats.counsellings)}</b> counsellings — NEET UG {yearSpan(stats.ugYears)} and NEET PG{" "}
            {yearSpan(stats.pgYears)}, every round including mop-up and stray. A seat&apos;s chance comes from where that same seat closed
            in round 1, in the last round of the year, and in earlier years.
          </p>
          <ul className="mt-4 space-y-2">
            {CHANCE_ORDER.map((b) => (
              <li key={b} className="text-[14.5px] leading-relaxed text-muted-foreground">
                <b className="text-foreground">{CHANCE[b].label}</b> — {CHANCE[b].hint}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13.5px] leading-relaxed text-muted-foreground">
            It is history, not a forecast: seat matrices and cutoffs move every year, and your counsellor checks the list against this
            year&apos;s rounds.
          </p>
        </div>

        {/* Sticky beside the longer explanation on a laptop, so its column never shows a gap (2026-10-21). */}
        <div className="lg:sticky lg:top-[calc(var(--site-top,112px)_+_1rem)] lg:self-start">
          <h2 className="font-heading text-2xl font-bold text-foreground md:text-[28px]">Questions about the predictor</h2>
          <div className="mt-5 space-y-3">
            {faqs.map((f) => (
              <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
                <summary className="cursor-pointer text-[15px] font-semibold text-foreground">{f.question}</summary>
                <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
