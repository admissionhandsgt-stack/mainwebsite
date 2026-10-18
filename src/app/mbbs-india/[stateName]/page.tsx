import { fitTitle, count } from "@/lib/seoTitle";
import { getStateAuthority } from "@/lib/stateAuthorities";
import StateAuthority from "@/components/states/StateAuthority";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { notFound, permanentRedirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { getStatePage, type StatePage } from "@/lib/stateQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";

import SectionHead from "@/components/ui/SectionHead";
/**
 * One page per state, read on the server.
 *
 * This was a client component that fetched its content from `/api/content/*`
 * after load. robots.txt keeps crawlers out of /api/, so Google saw a hero
 * reading "Study MBBS in" and nothing else — on 33 pages that were also linked
 * from nowhere, and any slug at all rendered a 200. See lib/stateQueries.ts.
 */

const SITE = "https://www.admissionhands.com";

type Props = { params: { stateName: string } };

/** Old slug -> current slug, for states whose address changed. */
const RENAMED: Record<string, string> = { chattisgarh: "chhattisgarh" };

function slugOf(raw: string): string {
  let s = raw;
  try {
    s = decodeURIComponent(raw);
  } catch {
    /* already decoded */
  }
  return s.toLowerCase();
}

const inr = (n: number) => n.toLocaleString("en-IN");

/** "Kerala, All India Quota and Deemed" — who fills the seats, for the hero line's {counsellings}. */
function bodiesOf(p: StatePage) {
  const bodies = p.counsellings.map((c) => c.name.replace(/ UG$/, "")).slice(0, 3);
  if (bodies.length <= 1) return bodies[0] ?? "the state's own";
  return `${bodies.slice(0, -1).join(", ")} and ${bodies[bodies.length - 1]}`;
}

/** The search snippet: under ~155 characters, where Google cuts. */
function snippet(p: StatePage) {
  // College pages show a cutoff band, fees and seats since 2026-10-12 — never "closing ranks by quota".
  return `${p.colleges.length} MBBS colleges in ${p.state.name}: fees, seats and the NEET UG cutoff band for each, and which counselling fills each seat.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = slugOf(params.stateName);
  const p = await getStatePage(slug);
  if (!p) return { title: "State not found", robots: { index: false } };
  return resolveMetadata(`/mbbs-india/${slug}`, {
    title: fitTitle(
      `MBBS in ${p.state.name} 2026: ${count(p.colleges.length, "College", "Colleges")}, Counselling & Cutoffs`,
      `MBBS in ${p.state.name} 2026: ${count(p.colleges.length, "College", "Colleges")} & Cutoffs`,
      `MBBS in ${p.state.name} 2026: Colleges & Cutoffs`,
      `MBBS in ${p.state.name} 2026`,
    ),
    description: snippet(p),
    keywords: `MBBS in ${p.state.name}, MBBS colleges in ${p.state.name}, ${p.state.name} NEET counselling, ${p.state.name} MBBS cutoff, government medical colleges ${p.state.name}`,
  });
}

/** What each kind of counselling is — said only where it holds everywhere. */
function explain(counselling: string, state: string): string {
  if (/all india/i.test(counselling))
    return "Run by MCC. 15% of the seats in government colleges, open to candidates from every state on their All India Rank.";
  if (/deemed/i.test(counselling)) return "Run by MCC. Deemed universities fill all their seats here, open to every state.";
  if (/esi/i.test(counselling)) return "ESIC colleges, with seats reserved for the wards of insured persons.";
  if (counselling.toLowerCase().startsWith(state.split(" ")[0].toLowerCase()))
    return `The state's own counselling — the remaining government seats and the private college seats in ${state}. Check the domicile rule before you count on it.`;
  return "A separate quota with its own eligibility.";
}

export default async function MBBSStatePage({ params }: Props) {
  const raw = slugOf(params.stateName);
  // Two states used to carry "&" in their slug, which also made the sitemap
  // invalid XML. They are "-and-" now; the old address redirects.
  if (raw.includes("&")) permanentRedirect(`/mbbs-india/${raw.replace(/&/g, "and")}`);
  // The CMS spelled it "Chattisgarh"; the state, and what people search, is "Chhattisgarh".
  if (raw in RENAMED) permanentRedirect(`/mbbs-india/${RENAMED[raw]}`);

  const p = await getStatePage(raw);
  if (!p) notFound();

  const name = p.state.name;
  const path = `/mbbs-india/${p.state.slug}`;
  // Words from Admin → Content → Text & numbers ("Page: MBBS state pages"); photo from Admin → Media.
  const [copy, heroImage, authority] = await Promise.all([
    pageCopy("page.ug_state.hero", { state: name, count: inr(p.colleges.length), counsellings: bodiesOf(p) }),
    pageHeroImage(`page.ug_state.${p.state.slug}.hero`, "page.ug_state.hero"),
    getStateAuthority(name),
  ]);
  const withRanks = p.colleges.filter((c) => c.rankRows > 0).length;
  const years = p.years.length ? p.years.join(" and ") : null;
  const yearSpan =
    p.years.length > 1 ? `${p.years[0]}–${String(p.years[p.years.length - 1]).slice(2)}` : p.years[0] ? String(p.years[0]) : null;

  const faqs = [
    {
      question: `How many MBBS colleges are there in ${name}?`,
      answer:
        `We list ${p.colleges.length} MBBS colleges in ${name}` +
        (withRanks ? `, ${withRanks} of them with published NEET UG closing ranks` : "") +
        `. Each has its own page with the ranks it closed at, round by round.`,
    },
    ...(p.counsellings.length
      ? [
          {
            question: `Which counselling fills MBBS seats in ${name}?`,
            answer:
              `In the published results, MBBS seats in ${name} were filled through: ` +
              p.counsellings.map((c) => `${c.name} (${c.colleges} ${c.colleges === 1 ? "college" : "colleges"})`).join(", ") +
              `.`,
          },
        ]
      : []),
    {
      question: `What NEET rank do I need for MBBS in ${name}?`,
      answer:
        `It depends on the quota and your category — a state-quota seat and an All India Quota seat in the same college close at very different ranks. ` +
        `Enter your rank in the NEET college predictor to see every seat it reached in ${years ? `the ${years}` : "the last"} counselling.`,
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MBBS in India", path: "/mbbs-india" },
            { name: `MBBS in ${name}`, path },
          ]),
          webPage({ name: `MBBS in ${name}`, description: snippet(p), path }),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `MBBS colleges in ${name}`,
            numberOfItems: p.colleges.length,
            itemListElement: p.colleges.map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.name,
              url: `${SITE}/mbbs-india/colleges/${c.slug}`,
            })),
          },
          faqPage(faqs),
        ]}
      />

      {/* ------------------------------- hero ------------------------------- */}
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MBBS in India", href: "/mbbs-india" }, { label: name }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "MBBS colleges", value: inr(p.colleges.length) },
          { label: "With cutoff data", value: inr(withRanks) },
          { label: "Counsellings", value: inr(p.counsellings.length) },
          { label: "Data years", value: yearSpan ?? "—" },
        ]}
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=mbbs" }}
        telegram="hero_ug_state"
        source={copy.source}
        image={heroImage}
        topic="map"
        visual={
          p.counsellings.length > 0 ? (
            <HeroBars
              title={copy.visual_title}
              caption={`Colleges in ${name} each counselling allotted seats in`}
              rows={p.counsellings.slice(0, 7).map((c) => ({
                label: c.name,
                value: c.colleges,
                display: `${c.colleges} ${c.colleges === 1 ? "college" : "colleges"}`,
                note: c.authority ?? undefined,
              }))}
            />
          ) : undefined
        }
      />

      {/* -------------------- the state's counselling authority -------------------- */}
      {authority && (
        <div className="container-custom pt-10 md:pt-14">
          <StateAuthority a={authority} state={name} level="ug" />
        </div>
      )}

      {/* --------------------------- counsellings --------------------------- */}
      {p.counsellings.length > 0 && (
        <section className="container-custom py-10 md:py-14">
          <SectionHead
            icon="authority"
            title={<>Who fills MBBS seats in {name}</>}
            intro={<>Every counselling that allotted an MBBS seat in {name} in the published results {years ? ` for ${years}` : ""}, and how many of the state&apos;s colleges it covers.</>}
          />
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {p.counsellings.map((c) => (
              <li key={c.name} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-foreground md:text-lg">
                    <Landmark className="h-4 w-4 shrink-0 text-primary-strong" aria-hidden="true" />
                    {c.name}
                  </h3>
                  <span className="tnum shrink-0 text-sm text-muted-foreground">
                    {c.colleges} {c.colleges === 1 ? "college" : "colleges"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{explain(c.name, name)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------ colleges ----------------------------- */}
      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <SectionHead
            icon="college"
            title={<>MBBS colleges in {name}</>}
            intro={<>Open a college for its courses, fees, seat options and its general-category cutoff band.</>}
          />
          {p.colleges.length === 0 ? (
            <p className="mt-6 text-muted-foreground">No MBBS college in {name} has published closing ranks in our data yet.</p>
          ) : (
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {p.colleges.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/mbbs-india/colleges/${c.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary"
                  >
                    {/* No icons on these cards: three inline SVGs a card, repeated in
                        the RSC payload, made Uttar Pradesh's page 555 KB. */}
                    <span className="font-semibold leading-snug text-foreground group-hover:text-primary">{c.name}</span>
                    <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                      {c.city && <span>{c.city}</span>}
                      {c.collegeType && <span>{c.collegeType}</span>}
                      {c.establishedYear && <span>Est. {c.establishedYear}</span>}
                      {c.intake ? <span className="tnum">{c.intake} seats</span> : null}
                    </span>
                    <span className="mt-auto pt-3 text-[13px] font-semibold text-primary-strong">
                      {c.rankRows > 0 ? "Closing ranks" : "College details"} <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* -------------------------------- faq -------------------------------- */}
      <section className="container-custom py-10 md:py-14">
        <SectionHead
          icon="help"
          title={<>MBBS in {name}: common questions</>}
        />
        <div className="mt-6 space-y-3">
          {faqs.map((f) => (
            <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
              <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
              <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <LeadCapture
        level="ug"
        source={`MBBS in ${name}`}
        title={`Planning MBBS in ${name}?`}
        body="Tell us your rank and category. A counsellor builds your choice list for this state, round by round, and stays with you until you report."
      />
      <TelegramJoin placement="ug_state" />

      {/* --------------------------- other states --------------------------- */}
      <section className="container-custom border-t border-border py-10">
        <h2 className="font-heading text-xl font-bold text-foreground">MBBS in other states</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {p.others.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/mbbs-india/${s.slug}`}
                className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
