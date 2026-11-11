import type { Metadata } from "next";
import { LinkCards } from "@/components/counsel/CounselBlocks";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { getPgStatistics } from "@/lib/pgStatistics";
import { getSeatMatrixOverview, MATRIX_LABEL } from "@/lib/pgSeatData";
import { getNmcBranchSeats } from "@/lib/nmcData";
import { getLiveFigures } from "@/lib/liveFigures";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import CiteThis from "@/components/seo/CiteThis";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import ExpertPlaybook from "@/components/lead/ExpertPlaybook";

/**
 * /neet-pg-statistics (2026-11-10; owner: "NEET PG / medical seats statistics 2026 banado"). A statistics page is what
 * other sites — and AI assistants — quote, so every figure is counted, never typed: candidates and scores from NBEMS's
 * result (`score_ranks`), seats from NMC's register (`nmc_courses`), MCC's matrix with every "newly added seats" notice
 * it has posted (`mcc_seat_matrix`) and its round counts (`mcc_allotments`), stipend and fee middles from `liveFigures`.
 * No college is ranked and no college's closing rank appears; bond terms (a compilation) stay on /md-ms-india/bond.
 *
 * Laid out compact the same night (owner: "design data formatting… professional banao… compact… space utilisation"):
 * two tables side by side from a laptop up, numbers right-aligned in tight rows, one counsellor block (the playbook),
 * FAQs in two columns. Every official figure carries an asterisk and the footnote says whose figure it is.
 */
export const revalidate = 3600;
const PATH = "/neet-pg-statistics";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
/** "M.D. Radio-diagnosis /Radiology" style names are NMC's; ours read "MD Radio Diagnosis". */
const shortCourse = (c: string) => c.replace(/\s*\(.*?\)\s*/g, " ").trim();
const Star = () => <sup className="ml-0.5 text-[10px] font-normal text-muted-foreground">*</sup>;

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
            `NEET PG ${y} ranked ${n(p.now.ranked)} candidates for ${n(p.mdms)} MD/MS seats (NMC) — ${(p.now.ranked / p.mdms).toFixed(1)} per seat. MCC's ${n(p.m?.total)}-seat matrix${p.s.added ? `, ${n(p.s.added.seats)} added since round 1` : ""}, rounds, scores.`,
            `NEET PG ${y}: ${n(p.now.ranked)} ranked, ${n(p.mdms)} MD/MS seats on NMC's register, MCC's seat matrix and round-by-round allotments.`,
          ]
        : []),
      "NEET PG in numbers: candidates, MD/MS seats on NMC's register, MCC's seat matrix and allotments by round.",
    ),
    keywords:
      "NEET PG statistics 2026, NEET PG 2026 candidates, MD MS seats in India 2026, how many PG seats in India, medical seats statistics, NEET PG seats 2026, NEET PG round 2 new seats, NEET PG competition ratio",
  });
}

