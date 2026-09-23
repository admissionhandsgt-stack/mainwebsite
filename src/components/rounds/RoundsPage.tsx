import Link from "next/link";
import { TrendingDown, TriangleAlert, Sparkles } from "lucide-react";
import { getRoundMoves, getRoundFacets, type Level } from "@/lib/roundQueries";
import { hasAccessServer } from "@/lib/userAuth";
import PageHero from "@/components/ui/PageHero";
import RoundControls from "@/components/rounds/RoundControls";
import RoundTable from "@/components/rounds/RoundTable";
import UnlockCard from "@/components/lead/UnlockCard";
import LeadCapture from "@/components/lead/LeadCapture";
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";

const num = (n: number) => n.toLocaleString("en-IN");

interface Props {
  level: Level;
  basePath: string;
  collegeBase: string;
  predictorPath: string;
  searchParams: { rank?: string; category?: string };
  crumbs: { name: string; path: string }[];
}

/**
 * "After round 1" — the page both levels share.
 *
 * A rank predictor answers a round-1 question and stops. The decision that
 * costs people a year comes after: you hold a seat and have to choose whether
 * to float for something better or freeze what you have.
 *
 * This page answers it the only honest way the data allows — by showing what
 * already happened. Which seats round 1 did not reach and a later round did,
 * and which seats went the other way. Both counted, neither predicted.
 */
