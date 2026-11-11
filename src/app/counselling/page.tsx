import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { resolveMetadata } from "@/lib/content";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { fitTitle, fitDescription } from "@/lib/seoTitle";
import { counsellingYear, getCounselPgStates, getCounselUgStates } from "@/lib/counselStates";
import DataHero from "@/components/hero/DataHero";
import SectionHead from "@/components/ui/SectionHead";
import ExpertCompare from "@/components/lead/ExpertCompare";
import LeadCapture from "@/components/lead/LeadCapture";
import ExpertPromise, { expertFaqs } from "@/components/counsel/ExpertPromise";
import { FaqList } from "@/components/counsel/CounselBlocks";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";

/**
 * The index of the counselling-guidance pages by state (2026-11-11): every state with a NEET PG page and every state
 * with an MBBS page, each with its own figure. Words: Admin → Content → "Page: counselling by state (the index)".
 */

const n = (v: number) => v.toLocaleString("en-IN");

async function copy() {
  const team = await pageCopy("page.services.figures");
  return pageCopy("page.counsel_hub", { year: counsellingYear(), years: team.years, students: team.students });
}

export async function generateMetadata(): Promise<Metadata> {
  const c = await copy();
  return resolveMetadata("/counselling", {
    title: fitTitle(c.seo_title, "NEET Counselling Guidance by State"),
    description: fitDescription(c.seo_description),
    keywords: "NEET counselling guidance by state, best NEET counsellor, NEET PG counsellor, MBBS counselling consultant, state wise NEET counselling",
  });
}

export default async function CounsellingHub() {
  const [c, pg, ug, heroImage, faqs, expert] = await Promise.all([
    copy(),
    getCounselPgStates(),
    getCounselUgStates(),
    pageHeroImage("page.counsel.hero", "page.pg_state.hero"),
    expertFaqs(),
    pageCopy("page.counsel_expert"),
  ]);
  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "Counselling by state", path: "/counselling" },
          ]),
          webPage({ name: "NEET counselling guidance by state", description: c.seo_description, path: "/counselling" }),
          ...(faqs.length ? [faqPage(faqs)] : []),
        ]}
      />
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "Counselling by state" }]}
        eyebrow={c.eyebrow}
        title={c.title}
        accent={c.accent}
        subtitle={c.subtitle}
        stats={[
          { label: "NEET PG state pages", value: n(pg.length) },
          { label: "MBBS state pages", value: n(ug.length) },
        ]}
        cta={{ label: "Check your colleges free", href: "/neet-college-predictor" }}
        telegram="hero_counsel_hub"
        image={heroImage}
        topic="map"
      />

      <ExpertPromise placement="counsel_hub" />

      <section className="container-custom py-10 md:py-14" id="states">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHead icon="branch" title={c.pg_title} />
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {pg.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/counselling/neet-pg/${s.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary"
                  >
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="tnum shrink-0 text-[12px] text-muted-foreground">{n(s.mdms)} MD/MS colleges</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHead icon="college" title={c.ug_title} />
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {ug.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/counselling/mbbs/${s.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary"
                  >
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="tnum shrink-0 text-[12px] text-muted-foreground">{n(s.seats)} MBBS seats</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <ExpertCompare placement="counsel_hub" />
      {faqs.length > 0 && <FaqList title={expert.faq_title} faqs={faqs} />}
      <LeadCapture level="pg" source="Counselling by state" />
    </main>
  );
}