/** A compact data table: tight rows, numbers right-aligned, a quiet header. */
function T({ head, rows, first = "left" }: { head: React.ReactNode[]; rows: React.ReactNode[][]; first?: "left" | "right" }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-[13.5px]">
        <thead className="bg-surface-1 text-[11.5px] uppercase tracking-wide text-muted-foreground">
          <tr>
            {head.map((h, i) => (
              <th key={i} className={`whitespace-nowrap px-3 py-2 font-semibold ${i === 0 && first === "left" ? "text-left" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-surface-1/60">
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-1.5 ${j === 0 && first === "left" ? "text-left text-foreground" : "tnum text-right text-foreground"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function H({ eyebrow, title, note }: { eyebrow: string; title: string; note?: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-strong">{eyebrow}</p>
      <h2 className="font-heading text-xl font-bold text-foreground md:text-[1.35rem]">{title}</h2>
      {note && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  );
}

export default async function PgStatisticsPage() {
  const p = await load();
  const perSeat = p && p.mdms ? (p.now.ranked / p.mdms).toFixed(1) : undefined;
  const tokens = {
    now_year: p?.now.year,
    ranked: p ? `${n(p.now.ranked)}*` : undefined,
    md_ms_seats: p ? `${n(p.mdms)}*` : undefined,
    per_seat: perSeat,
    mcc_seats: p?.m ? `${n(p.m.total)}*` : undefined,
    round1: p?.r1 ? `${n(p.r1.allotted)}*` : undefined,
    nmc_date: p?.live.nmc_date,
  };
  const [copy, body, heroImage] = await Promise.all([
    pageCopy("page.pg_statistics.hero", tokens),
    pageCopy("page.pg_statistics.body", tokens),
    pageHeroImage("page.pg_statistics.hero", "page.pg_cutoff.hero"),
  ]);
  const answerReady = !!(p && p.mdms && p.m?.total && p.r1);
  const md = p?.s.nmc.find((r) => r.type === "MD");
  const ms = p?.s.nmc.find((r) => r.type === "MS");
  const dip = p?.s.nmc.find((r) => r.type === "PG Diploma");

  const faqs = p
    ? [
        {
          question: `How many MD/MS seats are there in India in ${p.now.year}?`,
          answer: `NMC's register lists ${n(p.mdms)} MD and MS seats (${n(md?.seats)} MD and ${n(ms?.seats)} MS) and ${n(dip?.seats)} PG diploma seats${p.live.nmc_date ? `, as of ${p.live.nmc_date}` : ""}. DNB seats in hospitals are counted separately by NBEMS.`,
        },
        {
          question: `How many candidates were ranked in NEET PG ${p.now.year}?`,
          answer: `NBEMS ranked ${n(p.now.ranked)} candidates in NEET PG ${p.now.year} (marked out of ${p.now.outOf})${p.prev ? `, against ${n(p.prev.ranked)} in ${p.prev.year} (out of ${p.prev.outOf})` : ""}.`,
        },
        ...(p.m
          ? [
              {
                question: `How many seats are in MCC's NEET PG ${p.m.year} counselling?`,
                answer: `MCC's ${p.m.year} seat matrix lists ${n(p.m.total)} seats: ${p.m.byMatrix.map((b) => `${n(b.seats)} ${MATRIX_LABEL[b.seatMatrix] ?? b.seatMatrix}`).join(", ")}${p.s.added ? `, including ${n(p.s.added.seats)} seats MCC added after round 1` : ""}. The states' own quota and private colleges' state, management and NRI seats are filled by each state's counselling.`,
              },
            ]
          : []),
        ...(p.s.added
          ? [
              {
                question: `How many new seats were added in NEET PG ${p.m?.year ?? p.now.year} counselling?`,
                answer: `MCC's "newly added seats" notices add ${n(p.s.added.seats)} MD/MS, DNB and deemed university seats after round 1 — the latest is ${p.s.added.title.replace(/^MCC PG Medical \d{4} - /, "")}. Armed Forces Medical Services seats in those notices are filled separately and are not counted here.`,
              },
            ]
          : []),
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

  const dataset = p
    ? {
        "@context": "https://schema.org",
        "@type": "Dataset",
        name: `NEET PG ${p.now.year} and medical seats statistics (India)`,
        description: `Candidates ranked in NEET PG and the score at each rank (NBEMS), MD/MS/diploma/DM/M.Ch. seats on NMC's register, MCC's seat matrix with the seats it added after round 1, and MCC's allotments by round.`,
        url: `https://www.admissionhands.com${PATH}`,
        creator: { "@type": "Organization", name: "AdmissionHands", url: "https://www.admissionhands.com" },
        isBasedOn: ["https://natboard.edu.in", "https://www.nmc.org.in", "https://mcc.nic.in", ...(p.s.added?.url ? [p.s.added.url] : [])],
        temporalCoverage: `${p.prev?.year ?? p.now.year}/${p.now.year}`,
        spatialCoverage: "India",
        variableMeasured: ["Candidates ranked", "Score at rank", "MD/MS seats", "PG diploma seats", "MCC seat matrix", "Seats allotted by round"],
      }
    : null;

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
          ...(dataset ? [dataset] : []),
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
                { icon: "people" as const, label: `Ranked, NEET PG ${p.now.year}`, value: `${n(p.now.ranked)}*`, note: p.prev ? `${n(p.prev.ranked)} in ${p.prev.year}` : "NBEMS result" },
                { icon: "college" as const, label: "MD/MS seats (NMC)", value: `${n(p.mdms)}*`, note: perSeat ? `${perSeat} candidates a seat` : undefined },
                ...(p.m ? [{ icon: "authority" as const, label: `MCC seat matrix ${p.m.year}`, value: `${n(p.m.total)}*`, note: p.s.added ? `incl. ${n(p.s.added.seats)} added after round 1` : "AIQ, deemed, central, DNB" }] : []),
                ...(p.r1 ? [{ icon: "up" as const, label: `Round 1 allotted, ${p.r1.year}`, value: `${n(p.r1.allotted)}*`, note: "MCC's result" }] : []),
              ]
            : undefined
        }
      />

      {p && (
        <>
          {/* The footnote every asterisk points at. */}
          <div className="border-b border-border bg-surface-1">
            <p className="container-custom py-2 text-[12px] leading-relaxed text-muted-foreground">
              * As published by NBEMS, the National Medical Commission, MCC and the state counselling authorities; figures change when they publish
              revisions{p.s.added ? `; the latest included is MCC's ${p.s.added.title.replace(/^MCC PG Medical \d{4} - /, "")}` : ""}.
            </p>
          </div>

          <section className="container-custom grid gap-8 py-8 md:py-10 lg:grid-cols-2">
            <div>
              <H eyebrow="NBEMS result" title={body.scores_title} note={`Score held at each rank. NEET PG ${p.now.year} was out of ${p.now.outOf}${p.prev ? `, ${p.prev.year} out of ${p.prev.outOf}` : ""}.`} />
              <T
                head={["Rank", ...[...p.s.scores].reverse().map((y) => `${y.year}`)]}
                rows={[
                  ["Candidates ranked", ...[...p.s.scores].reverse().map((y) => <b key={y.year}>{n(y.ranked)}</b>)],
                  ["Top score", ...[...p.s.scores].reverse().map((y) => y.top)],
                  ...[1_000, 10_000, 25_000, 50_000, 1_00_000, 1_50_000, 2_00_000].map((rank) => [
                    `Rank ${n(rank)}`,
                    ...[...p.s.scores].reverse().map((y) => y.at.find((a) => a.rank === rank)?.score ?? "—"),
                  ]),
                ]}
              />
              <p className="mt-2 text-[12.5px] text-muted-foreground">
                Any score: <Link href="/neet-pg-marks-vs-rank" className="font-semibold text-primary-strong hover:underline">NEET PG marks vs rank</Link>
              </p>
            </div>

            <div>
              <H eyebrow="NMC register" title={body.seats_title} note={`Approved seats${p.live.nmc_date ? `, ${p.live.nmc_date}` : ""}. NMC files deemed universities as private.`} />
              <T
                head={["Course", "Govt", "Private", "Seats", "Colleges"]}
                rows={[...p.s.nmc, ...(p.s.mbbs ? [p.s.mbbs] : [])].map((r) => [r.type, n(r.govtSeats), n(r.privateSeats), <b key="s">{n(r.seats)}<Star /></b>, n(r.colleges)])}
              />
              <div className="mt-3 grid grid-cols-3 gap-2">
                {p.s.kinds.map((k) => (
                  <div key={k.kind} className="rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-[11.5px] text-muted-foreground">{k.kind}</p>
                    <p className="tnum font-heading text-lg font-bold text-foreground">{n(k.seats)}</p>
                    <p className="text-[11.5px] text-muted-foreground">{pct(k.seats, p.mdms)} of MD/MS</p>
                  </div>
                ))}
              </div>
              {p.s.mbbs && (
                <p className="mt-2 text-[12.5px] text-muted-foreground">
                  {n(p.s.mbbs.seats)} MBBS seats lead into {n(p.pgAll)} MD, MS and diploma seats ({pct(p.pgAll, p.s.mbbs.seats)}), before DNB.{" "}
                  <Link href="/neet-pg-low-score-clinical-branches" className="font-semibold text-primary-strong hover:underline">Clinical seat at a low rank</Link>
                </p>
              )}
            </div>
          </section>

          <section className="border-y border-border bg-surface-1/60">
            <div className="container-custom grid gap-8 py-8 md:py-10 lg:grid-cols-2">
              {p.withNmc.length > 0 && (
                <div>
                  <H eyebrow="By branch" title={body.branches_title} note={`NMC's seats in India, and how many MCC's ${p.m?.year ?? ""} counselling fills.`} />
                  <T
                    head={["Branch", "NMC", "Colleges", "MCC AIQ", "MCC deemed"]}
                    rows={p.withNmc.map((b) => [
                      <Link key="l" href={`/md-ms-india/branches/${b.slug}`} className="font-medium text-primary-strong hover:underline">
                        {shortCourse(b.course)}
                      </Link>,
                      <b key="s">{n(b.nmc?.seats)}</b>,
                      n(b.nmc?.colleges),
                      n(b.aiq),
                      n(b.deemed),
                    ])}
                  />
                </div>
              )}
              {p.m && (
                <div className="space-y-6">
                  <div>
                    <H eyebrow={`MCC ${p.m.year}`} title={body.matrix_title} note="Colleges are counted per matrix: a hospital with MD/MS and DNB seats is in two." />
                    <T
                      head={["Matrix", "Seats", "Colleges"]}
                      rows={[
                        ...p.m.byMatrix.map((b) => [MATRIX_LABEL[b.seatMatrix] ?? b.seatMatrix, n(b.seats), n(b.colleges)]),
                        [<b key="t">All matrices</b>, <b key="s">{n(p.m.total)}<Star /></b>, "—"],
                      ]}
                    />
                    {p.s.added && (
                      <p className="mt-2 text-[12.5px] text-muted-foreground">
                        Includes {n(p.s.added.seats)} seats MCC added after round 1
                        {p.s.added.url ? (
                          <>
                            {" "}
                            (<a href={p.s.added.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">MCC&apos;s notice</a>)
                          </>
                        ) : null}
                        . <Link href="/neet-pg-seat-matrix" className="font-semibold text-primary-strong hover:underline">Full seat matrix</Link>
                      </p>
                    )}
                  </div>
                  <div>
                    <H eyebrow="MCC results" title={body.rounds_title} note="A round's list is its fresh allotments plus its upgrades." />
                    <T
                      head={["Round", ...p.roundYears.map(String)]}
                      rows={[...new Set(p.rounds.filter((r) => p.roundYears.includes(r.year)).map((r) => r.round))].map((round) => [
                        round,
                        ...p.roundYears.map((y) => {
                          const r = p.rounds.find((x) => x.year === y && x.round === round);
                          return r ? (
                            <span key={y}>
                              {n(r.allotted)}
                              {r.upgraded > 0 && <span className="ml-1 text-[11px] text-muted-foreground">({n(r.upgraded)} up)</span>}
                            </span>
                          ) : (
                            "—"
                          );
                        }),
                      ])}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="container-custom py-8 md:py-10">
            <H eyebrow="Money" title={body.money_title} note="Fees are the middle 80% of the yearly fees colleges publish, never the extremes." />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Govt college stipend, median / month", value: p.live.govt_stipend_median, href: "/md-ms-india/stipend" },
                { label: "Private & deemed stipend, median / month", value: p.live.private_stipend_median, href: "/md-ms-india/stipend" },
                { label: "Govt college PG fee / year, middle 80%", value: p.live.govt_pg_fee, href: "/md-ms-india/fees" },
                { label: "Deemed university PG fee / year, middle 80%", value: p.live.deemed_pg_fee, href: "/md-ms-india/deemed-universities" },
              ]
                .filter((x) => x.value)
                .map((x) => (
                  <Link key={x.label} href={x.href} className="block rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/40">
                    <p className="text-[12px] text-muted-foreground">{x.label}</p>
                    <p className="tnum mt-0.5 text-lg font-bold text-foreground">{x.value}</p>
                  </Link>
                ))}
            </div>
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              Bond and seat-leaving terms by state: <Link href="/md-ms-india/bond" className="font-semibold text-primary-strong hover:underline">PG bond and penalty</Link>
            </p>
          </section>

          <ExpertPlaybook kind="cutoff" name="NEET PG" placement="pg_statistics" />

          {faqs.length > 0 && (
            <section className="border-t border-border bg-surface-1 py-8 md:py-10">
              <div className="container-custom">
                <SectionHead icon="help" eyebrow="FAQ" title={body.faq_title} />
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {faqs.map((f) => (
                    <details key={f.question} className="rounded-xl border border-border bg-card px-4 py-3">
                      <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
                      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{f.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="container-custom py-8">
            <CiteThis title="NEET PG & medical seats statistics" path={PATH} source="NBEMS, NMC and MCC data compiled by AdmissionHands" />
          </section>
        </>
      )}

      <LinkCards
        title="Related"
        links={[
          { label: "NEET PG seat increase", href: "/neet-pg-seat-increase", note: "Every seat MCC added, by branch, state and college" },
          { label: "Open states for NEET PG", href: "/neet-pg-open-states", note: "Which states take candidates from other states" },
          { label: "In-service quota, state wise", href: "/neet-pg-in-service-quota", note: "Seats kept for doctors in government service" },
        ]}
      />
      <LeadCapture level="pg" source="NEET PG statistics page" title={body.lead_title} body={body.lead_body} />
      <TelegramJoin placement="pg_statistics" />
    </main>
  );
}
