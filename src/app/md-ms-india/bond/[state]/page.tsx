import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import Link from "@/components/ui/Link";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { getPgStates } from "@/lib/pgStateQueries";
import { getBondByState } from "@/lib/pgSeatData";
import { getStipends } from "@/lib/cutoffHubQueries";
import { getFeeStates } from "@/lib/pgFeeMatrix";
import { getCounselPgStates } from "@/lib/counselStates";
import {
  bindsAiq,
  getOfficialBondState,
  govtBond,
  hasOwnBond,
  money,
  rangeText,
  sessionOf,
  yearsText,
  type Json,
  type JsonObject,
  type OfficialState,
} from "@/lib/officialBond";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import DataTools from "@/components/ui/DataTools";
import { toolLabels } from "@/lib/dataToolLabels";
import DataPageEnd from "@/components/lead/DataPageEnd";
import { FaqList, LinkCards } from "@/components/counsel/CounselBlocks";
import { CollegeBondTable, collegeBondText, JsonView, Rows, SourcedNote, Sources, sourcesIn } from "@/components/bond/OfficialBond";
import { sourcesOf } from "@/lib/officialBond";

/**
 * One state's PG service bond and seat-leaving rules, official (2026-11-16, owner: "alag page bhi rehne do aur ek generic
 * consolidated page bhi"). "<state> pg bond", "penalty for leaving neet pg seat in <state>" were searched (GSC, 90 days)
 * and landed on the stipend pages at position 6–9 with almost no clicks. Everything here is from the state's own 2026-27
 * bulletin / prospectus / orders and each college's own notice (lib/officialBond.ts), and every figure links its document.
 * Each state's file has its own shape, so the known parts are sections and the rest renders as label : value rows.
 *
 * Order (the data-page skeleton): hero → government bond → leaving the course → round by round → deposit → private
 * colleges → government colleges → notes → DataPageEnd → FAQ → links. Words: Admin → Content → "Page: PG bond in a state".
 */

type Props = { params: Promise<{ state: string }> };
const isObj = (v: unknown): v is JsonObject => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** Researchers' remarks about their own reading are not for the page ("unreachable during this check"). */
const INTERNAL = /\b(this check|was not read|were not read|unreachable|aggregator|in the market|handoff|zyn|scrap)/i;
const notesOf = (s: OfficialState) => (Array.isArray(s.data.notes) ? s.data.notes : []).filter((n): n is string => typeof n === "string" && !INTERNAL.test(n));

const date = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "";

/** Top-level keys the page renders in its own sections; anything else goes under "Also in the notices". */
const KNOWN = new Set([
  "state", "counselling", "session", "government_service_bond", "private_colleges", "course_leaving_penalty", "course_leaving_bond",
  "seat_leaving", "seat_leaving_source", "security_deposit_inr", "security_lost_when", "security_source", "security_source_2",
  "notes", "documents", "documents_read", "local_copy", "private_service_bond", "state_service_bond", "esic_faridabad_source",
  "faq_refund_source",
]);

async function load(slug: string) {
  const d = await getOfficialBondState(slug);
  if (!d) return null;
  const g = govtBond(d.state);
  const session = sessionOf(d.state);
  return { ...d, g, session };
}

function bondShort(g: ReturnType<typeof govtBond>) {
  if (g.zero) return "No Service Bond (0 Years)";
  const y = yearsText(g.years, g.yearsMax);
  const r = rangeText(g.min, g.max);
  return y && r ? `${y.replace(/years?/, (m) => (m === "year" ? "Year" : "Years"))}, ${r.replace(/ – /, "–")}` : r ?? (y ? y.replace(/years?/, (m) => (m === "year" ? "Year" : "Years")) : null);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { state } = await props.params;
  const d = await load(state);
  if (!d) return { title: "State not found", robots: { index: false } };
  const name = d.state.state;
  const short = bondShort(d.g);
  const own = d.colleges.filter(hasOwnBond).length;
  const govtLine =
    d.g.flag === "not_notified"
      ? `no government service bond notified for ${d.session} yet`
      : d.g.flag === "lead"
        ? "the government bond not yet confirmed in an official notice"
        : d.g.zero
          ? "no service bond for government colleges (0 years)"
          : short
          ? `government colleges ${yearsText(d.g.years, d.g.yearsMax) ?? ""}${rangeText(d.g.min, d.g.max) ? ` or ${rangeText(d.g.min, d.g.max)} if not served` : ""}`.replace("  ", " ")
          : "the government-college bond as the rules print it";
  return resolveMetadata(`/md-ms-india/bond/${d.state.slug}`, {
    title: fitTitle(
      ...(short ? [`${name} PG Bond ${d.session}: ${short} & Seat Leaving Penalty`, `${name} PG Bond ${d.session}: ${short}`] : []),
      `${name} PG Bond ${d.session} & Seat Leaving Penalty`,
      `${name} NEET PG Bond ${d.session}`,
      `${name} PG Bond`,
    ),
    description: fitDescription(
      `Official ${name} PG bond ${d.session}: ${govtLine}. Seat-leaving penalty round by round, security deposit${own ? `, and ${own} private colleges' own bonds` : ", private colleges"}, from the state's own notices.`,
      `Official ${name} PG bond ${d.session}: ${govtLine}. Seat-leaving penalty by round and deposits, from the state's own notices.`,
    ),
    keywords: `${name} PG bond, ${name} NEET PG bond, PG bond in ${name}, ${name} PG service bond, penalty for leaving NEET PG seat in ${name}, ${name} seat leaving penalty`,
  });
}

