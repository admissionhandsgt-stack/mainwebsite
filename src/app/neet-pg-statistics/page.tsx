import type { Metadata } from "next";
import { MessageCircle, Phone } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { getPgStatistics } from "@/lib/pgStatistics";
import { getSeatMatrixOverview, MATRIX_LABEL } from "@/lib/pgSeatData";
import { getNmcBranchSeats } from "@/lib/nmcData";
import { getLiveFigures } from "@/lib/liveFigures";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { CONTACT_INFO } from "@/lib/constants";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import CiteThis from "@/components/seo/CiteThis";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import ExpertPlaybook from "@/components/lead/ExpertPlaybook";

/**
 * /neet-pg-statistics (2026-11-10; owner: "NEET PG / medical seats statistics 2026 banado"). A statistics page is what
 * other sites link to when they quote a number, so every figure here is counted, never typed: candidates and scores
 * from NBEMS's result (`score_ranks`), seats from NMC's register (`nmc_courses`), MCC's matrix and round counts
 * (`mcc_seat_matrix`, `mcc_allotments`), stipend and fee middles from `liveFigures`. No college is ranked here and no
 * college's closing rank appears. Bond terms (a compilation, not an official notice) are left to /md-ms-india/bond.
 */
export const revalidate = 3600;
const PATH = "/neet-pg-statistics";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
/** "M.D. Radio-diagnosis /Radiology" style names are NMC's; ours read "MD Radio Diagnosis". */
const shortCourse = (c: string) => c.replace(/\s*\(.*?\)\s*/g, " ").trim();

async function load() {
  const [s, m, live] = await Promise.all([
    getPgStatistics().catch(() => null),
    getSeatMatrixOverview().catch(() => null),
    getLiveFigures(),
  ]);
  if (!s?.scores.length) return null;
  const now = s.scores[s.scores.length - 1];
  const prev = s.scores.length > 1 ? s.scores[s.scores.length - 2] : null;
  const mdms = s.nmc.filter((r) => r.type === "MD" || r.type === "MS").reduce((a, r) => a + r.seats, 0);
  const pgAll = s.nmc.filter((r) => r.type === "MD" || r.type === "MS" || r.type === "PG Diploma").reduce((a, r) => a + r.seats, 0);
  const rounds = m?.rounds ?? [];
  const r1 = rounds.find((r) => r.year === m?.year && /^round 1/i.test(r.round)) ?? null;
  const roundYears = [...new Set(rounds.map((r) => r.year))].sort((a, b) => b - a).slice(0, 3);
  // MD/MS branches in MCC's matrix, with NMC's own seat count for each; the top 15 by NMC seats.
  const mdBranches = (m?.branches ?? []).filter((b) => /^(MD|MS)\s/.test(b.course));
  const withNmc = (
    await Promise.all(mdBranches.map(async (b) => ({ ...b, nmc: await getNmcBranchSeats(b.course).catch(() => null) })))
  )
    .filter((b) => b.nmc && b.nmc.seats > 0)
    .sort((a, b) => (b.nmc?.seats ?? 0) - (a.nmc?.seats ?? 0))
    .slice(0, 15);
  const clinical = s.kinds.find((k) => k.kind === "Clinical");
  return { s, m, live, now, prev, mdms, pgAll, r1, rounds, roundYears, withNmc, clinical };
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await load();
  const y = p?.now.year;
  return resolveMetadata(PATH, {
    title: fitTitle(
      `NEET PG Statistics ${y ?? ""}: Candidates, MD/MS Seats & Rounds`.replace(" :", ":"),
      `NEET PG ${y ?? ""} Statistics: Candidates & Seats`.replace("  ", " "),
      "NEET PG Statistics: Candidates & Seats",
    ),
    description: fitDescription(
      ...(p
        ? [
            `NEET PG ${y} ranked ${n(p.now.ranked)} candidates for ${n(p.mdms)} MD/MS seats (NMC) — ${(p.now.ranked / p.mdms).toFixed(1)} per seat. Seats by branch, MCC's ${n(p.m?.total)}-seat matrix, rounds, score at each rank.`,
            `NEET PG ${y}: ${n(p.now.ranked)} ranked, ${n(p.mdms)} MD/MS seats on NMC's register, MCC's seat matrix and round-by-round allotments.`,
          ]
        : []),
      "NEET PG in numbers: candidates, MD/MS seats on NMC's register, MCC's seat matrix and allotments by round.",
    ),
    keywords:
      "NEET PG statistics 2026, NEET PG 2026 candidates, MD MS seats in India 2026, how many PG seats in India, medical seats statistics, NEET PG seats 2026, NEET PG competition ratio",
  });
}

