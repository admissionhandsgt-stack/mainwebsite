import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { getSeatMatrixOverview, MATRIX_LABEL, type Categories } from "@/lib/pgSeatData";
import { getBranches } from "@/lib/branchQueries";
import { getPgStates } from "@/lib/pgStateQueries";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import SectionHead from "@/components/ui/SectionHead";
import CiteThis from "@/components/seo/CiteThis";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";

/**
 * "NEET PG seat matrix 2026" (2026-10-20) — every seat MCC fills, from MCC's own published
 * matrix (mcc_seat_matrix, migration 0038): by seat matrix, by category, by branch and by state,
 * plus how many seats changed hands in each round of MCC's 2024 and 2025 results. Seat counts
 * only — no college's closing rank. Words from Admin → Content ("Page: NEET PG seat matrix").
 */

const PATH = "/neet-pg-seat-matrix";
const n = (v: number) => v.toLocaleString("en-IN");
const CATS: { key: keyof Categories; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "ews", label: "EWS" },
  { key: "obc", label: "OBC" },
  { key: "sc", label: "SC" },
  { key: "st", label: "ST" },
  { key: "pwd", label: "PwD (across categories)" },
];
const seatsOf = (o: { byMatrix: { seatMatrix: string; seats: number }[] }, m: string) => o.byMatrix.find((x) => x.seatMatrix === m)?.seats ?? 0;

export async function generateMetadata(): Promise<Metadata> {
  const o = await getSeatMatrixOverview();
  if (!o)
    return resolveMetadata(PATH, {
      title: "NEET PG Seat Matrix: MD/MS & DNB Seats by Branch",
      description: "MCC's NEET PG seat matrix: MD, MS, diploma and DNB seats, branch wise, state wise and category wise.",
    });
  return resolveMetadata(PATH, {
    // Searched as "neet pg seat matrix 2026", "neet pg 2026 seat matrix", "aiq seat matrix
    // neet pg", "neet pg total seats 2026". The year and the count are the matrix's own.
    title: fitTitle(
      `NEET PG Seat Matrix ${o.year}: ${n(o.total)} MD/MS & DNB Seats by Branch`,
      `NEET PG Seat Matrix ${o.year}: Branch & State Wise Seats`,
      `NEET PG Seat Matrix ${o.year}`,
    ),
    description: fitDescription(
      `MCC's NEET PG ${o.year} seat matrix: ${n(o.total)} seats — ${n(seatsOf(o, "AIQ"))} All India Quota, ${n(seatsOf(o, "Deemed"))} deemed, ${n(seatsOf(o, "DNB"))} DNB. Branch, state and category wise.`,
      `MCC's NEET PG ${o.year} seat matrix: ${n(o.total)} MD, MS, diploma and DNB seats, branch wise, state wise and category wise.`,
    ),
    keywords:
      "NEET PG seat matrix, NEET PG seat matrix 2026, NEET PG total seats, AIQ seat matrix, MCC seat matrix, MD MS seats, DNB seats, NEET PG seats category wise",
  });
}

