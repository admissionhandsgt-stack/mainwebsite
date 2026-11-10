import type { Metadata } from "next";
import { CalendarClock, MessageCircle, Phone, Search } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { getBlocks, resolveMetadata, type ContentBlock } from "@/lib/content";
import { getLowRankClinical, RANK_MILESTONES, CATEGORIES, type ClinicalRow, type Cut, type Family } from "@/lib/lowRankClinical";
import { getDeemedPg, getPrivatePgFees } from "@/lib/pgFeeQueries";
import { getSeatMatrixOverview } from "@/lib/pgSeatData";
import { getTelegramCue } from "@/lib/mccResults";
import { getPgProcessContent } from "@/lib/pgProcessContent";
import { scoreRange } from "@/lib/scoreRank";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { CONTACT_INFO } from "@/lib/constants";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import ExpertCompare from "@/components/lead/ExpertCompare";
import { getCounsellingFacts } from "@/lib/counsellingFacts";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";

/**
 * /neet-pg-low-score-clinical-branches (2026-11-10). Written as a landing page (owner, same day: "marketing ads ki trh
 * banana tha… aise users ko target kare, keywords target kare… counselors ne strategy ke sath ye seat dilwayi"): it
 * answers the searches people type — "neet pg rank vs branch", "50k rank in neet pg", "1 lakh rank", "neet pg 300 marks",
 * "rank required for md medicine", "clinical branches in neet pg" — and sends every reader to a counsellor.
 *
 * Every figure is a group figure from MCC's own results (lib/lowRankClinical.ts): the last rank admitted in a seat family
 * over three or more colleges, with the score that rank held. No college is named and no college's rank appears. Which
 * colleges, at what fee and bond, in which round — that is the counsellor's, and every section says so.
 *
 * Students' seats ("our students got…") come only from Admin → Content → "Low rank clinical: students' seats"
 * (`low_rank_cases`), real cases the team enters with the student's permission; with no rows the section is not shown.
 * None is ever written here.
 */
export const revalidate = 3600;
const PATH = "/neet-pg-low-score-clinical-branches";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const lakh = (v: number | null | undefined) => (v == null ? "—" : `₹${(v / 1e5).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, "")} L`);
/** "50K", "1 lakh", "1.25 lakh" — how a rank is said in a search. */
const said = (r: number) => (r >= 1_00_000 ? `${+(r / 1_00_000).toFixed(2)} lakh` : `${r / 1000}K`);
/** "MD General Medicine", "MS Orthopaedics" — the degree from the branch page's slug. */
const degree = (r: ClinicalRow) => `${r.slug?.startsWith("ms-") ? "MS" : "MD"} ${r.branch}`;
/** Example students for the plans section: a rank, who they are, and what they can pay. */
const PROFILES = [
  { rank: 40_000, who: "Open category · wants a government-fee seat", paid: false },
  { rank: 1_00_000, who: "Open category · family can fund a paid seat", paid: true },
  { rank: 1_60_000, who: "Just qualified · ready for a paid seat", paid: true },
];
/** The NEET PG scores people search with: "neet pg 250 marks clinical branch". */
const SCORE_MILESTONES = [400, 350, 300, 250, 200];
const FAMILY_LABEL: Record<Family, string> = { aiq: "Government seats, All India Quota (open)", dnb: "DNB in hospitals (open)", deemed: "Deemed universities' paid seats" };

