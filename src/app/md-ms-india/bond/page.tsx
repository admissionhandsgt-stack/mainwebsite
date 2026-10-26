import type { Metadata } from "next";
import { Info } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { getBondByState } from "@/lib/pgSeatData";
import { getPgStates } from "@/lib/pgStateQueries";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import SectionHead from "@/components/ui/SectionHead";
import OpenOnHash from "@/components/ui/OpenOnHash";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import TelegramRoundAlert from "@/components/engage/TelegramRoundAlert";

/**
 * "PG medical bond state wise" (2026-10-20): the service bond and seat-leaving terms on MD/MS
 * seats, state by state, from pg_seat_terms (migration 0039) — a third-party compilation, so the
 * hero's source line says so and asks the reader to confirm before paying or signing. A state's
 * figure needs three colleges behind it; each government college's own terms are listed under
 * its state. Words from Admin → Content ("Page: PG service bond").
 */

const PATH = "/md-ms-india/bond";
const rupees = (v: number) => `₹${v.toLocaleString("en-IN")}`;
const big = (v: number | null | undefined) => {
  if (v == null) return "—";
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, "");
  if (v >= 1e7) return `₹${trim(v / 1e7)} Cr`;
  if (v >= 1e5) return `₹${trim(v / 1e5)} L`;
  return rupees(v);
};
const years = (y: number | null | undefined) => (y == null ? "—" : y === 0 ? "No bond" : `${y} year${y === 1 ? "" : "s"}`);
const share = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBondByState();
  return resolveMetadata(PATH, {
    // Searched as "pg bond state wise", "md ms bond in government medical colleges", "pg service
    // bond penalty", "neet pg bond". The year is the counselling the terms were listed for.
    title: fitTitle(
      `PG Medical Bond State Wise ${b?.year ?? ""}: MD/MS Service Bond & Penalty`.replace(/\s+:/, ":"),
      "PG Medical Bond State Wise: MD/MS Service Bond & Penalty",
      "PG Service Bond State Wise",
    ),
    description: fitDescription(
      ...(b
        ? [
            `${b.govtBonded} of ${b.govtColleges} government PG colleges bind MD/MS graduates to service; the middle bond penalty is ${big(b.penaltyMedian)}. Bond years, penalty and seat-leaving rules, state wise.`,
            `MD/MS service bond state wise: years, bond penalty (middle ${big(b.penaltyMedian)}) and seat-leaving penalty for ${b.govtColleges + b.otherColleges} colleges.`,
          ]
        : []),
      "MD/MS service bond state wise: how long the bond is, what breaking it costs, and the seat-leaving penalty, for government and private colleges.",
    ),
    keywords:
      "PG bond state wise, MD MS bond, service bond PG medical, PG bond penalty, NEET PG bond, seat leaving penalty PG, bond in government medical colleges",
  });
}