export default async function PgStatisticsPage() {
  const p = await load();
  const perSeat = p && p.mdms ? (p.now.ranked / p.mdms).toFixed(1) : undefined;
  const tokens = {
    now_year: p?.now.year,
    ranked: n(p?.now.ranked),
    md_ms_seats: n(p?.mdms),
    per_seat: perSeat,
    mcc_seats: n(p?.m?.total),
    round1: n(p?.r1?.allotted),
    nmc_date: p?.live.nmc_date,
  };
  const [copy, body, heroImage] = await Promise.all([
    pageCopy("page.pg_statistics.hero", tokens),
    pageCopy("page.pg_statistics.body", tokens),
    pageHeroImage("page.pg_statistics.hero", "page.pg_cutoff.hero"),
  ]);
  const answerReady = !!(p && p.mdms && p.m?.total && p.r1);
  const wa = `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent("Hi, I want my NEET PG seat list. My rank is ___ and category ___.")}`;

  const faqs = p
    ? [
        {
          question: `How many MD/MS seats are there in India in ${p.now.year}?`,
          answer: `NMC's register lists ${n(p.mdms)} MD and MS seats (${n(p.s.nmc.find((r) => r.type === "MD")?.seats)} MD and ${n(p.s.nmc.find((r) => r.type === "MS")?.seats)} MS) and ${n(p.s.nmc.find((r) => r.type === "PG Diploma")?.seats)} PG diploma seats${p.live.nmc_date ? `, as of ${p.live.nmc_date}` : ""}. DNB seats in hospitals are counted separately by NBEMS.`,
        },
        {
          question: `How many candidates were ranked in NEET PG ${p.now.year}?`,
          answer: `NBEMS ranked ${n(p.now.ranked)} candidates in NEET PG ${p.now.year} (marked out of ${p.now.outOf})${p.prev ? `, against ${n(p.prev.ranked)} in ${p.prev.year} (out of ${p.prev.outOf})` : ""}.`,
        },
        ...(p.now.at.find((a) => a.rank === 50_000)
          ? [
              {
                question: `What score gave rank 50,000 in NEET PG ${p.now.year}?`,
                answer: `${p.now.at.find((a) => a.rank === 50_000)?.score} out of ${p.now.outOf}${
                  p.prev?.at.find((a) => a.rank === 50_000) ? `; in ${p.prev.year} it was ${p.prev.at.find((a) => a.rank === 50_000)?.score} out of ${p.prev.outOf}` : ""
                }. Rank 1,000 needed ${p.now.at.find((a) => a.rank === 1_000)?.score ?? "—"}, and rank 1 lakh ${p.now.at.find((a) => a.rank === 1_00_000)?.score ?? "—"}.`,
              },
            ]
          : []),
        ...(p.m
          ? [
              {
                question: `How many seats does MCC fill in NEET PG ${p.m.year} counselling?`,
                answer: `MCC's ${p.m.year} seat matrix lists ${n(p.m.total)} seats: ${p.m.byMatrix.map((b) => `${n(b.seats)} ${MATRIX_LABEL[b.seatMatrix] ?? b.seatMatrix}`).join(", ")}. The other government seats (the states' 50% quota) and private colleges' state, management and NRI seats are filled by each state's own counselling.`,
              },
            ]
          : []),
        ...(p.clinical
          ? [
              {
                question: "How many MD/MS seats are in clinical branches?",
                answer: `${n(p.clinical.seats)} of ${n(p.mdms)} MD/MS seats (${pct(p.clinical.seats, p.mdms)}) are in clinical branches; the rest are para-clinical (pathology, microbiology, pharmacology, forensic and community medicine) and pre-clinical (anatomy, physiology, biochemistry).`,
              },
            ]
          : []),
      ]
    : [];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "NEET PG statistics", path: PATH },
          ]),
          webPage({ name: "NEET PG & medical seats statistics", description: answerReady ? copy.answer : copy.subtitle, path: PATH }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "NEET PG statistics" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={answerReady && copy.answer ? copy.answer : copy.subtitle}
        image={heroImage}
        topic="chart"
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_statistics"
        source={copy.source}
        insights={
          p
            ? [
                { icon: "people" as const, label: `Ranked, NEET PG ${p.now.year}`, value: n(p.now.ranked), note: p.prev ? `${n(p.prev.ranked)} in ${p.prev.year}` : "NBEMS result" },
                { icon: "college" as const, label: "MD/MS seats (NMC)", value: n(p.mdms), note: perSeat ? `${perSeat} candidates a seat` : undefined },
                ...(p.m ? [{ icon: "authority" as const, label: `MCC seat matrix ${p.m.year}`, value: n(p.m.total), note: "AIQ, deemed, central, DNB" }] : []),
                ...(p.r1 ? [{ icon: "up" as const, label: `Round 1 allotted, ${p.r1.year}`, value: n(p.r1.allotted), note: "MCC's result" }] : []),
              ]
            : undefined
        }
      />

      {p && (
        <>
          <section className="container-custom py-10 md:py-14">
            <SectionHead icon="trend" eyebrow="NBEMS result" title={body.scores_title} intro="The score that held each rank, year by year. NEET PG 2026 was marked out of 720; 2025 out of 800." />
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="dt w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left">Rank</th>
                    {[...p.s.scores].reverse().map((y) => (
                      <th key={y.year} className="text-right">
                        {y.year} (out of {y.outOf})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Candidates ranked</td>
                    {[...p.s.scores].reverse().map((y) => (
                      <td key={y.year} className="tnum text-right font-semibold">{n(y.ranked)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Top score</td>
                    {[...p.s.scores].reverse().map((y) => (
                      <td key={y.year} className="tnum text-right">{y.top}</td>
                    ))}
                  </tr>
                  {[1_000, 10_000, 25_000, 50_000, 1_00_000, 1_50_000, 2_00_000].map((rank) => (
                    <tr key={rank}>
                      <td>Score at rank {n(rank)}</td>
                      {[...p.s.scores].reverse().map((y) => (
                        <td key={y.year} className="tnum text-right">{y.at.find((a) => a.rank === rank)?.score ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Look up any score:{" "}
              <Link href="/neet-pg-marks-vs-rank" className="font-semibold text-primary-strong hover:underline">NEET PG marks vs rank</Link>.
            </p>
          </section>

          <section className="border-t border-border bg-surface-1 py-10 md:py-14">
            <div className="container-custom">
              <SectionHead icon="college" eyebrow="NMC register" title={body.seats_title} intro={`Approved seats by course${p.live.nmc_date ? `, as NMC listed them on ${p.live.nmc_date}` : ""}. NMC files deemed universities as private.`} />
              <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="dt w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Course</th>
                      <th className="text-right">Government</th>
                      <th className="text-right">Private &amp; deemed</th>
                      <th className="text-right">All seats</th>
                      <th className="text-right">Colleges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...p.s.nmc, ...(p.s.mbbs ? [p.s.mbbs] : [])].map((r) => (
                      <tr key={r.type}>
                        <td className="font-medium">{r.type}</td>
                        <td className="tnum text-right">{n(r.govtSeats)}</td>
                        <td className="tnum text-right">{n(r.privateSeats)}</td>
                        <td className="tnum text-right font-semibold">{n(r.seats)}</td>
                        <td className="tnum text-right">{n(r.colleges)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {p.s.mbbs && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {n(p.s.mbbs.seats)} MBBS seats graduate into {n(p.pgAll)} MD, MS and diploma seats — {pct(p.pgAll, p.s.mbbs.seats)} of an MBBS batch, before DNB.
                </p>
              )}

              <h3 className="mt-10 font-heading text-xl font-bold text-foreground">{body.kinds_title}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {p.s.kinds.map((k) => (
                  <div key={k.kind} className="rounded-2xl border border-border bg-card p-5">
                    <p className="text-sm text-muted-foreground">{k.kind}</p>
                    <p className="tnum mt-1 text-2xl font-bold text-foreground">{n(k.seats)}</p>
                    <p className="text-xs text-muted-foreground">
                      {pct(k.seats, p.mdms)} of MD/MS seats · {k.branches} branches
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                A clinical seat at a low rank:{" "}
                <Link href="/neet-pg-low-score-clinical-branches" className="font-semibold text-primary-strong hover:underline">where the clinical branches went last year</Link>.
              </p>
            </div>
          </section>

          {p.withNmc.length > 0 && (
            <section className="container-custom py-10 md:py-14">
              <SectionHead icon="branch" eyebrow="By branch" title={body.branches_title} intro={`NMC's seats in India for each MD/MS branch, and how many of them MCC's ${p.m?.year ?? ""} counselling fills.`} />
              <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="dt w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left">Branch</th>
                      <th className="text-right">Seats in India (NMC)</th>
                      <th className="text-right">Colleges</th>
                      <th className="text-right">MCC: All India Quota</th>
                      <th className="text-right">MCC: deemed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.withNmc.map((b) => (
                      <tr key={b.course}>
                        <td>
                          <Link href={`/md-ms-india/branches/${b.slug}`} className="font-semibold text-primary-strong hover:underline">
                            {shortCourse(b.course)}
                          </Link>
                        </td>
                        <td className="tnum text-right font-semibold">{n(b.nmc?.seats)}</td>
                        <td className="tnum text-right">{n(b.nmc?.colleges)}</td>
                        <td className="tnum text-right">{n(b.aiq)}</td>
                        <td className="tnum text-right">{n(b.deemed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {p.m && (
            <section className="border-t border-border bg-surface-1 py-10 md:py-14">
              <div className="container-custom grid gap-10 lg:grid-cols-2">
                <div>
                  <SectionHead icon="authority" eyebrow={`MCC ${p.m.year}`} title={body.matrix_title} />
                  <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
                    <table className="dt w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">Matrix</th>
                          <th className="text-right">Seats</th>
                          <th className="text-right">Colleges</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.m.byMatrix.map((b) => (
                          <tr key={b.seatMatrix}>
                            <td>{MATRIX_LABEL[b.seatMatrix] ?? b.seatMatrix}</td>
                            <td className="tnum text-right font-semibold">{n(b.seats)}</td>
                            <td className="tnum text-right">{n(b.colleges)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="font-semibold">All matrices</td>
                          <td className="tnum text-right font-bold">{n(p.m.total)}</td>
                          <td className="text-right text-muted-foreground">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Colleges are counted matrix by matrix: a hospital with MD/MS and DNB seats is in two of them.{" "}
                    <Link href="/neet-pg-seat-matrix" className="font-semibold text-primary-strong hover:underline">The full seat matrix</Link>
                  </p>
                </div>
                <div>
                  <SectionHead icon="list" eyebrow="MCC results" title={body.rounds_title} />
                  <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
                    <table className="dt w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">Round</th>
                          {p.roundYears.map((y) => (
                            <th key={y} className="text-right">{y}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...new Set(p.rounds.filter((r) => p.roundYears.includes(r.year)).map((r) => r.round))].map((round) => (
                          <tr key={round}>
                            <td>{round}</td>
                            {p.roundYears.map((y) => {
                              const r = p.rounds.find((x) => x.year === y && x.round === round);
                              return (
                                <td key={y} className="tnum text-right">
                                  {r ? (
                                    <>
                                      {n(r.allotted)}
                                      {r.upgraded > 0 && <span className="block text-xs text-muted-foreground">{n(r.upgraded)} upgraded</span>}
                                    </>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    A round&apos;s list is its fresh allotments plus its upgrades.{" "}
                    <Link href="/neet-pg-choice-filling" className="font-semibold text-primary-strong hover:underline">How upgrades and free exit work</Link>
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="container-custom py-10 md:py-14">
            <SectionHead icon="money" eyebrow="Money" title={body.money_title} />
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Govt college stipend, median a month", value: p.live.govt_stipend_median, href: "/md-ms-india/stipend" },
                { label: "Private & deemed stipend, median a month", value: p.live.private_stipend_median, href: "/md-ms-india/stipend" },
                { label: "Govt college PG fee, middle 80%", value: p.live.govt_pg_fee, href: "/md-ms-india/fees" },
                { label: "Deemed university PG fee, middle 80%", value: p.live.deemed_pg_fee, href: "/md-ms-india/deemed-universities" },
              ]
                .filter((x) => x.value)
                .map((x) => (
                  <Link key={x.label} href={x.href} className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/40">
                    <p className="text-sm text-muted-foreground">{x.label}</p>
                    <p className="tnum mt-1 text-xl font-bold text-foreground">{x.value}</p>
                  </Link>
                ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Fees are the middle 80% of the yearly fees colleges publish, never the extremes. Bond and seat-leaving terms state by state:{" "}
              <Link href="/md-ms-india/bond" className="font-semibold text-primary-strong hover:underline">PG bond and penalty</Link>.
            </p>
          </section>

          <section className="container-custom pb-10 md:pb-14">
            <div className="rounded-3xl border border-primary/20 bg-primary-soft p-6 md:p-8">
              <h2 className="font-heading text-2xl font-bold text-foreground">{body.counsel_title}</h2>
              <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-foreground">{body.counsel_body}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={wa} target="_blank" rel="noopener noreferrer" data-placement="pg_statistics_wa" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 font-semibold text-white">
                  <MessageCircle className="h-4 w-4" aria-hidden /> Ask on WhatsApp
                </a>
                <a href={`tel:${CONTACT_INFO.phone}`} data-placement="pg_statistics_call" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-5 font-semibold text-foreground">
                  <Phone className="h-4 w-4" aria-hidden /> Call a counsellor
                </a>
              </div>
            </div>
          </section>

          {faqs.length > 0 && (
            <section className="border-t border-border bg-surface-1 py-10 md:py-14">
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
              </div>
            </section>
          )}

          <section className="container-custom py-10">
            <CiteThis title="NEET PG & medical seats statistics" path={PATH} source="NBEMS, NMC and MCC data compiled by AdmissionHands" />
          </section>
        </>
      )}

      <ExpertPlaybook kind="cutoff" name="NEET PG" placement="pg_statistics" />

      <LeadCapture level="pg" source="NEET PG statistics page" title={body.lead_title} body={body.lead_body} />
      <TelegramJoin placement="pg_statistics" />
    </main>
  );
}