export default async function SeatMatrixPage() {
  const [o, branchPages, pgStates] = await Promise.all([getSeatMatrixOverview(), getBranches(), getPgStates()]);
  const hasBranch = new Set(branchPages.map((b) => b.slug));
  const stateSlug = new Map(pgStates.map((p) => [p.name, p.slug]));

  const years = o ? [...new Set(o.rounds.map((r) => r.year))].sort((a, b) => a - b) : [];
  const latest = years[years.length - 1];
  const latestRounds = o?.rounds.filter((r) => r.year === latest) ?? [];
  const upgraded = latestRounds.reduce((a, r) => a + r.upgraded, 0);
  const upgradedIn = (re: RegExp) => latestRounds.find((r) => re.test(r.round))?.upgraded ?? 0;
  const aiq = o?.aiqCategories;
  // MCC's AIQ matrix carries no separate PwD figures (every PwD column is 0), so the row is shown
  // only if a future matrix has some — never as "0 seats for candidates with a disability".
  const cats = CATS.filter((c) => c.key !== "pwd" || (aiq?.pwd ?? 0) > 0);
  const aiqTotal = aiq ? cats.reduce((a, c) => a + aiq[c.key], 0) : 0;
  const aiqColleges = o?.byMatrix.find((m) => m.seatMatrix === "AIQ")?.colleges ?? 0;
  const [top1, top2] = o?.branches ?? [];

  const tokens = {
    year: o?.year,
    years: years.join(" and "),
    total: o ? n(o.total) : undefined,
    aiq: o ? n(seatsOf(o, "AIQ")) : undefined,
    deemed: o ? n(seatsOf(o, "Deemed")) : undefined,
    central: o ? n(seatsOf(o, "Central Institutes Internal Quota")) : undefined,
    dnb: o ? n(seatsOf(o, "DNB")) : undefined,
    top_branch: top1?.course,
    top_branch_seats: top1 ? n(top1.seats) : undefined,
    second_branch: top2?.course,
    second_branch_seats: top2 ? n(top2.seats) : undefined,
    open: aiq ? n(aiq.open) : undefined,
    ews: aiq ? n(aiq.ews) : undefined,
    obc: aiq ? n(aiq.obc) : undefined,
    sc: aiq ? n(aiq.sc) : undefined,
    st: aiq ? n(aiq.st) : undefined,
    upgraded: n(upgraded),
    r2_upgraded: n(upgradedIn(/^round 2/i)),
    r3_upgraded: n(upgradedIn(/^round 3/i)),
  };
  const [copy, body, heroImage] = await Promise.all([
    pageCopy("page.pg_seat_matrix.hero", tokens),
    pageCopy("page.pg_seat_matrix.body", { ...tokens, year: o?.year }),
    pageHeroImage("page.pg_seat_matrix.hero"),
  ]);
  // The round takeaway, card and FAQ 5 speak of the latest results year, not the matrix's.
  const roundsCopy = await pageCopy("page.pg_seat_matrix.body", { ...tokens, year: latest });

  const faqs = o
    ? [
        { question: body.faq1_q, answer: body.faq1_a },
        { question: body.faq2_q, answer: body.faq2_a },
        ...(top1 && top2 ? [{ question: body.faq3_q, answer: body.faq3_a }] : []),
        { question: body.faq4_q, answer: body.faq4_a },
        ...(upgraded > 0 ? [{ question: roundsCopy.faq5_q, answer: roundsCopy.faq5_a }] : []),
      ]
    : [];
  const NOTE: Record<string, string> = {
    AIQ: body.aiq_note,
    Deemed: body.deemed_note,
    "Central Institutes Internal Quota": body.central_note,
    DNB: body.dnb_note,
  };

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "NEET PG seat matrix", path: PATH },
          ]),
          webPage({ name: `NEET PG seat matrix ${o?.year ?? ""}`.trim(), description: copy.subtitle, path: PATH }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "Seat matrix" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        image={heroImage}
        topic="chart"
        stats={
          o
            ? [
                { label: "Seats", value: n(o.total), note: `MCC, ${o.year}` },
                { label: MATRIX_LABEL.AIQ, value: n(seatsOf(o, "AIQ")) },
                { label: MATRIX_LABEL.Deemed, value: n(seatsOf(o, "Deemed")) },
                { label: MATRIX_LABEL.DNB, value: n(seatsOf(o, "DNB")) },
              ]
            : []
        }
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_seat_matrix"
        source={copy.source}
        visual={
          o ? (
            <HeroBars
              title={copy.visual_title}
              caption={copy.visual_caption}
              rows={o.branches.slice(0, 7).map((b) => ({
                label: b.course,
                value: b.seats,
                display: n(b.seats),
                href: hasBranch.has(b.slug) ? `/md-ms-india/branches/${b.slug}` : undefined,
                note: `${n(b.colleges)} colleges`,
              }))}
            />
          ) : undefined
        }
        insights={o ? [
          ...(top1 ? [{ icon: "up" as const, label: body.insight_branch, value: n(top1.seats), note: top1.course }] : []),
          ...(o.states[0] ? [{ icon: "college" as const, label: body.insight_state, value: n(o.states[0].seats), note: o.states[0].state }] : []),
          ...(upgraded > 0
            ? [{ icon: "spark" as const, label: roundsCopy.insight_upgrades, value: n(upgraded), note: body.insight_upgrades_note }]
            : []),
          ...(aiqColleges ? [{ icon: "authority" as const, label: body.insight_colleges, value: n(aiqColleges), note: `MCC, ${o.year}` }] : []),
        ] : undefined}
      />

      {!o ? (
        <section className="container-custom py-14">
          <p className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-muted-foreground">
            The seat matrix could not be loaded just now. Please try again in a minute.
          </p>
        </section>
      ) : (
        <>
          {/* -------------------------- the matrices -------------------------- */}
          <section className="container-custom py-10 md:py-14">
            <SectionHead icon="authority" eyebrow={`MCC · ${o.year}`} title={body.matrix_title} intro={body.matrix_intro} />
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="dt w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Seat matrix</th>
                    <th scope="col" className="px-4 py-3 font-semibold">What it is</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Seats</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {o.byMatrix.map((m) => (
                    <tr key={m.seatMatrix}>
                      <th scope="row" className="px-4 py-3 font-semibold text-foreground">{MATRIX_LABEL[m.seatMatrix] ?? m.seatMatrix}</th>
                      <td className="px-4 py-3 text-muted-foreground">{NOTE[m.seatMatrix] ?? ""}</td>
                      <td className="tnum px-4 py-3 text-right font-semibold">{n(m.seats)}</td>
                      <td className="tnum px-4 py-3 text-right text-muted-foreground">{n(m.colleges)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-surface-1">
                  <tr>
                    <th scope="row" colSpan={2} className="px-4 py-3 text-right text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">All</th>
                    <td className="tnum px-4 py-3 text-right font-bold">{n(o.total)}</td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* -------------------------- AIQ by category -------------------------- */}
          {aiq && aiqTotal > 0 && (
            <section className="border-t border-border bg-surface-1 py-10 md:py-14">
              <div className="container-custom">
                <SectionHead icon="people" eyebrow={MATRIX_LABEL.AIQ} title={body.category_title} intro={body.category_intro} />
                <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
                  <table className="dt w-full min-w-[520px] text-left text-sm">
                    <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">Category</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Seats</th>
                        <th scope="col" className="w-1/2 px-4 py-3 font-semibold">Share of AIQ seats</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {cats.map((c) => {
                        const pct = (aiq[c.key] / aiqTotal) * 100;
                        return (
                          <tr key={c.key}>
                            <th scope="row" className="px-4 py-3 font-semibold text-foreground">{c.label}</th>
                            <td className="tnum px-4 py-3 text-right font-semibold">{n(aiq[c.key])}</td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-3">
                                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(1, pct)}%` }} />
                                </span>
                                <span className="tnum w-12 shrink-0 text-right text-[13px] text-muted-foreground">{pct.toFixed(1)}%</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* -------------------------- by branch -------------------------- */}
          <section className="container-custom py-10 md:py-14">
            <SectionHead icon="branch" eyebrow={`${o.branches.length} courses`} title={body.branch_title} intro={body.branch_intro} />
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="dt w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Course</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">All seats</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">AIQ</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Deemed</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">DNB</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {o.branches.map((b) => (
                    <tr key={b.course}>
                      <th scope="row" className="px-4 py-2.5 font-medium">
                        {hasBranch.has(b.slug) ? (
                          <Link href={`/md-ms-india/branches/${b.slug}`} className="text-foreground hover:text-primary hover:underline">
                            {b.course}
                          </Link>
                        ) : (
                          <span className="text-foreground">{b.course}</span>
                        )}
                      </th>
                      <td className="px-4 py-2.5 text-muted-foreground">{b.programme}</td>
                      <td className="tnum px-4 py-2.5 text-right font-semibold">{n(b.seats)}</td>
                      <td className="tnum px-4 py-2.5 text-right">{b.aiq ? n(b.aiq) : "–"}</td>
                      <td className="tnum px-4 py-2.5 text-right">{b.deemed ? n(b.deemed) : "–"}</td>
                      <td className="tnum px-4 py-2.5 text-right">{b.dnb ? n(b.dnb) : "–"}</td>
                      <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{n(b.colleges)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* -------------------------- by state -------------------------- */}
          <section className="border-t border-border bg-surface-1 py-10 md:py-14">
            <div className="container-custom">
              <SectionHead icon="map" eyebrow={`${o.states.length} states`} title={body.state_title} intro={body.state_intro} />
              <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="dt w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">State</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">Seats MCC fills</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">of which AIQ</th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold">of which DNB</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {o.states.map((s) => (
                      <tr key={s.state}>
                        <th scope="row" className="px-4 py-2.5 font-medium">
                          {stateSlug.get(s.state) ? (
                            <Link href={`/md-ms-india/states/${stateSlug.get(s.state)}`} className="text-foreground hover:text-primary hover:underline">
                              {s.state}
                            </Link>
                          ) : (
                            <span className="text-foreground">{s.state}</span>
                          )}
                        </th>
                        <td className="tnum px-4 py-2.5 text-right font-semibold">{n(s.seats)}</td>
                        <td className="tnum px-4 py-2.5 text-right">{s.aiq ? n(s.aiq) : "–"}</td>
                        <td className="tnum px-4 py-2.5 text-right">{s.dnb ? n(s.dnb) : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* -------------------------- rounds -------------------------- */}
          {o.rounds.length > 0 && (
            <section className="container-custom py-10 md:py-14">
              <SectionHead icon="route" eyebrow={`MCC · ${years.join(" and ")}`} title={body.rounds_title} intro={body.rounds_intro} />
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {[...years].reverse().map((y) => (
                  <div key={y} className="overflow-x-auto rounded-2xl border border-border bg-card">
                    <table className="dt w-full min-w-[420px] text-left text-sm">
                      <caption className="border-b border-border bg-surface-1 px-4 py-3 text-left font-heading text-[15px] font-bold text-foreground">
                        {y} counselling
                      </caption>
                      <thead className="border-b border-border text-[12px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-4 py-2.5 font-semibold">Round</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-semibold">Fresh</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-semibold">Upgraded</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-semibold">In the list</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {o.rounds
                          .filter((r) => r.year === y)
                          .map((r) => (
                            <tr key={r.round}>
                              <th scope="row" className="px-4 py-2.5 font-medium text-foreground">{r.round}</th>
                              <td className="tnum px-4 py-2.5 text-right">{n(r.fresh)}</td>
                              <td className="tnum px-4 py-2.5 text-right font-semibold">{r.upgraded ? n(r.upgraded) : "–"}</td>
                              <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{n(r.allotted)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
              {upgraded > 0 && (
                <p className="mt-5 max-w-[78ch] rounded-2xl border border-border bg-surface-2 px-5 py-4 text-[14px] leading-relaxed text-muted-foreground">
                  {roundsCopy.rounds_takeaway}{" "}
                  <Link href="/neet-college-predictor?course=pg" className="font-semibold text-primary-strong hover:underline dark:text-primary">
                    {copy.cta}
                  </Link>
                </p>
              )}
            </section>
          )}

          {/* -------------------------- FAQ -------------------------- */}
          {faqs.length > 0 && (
            <section className="border-t border-border bg-surface-1 py-10 md:py-14">
              <div className="container-custom">
                <SectionHead icon="help" eyebrow="FAQ" title={copy.faq_title} />
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
                  <Link href="/neet-pg-cutoff" className="font-semibold text-primary-strong hover:underline">NEET PG cutoff, branch wise</Link> ·{" "}
                  <Link href="/md-ms-india/bond" className="font-semibold text-primary-strong hover:underline">PG service bond by state</Link> ·{" "}
                  <Link href="/neet-pg-process" className="font-semibold text-primary-strong hover:underline">how NEET PG counselling works</Link>
                </p>
              </div>
            </section>
          )}

          <section className="container-custom py-10">
            <CiteThis title={`NEET PG seat matrix ${o.year}`} path={PATH} source="MCC's published NEET PG seat matrix" openData={false} />
          </section>
        </>
      )}

      <LeadCapture level="pg" source="NEET PG seat matrix page" title={body.lead_title} body={body.lead_body} />
      <TelegramJoin placement="pg_seat_matrix" />
    </main>
  );
}
