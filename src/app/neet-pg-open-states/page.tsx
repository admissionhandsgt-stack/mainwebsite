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
import DataPageEnd from "@/components/lead/DataPageEnd";
import { FaqList } from "@/components/counsel/CounselBlocks";

/**
 * "Open states for NEET PG counselling" (2026-11-12, the journey study): the states whose own counselling opened some of
 * their private colleges' MD/MS seats to candidates from any state, from the counselling results we hold
 * (lib/pgEligibility.ts), and the states that kept every seat for their own candidates. Counts are colleges and
 * college × branch options, never seats. No "domicile only" list: a state missing here may still open its management or
 * institutional seats to everyone without our results filing them as open, so the page names only what it can show.
 * Words: Admin → Content → "Page: NEET PG open states".
 */

const PATH = "/neet-pg-open-states";
const n = (v: number) => v.toLocaleString("en-IN");
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

async function load() {
  const e = await getPgEligibility();
  const tokens = {
    year: e?.year ?? undefined,
    states: e?.open.length,
    colleges: e ? n(e.openColleges) : undefined,
    options: e ? n(e.openOptions) : undefined,
    top: e?.open[0]?.state,
    top_colleges: e?.open[0]?.colleges,
    state_list: e ? list(e.open.map((o) => o.state)) : undefined,
    season: counsellingYear(),
  };
  const c = await pageCopy("page.pg_open_states", tokens);
  return { e, c };
}

export async function generateMetadata(): Promise<Metadata> {
  const { c } = await load();
  return resolveMetadata(PATH, {
    title: fitTitle(c.seo_title, "Open States for NEET PG Counselling: List", "Open States NEET PG"),
    description: fitDescription(c.seo_description, c.subtitle),
    keywords: "open states for neet pg counselling, open states neet pg list, neet pg other state candidates, neet pg domicile rules, private medical college pg seats open to all india",
  });
}

export default async function OpenStatesPage() {
  const [{ e, c }, heroImage] = await Promise.all([load(), pageHeroImage("page.pg_open_states.hero", "page.pg_state.hero")]);
  const faqs = pairs(c.faqs).map(([question, answer]) => ({ question, answer }));

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "Open states", path: PATH },
          ]),
          webPage({ name: "Open states for NEET PG counselling", description: c.subtitle, path: PATH }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "Open states" }]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={c.accent}
        subtitle={e?.open.length ? c.answer : c.subtitle}
        image={heroImage}
        topic="map"
        cta={{ label: c.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_open_states"
        source={c.source}
        visual={
          e?.open.length ? (
            <HeroBars
              title={c.visual_title}
              caption={c.visual_caption}
              rows={e.open.slice(0, 8).map((o) => ({ label: o.state, value: o.colleges, display: `${o.colleges} colleges`, href: `#${o.anchor}`, note: o.quotas[0] }))}
            />
          ) : undefined
        }
        insights={
          e
            ? [
                { icon: "authority" as const, label: c.insight_states, value: String(e.open.length) },
                { icon: "college" as const, label: c.insight_colleges, value: n(e.openColleges) },
                { icon: "spark" as const, label: c.insight_options, value: n(e.openOptions) },
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
            <SectionHead icon="map" eyebrow={c.table_eyebrow} title={c.table_title} intro={c.table_intro} />
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="dt w-full min-w-[640px] text-left text-[14px]">
                <thead>
                  <tr>
                    <th scope="col">{c.col_state}</th>
                    <th scope="col">{c.col_seats}</th>
                    <th scope="col" className="text-right">{c.col_colleges}</th>
                    <th scope="col" className="text-right">{c.col_options}</th>
                  </tr>
                </thead>
                <tbody>
                  {e.open.map((o) => (
                    <tr key={o.state}>
                      <th scope="row" className="font-semibold">
                        <a href={`#${o.anchor}`} className="text-foreground hover:text-primary">{o.state}</a>
                      </th>
                      <td className="text-muted-foreground">{o.quotas.join(" · ")}</td>
                      <td className="tnum text-right">{o.colleges}</td>
                      <td className="tnum text-right">{n(o.options)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex gap-2 text-[13px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {c.table_note}
            </p>
          </section>

          <section className="border-y border-border bg-surface-1 py-10 md:py-14">
            <div className="container-custom">
              <SectionHead icon="college" eyebrow={c.colleges_eyebrow} title={c.colleges_title} intro={c.colleges_intro} />
              <OpenOnHash />
              <div className="mt-6 lg:columns-2 lg:gap-4 [&>details]:break-inside-avoid">
                {e.open.map((o) => (
                  <details key={o.state} id={o.anchor} className="mb-3 scroll-mt-32 rounded-2xl border border-border bg-card p-4">
                    <summary className="cursor-pointer font-heading text-[16px] font-bold text-foreground">
                      {o.state} <span className="tnum text-[13px] font-medium text-muted-foreground">· {o.colleges} colleges</span>
                    </summary>
                    <p className="mt-2 text-[13px] text-muted-foreground">{o.quotas.join(" · ")}{o.year ? ` · ${o.year}` : ""}</p>
                    <ul className="mt-3 grid gap-1.5 text-[14px]">
                      {o.list.map((x) => (
                        <li key={x.name}>
                          {x.slug ? (
                            <Link href={`/md-ms-india/colleges/${x.slug}`} className="text-foreground underline-offset-2 hover:text-primary hover:underline">
                              {x.name}
                            </Link>
                          ) : (
                            x.name
                          )}
                        </li>
                      ))}
                    </ul>
                    {o.slug && (
                      <Link href={`/md-ms-india/states/${o.slug}`} className="mt-3 inline-block text-[13.5px] font-semibold text-primary-strong hover:underline dark:text-primary">
                        {o.state}: cut off, seats and fees →
                      </Link>
                    )}
                  </details>
                ))}
              </div>
            </div>
          </section>

          <DataPageEnd
            telegram={{ placement: "pg_open_states", round: false }}
            playbook={{ kind: "state", name: c.counsel_topic, placement: "pg_open_states" }}
            counsel={{ kind: "state", name: c.counsel_topic, placement: "pg_open_states" }}
          />
          {faqs.length > 0 && <FaqList title={c.faq_title} faqs={faqs} />}
        </>
      )}
    </main>
  );
}