export default async function RoundsPage({
  level,
  basePath,
  collegeBase,
  predictorPath,
  searchParams,
  crumbs,
}: Props) {
  const facets = await getRoundFacets(level);
  const defaultCategory =
    facets.categories.find((c) => c === "UR" || c === "GEN") ?? facets.categories[0] ?? "UR";

  const rawRank = Number(String(searchParams.rank ?? "").replace(/[,\s]/g, ""));
  const rank = Number.isFinite(rawRank) && rawRank >= 1 && rawRank <= 2_000_000 ? rawRank : null;
  const category = searchParams.category || defaultCategory;

  const result = rank
    ? await getRoundMoves({ level, rank, category, limit: 40 })
    : null;

  // Same rule as the predictor: the two totals are free, the row-by-row
  // detail is not. This page renders on the server, so the cut has to happen
  // here — rendering all forty and hiding thirty would leave them in the HTML.
  const unlocked = await hasAccessServer();
  const PREVIEW_ROWS = 5;
  const openedRows = unlocked ? result?.opened ?? [] : (result?.opened ?? []).slice(0, PREVIEW_ROWS);
  const tightenedRows = unlocked
    ? result?.tightened ?? []
    : (result?.tightened ?? []).slice(0, PREVIEW_ROWS);
  const hiddenRows = result
    ? result.opened.length - openedRows.length + (result.tightened.length - tightenedRows.length)
    : 0;

  const exam = level.toUpperCase();
  const label = level === "ug" ? "MBBS" : "MD/MS";

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          webPage({
            name: `What opens up after round 1 — NEET ${exam}`,
            description: `Which ${label} seats were out of reach in round 1 and which a later round reached, from published closing ranks.`,
            path: basePath,
          }),
          breadcrumb([{ name: "Home", path: "/" }, ...crumbs]),
        ]}
      />

      <PageHero
        eyebrow={`NEET ${exam} counselling`}
        eyebrowIcon="sparkles"
        title="Round 1 is not the whole story."
        titleAccent="Here is what came after it."
        subtitle="Most tools stop at what your rank reaches in round 1. The decision that actually costs a year comes next — hold the seat, or float for something better. This shows what already happened in later rounds, both ways."
        image="/assets/images/exam/neet-exam.avif"
        tone="dark"
      />

      <div className="container-custom py-9 md:py-12">
        <RoundControls
          basePath={basePath}
          rank={rank}
          category={category}
          categories={facets.categories}
          level={level}
        />

        {!rank ? (
          <section className="mx-auto mt-10 max-w-2xl text-center">
            <h2 className="font-heading text-lg font-bold text-foreground">
              Enter a rank to see both sides
            </h2>
            <p className="mx-auto mt-2 max-w-[56ch] text-[15px] leading-relaxed text-muted-foreground">
              You will get two lists. Seats that round 1 closed above your rank but a later round
              reached — the case for floating. And seats that were within reach in round 1 and then
              closed <em>tighter</em> afterwards — the case for holding what you have.
            </p>
            <Link
              href={predictorPath}
              className="mt-5 inline-block rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary/40"
            >
              Not sure of your rank&apos;s reach? Start with the predictor
            </Link>
          </section>
        ) : (
          <>
            <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5">
                <div className="flex items-center gap-2 text-accent">
                  <TrendingDown className="h-4 w-4" aria-hidden="true" />
                  <span className="text-[11px] font-bold uppercase tracking-wide">
                    Opened after round 1
                  </span>
                </div>
                <div className="tnum mt-1 text-3xl font-extrabold text-foreground">
                  {num(result!.openedTotal)}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Seats round 1 closed above rank {num(rank)}, that a later round reached.
                </p>
              </div>

              <div className="rounded-2xl border border-signal-stretch/30 bg-signal-stretch/5 p-5">
                <div className="flex items-center gap-2 text-signal-stretch">
                  <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                  <span className="text-[11px] font-bold uppercase tracking-wide">
                    Tightened after round 1
                  </span>
                </div>
                <div className="tnum mt-1 text-3xl font-extrabold text-foreground">
                  {num(result!.tightenedTotal)}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Seats within reach in round 1 whose later rounds went to better ranks only.
                </p>
              </div>
            </div>

            <section className="mt-10">
              <h2 className="font-heading text-xl font-bold text-foreground">
                What opened up for rank {num(rank)}
              </h2>
              <p className="mt-1 max-w-[74ch] text-[14px] leading-relaxed text-muted-foreground">
                Upgrades free seats, and a freed seat goes to whoever is next on the list — which is
                why a later round can reach much further down than round 1 did. Sorted by how far
                the cut travelled.
              </p>
              <div className="mt-5">
                <RoundTable
                  moves={openedRows}
                  direction="opened"
                  collegeHref={(slug) => `${collegeBase}/${slug}`}
                  emptyNote={`No published seat for ${category} moved past rank ${num(rank)} after round 1. At this rank, round 1 is where the decision is made.`}
                />
              </div>
            </section>

            <section className="mt-12">
              <h2 className="font-heading text-xl font-bold text-foreground">
                What tightened — the reason floating is not free
              </h2>
              <p className="mt-1 max-w-[74ch] text-[14px] leading-relaxed text-muted-foreground">
                These seats were within reach in round 1 and then closed at better ranks. Had you
                given one up to chase an upgrade, you could not have taken it back.
              </p>
              <div className="mt-5">
                <RoundTable
                  moves={tightenedRows}
                  direction="tightened"
                  collegeHref={(slug) => `${collegeBase}/${slug}`}
                  emptyNote={`Nothing within reach of rank ${num(rank)} for ${category} closed tighter after round 1 in the years we hold.`}
                />
              </div>
            </section>
          </>
        )}

        {rank && !unlocked && hiddenRows > 0 && (
          <UnlockCard
            lockedCount={hiddenRows}
            level={level}
            rank={rank}
            category={category}
            noun="rows"
          />
        )}

        <section className="mx-auto mt-12 max-w-[74ch] rounded-2xl border border-border bg-surface-2 p-6">
          <h2 className="flex items-center gap-2 font-heading text-[15px] font-bold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            What this is, and what it is not
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            Every number here already happened. It is the published closing rank for that seat, in
            that round, in that year{result?.years.length ? ` (${result.years.join(", ")})` : ""}.
            None of it is a forecast, and a seat that opened up last year can close tighter this
            year — that is exactly what the second list shows.
          </p>
          <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
            Float and freeze rules differ by counselling authority, and giving a seat up is not
            always reversible. Read your own authority&apos;s notice before you act on any of this.
          </p>
        </section>

        <LeadCapture
          level={level}
          source={`After round 1 — ${exam}`}
          title="Holding a seat and unsure whether to float?"
          body="Send us the seat you have and your rank. We check it against every published round for that seat and the ones above it, and tell you what the record actually shows."
        />
      </div>
    </main>
  );
}
