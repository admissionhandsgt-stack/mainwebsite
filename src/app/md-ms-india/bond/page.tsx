import type { Metadata } from "next";
import { Info } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { getBondByState } from "@/lib/pgSeatData";
import { getPgStates } from "@/lib/pgStateQueries";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { bindsAiq, getOfficialBond, govtBond, hasOwnBond, money, rangeText, sessionOf, yearsText, type JsonObject, type OfficialState } from "@/lib/officialBond";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import SectionHead from "@/components/ui/SectionHead";
import OpenOnHash from "@/components/ui/OpenOnHash";
import { hinglishFaqs } from "@/lib/hinglishFaq";
import DataTools from "@/components/ui/DataTools";
import { toolLabels } from "@/lib/dataToolLabels";
import DataPageEnd from "@/components/lead/DataPageEnd";
import { JsonView, Rows, SourcedNote, Sources, sourcesIn } from "@/components/bond/OfficialBond";
import { sourcesOf } from "@/lib/officialBond";

/**
 * "PG medical bond state wise". Since 2026-11-16 (owner: "ek generic consolidated page bhi rehne do… uske aankde clear
 * kardena") it leads with the official rules: each state's own 2026-27 bulletin / prospectus / orders, MCC's bulletin and
 * each college's own notice (lib/officialBond.ts), one row per state linking its own page (/md-ms-india/bond/<state>), then
 * MCC's seats. The third-party compilation (pg_seat_terms) stays only for the states not read yet, under its caveat; for a
 * state with official rules the compilation's figures are not shown anywhere on the page, its government colleges are
 * listed by name with the state's rule. Words from Admin → Content ("Page: PG service bond", "… — official rules").
 */

const PATH = "/md-ms-india/bond";
const rupees = (v: number) => `₹${v.toLocaleString("en-IN")}`;
const big = (v: number | null | undefined) => (v == null ? "—" : money(v));
const years = (y: number | null | undefined) => (y == null ? "—" : y === 0 ? "No bond" : `${y} year${y === 1 ? "" : "s"}`);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const isObj = (v: unknown): v is JsonObject => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const date = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "";

/** Figures for the hero, the table and the FAQ, all from the official rules. */
async function officialFigures() {
  const off = await getOfficialBond();
  if (!off) return null;
  const rows = off.states.map((s) => ({ s, g: govtBond(s), aiq: bindsAiq(s), colleges: off.colleges.filter((c) => c.state === s.state) }));
  const withYears = rows.filter((r) => r.g.years && !r.g.flag);
  const yMin = withYears.length ? Math.min(...withYears.map((r) => r.g.years!)) : null;
  const yMax = withYears.length ? Math.max(...withYears.map((r) => r.g.yearsMax ?? r.g.years!)) : null;
  const byAmount = rows.filter((r) => r.g.max && r.g.flag !== "lead").sort((a, b) => (b.g.max ?? 0) - (a.g.max ?? 0));
  const session = off.states[0] ? sessionOf(off.states[0]) : "2026-27";
  const read = off.colleges.filter((c) => c.status !== "not_verified").length;
  const own = off.colleges.filter(hasOwnBond).length;
  return { off, rows, yMin, yMax, byAmount, session, read, own };
}