export default async function BondPage() {
  const [b, pgStates] = await Promise.all([getBondByState(), getPgStates()]);
  const stateSlug = new Map(pgStates.map((p) => [p.name, p.slug]));
  const govtStates = b?.states.filter((s) => s.govt.colleges > 0) ?? [];
  const otherStates = b?.states.filter((s) => s.other.colleges > 0).sort((x, y) => y.other.colleges - x.other.colleges) ?? [];
  const states = b?.states.length ?? 0;

  const tokens = {
    year: b?.year,
    colleges: b ? (b.govtColleges + b.otherColleges).toLocaleString("en-IN") : undefined,
    states,
    govt_bonded: b?.govtBonded,
    govt_colleges: b?.govtColleges,
    one_year: b?.byYears[1],
    two_year: b?.byYears[2],
    three_year: b?.byYears[3],
    penalty_median: big(b?.penaltyMedian),
    penalty_low: big(b?.penaltyLow),
    penalty_high: big(b?.penaltyHigh),
    exit_median: big(b?.exitMedian),
    exit_colleges: b?.exitColleges,
    all_colleges: b?.allColleges,
    private_colleges: b?.otherColleges,
    private_bonded: b?.otherBonded,
    private_bond_states: list((b?.otherBondStates ?? []).slice(0, 5)),
  };
  const [copy, body, heroImage] = await Promise.all([
    pageCopy("page.pg_bond.hero", tokens),
    pageCopy("page.pg_bond.body", tokens),
    pageHeroImage("page.pg_bond.hero"),
  ]);

  const faqs = b
    ? [
        { question: body.faq1_q, answer: body.faq1_a },
        { question: body.faq2_q, answer: body.faq2_a },
        ...(b.penaltyMedian ? [{ question: body.faq3_q, answer: body.faq3_a }] : []),
        ...(b.exitMedian ? [{ question: body.faq4_q, answer: body.faq4_a }] : []),
        ...(b.otherBondStates.length ? [{ question: body.faq5_q, answer: body.faq5_a }] : []),
      ]
    : [];
  const byPenalty = govtStates.filter((s) => s.govt.penaltyMedian).sort((x, y) => (y.govt.penaltyMedian ?? 0) - (x.govt.penaltyMedian ?? 0));

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "PG service bond by state", path: PATH },
          ]),
          webPage({ name: "PG medical service bond, state wise", description: copy.subtitle, path: PATH }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "Service bond" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        image={heroImage}
        topic="document"
        // No stat tiles: the four insight cards under the words carry the same figures with their context,
        // and the subtitle names the states (2026-10-21 — eight boxes said four things twice).
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_bond"
        source={copy.source}
        visual={
          byPenalty.length ? (
            <HeroBars
              title={copy.visual_title}
              caption={copy.visual_caption}
              rows={byPenalty.slice(0, 7).map((s) => ({
                label: s.state,
                value: s.govt.penaltyMedian ?? 0,
                display: big(s.govt.penaltyMedian),
                href: `#${s.anchor}`,
                note: `${years(s.govt.typicalYears)} usual · ${s.govt.withBond} of ${s.govt.colleges} colleges`,
              }))}
            />
          ) : undefined
        }
        insights={b ? [
          { icon: "authority" as const, label: body.insight_bonded, value: share(b.govtBonded, b.govtColleges), note: `${b.govtBonded} of ${b.govtColleges}` },
          ...(b.penaltyMedian ? [{ icon: "up" as const, label: body.insight_penalty, value: big(b.penaltyMedian), note: `usually ${big(b.penaltyLow)} – ${big(b.penaltyHigh)}` }] : []),
          ...(b.exitMedian ? [{ icon: "compare" as const, label: body.insight_exit, value: big(b.exitMedian), note: `${b.exitColleges} of ${b.allColleges} colleges list one` }] : []),
          { icon: "college" as const, label: body.insight_private, value: share(b.otherBonded, b.otherColleges), note: `${b.otherBonded} of ${b.otherColleges}` },
        ] : undefined}
      />

      {!b ? (
        <section className="container-custom py-14">
          <p className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-muted-foreground">
            The bond terms could not be loaded just now. Please try again in a minute.
          </p>
        </section>
      ) : (
        <>
          {/* ---------------------- government seats, by state ---------------------- */}
          <section className="container-custom py-10 md:py-14">
            <SectionHead icon="authority" eyebrow="Government colleges" title={body.states_title} intro={body.states_intro} />
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="dt w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">State</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">With a bond</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Usual length</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Bond penalty</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Leaving the seat</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Barred for</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {govtStates.map((s) => (
                    <tr key={s.state}>
                      <th scope="row" className="px-4 py-2.5 font-medium">
                        <Link href={`#${s.anchor}`} className="text-foreground hover:text-primary hover:underline">
                          {s.state}
                        </Link>
                      </th>
                      <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{s.govt.colleges}</td>
                      <td className="tnum px-4 py-2.5 text-right">{s.govt.withBond}</td>
                      <td className="px-4 py-2.5">{s.govt.withBond ? years(s.govt.typicalYears) : "No bond listed"}</td>
                      <td className="tnum px-4 py-2.5 text-right font-semibold">
                        {big(s.govt.penaltyMedian)}
                        {s.govt.penaltyLow != null && s.govt.penaltyHigh != null && s.govt.penaltyLow !== s.govt.penaltyHigh && (
                          <span className="block text-[12px] font-normal text-muted-foreground">
                            {big(s.govt.penaltyLow)} – {big(s.govt.penaltyHigh)}
                          </span>
                        )}
                      </td>
                      <td className="tnum px-4 py-2.5 text-right">{big(s.govt.exitMedian)}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{s.govt.debarYears ? years(s.govt.debarYears) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 flex gap-3 rounded-2xl border border-border bg-surface-2 px-5 py-4 text-[13.5px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span>{copy.source}</span>
            </p>
          </section>

          {/* The bond is read by someone choosing seats for the next MCC round — the alert is what they need next. */}
          <TelegramRoundAlert placement="round_alert_pg_bond" className="pb-10 md:pb-14" />

          {/* ---------------------- private, deemed, society ---------------------- */}
          {otherStates.length > 0 && (
            <section className="border-t border-border bg-surface-1 py-10 md:py-14">
              <div className="container-custom">
                <SectionHead icon="college" eyebrow="Private and deemed" title={body.private_title} intro={body.private_intro} />
                <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
                  <table className="dt w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">State</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">With a bond</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Leaving the seat</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Keep the whole fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {otherStates.map((s) => (
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
                          <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{s.other.colleges}</td>
                          <td className="tnum px-4 py-2.5 text-right">{s.other.withBond || "–"}</td>
                          <td className="tnum px-4 py-2.5 text-right font-semibold">{big(s.other.exitMedian)}</td>
                          <td className="tnum px-4 py-2.5 text-right">{s.other.fullFee || "–"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ---------------------- every government college ---------------------- */}
          <section className="container-custom py-10 md:py-14">
            <SectionHead icon="list" eyebrow={`${b.govtColleges} colleges`} title={body.list_title} intro={body.list_intro} />
            <OpenOnHash />
            <div className="mt-6 space-y-3">
              {govtStates.map((s) => (
                <details key={s.state} id={s.anchor} className="scroll-mt-24 rounded-2xl border border-border bg-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                    <span className="font-heading text-[16px] font-bold text-foreground">{s.state}</span>
                    <span className="tnum text-[13px] text-muted-foreground">
                      {s.govt.withBond} of {s.govt.colleges} with a bond
                    </span>
                  </summary>
                  <div className="overflow-x-auto border-t border-border">
                    <table className="dt w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-4 py-2.5 font-semibold">College</th>
                          <th scope="col" className="px-4 py-2.5 font-semibold">Bond</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-semibold">Bond penalty</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-semibold">Leaving the seat</th>
                          <th scope="col" className="px-4 py-2.5 text-right font-semibold">Stipend, year 1</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {s.govt.list.map((c) => (
                          <tr key={c.slug}>
                            <th scope="row" className="px-4 py-2.5 font-medium">
                              <Link href={`/md-ms-india/colleges/${c.slug}#seat-terms`} className="text-foreground hover:text-primary hover:underline">
                                {c.name}
                              </Link>
                            </th>
                            <td className="px-4 py-2.5">{years(c.bondYears)}</td>
                            <td className="tnum px-4 py-2.5 text-right">{c.bondYears ? big(c.bondPenalty) : "—"}</td>
                            <td className="tnum px-4 py-2.5 text-right">
                              {big(c.exitPenalty)}
                              {c.exitDebarYears ? <span className="block text-[12px] text-muted-foreground">barred {years(c.exitDebarYears)}</span> : null}
                            </td>
                            <td className="tnum px-4 py-2.5 text-right">{c.stipendY1 ? `${rupees(c.stipendY1)} /mo` : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* ---------------------- FAQ ---------------------- */}
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
                <p className="mt-6 text-sm text-muted-foreground">
                  Also:{" "}
                  <Link href="/md-ms-india/stipend" className="font-semibold text-primary-strong hover:underline">PG stipend by state</Link> ·{" "}
                  <Link href="/neet-pg-seat-matrix" className="font-semibold text-primary-strong hover:underline">NEET PG seat matrix</Link> ·{" "}
                  <Link href="/md-ms-india/private-college-fees" className="font-semibold text-primary-strong hover:underline">private college PG fees</Link>
                </p>
              </div>
            </section>
          )}
        </>
      )}

      <LeadCapture level="pg" source="PG bond page" title={body.lead_title} body={body.lead_body} />
      <TelegramJoin placement="pg_bond" />
    </main>
  );
}
