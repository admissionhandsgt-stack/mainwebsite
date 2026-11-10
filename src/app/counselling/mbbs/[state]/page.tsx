import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStatePage } from "@/lib/stateQueries";
import { getStateAuthority } from "@/lib/stateAuthorities";
import { getContactInfo, resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { fitTitle, fitDescription } from "@/lib/seoTitle";
import { CONTACT_INFO, OFFICE } from "@/lib/constants";
import { counsellingYear, getCounselPgStates, getCounselUgStates, sameState } from "@/lib/counselStates";
import DataHero from "@/components/hero/DataHero";
import StateAuthority from "@/components/states/StateAuthority";
import StateNotices from "@/components/states/StateNotices";
import SectionHead from "@/components/ui/SectionHead";
import ExpertPlaybook from "@/components/lead/ExpertPlaybook";
import ExpertCompare from "@/components/lead/ExpertCompare";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import { FaqList, HowWeWork, LinkCards, RouteCards, StateChips, pairs } from "@/components/counsel/CounselBlocks";

/**
 * MBBS counselling guidance for one state (2026-11-11, owner: "best NEET counsellor in <state>… MBBS ke sath + PG alag").
 * The service page beside the state's data page (/mbbs-india/<slug>, which keeps the colleges and cut off intent): NMC's
 * seats and colleges, who fills them (the state's authority and MCC), the counsellings in our results, the authority's
 * latest notices, how the team works, the playbook and FAQs. No state-wide fee: UG fee rows carry no quota (CLAUDE.md).
 * Every word: Admin → Content → "Page: MBBS counselling by state"; every figure from data.
 */

type Props = { params: Promise<{ state: string }> };
const SITE = "https://www.admissionhands.com";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

async function load(slug: string) {
  const states = await getCounselUgStates();
  if (!states.some((s) => s.slug === slug)) return null;
  const p = await getStatePage(slug);
  if (!p || !p.nmc) return null;
  const name = p.state.name;
  const [authority, team, contact] = await Promise.all([
    getStateAuthority(name),
    pageCopy("page.services.figures"),
    getContactInfo().catch(() => null),
  ]);
  const year = counsellingYear();
  const nmc = p.nmc;
  const c = await pageCopy("page.counsel_ug", {
    state: name,
    year,
    authority: authority?.authority ?? `${name}'s counselling authority`,
    seats: n(nmc.seats),
    colleges: n(nmc.colleges),
    govt_seats: n(nmc.govtSeats),
    govt_colleges: n(nmc.govtColleges),
    years: team.years,
    students: team.students,
    hours: OFFICE.hoursShort,
  });
  return { p, name, nmc, states, authority, c, year, contact };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { state } = await props.params;
  const d = await load(state);
  if (!d) return { title: "State not found", robots: { index: false } };
  return resolveMetadata(`/counselling/mbbs/${d.p.state.slug}`, {
    title: fitTitle(d.c.seo_title, d.c.seo_title_short, `MBBS Counselling in ${d.name}`),
    description: fitDescription(d.c.seo_description),
    keywords: `MBBS counselling ${d.name}, best NEET counsellor in ${d.name}, NEET UG counselling ${d.name} ${d.year}, MBBS admission consultant ${d.name}, ${d.name} MBBS counselling guidance`,
  });
}

export default async function CounselUgStatePage(props: Props) {
  const { state } = await props.params;
  const d = await load(state);
  if (!d) notFound();
  const { p, name, nmc, c, authority, contact } = d;
  const path = `/counselling/mbbs/${p.state.slug}`;
  const [heroImage, pgStates] = await Promise.all([
    pageHeroImage(`page.ug_state.${p.state.slug}.hero`, "page.ug_state.hero"),
    getCounselPgStates().catch(() => []),
  ]);
  const pg = sameState(pgStates, name);
  const phone = contact?.phoneNumber || CONTACT_INFO.phone;
  const wa = `https://wa.me/${(contact?.whatsappNumber || CONTACT_INFO.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(c.wa_text)}`;
  const privateColleges = nmc.colleges - nmc.govtColleges;

  const faqs = [
    { question: c.faq_best_q, answer: c.faq_best_a },
    { question: c.faq_how_q, answer: c.faq_how_a },
    { question: c.faq_seats_q, answer: c.faq_seats_a },
    { question: c.faq_online_q, answer: c.faq_online_a },
  ].filter((f) => f.question && f.answer);

  const links = [
    { label: `MBBS colleges and seats in ${name}`, href: `/mbbs-india/${p.state.slug}`, note: "Every college, NMC's seats and the cut off band" },
    { label: "NEET UG cut off", href: "/neet-ug-cutoff", note: "All India Quota, category by category" },
    { label: "Deemed universities", href: "/mbbs-india/deemed-universities", note: "MBBS at deemed universities, through MCC" },
    { label: "Check your MBBS colleges", href: "/neet-college-predictor?course=mbbs", note: "Your rank, your chance at each college" },
    ...(pg ? [{ label: `NEET PG counselling in ${pg.name}`, href: `/counselling/neet-pg/${pg.slug}` }] : []),
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "Counselling by state", path: "/counselling" },
            { name: `MBBS · ${name}`, path },
          ]),
          webPage({ name: `MBBS counselling in ${name}`, description: c.seo_description, path }),
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: `MBBS counselling guidance in ${name}`,
            serviceType: "NEET UG (MBBS) admission counselling",
            url: `${SITE}${path}`,
            provider: { "@id": `${SITE}/#organization` },
            areaServed: { "@type": "State", name, containedInPlace: { "@type": "Country", name: "India" } },
          },
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Counselling by state", href: "/counselling" }, { label: `MBBS · ${name}` }]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={c.accent}
        subtitle={c.subtitle}
        stats={[
          { label: "MBBS seats", value: n(nmc.seats), note: "NMC's register" },
          { label: "Colleges", value: n(nmc.colleges), note: "NMC's register" },
          { label: "Government", value: n(nmc.govtColleges), note: `${n(nmc.govtSeats)} seats` },
          ...(privateColleges > 0 ? [{ label: "Private & deemed", value: n(privateColleges), note: `${n(nmc.seats - nmc.govtSeats)} seats` }] : []),
        ]}
        cta={{ label: c.cta, href: "/neet-college-predictor?course=mbbs" }}
        telegram="hero_counsel_ug"
        image={heroImage}
        topic="map"
        aside={authority ? <StateAuthority a={authority} state={name} level="ug" /> : undefined}
      />

      <StateNotices state={name} level="ug" />

      <RouteCards title={c.routes_title} cards={pairs([c.route_state, c.route_mcc].join("\n"))} />

      {p.counsellings.length > 0 && (
        <section className="container-custom pb-10 md:pb-14">
          <SectionHead icon="authority" title={c.counsellings_title} />
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.counsellings.map((x) => (
              <li key={x.name} className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="font-semibold text-foreground">{x.name}</p>
                <p className="text-[13px] text-muted-foreground">
                  {x.authority ? `${x.authority} · ` : ""}
                  {n(x.colleges)} {x.colleges === 1 ? "college" : "colleges"} in {name}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <HowWeWork title={c.how_title} steps={pairs(c.how_steps)} wa={wa} phone={phone} />

      <ExpertPlaybook kind="mbbs_state" name={name} placement="counsel_ug_state" />
      <ExpertCompare placement="counsel_ug_state" />

      <FaqList title={c.faq_title} faqs={faqs} />

      <LeadCapture level="ug" source={`Counselling page: MBBS ${name}`} title={c.lead_title} body={c.lead_body} />
      <TelegramJoin placement="counsel_ug_state" />

      <div className="pt-10">
        <LinkCards title={c.links_title} links={links} />
      </div>
      <StateChips
        title={c.others_title}
        items={d.states.filter((s) => s.slug !== p.state.slug).map((s) => ({ name: s.name, href: `/counselling/mbbs/${s.slug}` }))}
      />
    </main>
  );
}