export default async function BondStatePage(props: Props) {
  const { state: slug } = await props.params;
  const d = await load(slug);
  if (!d) notFound();
  const { state: s, colleges, g, session, all } = d;
  const name = s.state;
  const path = `/md-ms-india/bond/${s.slug}`;
  const data = s.data;
  const gsb = isObj(data.government_service_bond) ? data.government_service_bond : {};
  const aiq = bindsAiq(s);
  const own = colleges.filter(hasOwnBond);
  const read = colleges.filter((c) => c.status !== "not_verified");

  const [c, oc, heroImage, pgStates, bondAll, stipends, fees, counsel, labels] = await Promise.all([
    pageCopy("page.pg_bond_state", { state: name, session, as_of: date(s.asOf) }),
    pageCopy("page.pg_bond.official", { as_of: date(s.asOf) }),
    pageHeroImage("page.pg_bond.hero"),
    getPgStates(),
    getBondByState().catch(() => null),
    getStipends().catch(() => null),
    getFeeStates().catch(() => null),
    getCounselPgStates().catch(() => [] as { name: string; slug: string; mdms: number }[]),
    toolLabels("bond_search"),
  ]);
  const pgSlug = pgStates.find((p) => p.name === name)?.slug;
  // Government colleges by name only (the compilation's list): the rule above is what applies to them, not its figures.
  const govtColleges = bondAll?.states.find((b) => b.state === name)?.govt.list ?? [];

  // --------------------------------------------------------------- the hero's answer, from the rules
  const amountRows = isObj(gsb.amount_inr) ? Object.entries(gsb.amount_inr).filter(([, v]) => typeof v === "number") : [];
  const govtSentence = g.zero
    ? `${name}'s government colleges carry no service bond (0 years): none is stated in the state's own 2026-27 documents.`
    : g.flag === "not_notified"
      ? c.govt_not_notified
      : g.flag === "lead"
        ? c.govt_lead
        : g.years || g.min
          ? `Government colleges bind MD/MS graduates to ${yearsText(g.years, g.yearsMax) ?? "a period"} of service${rangeText(g.min, g.max) ? `, or ${rangeText(g.min, g.max)} if it is not served` : ""}.`
          : g.words
            ? `The government bond: ${g.words}.`
            : str(gsb.what)
              ? `The government bond: ${str(gsb.what)}`
              : "";
  const privateSentence = own.length
    ? `${own.length} of the ${colleges.length} private and deemed colleges listed below print their own bond.`
    : colleges.length
      ? `None of the ${read.length} private and deemed colleges whose documents were read prints its own service bond.`
      : "";
  const subtitle = [govtSentence.replace(/\.$/, "") + ".", aiq ? "It binds All India Quota seats in the state's government colleges too." : "", privateSentence]
    .filter((x) => x && x !== ".")
    .join(" ");

  // --------------------------------------------------------------- FAQ, from the same rules
  const seatRows = Array.isArray(data.seat_leaving) ? (data.seat_leaving.filter(isObj) as JsonObject[]) : [];
  const leaveAnswer = seatRows
    .map((r) => `${str(r.when)}: ${str(r.government) ?? "—"}${str(r.private) && str(r.private) !== "same" && str(r.private) !== str(r.government) ? ` (private colleges: ${str(r.private)})` : ""}`)
    .filter((x) => !x.startsWith("null"))
    .join(". ");
  const pc = isObj(data.private_colleges) ? data.private_colleges : null;
  const faqs = [
    { question: c.faq_is_q, answer: subtitle },
    ...(amountRows.length && g.flag !== "lead"
      ? [
          {
            question: c.faq_amount_q,
            answer: `${amountRows.map(([k, v]) => `${k}: ${money(v as number)}`).join("; ")}${yearsText(g.years, g.yearsMax) ? `, for ${yearsText(g.years, g.yearsMax)} of service` : ""}. ${str(gsb.release) ?? ""}`.trim(),
          },
        ]
      : []),
    ...(str(gsb.applies_to) ? [{ question: c.faq_aiq_q, answer: `${aiq ? "Yes. " : ""}${str(gsb.applies_to)}` }] : []),
    ...(leaveAnswer ? [{ question: c.faq_leave_q, answer: `${leaveAnswer}.` }] : []),
    ...(colleges.length || pc
      ? [
          {
            question: c.faq_private_q,
            answer: [
              pc && str(pc.state_service_bond) ? `State rule: ${str(pc.state_service_bond)}` : null,
              own.length ? `Their own bond, as each college's notice prints it: ${list(own.slice(0, 8).map((x) => `${x.name} (${collegeBondText(x)})`))}${own.length > 8 ? ` and ${own.length - 8} more` : ""}.` : privateSentence || null,
            ]
              .filter(Boolean)
              .join(" "),
          },
        ]
      : []),
  ].filter((f) => f.question && f.answer);

  const stipendState = stipends?.states.find((x) => x.state === name);
  const feeState = fees?.states.find((x) => x.slug === pgSlug);
  const counselState = counsel.find((x) => x.name === name);
  const links = [
    ...(stipendState && pgSlug ? [{ label: `PG stipend in ${name}`, href: `/md-ms-india/stipend/${pgSlug}`, note: "Every college's monthly stipend, year 1 to 3" }] : []),
    ...(feeState && pgSlug ? [{ label: `PG fees in ${name}`, href: `/md-ms-india/fees/${pgSlug}`, note: "College by college, branch and quota" }] : []),
    ...(pgSlug ? [{ label: `NEET PG cut off and colleges in ${name}`, href: `/md-ms-india/states/${pgSlug}`, note: "By quota and branch" }] : []),
    ...(counselState ? [{ label: `NEET PG counselling in ${name}`, href: `/counselling/neet-pg/${counselState.slug}`, note: "Who runs it and how we plan it with you" }] : []),
    { label: "PG bond, every state", href: "/md-ms-india/bond", note: "The official rules side by side" },
    { label: "NEET PG choice filling", href: "/neet-pg-choice-filling", note: "Freeze, float, upgrade and free exit" },
  ];
  const others = all.states.filter((x) => x.slug !== s.slug);

  const courseLeave = isObj(data.course_leaving_penalty) ? data.course_leaving_penalty : isObj(data.course_leaving_bond) ? data.course_leaving_bond : null;
  const deposit = isObj(data.security_deposit_inr) ? data.security_deposit_inr : null;
  const extra = Object.fromEntries(Object.entries(data).filter(([k, v]) => !KNOWN.has(k) && v != null)) as JsonObject;
  const notes = notesOf(s);
  const docSources = [...sourcesOf(data.documents as Json), ...sourcesOf(data.documents_read as Json)];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "PG service bond", path: "/md-ms-india/bond" },
            { name: name, path },
          ]),
          webPage({ name: `${name} PG bond and seat leaving rules ${session}`, description: subtitle, path }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />

      <DataHero
        crumbs={[
          { label: "Home", href: "/" },
          { label: "MD/MS in India", href: "/md-ms-india" },
          { label: "Service bond", href: "/md-ms-india/bond" },
          { label: name },
        ]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={c.accent}
        subtitle={subtitle}
        image={heroImage}
        topic="document"
        cta={{ label: c.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_bond_state"
        source={c.source}
        insights={[
          {
            icon: "authority" as const,
            label: "Government service",
            value: g.flag === "not_notified" ? "Not notified" : g.flag === "lead" ? "Not confirmed" : (yearsText(g.years, g.yearsMax) ?? "As printed"),
            note: g.flag ? "see the rules below" : "government colleges",
          },
          ...(g.min && g.flag !== "lead"
            ? [{ icon: "up" as const, label: "If not served", value: rangeText(g.min, g.max)!, note: amountRows.length > 1 ? "by course or branch" : "the bond amount" }]
            : []),
          { icon: "compare" as const, label: "All India Quota seats", value: aiq ? "Bound too" : "Not stated", note: aiq ? "in government colleges" : "ask the college" },
          ...(colleges.length ? [{ icon: "college" as const, label: "Private colleges' own bond", value: `${own.length} of ${colleges.length}`, note: `${read.length} read from their own notices` }] : []),
        ]}
      />

      {/* ------------------------------------------------------- government colleges */}
      <section className="container-custom py-10 md:py-14" id="government-bond">
        <SectionHead icon="authority" eyebrow={`${name} · ${session}`} title={c.govt_title} intro={str(data.counselling) ?? undefined} />
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
          {(g.flag === "lead" || g.flag === "not_notified") && (
            <p className="mb-4 flex gap-2.5 rounded-xl border border-signal-borderline/40 bg-signal-borderline/10 px-4 py-3 text-[14px] leading-relaxed text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-signal-borderline" aria-hidden="true" />
              <span>{g.flag === "lead" ? c.govt_lead : c.govt_not_notified}</span>
            </p>
          )}
          <Rows obj={gsb} />
          {g.flag !== "lead" && <Sources sources={sourcesIn(gsb)} className="mt-5 border-t border-border pt-4" />}
        </div>
        {(aiq || str(gsb.applies_to)) && (
          <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
            {c.mcc_line}{" "}
            <Link href="/md-ms-india/bond#mcc" className="font-semibold text-primary-strong hover:underline dark:text-primary">
              {c.mcc_link}
            </Link>
          </p>
        )}
      </section>

      {/* ------------------------------------------------------- leaving the course */}
      {courseLeave && (
        <section className="container-custom pb-10 md:pb-14" id="leaving-the-course">
          <SectionHead icon="document" title={c.course_title} />
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
            {str(courseLeave.text) && <p className="text-[15px] leading-relaxed text-foreground">{str(courseLeave.text)}</p>}
            <div className={str(courseLeave.text) ? "mt-4" : ""}>
              <Rows obj={courseLeave} />
            </div>
            <Sources sources={sourcesIn(courseLeave)} className="mt-5 border-t border-border pt-4" />
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- round by round */}
      {seatRows.length > 0 && (
        <section className="border-y border-border bg-surface-1 py-10 md:py-14" id="seat-leaving">
          <div className="container-custom">
            <SectionHead icon="route" title={c.seat_title} intro={c.seat_intro} />
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
              <table className="dt w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-surface-1 text-[12px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-[22%] px-4 py-3 font-semibold">When</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Government colleges</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Private colleges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {seatRows.map((r, i) => (
                    <tr key={i} className="align-top">
                      <th scope="row" className="px-4 py-3 font-semibold text-foreground">{str(r.when)}</th>
                      <td className="px-4 py-3 leading-relaxed text-foreground">
                        <JsonView value={r.government} />
                      </td>
                      <td className="px-4 py-3 leading-relaxed text-foreground">
                        {str(r.private) && /^same\b/i.test(str(r.private)!) ? <span className="text-muted-foreground">{str(r.private)}</span> : <JsonView value={r.private} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Sources
              sources={[...seatRows.flatMap((r) => sourcesOf(r.source)), ...sourcesOf(data.seat_leaving_source as Json)].filter(
                (x, i, a) => a.findIndex((y) => `${y.url ?? y.title}|${y.page}` === `${x.url ?? x.title}|${x.page}`) === i,
              )}
              className="mt-4"
            />
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- deposit */}
      {(deposit || str(data.security_lost_when)) && (
        <section className="container-custom py-10 md:py-14" id="security-deposit">
          <SectionHead icon="money" title={c.deposit_title} />
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
            {deposit && <Rows obj={deposit} />}
            {str(data.security_lost_when) && (
              <div className={deposit ? "mt-4 border-t border-border pt-4" : ""}>
                <Rows obj={{ security_lost_when: data.security_lost_when ?? null }} />
              </div>
            )}
            <Sources sources={[...sourcesOf(data.security_source as Json), ...sourcesOf(data.security_source_2 as Json)]} className="mt-5 border-t border-border pt-4" />
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- private and deemed */}
      {(pc || colleges.length > 0 || str(data.private_service_bond) || str(data.state_service_bond)) && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14" id="private-colleges">
          <div className="container-custom">
            <SectionHead icon="college" eyebrow={colleges.length ? `${colleges.length} colleges` : undefined} title={c.private_title} intro={c.private_intro} />
            {(pc || str(data.private_service_bond) || str(data.state_service_bond)) && (
              <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
                {pc && <Rows obj={pc} />}
                {str(data.private_service_bond) && <Rows obj={{ private_service_bond: data.private_service_bond ?? null }} />}
                {str(data.state_service_bond) && <Rows obj={{ state_service_bond: data.state_service_bond ?? null }} />}
                <Sources sources={[...sourcesIn(pc ?? undefined), ...sourcesOf(data.esic_faridabad_source as Json)]} className="mt-5 border-t border-border pt-4" />
              </div>
            )}
            {colleges.length > 0 && (
              <>
                {colleges.length >= 8 && (
                  <DataTools
                    id="bond-college-tools"
                    className="mt-6"
                    targets={["bond-state-colleges"]}
                    total={colleges.length}
                    placement="bond_state_colleges"
                    labels={labels}
                    chips={[
                      {
                        key: "status",
                        label: "Status",
                        options: [
                          { value: "official", label: "Official terms" },
                          { value: "none", label: "No bond in its documents" },
                          { value: "ask", label: "Ask the college" },
                        ],
                      },
                      {
                        key: "type",
                        label: "Type",
                        options: [
                          { value: "private", label: "Private" },
                          { value: "deemed", label: "Deemed" },
                        ],
                      },
                    ]}
                    sorts={[
                      { key: "amt", label: "Bond amount, highest first", dir: "desc" },
                      { key: "name", label: "College, A–Z", text: true },
                    ]}
                  />
                )}
                <div className="mt-6">
                  <CollegeBondTable id="bond-state-colleges" colleges={colleges} ask={c.ask} />
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- government colleges by name */}
      {govtColleges.length > 0 && g.flag !== "lead" && (
        <section className="container-custom py-10 md:py-14" id="government-colleges">
          <SectionHead icon="list" title={c.govt_list_title} intro={c.govt_list_intro} />
          <p className="mt-5 text-[14.5px] leading-relaxed">
            {govtColleges.map((x, i) => (
              <span key={x.slug}>
                {i > 0 && <span className="text-muted-foreground"> · </span>}
                <Link href={`/md-ms-india/colleges/${x.slug}#official-bond`} className="text-foreground hover:text-primary hover:underline">
                  {x.name}
                </Link>
              </span>
            ))}
          </p>
        </section>
      )}

      {/* ------------------------------------------------------- the rest of the notices */}
      {(notes.length > 0 || Object.keys(extra).length > 0 || docSources.length > 0) && (
        <section className="container-custom pb-10 md:pb-14" id="notes">
          <SectionHead icon="document" title={c.notes_title} />
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
            {Object.keys(extra).length > 0 && <Rows obj={extra} />}
            {notes.length > 0 && (
              <ul className={`list-disc space-y-2 pl-5 text-[14.5px] leading-relaxed text-foreground ${Object.keys(extra).length ? "mt-4" : ""}`}>
                {notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            )}
            <Sources sources={docSources} className="mt-5 border-t border-border pt-4" />
          </div>
        </section>
      )}

      <DataPageEnd
        telegram={{ placement: "pg_bond_state" }}
        playbook={{ kind: "state", name, placement: "bond_state" }}
        lead={{ level: "pg", source: `PG bond page: ${name}`, title: c.lead_title, body: c.lead_body }}
      />

      {faqs.length > 0 && <FaqList title={c.faq_title} faqs={faqs} />}

      <LinkCards title={c.links_title} links={links} />
      <section className="container-custom border-t border-border py-10">
        <h2 className="font-heading text-xl font-bold text-foreground">PG bond in other states</h2>
        <p className="mt-4 text-[14.5px] leading-relaxed">
          {others.map((x, i) => (
            <span key={x.slug}>
              {i > 0 && <span className="text-muted-foreground"> · </span>}
              <Link href={`/md-ms-india/bond/${x.slug}`} className="text-primary-strong hover:underline dark:text-primary">
                {x.state} PG bond
              </Link>
            </span>
          ))}
        </p>
      </section>
      <SourcedNote text={oc.sourced_note} />
    </main>
  );
}
