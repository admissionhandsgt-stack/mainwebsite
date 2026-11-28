import { pageOgImage } from "@/lib/ogImage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/ui/Link";
import { getPgStatePage } from "@/lib/pgStateQueries";
import { getPgAuthority } from "@/lib/pgAuthority";
import { getNmcPgForState } from "@/lib/nmcData";
import { getStateSeatMatrix, getBondByState } from "@/lib/pgSeatData";
import { getStipends } from "@/lib/cutoffHubQueries";
import { getFeeStates } from "@/lib/pgFeeMatrix";
import { getStateRound } from "@/lib/stateRoundQueries";
import { getContactInfo, resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { fitTitle, fitDescription } from "@/lib/seoTitle";
import { CONTACT_INFO, OFFICE } from "@/lib/constants";
import { counsellingYear, getCounselPgStates, getCounselUgStates, sameState } from "@/lib/counselStates";
import DataHero from "@/components/hero/DataHero";
import StateAuthority from "@/components/states/StateAuthority";
import StateNotices from "@/components/states/StateNotices";
import StateRoundLinks from "@/components/states/StateRoundLinks";
import SectionHead from "@/components/ui/SectionHead";
import ExpertPlaybook from "@/components/lead/ExpertPlaybook";
import ExpertCompare from "@/components/lead/ExpertCompare";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import ExpertPromise from "@/components/counsel/ExpertPromise";
import { FaqList, HowWeWork, LinkCards, RouteCards, StateChips, pairs } from "@/components/counsel/CounselBlocks";
import FeePdfCta from "@/components/lead/FeePdfCta";
import { getOfficialStateByName, govtBond, rangeText, yearsText, serviceYears } from "@/lib/officialBond";
import WhereNow from "@/components/counsel/WhereNow";

/**
 * NEET PG counselling guidance for one state (2026-11-11, owner: "best NEET PG counsellor in <state>… PG alag"). The
 * service page beside the state's data page (/md-ms-india/states/<slug>, which keeps the cut off and college intent):
 * who fills the state's seats (its authority and MCC, with MCC's seat split), the authority's latest notices, what a
 * seat costs and pays (fee middles, stipend, bond with its caveat), how the team works, the counsellor's playbook and
 * FAQs that answer "who is the best NEET PG counsellor in <state>" with what to look for — never a self-awarded "best".
 * Every word: Admin → Content → "Page: NEET PG counselling by state"; every figure from data. A FAQ whose figures the
 * state lacks is left out. Never a college's closing rank.
 */

type Props = { params: Promise<{ state: string }> };
const SITE = "https://www.admissionhands.com";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const money = (v: number) => (v >= 10_000_000 ? `₹${(v / 10_000_000).toFixed(2)} Cr` : v >= 100_000 ? `₹${(v / 100_000).toFixed(2)} L` : `₹${v.toLocaleString("en-IN")}`);

async function load(slug: string) {
  const states = await getCounselPgStates();
  if (!states.some((s) => s.slug === slug)) return null;
  const p = await getPgStatePage(slug);
  if (!p) return null;
  const [authority, nmcPg, mcc, stipends, fees, bond, team, contact, round, official] = await Promise.all([
    getPgAuthority(p.name),
    getNmcPgForState(p.name),
    getStateSeatMatrix(p.name),
    getStipends().catch(() => null),
    getFeeStates().catch(() => null),
    getBondByState().catch(() => null),
    pageCopy("page.services.figures"),
    getContactInfo().catch(() => null),
    getStateRound(slug).catch(() => null),
    getOfficialStateByName(p.name).catch(() => null),
  ]);
  const year = counsellingYear();
  const authorityName = authority?.authority ?? `${p.name}'s counselling authority`;
  const stipend = stipends?.states.find((x) => x.state === p.name) ?? null;
  const fee = fees?.states.find((x) => x.slug === p.slug) ?? null;
  const b = bond?.states.find((x) => x.state === p.name) ?? null;
  const nmcSeats = nmcPg ? nmcPg.md + nmcPg.ms : 0;
  const mccSplit = mcc
    ? mcc.courses.reduce((a, c) => ({ aiq: a.aiq + c.aiq, deemed: a.deemed + c.deemed, dnb: a.dnb + c.dnb }), { aiq: 0, deemed: 0, dnb: 0 })
    : null;

  // The fee figures, written out — each a median of one yearly figure per college (lib/pgFeeMatrix.ts).
  const feeParts = fee
    ? [
        fee.govtState != null && `government colleges ${money(fee.govtState)} a year`,
        fee.privateState != null && `private colleges' state quota ${money(fee.privateState)}`,
        fee.privateManagement != null && `management quota ${money(fee.privateManagement)}`,
        fee.deemedPaid != null && `deemed universities ${money(fee.deemedPaid)}`,
      ].filter(Boolean)
    : [];
  // The state's own 2026-27 bond rules where read (lib/officialBond.ts); the listing's count only for a state not read yet.
  const og = official ? govtBond(official) : null;
  const officialLine = og
    ? og.flag === "not_notified"
      ? `${p.name} has not notified a government service bond for the 2026-27 batch yet.`
      : og.flag === "lead"
        ? null
        : (() => {
            const parts = [serviceYears(og), rangeText(og.min, og.max) ? `${rangeText(og.min, og.max)} if not served` : null].filter(Boolean);
            if (og.zero) return `${p.name}'s government colleges carry no service bond (0 years): none is stated in the state's own 2026-27 documents.`;
            return parts.length ? `${p.name}'s government colleges bind MD/MS graduates to ${parts.join(", ")}, as the state's own 2026-27 rules print it.` : null;
          })()
    : null;
  // Only the state's own rules: the counselling listing's bond count, years and amount never reach a page (owner,
  // 2026-11-28: "bond figures hum claim kie bina").
  const bondLine = official ? officialLine : null;

  const tokens = {
    state: p.name,
    year,
    authority: authorityName,
    mdms: n(p.mdmsCount),
    nmc_seats: nmcSeats ? n(nmcSeats) : undefined,
    nmc_colleges: nmcPg ? n(nmcPg.colleges) : undefined,
    nmc_govt: nmcPg ? n(nmcPg.govt) : undefined,
    mcc_year: mcc?.year,
    mcc_total: mcc ? n(mcc.total) : undefined,
    years: team.years,
    students: team.students,
    hours: OFFICE.hoursShort,
    fee_list: feeParts.join(", "),
    bond_line: bondLine ?? "",
    bond_caveat: official
      ? `Bond terms are from ${p.name}'s own 2026-27 rules; its PG bond page has every rule.`
      : `${p.name}'s own bond documents are not ones we hold, so no bond figure is quoted: a seat's bond is in the admission papers you sign, so ask for it in writing.`,
  };
  const c = await pageCopy("page.counsel_pg", tokens);
  return { p, states, authority, nmcSeats, mcc, mccSplit, stipend, fee, b, bondLine, feeParts, c, year, contact, round, official, og };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { state } = await props.params;
  const d = await load(state);
  if (!d) return { title: "State not found", robots: { index: false } };
  return resolveMetadata(`/counselling/neet-pg/${d.p.slug}`, {
    image: pageOgImage(`/counselling/neet-pg/${d.p.slug}`, `NEET PG counselling in ${d.p.name}`),
    title: fitTitle(d.c.seo_title, d.c.seo_title_short, `NEET PG Counselling in ${d.p.name}`),
    description: fitDescription(d.c.seo_description),
    keywords: `NEET PG counselling ${d.p.name}, best NEET PG counsellor in ${d.p.name}, NEET PG counselling guidance ${d.p.name}, ${d.p.name} PG admission consultant, ${d.p.name} NEET PG counselling ${d.year}`,
  });
}

export default async function CounselPgStatePage(props: Props) {
  const { state } = await props.params;
  const d = await load(state);
  if (!d) notFound();
  const { p, c, authority, nmcSeats, mcc, mccSplit, stipend, fee, b, bondLine, feeParts, year, contact, round, official, og } = d;
  const path = `/counselling/neet-pg/${p.slug}`;
  const [heroImage, ugStates] = await Promise.all([
    pageHeroImage(`page.pg_state.${p.slug}.hero`, "page.pg_state.hero"),
    getCounselUgStates().catch(() => []),
  ]);
  const ug = sameState(ugStates, p.name);
  const phone = contact?.phoneNumber || CONTACT_INFO.phone;
  const wa = `https://wa.me/${(contact?.whatsappNumber || CONTACT_INFO.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(c.wa_text)}`;

  const faqs = [
    { question: c.faq_best_q, answer: c.faq_best_a },
    { question: c.faq_how_q, answer: c.faq_how_a },
    ...(nmcSeats ? [{ question: c.faq_seats_q, answer: c.faq_seats_a }] : []),
    ...(feeParts.length ? [{ question: c.faq_fee_q, answer: c.faq_fee_a }] : []),
    ...(bondLine ? [{ question: c.faq_bond_q, answer: c.faq_bond_a }] : []),
    { question: c.faq_online_q, answer: c.faq_online_a },
  ].filter((f) => f.question && f.answer);

  const routeCards = pairs([c.route_state, mcc ? c.route_mcc : c.route_mcc.replace(/\s*MCC's\s+\S*\s*matrix lists[^.]*\./, "")].join("\n"));

  const links = [
    { label: `NEET PG cut off and colleges in ${p.name}`, href: `/md-ms-india/states/${p.slug}`, note: "By quota and branch, with the state's own round" },
    ...(fee ? [{ label: `PG fees in ${p.name}`, href: `/md-ms-india/fees/${p.slug}`, note: "College by college, branch and quota" }] : []),
    ...(stipend ? [{ label: `PG stipend in ${p.name}`, href: `/md-ms-india/stipend/${p.slug}`, note: "Every college that publishes one" }] : []),
    ...(official
      ? [{ label: `PG bond in ${p.name}`, href: `/md-ms-india/bond/${official.slug}`, note: "The state's own 2026-27 rules, round by round" }]
      : b
        ? [{ label: "Service bond by state", href: `/md-ms-india/bond#${b.anchor}`, note: "Each state's own rules, where we hold them" }]
        : []),
    { label: "NEET PG choice filling", href: "/neet-pg-choice-filling", note: "MCC's rules for each round" },
    ...(ug ? [{ label: `MBBS counselling in ${ug.name}`, href: `/counselling/mbbs/${ug.slug}` }] : []),
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "Counselling by state", path: "/counselling" },
            { name: `NEET PG · ${p.name}`, path },
          ]),
          webPage({ name: `NEET PG counselling in ${p.name}`, description: c.seo_description, path }),
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: `NEET PG counselling guidance in ${p.name}`,
            serviceType: "NEET PG (MD/MS) admission counselling",
            url: `${SITE}${path}`,
            provider: { "@id": `${SITE}/#organization` },
            areaServed: { "@type": "State", name: p.name, containedInPlace: { "@type": "Country", name: "India" } },
          },
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Counselling by state", href: "/counselling" }, { label: `NEET PG · ${p.name}` }]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={c.accent}
        subtitle={c.subtitle}
        stats={[
          { label: "MD/MS colleges", value: n(p.mdmsCount), note: "in counselling results" },
          ...(nmcSeats ? [{ label: "MD/MS seats", value: n(nmcSeats), note: "NMC's register" }] : []),
          ...(mcc ? [{ label: `MCC seats, ${mcc.year}`, value: n(mcc.total), note: "AIQ, deemed and DNB" }] : []),
          ...(stipend?.govtMedian ? [{ label: "Govt stipend", value: `₹${stipend.govtMedian.toLocaleString("en-IN")}`, note: "median a month, year 1" }] : []),
        ]}
        cta={{ label: c.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_counsel_pg"
        image={heroImage}
        topic="map"
        aside={authority ? <StateAuthority a={authority} state={p.name} level="pg" /> : undefined}
      />
      <FeePdfCta state={p.name} placement="pdf_counsel_pg" />

      {round && (
        <div className="container-custom pt-8">
          <p className="rounded-xl border border-primary/30 bg-primary-soft px-4 py-3 text-[14.5px] leading-relaxed text-foreground">
            <span className="font-semibold">
              {round.counselling} — {round.round} {round.year} allotment is out.
            </span>{" "}
            <Link href={`/md-ms-india/states/${p.slug}`} className="font-semibold text-primary-strong hover:underline">
              See the cut off by quota and branch →
            </Link>
          </p>
        </div>
      )}

      <WhereNow level="pg" placement="counsel_pg_state" stateName={p.name} feesHref={fee ? `/md-ms-india/fees/${p.slug}` : undefined} />

      <StateNotices state={p.name} level="pg" />
      {/* The state's own rounds, each a page: its notices, result and last year's same round (2026-11-24). */}
      <StateRoundLinks state={p.name} />

      <RouteCards title={c.routes_title} cards={routeCards}>
        {mccSplit && mcc && (
          <dl className="mt-4 grid grid-cols-3 gap-3 sm:max-w-xl">
            {[
              ["All India Quota", mccSplit.aiq],
              ["Deemed", mccSplit.deemed],
              ["DNB", mccSplit.dnb],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-xl border border-border bg-card px-4 py-3">
                <dd className="tnum font-heading text-xl font-extrabold text-primary-strong">{n(v as number)}</dd>
                <dt className="text-[12px] text-muted-foreground">
                  {k} seats, MCC {mcc.year}
                </dt>
              </div>
            ))}
          </dl>
        )}
      </RouteCards>

      {(feeParts.length > 0 || stipend || bondLine) && (
        <section className="container-custom pb-10 md:pb-14">
          <SectionHead icon="money" title={c.money_title} />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {fee?.govtState != null && <Tile label="Government colleges" value={money(fee.govtState)} note="fee a year, middle" />}
            {fee?.privateState != null && <Tile label="Private, state quota" value={money(fee.privateState)} note="fee a year, middle" />}
            {fee?.privateManagement != null && <Tile label="Management quota" value={money(fee.privateManagement)} note="fee a year, middle" />}
            {fee?.deemedPaid != null && <Tile label="Deemed universities" value={money(fee.deemedPaid)} note="fee a year, middle" />}
            {stipend && <Tile label="Stipend, all colleges" value={`₹${stipend.median.toLocaleString("en-IN")}`} note="median a month, year 1" />}
            {official && og && !og.flag && (og.years || og.min) ? (
              <Tile label="Govt-college bond" value={yearsText(og.years, og.yearsMax) ?? rangeText(og.min, og.max)!} note={rangeText(og.min, og.max) ? `${rangeText(og.min, og.max)} if not served · official` : "official 2026-27 rules"} />
            ) : !official && b && b.govt.colleges >= 3 ? (
              // No figure: the counselling listing's bond count and years never reach a page (owner, 2026-11-28).
              <Tile label="Service bond" value="Ask in writing" note="set in the admission papers you sign" />
            ) : null}
          </div>
          <p className="mt-3 max-w-[90ch] text-[12.5px] leading-relaxed text-muted-foreground">{c.money_note}</p>
        </section>
      )}

      <HowWeWork title={c.how_title} steps={pairs(c.how_steps)} wa={wa} phone={phone} />

      <ExpertPlaybook kind="state" name={p.name} placement="counsel_pg_state" />
      <ExpertCompare placement="counsel_pg_state" />
      <ExpertPromise variant="state" placement="counsel_pg_state" stateName={p.name} />

      <FaqList title={c.faq_title} faqs={faqs} />

      <LeadCapture level="pg" source={`Counselling page: NEET PG ${p.name}`} title={c.lead_title} body={c.lead_body} />
      <TelegramJoin placement="counsel_pg_state" />

      <div className="pt-10">
        <LinkCards title={c.links_title} links={links} />
      </div>
      <StateChips
        title={c.others_title}
        items={d.states.filter((s) => s.slug !== p.slug).map((s) => ({ name: s.name, href: `/counselling/neet-pg/${s.slug}` }))}
      />
    </main>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[12.5px] font-semibold text-muted-foreground">{label}</p>
      <p className="tnum mt-0.5 font-heading text-xl font-extrabold text-foreground">{value}</p>
      <p className="text-[12px] text-muted-foreground">{note}</p>
    </div>
  );
}