async function load() {
  const [d, deemed, overview, privateFees] = await Promise.all([
    getLowRankClinical().catch(() => null),
    getDeemedPg().catch(() => null),
    getSeatMatrixOverview().catch(() => null),
    getPrivatePgFees().catch(() => null),
  ]);
  if (!d || !d.years.length) return null;
  const nowYear = d.years[d.years.length - 1];
  const year = d.runningRound ? d.years[0] : nowYear;
  const cut = (r: ClinicalRow | undefined, y: number, f: Family): Cut | undefined => r?.cuts[y]?.[f];
  const byName = (b: string) => d.rows.find((r) => r.branch === b);
  const med = byName("General Medicine");
  const surg = byName("General Surgery");
  const deepest = (y: number, f: Family) =>
    d.rows
      .map((r) => ({ r, c: cut(r, y, f) }))
      .filter((x): x is { r: ClinicalRow; c: Cut } => !!x.c)
      .sort((a, b) => b.c.rank - a.c.rank);
  const deep = deepest(year, "deemed");
  const deepAiq = deepest(year, "aiq");
  const deepNow = nowYear !== year ? deepest(nowYear, "deemed") : [];
  // Each milestone rank: the branches whose last seat in `year` went at that rank or later, family by family.
  const bands = RANK_MILESTONES.filter((m) => m <= (d.ranked[year] ?? 0)).map((m) => ({
    rank: m,
    score: d.milestones[year]?.find((x) => x.rank === m) ?? null,
    scoreNow: nowYear !== year ? d.milestones[nowYear]?.find((x) => x.rank === m) ?? null : null,
    reach: (["aiq", "dnb", "deemed"] as Family[]).map((f) => ({ family: f, branches: d.rows.filter((r) => (cut(r, year, f)?.rank ?? 0) >= m).map((r) => r.branch) })),
  }));
  const fee = deemed?.national.find((b) => /management/i.test(b.family));
  const stray = overview?.rounds.find((r) => r.year === year && /^stray/i.test(r.round))?.allotted ?? null;
  const dnbFee = privateFees?.national.find((b) => /DNB/i.test(b.family)) ?? null;
  // Score cards: the rank each score held in the newest year, and the branches whose seats went that far in `year`.
  const scores = (
    await Promise.all(
      SCORE_MILESTONES.map(async (sc) => {
        const r = await scoreRange("pg", sc).catch(() => null);
        if (!r?.ok) return null;
        const at = r.range.rankMax;
        return {
          score: sc,
          range: r.range,
          reach: (["aiq", "dnb", "deemed"] as Family[]).map((f) => ({ family: f, branches: d.rows.filter((x) => (cut(x, year, f)?.rank ?? 0) >= at).map((x) => x.branch) })),
        };
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => !!x);
  // Example plans: what a counsellor would put first, next and last for a student at each example rank.
  const plans = PROFILES.filter((x) => x.rank <= (d.ranked[year] ?? 0)).map((x) => {
    const at = (f: Family) => d.rows.filter((r) => (cut(r, year, f)?.rank ?? 0) >= x.rank).map((r) => r.branch);
    const near = d.rows.filter((r) => {
      const c = cut(r, year, "aiq")?.rank ?? 0;
      return c < x.rank && c >= x.rank * 0.75;
    });
    return { ...x, aiq: at("aiq"), dnb: at("dnb"), deemed: at("deemed"), near: near.map((r) => r.branch), score: d.milestones[year]?.find((m) => m.rank === x.rank) ?? null };
  });
  return { d, year, nowYear, med, surg, deep, deepAiq, deepNow, cut, fee, bands, stray, dnbFee, scores, plans };
}

/** The round whose choice filling is next, with its dates from the admin's schedule; null between rounds. */
async function liveRound(): Promise<{ label: string; filling?: string; locking?: string } | null> {
  const [cue, { schedule }] = await Promise.all([getTelegramCue(), getPgProcessContent()]);
  if (!cue) return null;
  const label = cue.label.replace(/\b\w/g, (c) => c.toUpperCase());
  const key = label.toLowerCase().startsWith("stray") ? "stray" : label.toLowerCase();
  const row = schedule.find((s) => s.round.trim().toLowerCase().startsWith(key));
  return row?.choiceFilling ? { label, filling: row.choiceFilling, locking: row.choiceLocking } : null;
}

const scoreText = (c?: { score: number | null; outOf: number | null } | null) => (c?.score != null ? `${c.score}/${c.outOf}` : "—");

export async function generateMetadata(): Promise<Metadata> {
  const p = await load();
  const medC = p ? p.cut(p.med, p.year, "deemed") : undefined;
  const surgC = p ? p.cut(p.surg, p.year, "deemed") : undefined;
  return resolveMetadata(PATH, {
    title: fitTitle(
      `NEET PG Low Rank Clinical Branch ${p?.nowYear ?? ""}: Rank vs Branch (50K–2L)`.replace("  ", " "),
      `NEET PG Low Rank Clinical Branch ${p?.nowYear ?? ""}: Rank vs Branch`.replace("  ", " "),
      `Low Score Clinical Branches in NEET PG ${p?.nowYear ?? ""}`.trim(),
      "NEET PG Low Rank Clinical Branch",
    ),
    description: fitDescription(
      ...(p && medC
        ? [
            `Rank 50K, 1 lakh, 1.5 lakh? In ${p.year} MD Medicine went to AIR ${n(medC.rank)}${surgC ? ` and MS Surgery to AIR ${n(surgC.rank)}` : ""} on paid seats. Rank vs clinical branch, score, and how counsellors plan the seat.`,
            `In ${p.year} MD Medicine went to AIR ${n(medC.rank)} (score ${scoreText(medC)}) on deemed paid seats. NEET PG rank vs clinical branch, from 25K to 2 lakh.`,
          ]
        : []),
      "Which clinical branch a low NEET PG rank reached — MD Medicine, Surgery, Ortho and the rest — rank by rank, from MCC's own results.",
    ),
    keywords:
      "NEET PG low rank clinical branch, NEET PG rank vs branch, low score clinical branches NEET PG, just eligible NEET PG clinical branch, NEET PG just qualified clinical branch, 50k rank in NEET PG, 1 lakh rank NEET PG clinical branch, NEET PG 250 marks clinical branch, NEET PG 300 marks clinical branch, lowest rank for MD medicine, lowest rank for MS orthopaedics, rank required for MD medicine, clinical branches in NEET PG, NEET PG SC rank clinical branch, OBC rank MD medicine, DNB at low rank, stray round clinical branch, deemed university MD medicine rank",
  });
}

export default async function LowScoreClinicalPage() {
  const [p, round, cases, s300, facts] = await Promise.all([
    load(),
    liveRound().catch(() => null),
    getBlocks("low_rank_cases").catch((): ContentBlock[] => []),
    scoreRange("pg", 300).catch(() => null),
    getCounsellingFacts().catch(() => null),
  ]);
  const medDeemed = p ? p.cut(p.med, p.year, "deemed") : undefined;
  const medAiq = p ? p.cut(p.med, p.year, "aiq") : undefined;
  const surgDeemed = p ? p.cut(p.surg, p.year, "deemed") : undefined;
  const top = p?.deep[0];
  const topNow = p?.deepNow[0];
  const tokens = {
    year: p?.year,
    now_year: p?.nowYear,
    med_rank: n(medDeemed?.rank),
    med_score: scoreText(medDeemed),
    surg_rank: n(surgDeemed?.rank),
    deep_branch: top?.r.branch,
    deep_rank: n(top?.c.rank),
    deep_score: scoreText(top?.c),
    ranked: n(p?.d.ranked[p?.year ?? 0]),
    deemed_fee: p?.fee?.p10 && p.fee.p90 ? `${lakh(p.fee.p10)} – ${lakh(p.fee.p90)}` : "more than a government seat",
    stray: n(p?.stray),
    moved_pct: facts?.movedAfterR1.pg,
    round: round?.label,
    filling: round?.filling,
    locking: round?.locking ?? "see MCC's schedule",
  };
  const [copy, body, heroImage] = await Promise.all([
    pageCopy("page.pg_low_clinical.hero", tokens),
    pageCopy("page.pg_low_clinical.body", tokens),
    pageHeroImage("page.pg_low_clinical.hero", "page.pg_branch.hero"),
  ]);
  const wa = (text: string) => `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(text)}`;
  const lines = (t: string) => t.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((x) => x[0] && x[1]);
  const routes = lines(body.routes);
  const steps = lines(body.strategy);
  // A case whose figure is missing ("AIR —") reads wrong: dropped.
  const caseTypes = lines(body.case_types).filter((x) => x[2] && !/AIR —|(^|\s)%/.test(x[2]));
  const points = body.counsel_points.split("\n").map((x) => x.trim()).filter(Boolean);
  const eligiblePoints = body.eligible_points.split("\n").map((x) => x.trim()).filter(Boolean);
  const deepestFor = (cat: (typeof CATEGORIES)[number]) =>
    p
      ? p.d.rows
          .map((r) => ({ r, c: r.aiqByCategory[p.year]?.[cat] }))
          .filter((x): x is { r: ClinicalRow; c: Cut } => !!x.c)
          .sort((a, b) => b.c.rank - a.c.rank)
      : [];
  const answerReady = !!(medDeemed && surgDeemed);
  const realCases = cases.filter((c) => c.title && c.subtitle);
  const s300Rank = s300?.ok ? s300.range : null;
  const band = (rank: number) => p?.bands.find((b) => b.rank === rank);
  const reachAt = (rank: number) => {
    const b = band(rank);
    return b ? b.reach.filter((x) => x.branches.length).map((x) => `${FAMILY_LABEL[x.family].toLowerCase()}: ${x.branches.join(", ")}`).join("; ") : "";
  };

  const faqs =
    p && medDeemed && top
      ? [
          ...(band(1_00_000)
            ? [
                {
                  question: "Which clinical branch can I get at 1 lakh rank in NEET PG?",
                  answer: `In ${p.year}, at AIR 1,00,000 (score ${scoreText(band(1_00_000)?.score)}), these clinical branches still had seats going at that rank or later — ${reachAt(1_00_000) || "none"}. Which colleges, and at what fee, depends on your category and state; a counsellor lists them for you.`,
                },
              ]
            : []),
          ...(band(50_000) && medAiq
            ? [
                {
                  question: "Can I get MD General Medicine at 50,000 rank?",
                  answer: `Not on a government seat in the All India Quota: in ${p.year} that closed at AIR ${n(medAiq.rank)} for the open category. On deemed universities' paid seats MD General Medicine went to AIR ${n(medDeemed.rank)}, so yes — at a paid seat's fee. State quota and management seats close at their own ranks, and those depend on your domicile.`,
                },
              ]
            : []),
          ...(s300Rank
            ? [
                {
                  question: "Is a clinical branch possible with 300 marks in NEET PG?",
                  answer: `A score of 300 out of ${s300Rank.outOf} in NEET PG ${s300Rank.year} was rank ${n(s300Rank.rankMin)} – ${n(s300Rank.rankMax)}. In ${p.year}, deemed universities' paid seats went further than that in ${p.deep.filter((x) => x.c.rank >= s300Rank.rankMax).length} of ${p.deep.length} clinical branches. Those are paid seats, and most of them fill in the later rounds.`,
                },
              ]
            : []),
          ...(medAiq
            ? [
                {
                  question: "What rank is required for MD Medicine in a government college?",
                  answer: `In MCC's All India Quota, the last government MD General Medicine seat for the open category went to AIR ${n(medAiq.rank)} (score ${scoreText(medAiq)}) in ${p.year}, over ${medAiq.colleges} colleges. Reserved categories and each state's own quota close at other ranks.`,
                },
              ]
            : []),
          {
            question: "I am just eligible in NEET PG. Can I still get a clinical branch?",
            answer: `Possibly, but only on paid seats and only in the later rounds. In ${p.year} the deepest clinical seat on deemed universities' paid seats went to AIR ${n(top.c.rank)} (${top.r.branch}, score ${scoreText(top.c)}) out of ${n(p.d.ranked[p.year])} ranked${p.stray ? `, and MCC's stray vacancy round allotted ${n(p.stray)} seats` : ""}. Past that rank, look at the states' own management and NRI quotas. Register in every counselling you are eligible for and keep your budget and documents ready.`,
          },
          ...(["SC", "ST", "OBC", "EWS"] as const)
            .map((cat) => ({ cat, list: deepestFor(cat) }))
            .filter((x) => x.list.length)
            .map(({ cat, list }) => ({
              question: `Which clinical branch can a ${cat} candidate get at a low rank in NEET PG?`,
              answer: `On government seats in MCC's All India Quota, ${p.year}, ${cat} category: ${list
                .slice(0, 4)
                .map((x) => `${degree(x.r)} to AIR ${n(x.c.rank)}`)
                .join(", ")}. Deemed universities' paid seats have no category reservation and went much further — MD General Medicine to AIR ${n(medDeemed.rank)}.`,
            })),
          ...(p.dnbFee?.median
            ? [
                {
                  question: "Which is the cheapest clinical seat at a low rank?",
                  answer: `DNB in hospitals: the fee is about ${lakh(p.dnbFee.median)} a year and the hospital pays a stipend. Clinical DNB seats close earlier than deemed paid seats — in ${p.year} the deepest open-category clinical DNB seat went to AIR ${n(p.d.rows.map((r) => p.cut(r, p.year, "dnb")?.rank ?? 0).reduce((a, b) => Math.max(a, b), 0))}.`,
                },
              ]
            : []),
          {
            question: "Is it worth waiting for round 3 and the stray round with a low rank?",
            answer: `For a clinical branch at a low rank, the last rounds are where most such seats are filled: upgrades free seats every round and the widest ranks come at the end${p.stray ? ` (MCC's stray round alone allotted ${n(p.stray)} seats in ${p.year})` : ""}. Waiting pays only if you know which seat to hold meanwhile and what leaving it costs in that round.`,
          },
          {
            question: "Which is the easiest clinical branch to get at a low rank?",
            answer: `By how far its seats went in ${p.year}: on deemed paid seats, ${p.deep
              .slice(0, 3)
              .map((x) => `${x.r.branch} (AIR ${n(x.c.rank)})`)
              .join(", ")}; on government seats in the All India Quota, ${p.deepAiq
              .slice(0, 3)
              .map((x) => `${x.r.branch} (AIR ${n(x.c.rank)})`)
              .join(", ")}.`,
          },
          {
            question: "Which are the clinical branches in NEET PG?",
            answer: `The ones asked about most: ${p.d.rows.map((r) => r.branch).join(", ")}. Others — such as Family Medicine, Geriatrics, Physical Medicine & Rehabilitation and Radiation Oncology — are clinical too, with fewer seats.`,
          },
          {
            question: "Why do paid seats go to such low ranks?",
            answer: `Deemed universities' paid seats cost far more than government seats${p.fee?.median ? ` — ${lakh(p.fee.median)} a year in the middle` : ""} — so many higher-ranked candidates pass on them. As the rounds go on they fall to candidates further down the list who can pay.`,
          },
        ]
      : [];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "Low rank clinical branches", path: PATH },
          ]),
          webPage({ name: "NEET PG low rank clinical branches", description: answerReady ? copy.answer : copy.subtitle, path: PATH }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "Low rank clinical branches" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={answerReady && copy.answer ? copy.answer : copy.subtitle}
        image={heroImage}
        topic="branch"
        cta={{ label: copy.cta, href: "#get-plan" }}
        telegram="hero_pg_low_clinical"
        source={copy.source}
        insights={
          p && top
            ? [
                ...(medDeemed ? [{ icon: "down" as const, label: `MD Medicine, deemed paid, ${p.year}`, value: `AIR ${n(medDeemed.rank)}`, note: `score ${scoreText(medDeemed)}` }] : []),
                { icon: "down" as const, label: `Deepest clinical seat, ${p.year}`, value: `AIR ${n(top.c.rank)}`, note: `${top.r.branch} · score ${scoreText(top.c)}` },
                ...(topNow ? [{ icon: "up" as const, label: `${p.nowYear} ${p.d.runningRound ?? ""} so far`.replace("  ", " "), value: `AIR ${n(topNow.c.rank)}`, note: `${topNow.r.branch} · score ${scoreText(topNow.c)}` }] : []),
                { icon: "people" as const, label: `Ranked in ${p.year}`, value: n(p.d.ranked[p.year]), note: "NBEMS result" },
              ]
            : undefined
        }
      />

      {round?.filling && (
        <div className="border-b border-accent/20 bg-accent-soft">
          <div className="container-custom flex flex-wrap items-center gap-3 py-3 text-[15px] text-foreground">
            <CalendarClock className="h-5 w-5 shrink-0 text-accent" aria-hidden />
            <p className="min-w-0 flex-1">{body.urgency}</p>
            <a href={wa(`Hi, please check my NEET PG ${round.label} choice order. My rank is ___ and category ___.`)} target="_blank" rel="noopener noreferrer" data-placement="low_clinical_round" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white">
              <MessageCircle className="h-4 w-4" aria-hidden /> Check my order
            </a>
          </div>
        </div>
      )}

      {p && (
        <nav aria-label="On this page" className="border-b border-border bg-background">
          <div className="container-custom flex flex-wrap items-center gap-x-1 gap-y-2 py-3 text-[13px]">
            <span className="mr-1 font-semibold text-foreground">On this page:</span>
            {[
              ["#rank-vs-branch", "Rank vs clinical branch (25K–2 lakh)"],
              ["#just-eligible", "Just eligible / just qualified"],
              ["#marks-vs-branch", "Marks vs branch (200–400)"],
              ["#cases", "Cases we work on"],
              ["#strategy", "Counsellor strategy"],
              ["#example-plans", "Example plans"],
              ["#by-category", "OBC, SC, ST, EWS"],
              ["#lowest-rank", "Lowest rank per branch"],
              ["#faq", "FAQs"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground hover:border-primary/40 hover:text-primary-strong">
                {label}
              </a>
            ))}
          </div>
        </nav>
      )}

      {p && p.bands.length > 0 && (
        <section id="rank-vs-branch" className="scroll-mt-28 container-custom py-10 md:py-14">
          <SectionHead icon="route" eyebrow="Rank vs branch" title={body.bands_title} intro={body.bands_intro} />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {p.bands.map((b) => {
              const any = b.reach.some((x) => x.branches.length);
              return (
                <article key={b.rank} id={`rank-${b.rank}`} className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <h3 className="font-heading text-lg font-bold text-foreground">NEET PG {said(b.rank)} rank: which clinical branch?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AIR {n(b.rank)} · score {scoreText(b.score)} in {p.year}
                    {b.scoreNow ? `, ${scoreText(b.scoreNow)} in ${p.nowYear}` : ""}
                  </p>
                  <div className="mt-4 flex-1 space-y-3">
                    {b.reach.map((x) => (
                      <div key={x.family}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{FAMILY_LABEL[x.family]}</p>
                        {x.branches.length ? (
                          <p className="mt-1 flex flex-wrap gap-1.5">
                            {x.branches.map((br) => (
                              <span key={br} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[13px] font-medium text-primary-strong">
                                {br}
                              </span>
                            ))}
                          </p>
                        ) : (
                          <p className="mt-1 text-[13px] text-muted-foreground">Closed before this rank</p>
                        )}
                      </div>
                    ))}
                    {!any && <p className="text-[13px] text-muted-foreground">State management and NRI seats are the route here — ask us which are open to you.</p>}
                  </div>
                  <a
                    href={wa(body.band_wa.replace("{rank}", n(b.rank)))}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-placement={`low_clinical_band_${b.rank}`}
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary-strong px-4 text-sm font-semibold text-primary-foreground"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden /> {body.band_button}
                  </a>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {caseTypes.length > 0 && (
        <section id="cases" className="scroll-mt-28 container-custom py-10 md:py-14">
          <SectionHead icon="people" eyebrow="Our work" title={body.cases_types_title} intro={body.cases_types_intro} />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {caseTypes.map(([who, what, where]) => (
              <article key={who} className="flex flex-col rounded-2xl border border-accent/25 bg-card p-5 shadow-sm">
                <p className="font-heading text-lg font-bold text-foreground">{who}</p>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted-foreground">{what}</p>
                <p className="mt-4 rounded-xl bg-accent-soft px-3 py-2 text-[14px] font-medium text-foreground">
                  <span className="font-semibold text-accent">Where it lands: </span>
                  {where}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={wa(body.wa_text)} target="_blank" rel="noopener noreferrer" data-placement="low_clinical_cases_wa" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white">
              <MessageCircle className="h-4 w-4" aria-hidden /> Tell us your case
            </a>
            <a href={`tel:${CONTACT_INFO.phone}`} data-placement="low_clinical_cases_call" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-5 font-semibold text-foreground">
              <Phone className="h-4 w-4" aria-hidden /> Call a counsellor
            </a>
          </div>
        </section>
      )}

      {p && top && (
        <section id="just-eligible" className="scroll-mt-28 border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
            <div>
              <SectionHead icon="people" eyebrow="Just eligible" title={body.eligible_title} />
              <p className="mt-4 max-w-[70ch] text-[15px] leading-relaxed text-foreground">{body.eligible_intro}</p>
              <a href={wa(body.eligible_wa)} target="_blank" rel="noopener noreferrer" data-placement="low_clinical_eligible_wa" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white">
                <MessageCircle className="h-4 w-4" aria-hidden /> Ask what is left for my rank
              </a>
            </div>
            <ul className="space-y-2 rounded-2xl border border-border bg-card p-5">
              {eligiblePoints.map((x) => (
                <li key={x} className="flex gap-2 text-[15px] leading-relaxed text-foreground">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {p && p.scores.length > 0 && (
        <section id="marks-vs-branch" className="scroll-mt-28 container-custom py-10 md:py-14">
          <SectionHead icon="trend" eyebrow="Marks vs branch" title={body.scores_title} intro={body.scores_intro} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {p.scores.map((x) => (
              <article key={x.score} id={`marks-${x.score}`} className="flex flex-col rounded-2xl border border-border bg-card p-4">
                <h3 className="font-heading text-base font-bold text-foreground">NEET PG {x.score} marks: clinical branch?</h3>
                <p className="tnum mt-1 text-[13px] text-muted-foreground">
                  {x.score}/{x.range.outOf} in {x.range.year} = AIR {n(x.range.rankMin)}
                  {x.range.rankMax !== x.range.rankMin ? `–${n(x.range.rankMax)}` : ""}
                </p>
                <div className="mt-3 flex-1 space-y-2 text-[13px]">
                  {x.reach.map((r) => (
                    <p key={r.family}>
                      <span className="font-semibold text-foreground">{r.family === "aiq" ? "Govt AIQ" : r.family === "dnb" ? "DNB" : "Deemed paid"}: </span>
                      <span className="text-muted-foreground">{r.branches.length ? r.branches.join(", ") : "closed before this rank"}</span>
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Score and rank from NBEMS&apos;s result; branches from MCC&apos;s {p.year} results (last rank admitted over three or more colleges).{" "}
            <Link href="/neet-pg-marks-vs-rank" className="font-semibold text-primary-strong hover:underline">Any score&apos;s rank</Link>
          </p>
        </section>
      )}

      {steps.length > 0 && (
        <section id="strategy" className="scroll-mt-28 border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="people" eyebrow="Our strategy" title={body.strategy_title} />
            <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {steps.map(([t, d], i) => (
                <li key={t} className="rounded-2xl border border-border bg-card p-5">
                  <span className="tnum flex h-9 w-9 items-center justify-center rounded-full bg-primary-strong font-bold text-primary-foreground">{i + 1}</span>
                  <h3 className="mt-3 font-semibold text-foreground">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={wa(body.wa_text)} target="_blank" rel="noopener noreferrer" data-placement="low_clinical_strategy_wa" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white">
                <MessageCircle className="h-4 w-4" aria-hidden /> Get my clinical seat plan
              </a>
              <a href={`tel:${CONTACT_INFO.phone}`} data-placement="low_clinical_strategy_call" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-5 font-semibold text-foreground">
                <Phone className="h-4 w-4" aria-hidden /> Call a counsellor
              </a>
            </div>
          </div>
        </section>
      )}

      {p && p.plans.length > 0 && (
        <section id="example-plans" className="scroll-mt-28 container-custom py-10 md:py-14">
          <SectionHead icon="route" eyebrow="Example plans" title={body.plans_title} intro={body.plans_intro} />
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {p.plans.map((x) => {
              const list = (xs: string[], none: string) => (xs.length ? xs.join(", ") : none);
              const steps = [
                x.near.length || x.aiq.length
                  ? `Round 1 — government seats first: ${list(x.aiq, "")}${x.aiq.length && x.near.length ? "; " : ""}${x.near.length ? `${x.near.join(", ")} closed just above this rank last year, so they stay high in the list for the later rounds` : ""}.`
                  : "Round 1 — government All India seats in clinical branches closed before this rank last year; your state's own quota is the government route here.",
                x.dnb.length ? `Next, DNB in hospitals: ${x.dnb.join(", ")} went this far last year — a stipend and a far lower fee than a paid seat.` : "DNB clinical seats closed before this rank last year, so the list leans on paid seats.",
                !x.paid
                  ? `Your state's own quota at its government colleges, and only if the budget can stretch, a paid seat — ${x.deemed.length === p.d.rows.length ? "every clinical branch" : `${x.deemed.length} clinical branches`} went past this rank on deemed paid seats last year. We work out the three-year cost before adding one.`
                  : x.deemed.length
                    ? `Paid seats, ordered by fee and college: ${x.deemed.slice(0, 6).join(", ")}${x.deemed.length > 6 ? ` and ${x.deemed.length - 6} more` : ""} went this far on deemed universities' paid seats.`
                    : "Deemed universities' paid clinical seats closed before this rank last year — state management and NRI seats are the route.",
                "Your state's counselling in parallel, then float or freeze after every result — and the stray round ready with documents and fee.",
              ];
              return (
                <article key={x.rank} className="flex flex-col rounded-2xl border border-border bg-card p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-strong">Example plan</p>
                  <h3 className="mt-1 font-heading text-lg font-bold text-foreground">AIR around {n(x.rank)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {x.who}
                    {x.score?.score != null ? ` · score ≈ ${scoreText(x.score)} in ${p.year}` : ""}
                  </p>
                  <ol className="mt-4 flex-1 space-y-3">
                    {steps.map((st, i) => (
                      <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-foreground">
                        <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-strong">{i + 1}</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ol>
                  <a
                    href={wa(`Hi, my NEET PG rank is around ${n(x.rank)}. Please make my clinical seat plan.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-placement={`low_clinical_plan_${x.rank}`}
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden /> Make my plan
                  </a>
                </article>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{body.plans_note}</p>
        </section>
      )}

      {realCases.length > 0 && (
        <section id="students-seats" className="scroll-mt-28 container-custom py-10 md:py-14">
          <SectionHead icon="college" eyebrow="Students' seats" title={body.cases_title} intro={body.cases_intro} />
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {realCases.map((c) => (
              <article key={c.id} className="rounded-2xl border border-accent/30 bg-card p-5">
                <p className="tnum text-sm font-semibold text-accent">{c.subtitle}</p>
                <h3 className="mt-1 font-heading text-lg font-bold text-foreground">{c.title}</h3>
                {c.body && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>}
                {(typeof c.data?.round === "string" || typeof c.data?.student === "string") && (
                  <p className="mt-3 text-xs text-muted-foreground">{[c.data?.student, c.data?.round].filter((x) => typeof x === "string" && x).join(" · ")}</p>
                )}
              </article>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No one can promise a seat: counselling allots it. These are the students&apos; own results, shared with their permission.</p>
        </section>
      )}

      {p && (
        <section id="last-rank-table" className={`scroll-mt-28 ${realCases.length ? "border-t border-border bg-surface-1" : ""} py-10 md:py-14`}>
          <div className="container-custom">
            <SectionHead icon="list" eyebrow={`${p.d.rows.length} clinical branches`} title={body.table_title} intro={body.table_intro} />
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="dt w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Branch</th>
                    <th className="text-right">Govt seats, open · {p.year}</th>
                    <th className="text-right">Deemed paid · {p.year}</th>
                    {p.nowYear !== p.year && <th className="text-right">Deemed paid · {p.nowYear} {p.d.runningRound ?? ""}</th>}
                    <th className="text-right">DNB, open · {p.year}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.d.rows.map((r) => {
                    const cell = (c?: Cut) =>
                      c ? (
                        <>
                          <span className="tnum font-semibold text-foreground">AIR {n(c.rank)}</span>
                          <span className="block text-xs text-muted-foreground">score {scoreText(c)}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      );
                    return (
                      <tr key={r.branch}>
                        <td>
                          {r.slug ? (
                            <Link href={`/md-ms-india/branches/${r.slug}`} className="font-semibold text-primary-strong hover:underline">
                              {r.branch}
                            </Link>
                          ) : (
                            r.branch
                          )}
                        </td>
                        <td className="text-right">{cell(p.cut(r, p.year, "aiq"))}</td>
                        <td className="text-right">{cell(p.cut(r, p.year, "deemed"))}</td>
                        {p.nowYear !== p.year && <td className="text-right">{cell(p.cut(r, p.nowYear, "deemed"))}</td>}
                        <td className="text-right">{cell(p.cut(r, p.year, "dnb"))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              The last rank admitted in each seat family over three or more colleges, from MCC&apos;s results; deemed paid seats have no category
              reservation. State counselling quotas are not in this table — ask a counsellor for your state&apos;s.
            </p>
          </div>
        </section>
      )}

      {p && p.d.rows.some((r) => r.aiqByCategory[p.year]) && (
        <section id="by-category" className="scroll-mt-28 container-custom pb-10 md:pb-14">
          <SectionHead icon="people" eyebrow="By category" title={body.category_title} intro={body.category_intro} />
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="dt w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Branch · {p.year}</th>
                  {CATEGORIES.map((c) => (
                    <th key={c} className="text-right">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.d.rows.map((r) => (
                  <tr key={r.branch}>
                    <td className="font-medium">{degree(r)}</td>
                    {CATEGORIES.map((c) => {
                      const x = r.aiqByCategory[p.year]?.[c];
                      return (
                        <td key={c} className="tnum text-right">
                          {x ? `AIR ${n(x.rank)}` : <span className="text-muted-foreground">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {p && (
        <section id="lowest-rank" className="scroll-mt-28 border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="branch" eyebrow="Branch by branch" title={body.lowest_title} />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {p.d.rows.map((r) => {
                const a = p.cut(r, p.year, "aiq");
                const dm = p.cut(r, p.year, "deemed");
                const dn = p.cut(r, p.year, "dnb");
                return (
                  <article key={r.branch} id={r.slug ? `lowest-${r.slug}` : undefined} className="scroll-mt-28 rounded-2xl border border-border bg-card p-4">
                    <h3 className="font-semibold text-foreground">
                      {r.slug ? (
                        <Link href={`/md-ms-india/branches/${r.slug}`} className="hover:underline">
                          Lowest NEET PG rank for {degree(r)}
                        </Link>
                      ) : (
                        `Lowest NEET PG rank for ${degree(r)}`
                      )}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                      In {p.year}: {dm ? `deemed paid seats to AIR ${n(dm.rank)} (score ${scoreText(dm)})` : "no deemed paid figure"}
                      {a ? `; government AIQ seats, open, to AIR ${n(a.rank)}` : ""}
                      {dn ? `; DNB, open, to AIR ${n(dn.rank)}` : ""}.
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {routes.length > 0 && (
        <section id="routes" className="scroll-mt-28 container-custom py-10 md:py-14">
          <SectionHead icon="branch" eyebrow="Four routes" title={body.routes_title} />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {routes.map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container-custom pb-10 md:pb-14">
        <div className="rounded-3xl border border-primary/20 bg-primary-soft p-6 md:p-8">
          <h2 className="font-heading text-2xl font-bold text-foreground">{body.counsel_title}</h2>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {points.map((x) => (
              <li key={x} className="flex gap-2 text-[15px] leading-relaxed text-foreground">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-strong" />
                {x}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={wa(body.wa_text)} target="_blank" rel="noopener noreferrer" data-placement="low_clinical_wa" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white">
              <MessageCircle className="h-4 w-4" aria-hidden /> Ask on WhatsApp
            </a>
            <a href={`tel:${CONTACT_INFO.phone}`} data-placement="low_clinical_call" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-5 font-semibold text-foreground">
              <Phone className="h-4 w-4" aria-hidden /> Call a counsellor
            </a>
            <Link href="/neet-college-predictor?course=pg" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-5 font-semibold text-foreground">
              <Search className="h-4 w-4" aria-hidden /> Check my rank free
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No one can promise a seat: counselling allots it. We tell you where your rank stood last year and how to fill your choices.</p>
        </div>
      </section>

      <ExpertCompare placement="low_clinical" />

      {faqs.length > 0 && (
        <section id="faq" className="scroll-mt-28 border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="help" eyebrow="FAQ" title={body.faq_title} />
            <div className="mt-6 space-y-3">
              {faqs.map((f) => (
                <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
                  <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
                </details>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Also:{" "}
              <Link href="/neet-pg-cutoff" className="font-semibold text-primary-strong hover:underline">NEET PG cut off branch wise</Link> ·{" "}
              <Link href="/neet-pg-marks-vs-rank" className="font-semibold text-primary-strong hover:underline">marks vs rank</Link> ·{" "}
              <Link href="/neet-pg-choice-filling" className="font-semibold text-primary-strong hover:underline">choice filling and upgrades</Link> ·{" "}
              <Link href="/md-ms-india/deemed-universities" className="font-semibold text-primary-strong hover:underline">deemed university PG fees</Link> ·{" "}
              <Link href="/management-quota" className="font-semibold text-primary-strong hover:underline">management quota</Link>
            </p>
          </div>
        </section>
      )}

      <div id="get-plan" className="scroll-mt-24">
        <LeadCapture level="pg" source="Low score clinical branches page" title={body.lead_title} body={body.lead_body} />
      </div>
      <TelegramJoin placement="pg_low_clinical" />
    </main>
  );
}
