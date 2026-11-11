import type { Metadata } from "next";
import { Info } from "lucide-react";
import Link from "@/components/ui/Link";
import { resolveMetadata } from "@/lib/content";
import { fitDescription, fitTitle } from "@/lib/seoTitle";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { getPgEligibility } from "@/lib/pgEligibility";
import { counsellingYear } from "@/lib/counselStates";
import { pairs } from "@/components/counsel/CounselBlocks";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import SectionHead from "@/components/ui/SectionHead";
import OpenOnHash from "@/components/ui/OpenOnHash";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import LeadCapture from "@/components/lead/LeadCapture";
import { FaqList } from "@/components/counsel/CounselBlocks";

/**
 * "In service quota in NEET PG <state>" (2026-11-12, the journey study — ten states searched by name): every state whose
 * counselling allotted MD/MS, diploma or DNB seats to in-service doctors, quota by quota as the state prints it, from the
 * counselling results we hold (lib/pgEligibility.ts), and MCC's DNB sponsored seats apart. The eligibility rules (years of
 * service, rural service) are each state's own: the page names none it cannot cite — "rules" lines come from Admin →
 * Content, one per state with its source. Words: Admin → Content → "Page: NEET PG in-service quota".
 */

const PATH = "/neet-pg-in-service-quota";
const n = (v: number) => v.toLocaleString("en-IN");

async function load() {
  const e = await getPgEligibility();
  const tokens = {
    year: e?.year ?? undefined,
    states: e?.service.length,
    colleges: e ? n(e.serviceColleges) : undefined,
    options: e ? n(e.serviceOptions) : undefined,
    top: e?.service[0]?.state,
    sponsored_colleges: e?.sponsored ? n(e.sponsored.colleges) : undefined,
    sponsored_states: e?.sponsored?.states,
    season: counsellingYear(),
  };
  const c = await pageCopy("page.pg_in_service", tokens);
  return { e, c };
}

export async function generateMetadata(): Promise<Metadata> {
  const { c } = await load();
  return resolveMetadata(PATH, {
    title: fitTitle(c.seo_title, "In-Service Quota in NEET PG: State Wise", "NEET PG In-Service Quota"),
    description: fitDescription(c.seo_description, c.subtitle),
    keywords: "in service quota in neet pg, in service quota neet pg state wise, neet pg in service quota maharashtra, karnataka in service quota pg, dnb sponsored seats",
  });
}

