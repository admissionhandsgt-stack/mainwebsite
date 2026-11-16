import { fitDescription, fitTitle } from "@/lib/seoTitle";
import PageDatasets from "@/components/seo/PageDatasets";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getStipends } from "@/lib/cutoffHubQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import HeroBars from "@/components/hero/HeroBars";
import { getPgStates } from "@/lib/pgStateQueries";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import DataPageEnd from "@/components/lead/DataPageEnd";
import { hinglishFaqs } from "@/lib/hinglishFaq";
import DataTools from "@/components/ui/DataTools";
import { toolLabels } from "@/lib/dataToolLabels";
import { getOfficialStipend, hasOwnStipend } from "@/lib/officialStipend";
import { GovtStipendCard, kindLabel, NationalRules } from "@/components/stipend/OfficialStipend";
import { SourcedNote } from "@/components/bond/OfficialBond";

/**
 * "NEET PG stipend state wise" — one of the most-searched PG money questions,
 * and the data was already here: a published first-year stipend for ~2,000 PG
 * colleges, which only ever appeared one college at a time. Monthly figures
 * only (see LATEST_STIPEND). Stipend is a college-level fact, not a seat, so
 * a state's median and range are honest summaries.
 */

const PATH = "/md-ms-india/stipend";
const inr = (v: number | null | undefined) => (v == null ? "—" : `₹${v.toLocaleString("en-IN")}`);
const OWN: Record<string, string> = { government: "Govt", private: "Private", deemed: "Deemed", other: "—" };

export async function generateMetadata(): Promise<Metadata> {
  const s = await getStipends();
  // The state whose government colleges pay most can differ from the highest median overall (Nov 2026: Gujarat
  // ₹1,00,800 overall, Delhi ₹1,26,927 in government colleges). "Highest" queries mostly mean government seats.
  const govtTop = [...s.states].filter((x) => x.govtMedian != null).sort((a, b) => (b.govtMedian ?? 0) - (a.govtMedian ?? 0))[0];
  const govtLine = govtTop && govtTop.state !== s.states[0]?.state ? `; government colleges: ${govtTop.state} ${inr(govtTop.govtMedian)}` : "";
  return resolveMetadata(PATH, {
    // Searched as "highest pg stipend in india" (the page's top query, Oct–Nov 2026: ~20k impressions at position 6,
    // CTR 1.25%), "stipend for pg medical students state wise", "rajasthan pg stipend". The title leads with the
    // words of the top query (2026-11-10). No year: the figures are each college's latest published stipend.
    title: fitTitle(
      "Highest PG Stipend in India: State Wise List, Govt vs Private",
      "Highest PG Stipend in India: State Wise MD/MS Stipend",
      "NEET PG Stipend State Wise: Highest MD/MS Stipend in India",
      "PG Stipend State Wise: Highest MD/MS Stipend",
    ),
    description: fitDescription(
      ...(s.states[0]
        ? [
            `Highest median PG stipend: ${s.states[0].state} ${inr(s.states[0].median)} a month${govtLine}. First-year MD/MS stipend state wise for ${s.states.length} states and ${s.colleges.toLocaleString("en-IN")} colleges.`,
            `Highest median PG stipend: ${s.states[0].state} ${inr(s.states[0].median)} a month${govtLine}. MD/MS stipend state wise, government vs private.`,
            `Highest PG stipend: ${s.states[0].state}, median ${inr(s.states[0].median)} a month. First-year MD/MS stipend state wise for ${s.states.length} states and ${s.colleges.toLocaleString("en-IN")} colleges, government vs private.`,
            `Highest PG stipend: ${s.states[0].state}, median ${inr(s.states[0].median)} a month. MD/MS stipend state wise for ${s.states.length} states, government vs private.`,
          ]
        : []),
      `Monthly first-year MD/MS stipend in ${s.states.length} states and ${s.colleges.toLocaleString("en-IN")} colleges — government against private, and the highest-paying colleges.`,
    ),
    keywords:
      "NEET PG stipend, PG stipend state wise, MD stipend, MS stipend, resident doctor stipend, PG stipend in private medical colleges, stipend in government medical colleges",
  });
}