export async function generateMetadata(): Promise<Metadata> {
  const f = await officialFigures();
  const top = f?.byAmount[0];
  return resolveMetadata(PATH, {
    // Searched as "neet pg bond state wise", "seat leaving penalty neet pg state wise", "pg bond in <state>" (GSC, 90 days
    // to 16 Nov 2026: ~2,600 impressions, position ~8). The year is the session the official rules are for.
    title: fitTitle(
      `NEET PG Bond & Seat Leaving Penalty State Wise ${f?.session ?? ""}`.trim(),
      "NEET PG Bond & Seat Leaving Penalty State Wise",
      `PG Medical Bond State Wise ${f?.session ?? ""}: MD/MS Service Bond & Penalty`.replace(/\s+:/, ":"),
      "PG Service Bond State Wise",
    ),
    description: fitDescription(
      ...(f && top
        ? [
            `Official ${f.session} PG bond rules for ${f.rows.length} states: government bonds of ${f.yMin}–${f.yMax} years, up to ${money(top.g.max!)} (${top.s.state}) if not served. Seat-leaving penalty round by round and ${f.off.colleges.length} private colleges' own bonds, from official notices.`,
            `Official ${f.session} PG bond rules, state wise: years, amount if not served, seat-leaving penalty by round and private colleges' bonds for ${f.rows.length} states.`,
          ]
        : []),
      "MD/MS service bond state wise: how long the bond is, what breaking it costs, and the seat-leaving penalty, for government and private colleges.",
    ),
    keywords:
      "PG bond state wise, NEET PG bond state wise, MD MS bond, service bond PG medical, PG bond penalty, seat leaving penalty NEET PG state wise, bond in government medical colleges",
  });
}