export default async function InServicePage() {
  const [{ e, c }, heroImage] = await Promise.all([load(), pageHeroImage("page.pg_in_service.hero", "page.pg_state.hero")]);
  const faqs = pairs(c.faqs).map(([question, answer]) => ({ question, answer }));
  // "State | rule | source" lines, typed by the team from each state's own notice; shown only when the line has all three.
  const rules = new Map(
    c.rules
      .split("\n")
      .map((l) => l.split("|").map((x) => x.trim()))
      .filter((x) => x.length >= 3 && x[0] && x[1] && x[2])
      .map((x) => [x[0].toLowerCase(), { rule: x[1], source: x[2] }] as const),
  );

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "In-service quota", path: PATH },
          ]),
          webPage({ name: "In-service quota in NEET PG, state wise", description: c.subtitle, path: PATH }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "In-service quota" }]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={c.accent}
        subtitle={e?.service.length ? c.answer : c.subtitle}
        image={heroImage}
        topic="authority"
        cta={{ label: c.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_in_service"
        source={c.source}
        visual={
          e?.service.length ? (
            <HeroBars
              title={c.visual_title}
              caption={c.visual_caption}
              rows={e.service.slice(0, 8).map((s) => ({ label: s.state, value: s.colleges, display: `${s.colleges} colleges`, href: `#${s.anchor}`, note: s.quotas[0]?.label }))}
            />
          ) : undefined
        }
        insights={
          e
            ? [
                { icon: "authority" as const, label: c.insight_states, value: String(e.service.length) },
                { icon: "college" as const, label: c.insight_colleges, value: n(e.serviceColleges) },
                { icon: "spark" as const, label: c.insight_options, value: n(e.serviceOptions) },
                ...(e.sponsored ? [{ icon: "people" as const, label: c.insight_sponsored, value: n(e.sponsored.colleges) }] : []),
              ]
            : undefined
        }
      />

      {!e ? (
        <section className="container-custom py-14">
          <p className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-muted-foreground">{c.empty}</p>
        </section>
      ) : (
        <>
          <section className="container-custom py-10 md:py-14">
            <SectionHead icon="authority" eyebrow={c.table_eyebrow} title={c.table_title} intro={c.table_intro} />
            <OpenOnHash />
            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {e.service.map((s) => {
                const r = rules.get(s.state.toLowerCase());
                return (
                  <details key={s.state} id={s.anchor} className="scroll-mt-32 rounded-2xl border border-border bg-card p-4" open={e.service.length <= 6}>
                    <summary className="cursor-pointer font-heading text-[16px] font-bold text-foreground">
                      {s.state}{" "}
                      <span className="tnum text-[13px] font-medium text-muted-foreground">
                        · {s.colleges} colleges · {n(s.options)} options{s.year ? ` · ${s.year}` : ""}
                      </span>
                    </summary>
                    <table className="dt mt-3 w-full text-left text-[13.5px]">
                      <thead>
                        <tr>
                          <th scope="col">{c.col_quota}</th>
                          <th scope="col" className="text-right">{c.col_colleges}</th>
                          <th scope="col" className="text-right">{c.col_options}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.quotas.map((q) => (
                          <tr key={q.label}>
                            <td>{q.label}</td>
                            <td className="tnum text-right">{q.colleges}</td>
                            <td className="tnum text-right">{n(q.options)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {r && (
                      <p className="mt-3 rounded-xl bg-surface-1 px-3 py-2 text-[13px] leading-relaxed text-foreground">
                        {r.rule} <span className="text-muted-foreground">— {r.source}</span>
                      </p>
                    )}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-[13px] font-semibold text-primary-strong dark:text-primary">{c.colleges_toggle}</summary>
                      <ul className="mt-2 grid gap-1 text-[13.5px]">
                        {s.list.map((x) => (
                          <li key={x.name}>
                            {x.slug ? (
                              <Link href={`/md-ms-india/colleges/${x.slug}`} className="text-foreground hover:text-primary hover:underline">
                                {x.name}
                              </Link>
                            ) : (
                              x.name
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                    {s.slug && (
                      <Link href={`/md-ms-india/states/${s.slug}`} className="mt-3 inline-block text-[13.5px] font-semibold text-primary-strong hover:underline dark:text-primary">
                        {s.state}: cut off, seats and fees →
                      </Link>
                    )}
                  </details>
                );
              })}
            </div>
            <p className="mt-4 flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {c.table_note}
            </p>
          </section>

          {e.sponsored && (
            <section className="border-y border-border bg-surface-1 py-10 md:py-14">
              <div className="container-custom">
                <SectionHead icon="people" eyebrow={c.dnb_eyebrow} title={c.dnb_title} intro={c.dnb_intro} />
                <p className="mt-4 text-[14px] text-muted-foreground">
                  <Link href="/md-vs-dnb" className="font-semibold text-primary-strong hover:underline dark:text-primary">{c.dnb_link}</Link>
                </p>
              </div>
            </section>
          )}

          <DataPageCounsel kind="state" name={c.counsel_topic} placement="pg_in_service" />
          {faqs.length > 0 && <FaqList title={c.faq_title} faqs={faqs} />}
          <section className="container-custom pb-10">
            <p className="text-[14px] text-muted-foreground">
              {c.open_note}{" "}
              <Link href="/neet-pg-open-states" className="font-semibold text-primary-strong hover:underline dark:text-primary">{c.open_link}</Link>
            </p>
          </section>
        </>
      )}
      <LeadCapture level="pg" source="In-service quota (NEET PG)" />
    </main>
  );
}