export default async function StipendPage() {
  const [s, pgStates, stateLabels, off] = await Promise.all([getStipends(), getPgStates(), toolLabels("state_search"), getOfficialStipend().catch(() => null)]);
  // The official rates (2026-11-16): each state's order, by year-1 government figure; basic-pay states marked.
  // A state has a stipend page only with three colleges listed (getStateStipend): never link one that 404s (Goa).
  const hasPage = new Set(s.states.map((x) => x.state));
  const offRows = (off?.states ?? []).map((st) => ({
    st,
    own: off!.colleges.filter((c) => c.state === st.state && hasOwnStipend(c)).length,
    all: off!.colleges.filter((c) => c.state === st.state).length,
  }));
  const offRanked = offRows.filter((r) => r.st.govt.y[0] && r.st.govt.kind !== "none").sort((a, b) => (b.st.govt.y[0] ?? 0) - (a.st.govt.y[0] ?? 0));
  const offFull = offRanked.filter((r) => r.st.govt.kind === "figures" || r.st.govt.kind === "disclosure");
  const offBasic = offRows.filter((r) => r.st.govt.kind === "basic").map((r) => r.st.state);
  const offNone = offRows.filter((r) => r.st.govt.kind === "none").map((r) => r.st.state);
  const offOwn = off ? off.colleges.filter(hasOwnStipend).length : 0;
  const offAnswer =
    off && offFull[0]
      ? `Under each state's own order, ${offFull[0].st.state} pays government-college MD/MS residents the most: ${inr(offFull[0].st.govt.y[0])} a month in year 1${offFull[1] ? `, then ${offFull[1].st.state} at ${inr(offFull[1].st.govt.y[0])}` : ""}. ${offBasic.length ? `${offBasic.join(", ")} print basic pay only, with DA and allowances on top; ` : ""}${offNone.length} states publish no rupee figure. NMC requires every college, private ones included, to pay at par with the state's government colleges.`
      : null;
  const stateSlug = new Map(pgStates.map((p) => [p.name, p.slug]));
  const top = s.states[0];
  const low = s.states[s.states.length - 1];
  // Words from Admin → Content → Text & numbers ("Page: PG stipend"); photo from Admin → Media.
  // The state whose government colleges pay most (it can differ from the highest median overall).
  const govtTop = [...s.states].filter((x) => x.govtMedian != null).sort((a, b) => (b.govtMedian ?? 0) - (a.govtMedian ?? 0))[0];
  const answerReady = !!(top && low && govtTop);
  const [copy, heroImage] = await Promise.all([
    pageCopy("page.pg_stipend.hero", {
      top_state: top?.state,
      top_median: inr(top?.median),
      govt_top_state: govtTop?.state,
      govt_top_median: inr(govtTop?.govtMedian),
      low_state: low?.state,
      low_median: inr(low?.median),
    }),
    pageHeroImage("page.pg_stipend.hero"),
  ]);
  const oc = await pageCopy("page.pg_stipend_official", {
    as_of: off?.asOf ? new Date(`${off.asOf}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "",
  });

  const faqs = [
    ...(offAnswer ? [{ question: "Which state pays the highest PG stipend in government colleges?", answer: offAnswer }] : []),
    {
      question: "What is the NEET PG stipend in India?",
      answer: `Across the ${s.colleges.toLocaleString("en-IN")} MD/MS colleges listed for the counselling, the median first-year stipend is ${inr(s.median)} a month (as listed, not an official notice; each state's official rate is in the official table). It varies widely by state and between government and private colleges — the table on this page lists each state.`,
    },
    ...(top && low
      ? [
          {
            question: "Which state pays the highest PG stipend?",
            answer: `By median first-year stipend among MD/MS colleges as listed for the counselling, ${top.state} is highest at ${inr(top.median)} a month and ${low.state} lowest at ${inr(low.median)}. A state's government and private colleges often differ widely, so compare the two columns.`,
          },
        ]
      : []),
    {
      question: "Do private medical colleges pay a PG stipend?",
      answer:
        "Many do, but less consistently than government colleges, and some publish none. Where a private college publishes its stipend it is on its own page here, beside its fee — set the two against each other before choosing a seat.",
    },
  ];

  faqs.push(...(await hinglishFaqs("stipend", { colleges: s.colleges.toLocaleString("en-IN"), median: inr(s.median), top_state: top?.state, top_median: inr(top?.median), low_state: low?.state, low_median: inr(low?.median), govt_top_state: govtTop?.state, govt_top_median: inr(govtTop?.govtMedian) })));
  return (
    <main className="min-h-screen bg-background">
      <PageDatasets path="/md-ms-india/stipend" />
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "PG stipend by state", path: PATH },
          ]),
          webPage({ name: "NEET PG stipend, state wise", description: "Monthly first-year MD/MS stipend by state.", path: PATH }),
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "Stipend" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={offAnswer ?? (answerReady && copy.answer ? copy.answer : copy.subtitle)}
        image={heroImage}
        topic="money"
        // One block of numbers (2026-10-21): the stat tiles repeated the highest state, so the national median
        // and its counts lead the insight cards instead.
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_stipend"
        source={off ? oc.hub_source : copy.source}
        visual={
          offRanked.length >= 5 ? (
            <HeroBars
              title="Government-college stipend, year 1"
              caption="A month, from each state's own order"
              rows={offRanked.slice(0, 7).map((r) => ({
                label: r.st.state,
                value: r.st.govt.y[0]!,
                display: `${inr(r.st.govt.y[0])}${r.st.govt.kind === "basic" ? " basic" : ""}`,
                href: stateSlug.get(r.st.state) && hasPage.has(r.st.state) ? `/md-ms-india/stipend/${stateSlug.get(r.st.state)}#official` : undefined,
                note: r.st.govt.label ? "state prospectus" : r.st.govt.kind === "disclosure" ? "from a govt college document" : r.st.govt.kind === "basic" ? "basic pay + DA" : "state order",
              }))}
            />
          ) : (
          <HeroBars
            title={copy.visual_title}
            caption="Median first-year stipend a month"
            rows={s.states.slice(0, 7).map((r) => ({
              label: r.state,
              value: r.median,
              display: inr(r.median),
              href: stateSlug.get(r.state) ? `/md-ms-india/stipend/${stateSlug.get(r.state)}` : undefined,
              note: `${r.colleges} colleges${r.govtMedian ? ` · govt ${inr(r.govtMedian)}` : ""}`,
            }))}
            footnote={low ? `Lowest: ${low.state}, ${inr(low.median)} a month. Every state is in the table below.` : undefined}
          />
          )
        }
        insights={off ? [
          { icon: "authority" as const, label: "States with an official rate", value: `${offRanked.length} of ${offRows.length}`, note: `${offBasic.length} of them basic pay only` },
          ...(offFull[0] ? [{ icon: "up" as const, label: "Highest govt rate, year 1", value: inr(offFull[0].st.govt.y[0]), note: offFull[0].st.state }] : []),
          { icon: "college" as const, label: "Private colleges' own figure", value: String(offOwn), note: `of ${off.colleges.length} read from their own documents` },
          { icon: "people" as const, label: "Median as listed", value: inr(s.median), note: `first year · ${s.colleges.toLocaleString("en-IN")} MD/MS colleges, not an official figure` },
        ] : [
          {
            icon: "people" as const,
            label: "Median / month, all India",
            value: inr(s.median),
            note: `first year · ${s.colleges.toLocaleString("en-IN")} MD/MS colleges as listed, in ${s.states.length} states`,
          },
          ...(top ? [{ icon: "up" as const, label: "Highest median", value: inr(top.median), note: `${top.state} · ${top.colleges} colleges` }] : []),
          ...(s.govtMedian && s.privateMedian
            ? [{ icon: "compare" as const, label: "Govt vs private", value: `${inr(s.govtMedian)} vs ${inr(s.privateMedian)}`, note: "All-India medians, first year, a month" }]
            : []),
          ...(low ? [{ icon: "down" as const, label: "Lowest median", value: inr(low.median), note: `${low.state} · ${low.colleges} colleges` }] : []),
        ]}
      />

      {off && (
        <section className="container-custom py-10 md:py-14" id="official">
          <SectionHead icon="authority" eyebrow="Official · 2026-27" title={oc.hub_title} intro={oc.hub_intro} />
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="dt w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">State</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Year 1</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Year 2</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Year 3</th>
                  <th scope="col" className="px-4 py-3 font-semibold">From</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Private colleges' own figure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {offRows.map(({ st, own, all }) => (
                  <tr key={st.slug}>
                    <th scope="row" className="px-4 py-2.5 font-medium">
                      {stateSlug.get(st.state) && hasPage.has(st.state) ? (
                        <Link href={`/md-ms-india/stipend/${stateSlug.get(st.state)}#official`} className="text-primary-strong hover:underline dark:text-primary">
                          {st.state} PG stipend
                        </Link>
                      ) : (
                        <span className="text-foreground">{st.state}</span>
                      )}
                    </th>
                    {st.govt.y.map((v, i) => (
                      <td key={i} className="tnum px-4 py-2.5 text-right font-semibold">
                        {v ? `${inr(v)}${st.govt.kind === "basic" ? " basic" : ""}` : <span className="font-normal text-muted-foreground">—</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{kindLabel(st.govt).split(";")[0]}</td>
                    <td className="tnum px-4 py-2.5 text-right">{all ? `${own} of ${all}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:items-start">
            <NationalRules rules={off.national} title={oc.nmc_title} />
            {off.central && <GovtStipendCard g={off.central} state="Central Government" title="Central Government institutes (VMMC-Safdarjung, LHMC)" />}
          </div>
        </section>
      )}

      <section className="container-custom py-10 md:py-14">
        <SectionHead
          icon="money"
          eyebrow="State by state"
          title="PG stipend by state"
          intro="First-year stipend per month as listed for the counselling (not an official notice), median across the state's colleges, highest first. States with fewer than three colleges listed are left out."
        />
        {s.states.length >= 8 && (
          <DataTools
            id="stipend-state-tools"
            className="mt-6"
            targets={["stipend-states"]}
            total={s.states.length}
            placement="stipend_hub"
            labels={stateLabels}
            sorts={[
              { key: "med", label: "Median, highest first", dir: "desc" },
              { key: "govt", label: "Govt median, highest first", dir: "desc" },
              { key: "pvt", label: "Private median, highest first", dir: "desc" },
              { key: "col", label: "Most colleges first", dir: "desc" },
              { key: "name", label: "State, A–Z", text: true },
            ]}
          />
        )}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table id="stipend-states" className="dt w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">State</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Colleges</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Median</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Govt median</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Private median</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Range</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {s.states.map((r) => (
                <tr
                  key={r.state}
                  data-row=""
                  data-s-name={r.state.toLowerCase()}
                  data-s-col={r.colleges}
                  {...(r.median ? { "data-s-med": r.median } : {})}
                  {...(r.govtMedian ? { "data-s-govt": r.govtMedian } : {})}
                  {...(r.privateMedian ? { "data-s-pvt": r.privateMedian } : {})}
                >
                  <th scope="row" className="px-4 py-3 font-semibold text-foreground">
                    {/* Each state's own page lists every college in it (2026-10-20). */}
                    {stateSlug.get(r.state) ? (
                      // The words people search ("rajasthan pg stipend": 2,953 impressions a month landed on this
                      // hub rather than the state's own page) are the link's words.
                      <Link href={`/md-ms-india/stipend/${stateSlug.get(r.state)}`} className="hover:text-primary hover:underline">
                        {r.state} PG stipend
                      </Link>
                    ) : (
                      r.state
                    )}
                  </th>
                  <td className="tnum px-4 py-3 text-right text-muted-foreground">{r.colleges}</td>
                  <td className="tnum px-4 py-3 text-right font-semibold">{inr(r.median)}</td>
                  <td className="tnum px-4 py-3 text-right">{inr(r.govtMedian)}</td>
                  <td className="tnum px-4 py-3 text-right">{inr(r.privateMedian)}</td>
                  <td className="tnum px-4 py-3 text-right text-muted-foreground">
                    {inr(r.min)} – {inr(r.max)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>


      <section className="cv-auto border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <SectionHead icon="trend" eyebrow="Top 25" title="Highest PG stipends" />
          <p className="mt-2 max-w-[70ch] text-muted-foreground">
            The 25 colleges paying the most in the first year, per month. Open one for its fee, seats, bond and cut off band.
          </p>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="dt w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">College</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Year 1</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Year 2</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Year 3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {s.top.map((c) => (
                  <tr key={c.slug}>
                    <th scope="row" className="px-4 py-3 font-medium">
                      <Link href={`/md-ms-india/colleges/${c.slug}`} className="text-foreground hover:text-primary hover:underline">
                        {c.name}
                      </Link>
                      {c.state && <span className="block text-[12px] font-normal text-muted-foreground">{c.state}</span>}
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">{OWN[c.ownership] ?? c.ownership}</td>
                    <td className="tnum px-4 py-3 text-right font-semibold">{inr(c.y1)}</td>
                    <td className="tnum px-4 py-3 text-right">{inr(c.y2)}</td>
                    <td className="tnum px-4 py-3 text-right">{inr(c.y3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <DataPageEnd
        cite={{ title: "NEET PG stipend by state", path: "/md-ms-india/stipend", source: "colleges' published PG stipends" }}
        telegram={{ placement: "pg_stipend" }}
        playbook={{ kind: "stipend", placement: "stipend" }}
        counsel={{ kind: "stipend", placement: "counsel_stipend" }}
      />

      <section className="cv-auto container-custom py-10 md:py-14">
        <SectionHead icon="help" eyebrow="FAQ" title="PG stipend: common questions" />
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Also: <Link href="/reports/neet-pg-stipend-2026" className="font-semibold text-primary-strong hover:underline">NEET PG stipend report 2026</Link> ·{" "}
          <Link href="/md-ms-india/bond" className="font-semibold text-primary-strong hover:underline">service bond by state</Link> ·{" "}
          <Link href="/neet-pg-cutoff" className="font-semibold text-primary-strong hover:underline">NEET PG cutoff, branch wise</Link> ·{" "}
          <Link href="/management-quota" className="font-semibold text-primary-strong hover:underline">management quota fees</Link>
        </p>
      </section>


      {off && <SourcedNote text={oc.sourced_note} />}
    </main>
  );
}