export default async function BondPage() {
  const [b, pgStates, f] = await Promise.all([getBondByState(), getPgStates(), officialFigures()]);
  const stateSlug = new Map(pgStates.map((p) => [p.name, p.slug]));
  const official = new Map((f?.rows ?? []).map((r) => [r.s.state, r]));
  // The compilation, only for states whose own documents have not been read.
  const govtStates = b?.states.filter((s) => s.govt.colleges > 0) ?? [];
  const otherGovt = govtStates.filter((s) => !official.has(s.state));
  const otherPrivate = (b?.states ?? []).filter((s) => s.other.colleges > 0 && !official.has(s.state)).sort((x, y) => y.other.colleges - x.other.colleges);
  const mcc = f?.off.mcc ?? null;

  const top = f?.byAmount[0];
  const aiqStates = (f?.rows ?? []).filter((r) => r.aiq).map((r) => r.s.state);
  const tokens = {
    session: f?.session,
    as_of: date(f?.off.asOf ?? null),
    official_states: f?.rows.length,
    years_range: f?.yMin != null && f?.yMax != null ? (f.yMin === f.yMax ? `${f.yMin} year${f.yMin === 1 ? "" : "s"}` : `${f.yMin} to ${f.yMax} years`) : undefined,
    top_bond: top ? money(top.g.max!) : undefined,
    top_state: top?.s.state,
    aiq_states: aiqStates.length || undefined,
    year: b?.year,
  };
  const notNotified = (f?.rows ?? []).filter((r) => r.g.flag === "not_notified").map((r) => r.s.state);
  const lead = (f?.rows ?? []).filter((r) => r.g.flag === "lead").map((r) => r.s.state);
  // A state whose government bond is only a lead (Jharkhand): its government colleges' bond as listed for the counselling,
  // marked so (owner, 2026-11-16: never "not confirmed" where we hold a figure).
  const listedGovt = (state: string) => {
    const x = b?.states.find((y) => y.state === state)?.govt;
    if (!x?.colleges) return null;
    if (!x.typicalYears) return x.withBond === 0 ? "0 years (no service bond)" : null;
    return `${x.typicalYears} year${x.typicalYears === 1 ? "" : "s"}${x.penaltyMedian ? `, ${money(x.penaltyMedian)} if not served` : ""}`;
  };
  const noFigure = (f?.rows ?? []).filter((r) => !r.g.flag && !r.g.zero && !r.g.years && !r.g.min).map((r) => r.s.state);
  const zeroStates = (f?.rows ?? []).filter((r) => r.g.zero).map((r) => r.s.state);
  const bondStates = (f?.rows ?? []).filter((r) => !r.g.flag && (r.g.years || r.g.min));
  const otherLine = [
    notNotified.length ? `${list(notNotified)} ${notNotified.length > 1 ? "have" : "has"} not notified one for ${f?.session} yet.` : "",
    ...lead.map((st) => (listedGovt(st) ? `${st}'s government colleges: ${listedGovt(st)}, as listed for the counselling.` : "")),
    zeroStates.length ? `${list(zeroStates)} carry no government service bond (0 years): none is stated in their 2026-27 documents.` : "",
    noFigure.length ? `${list(noFigure)} print no fixed figure; their pages give the rules as printed.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const mccRows = mcc && Array.isArray(mcc.data.seat_leaving) ? (mcc.data.seat_leaving.filter(isObj) as JsonObject[]) : [];
  const ftokens = {
    ...tokens,
    bond_states: list(bondStates.map((r) => `${r.s.state} (${[yearsText(r.g.years, r.g.yearsMax), rangeText(r.g.min, r.g.max)].filter(Boolean).join(", ")})`)),
    other_line: otherLine,
    top_list: list((f?.byAmount ?? []).slice(0, 3).map((r) => `${r.s.state} ${money(r.g.max!)}`)),
    aiq_list: list(aiqStates),
    read_colleges: f?.read,
    own_colleges: f?.own,
    mcc_leave: mccRows.length ? `${mccRows.map((r) => `${str(r.when)}: ${str(r.government)}`).join(" ")}` : undefined,
  };
  const [copy, body, oc, heroImage] = await Promise.all([
    pageCopy("page.pg_bond.hero", tokens),
    pageCopy("page.pg_bond.body", tokens),
    pageCopy("page.pg_bond.official", ftokens),
    pageHeroImage("page.pg_bond.hero"),
  ]);

  const faqs = f
    ? [
        { question: oc.faq_states_q, answer: oc.faq_states_a },
        { question: oc.faq_top_q, answer: oc.faq_top_a },
        ...(aiqStates.length ? [{ question: oc.faq_aiq_q, answer: oc.faq_aiq_a }] : []),
        { question: oc.faq_private_q, answer: oc.faq_private_a },
        ...(mccRows.length ? [{ question: oc.faq_leave_q, answer: oc.faq_leave_a }] : []),
      ].filter((x) => x.question && x.answer)
    : [];
  // Hinglish questions (Admin → Content → "Site: Hinglish questions on data pages"); a line whose figure is missing drops.
  if (f) faqs.push(...(await hinglishFaqs("bond", ftokens)));
  const [labels, stateLabels] = await Promise.all([toolLabels("bond_search"), toolLabels("state_search")]);

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
        subtitle={f && top && copy.answer ? copy.answer : copy.subtitle}
        image={heroImage}
        topic="document"
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_bond"
        source={copy.source}
        visual={
          f?.byAmount.length ? (
            <HeroBars
              title={copy.visual_title}
              caption={copy.visual_caption}
              rows={f.byAmount.slice(0, 7).map((r) => ({
                label: r.s.state,
                value: r.g.max ?? 0,
                display: money(r.g.max!),
                href: `/md-ms-india/bond/${r.s.slug}`,
                note: `${yearsText(r.g.years, r.g.yearsMax) ?? ""} of service`.trim(),
              }))}
            />
          ) : undefined
        }
        insights={
          f
            ? [
                { icon: "authority" as const, label: oc.insight_states, value: String(f.rows.length), note: "plus MCC's own rules" },
                ...(top ? [{ icon: "up" as const, label: oc.insight_top, value: money(top.g.max!), note: top.s.state }] : []),
                { icon: "compare" as const, label: oc.insight_aiq, value: String(aiqStates.length), note: "in their government colleges" },
                { icon: "college" as const, label: oc.insight_private, value: String(f.off.colleges.length), note: `${f.own} print their own bond` },
              ]
            : undefined
        }
      />

      {/* ---------------------- official rules, state by state ---------------------- */}
      {f && (
        <section className="container-custom py-8 md:py-10" id="official">
          <SectionHead icon="authority" eyebrow={`Official · ${f.session}`} title={oc.states_title} intro={oc.states_intro} />
          <DataTools
            id="bond-official-tools"
            className="mt-6"
            targets={["bond-official"]}
            total={f.rows.length}
            placement="bond_official"
            labels={stateLabels}
            chips={[
              {
                key: "aiq",
                label: "AIQ seats",
                options: [
                  { value: "yes", label: "Bond binds AIQ seats" },
                  { value: "no", label: "Not stated" },
                ],
              },
            ]}
            sorts={[
              { key: "amt", label: "Bond amount, highest first", dir: "desc" },
              { key: "yrs", label: "Longest bond first", dir: "desc" },
              { key: "name", label: "State, A–Z", text: true },
            ]}
          />
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table id="bond-official" className="dt w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">State</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Government service</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">If not served</th>
                  <th scope="col" className="px-4 py-3 font-semibold">AIQ seats</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Private colleges with their own bond</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {f.rows.map(({ s, g, aiq, colleges }) => {
                  const own = colleges.filter(hasOwnBond).length;
                  return (
                    <tr
                      key={s.slug}
                      data-row=""
                      data-f-aiq={aiq ? "yes" : "no"}
                      data-s-name={s.state.toLowerCase()}
                      {...(g.max && g.flag !== "lead" ? { "data-s-amt": g.max } : {})}
                      {...(g.years && !g.flag ? { "data-s-yrs": g.yearsMax ?? g.years } : {})}
                    >
                      <th scope="row" className="px-4 py-2.5 font-medium">
                        <Link href={`/md-ms-india/bond/${s.slug}`} className="text-primary-strong hover:underline dark:text-primary">
                          {s.state} PG bond
                        </Link>
                      </th>
                      <td className="px-4 py-2.5">
                        {g.flag === "not_notified" ? "Not notified yet" : g.flag === "lead" ? (listedGovt(s.state) ? `${listedGovt(s.state)} (as listed)` : "As listed for the counselling") : g.zero ? "0 years (no service bond)" : (yearsText(g.years, g.yearsMax) ?? <span className="text-muted-foreground">As printed</span>)}
                      </td>
                      <td className="tnum px-4 py-2.5 text-right font-semibold">
                        {g.flag !== "lead" && rangeText(g.min, g.max) ? rangeText(g.min, g.max) : <span className="font-normal text-muted-foreground">{g.words ? "No fixed figure" : "—"}</span>}
                      </td>
                      <td className="px-4 py-2.5">{aiq ? "Bound too" : <span className="text-muted-foreground">Not stated</span>}</td>
                      <td className="tnum px-4 py-2.5 text-right">
                        {colleges.length ? `${own} of ${colleges.length}` : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex gap-3 rounded-2xl border border-border bg-surface-2 px-5 py-4 text-[13.5px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{copy.source}</span>
          </p>
        </section>
      )}

      {/* ---------------------- MCC's seats ---------------------- */}
      {mcc && <MccRules mcc={mcc} title={oc.mcc_title} intro={oc.mcc_intro} />}

      {/* ---------------------- states not read yet: the compilation, with its caveat ---------------------- */}
      {(otherGovt.length > 0 || otherPrivate.length > 0) && (
        <section className="container-custom py-8 md:py-10" id="other-states">
          <SectionHead icon="list" eyebrow="As listed for the counselling" title={oc.other_title} intro={oc.other_intro} />
          {otherGovt.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="dt w-full min-w-[640px] text-left text-sm">
                <caption className="px-4 pt-3 text-left text-[13px] font-semibold text-muted-foreground">Government colleges</caption>
                <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">State</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">With a bond</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Usual length</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Bond penalty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {otherGovt.map((s) => (
                    <tr key={s.state}>
                      <th scope="row" className="px-4 py-2.5 font-medium">
                        <Link href={`#${s.anchor}`} className="text-foreground hover:text-primary hover:underline">
                          {s.state}
                        </Link>
                      </th>
                      <td className="tnum px-4 py-2.5 text-right text-muted-foreground">{s.govt.colleges}</td>
                      <td className="tnum px-4 py-2.5 text-right">{s.govt.withBond}</td>
                      <td className="px-4 py-2.5">{s.govt.withBond ? years(s.govt.typicalYears) : "No bond listed"}</td>
                      <td className="tnum px-4 py-2.5 text-right font-semibold">{big(s.govt.penaltyMedian)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {otherPrivate.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="dt w-full min-w-[560px] text-left text-sm">
                <caption className="px-4 pt-3 text-left text-[13px] font-semibold text-muted-foreground">Private, deemed and society-run colleges</caption>
                <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">State</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">With a bond</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {otherPrivate.map((s) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ---------------------- every government college ---------------------- */}
      {b && govtStates.length > 0 && (
        <section className="border-t border-border bg-surface-1 py-8 md:py-10">
          <div className="container-custom">
            <SectionHead icon="list" eyebrow={`${b.govtColleges} colleges`} title={body.list_title} intro={body.list_intro} />
            <OpenOnHash />
            {/* "Find your college": opens the state holding it and shows only the matching colleges (components/ui/DataTools). */}
            <DataTools
              id="bond-tools"
              className="mt-6"
              targets={["bond-colleges"]}
              total={govtStates.length}
              placement="bond_colleges"
              labels={{ ...labels, showing: labels.showing.replace("{total}", "{total} states") }}
              searchSubs
            />
            <div id="bond-colleges" className="mt-6 space-y-3">
              {govtStates.map((s) => {
                const o = official.get(s.state);
                return (
                  <details key={s.state} id={s.anchor} data-row="" className="scroll-mt-24 rounded-2xl border border-border bg-card">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                      <span className="font-heading text-[16px] font-bold text-foreground">{s.state}</span>
                      <span className="tnum text-[13px] text-muted-foreground">
                        {o ? "Official rules" : `${s.govt.withBond} of ${s.govt.colleges} with a bond`}
                      </span>
                    </summary>
                    {o ? (
                      <div className="border-t border-border px-5 py-4">
                        <p className="text-[14.5px] leading-relaxed text-foreground">
                          {o.g.flag === "not_notified"
                            ? `${s.state} has not notified a government service bond for ${f?.session} yet.`
                            : o.g.flag === "lead"
                              ? `Government colleges, as listed for the counselling: ${listedGovt(s.state) ?? "see the colleges below"}.`
                              : `Government colleges: ${[yearsText(o.g.years, o.g.yearsMax) ? `${yearsText(o.g.years, o.g.yearsMax)} of service` : null, rangeText(o.g.min, o.g.max) ? `${rangeText(o.g.min, o.g.max)} if not served` : null].filter(Boolean).join(", ") || "as the state's rules print it"}.`}{" "}
                          <Link href={`/md-ms-india/bond/${o.s.slug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                            {s.state}'s rules in full →
                          </Link>
                        </p>
                        <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-[14px] sm:grid-cols-2 lg:grid-cols-3">
                          {s.govt.list.map((c) => (
                            <li key={c.slug} data-sub="">
                              <Link href={`/md-ms-india/colleges/${c.slug}#official-bond`} className="text-foreground hover:text-primary hover:underline">
                                {c.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border-t border-border">
                        <table className="dt w-full min-w-[720px] text-left text-sm">
                          <thead className="bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                            <tr>
                              <th scope="col" className="px-4 py-2.5 font-semibold">College</th>
                              <th scope="col" className="px-4 py-2.5 font-semibold">Bond</th>
                              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Bond penalty</th>
                              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Stipend, year 1</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {s.govt.list.map((c) => (
                              <tr key={c.slug} data-sub="">
                                <th scope="row" className="px-4 py-2.5 font-medium">
                                  <Link href={`/md-ms-india/colleges/${c.slug}#seat-terms`} className="text-foreground hover:text-primary hover:underline">
                                    {c.name}
                                  </Link>
                                </th>
                                <td className="px-4 py-2.5">{years(c.bondYears)}</td>
                                <td className="tnum px-4 py-2.5 text-right">{c.bondYears ? big(c.bondPenalty) : "—"}</td>
                                <td className="tnum px-4 py-2.5 text-right">{c.stipendY1 ? `${rupees(c.stipendY1)} /mo` : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="px-4 py-3 text-[12.5px] text-muted-foreground">{oc.other_intro}</p>
                      </div>
                    )}
                  </details>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <DataPageEnd
        telegram={{ placement: "pg_bond" }}
        playbook={{ kind: "fees", name: "PG bond", placement: "bond" }}
        lead={{ level: "pg", source: "PG bond page", title: body.lead_title, body: body.lead_body }}
      />

      {/* ---------------------- FAQ ---------------------- */}
      {faqs.length > 0 && (
        <section className="border-t border-border bg-surface-1 py-8 md:py-10">
          <div className="container-custom">
            <SectionHead icon="help" eyebrow="FAQ" title={body.faq_title} />
            <div className="mt-6 space-y-3">
              {faqs.map((x) => (
                <details key={x.question} className="rounded-2xl border border-border bg-card p-5">
                  <summary className="cursor-pointer font-semibold text-foreground">{x.question}</summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{x.answer}</p>
                </details>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Also:{" "}
              <Link href="/md-ms-india/stipend" className="font-semibold text-primary-strong hover:underline">PG stipend by state</Link> ·{" "}
              <Link href="/neet-pg-seat-matrix" className="font-semibold text-primary-strong hover:underline">NEET PG seat matrix</Link> ·{" "}
              <Link href="/neet-pg-choice-filling" className="font-semibold text-primary-strong hover:underline">NEET PG choice filling</Link> ·{" "}
              <Link href="/md-ms-india/private-college-fees" className="font-semibold text-primary-strong hover:underline">private college PG fees</Link>
            </p>
          </div>
        </section>
      )}
      {f && <SourcedNote text={oc.sourced_note} />}
    </main>
  );
}

/** MCC's own rules: no service bond, AFMS's, what leaving a seat costs round by round, the deposit. */
function MccRules({ mcc, title, intro }: { mcc: OfficialState; title: string; intro: string }) {
  const d = mcc.data;
  const gsb = isObj(d.government_service_bond) ? d.government_service_bond : {};
  const rows = Array.isArray(d.seat_leaving) ? (d.seat_leaving.filter(isObj) as JsonObject[]) : [];
  const deposit = isObj(d.security_deposit_inr) ? d.security_deposit_inr : null;
  const course = isObj(d.course_leaving_penalty) ? d.course_leaving_penalty : null;
  return (
    <section className="border-y border-border bg-surface-1 py-8 md:py-10" id="mcc">
      <div className="container-custom">
        <SectionHead icon="authority" eyebrow={sessionOf(mcc)} title={title} intro={intro} />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
            <Rows obj={gsb} />
            {course && str(course.text) && <p className="mt-4 border-t border-border pt-4 text-[14.5px] leading-relaxed text-foreground">{str(course.text)}</p>}
            <Sources sources={[...sourcesIn(gsb), ...sourcesIn(course ?? undefined)]} className="mt-5 border-t border-border pt-4" />
          </div>
          {deposit && (
            <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
              <h3 className="font-heading text-[16px] font-bold text-foreground">Security deposit</h3>
              <div className="mt-3">
                <Rows obj={deposit} />
              </div>
              {str(d.security_lost_when) && (
                <p className="mt-4 border-t border-border pt-4 text-[14px] leading-relaxed text-foreground">
                  <span className="font-semibold">Lost when: </span>
                  {str(d.security_lost_when)}
                </p>
              )}
              <Sources sources={sourcesOf(d.security_source)} className="mt-5 border-t border-border pt-4" />
            </div>
          )}
        </div>
        {rows.length > 0 && (
          <>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="dt w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-[18%] px-4 py-3 font-semibold">When</th>
                    <th scope="col" className="px-4 py-3 font-semibold">AIQ and central seats</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Deemed universities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r, i) => (
                    <tr key={i} className="align-top">
                      <th scope="row" className="px-4 py-3 font-semibold text-foreground">{str(r.when)}</th>
                      <td className="px-4 py-3 leading-relaxed text-foreground">
                        <JsonView value={r.government} />
                      </td>
                      <td className="px-4 py-3 leading-relaxed text-foreground">
                        <JsonView value={r.private} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Sources sources={rows.flatMap((r) => sourcesOf(r.source)).filter((x, i, a) => a.findIndex((y) => `${y.url}|${y.page}` === `${x.url}|${x.page}`) === i)} className="mt-4" />
          </>
        )}
      </div>
    </section>
  );
}
