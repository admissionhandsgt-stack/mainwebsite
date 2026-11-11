import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { ExternalLink } from "lucide-react";
import { resolveMetadata } from "@/lib/content";
import { getHubNotices, type HubNotice } from "@/lib/stateNotices";
import { getPgStates } from "@/lib/pgStateQueries";
import { getMbbsStateSeats } from "@/lib/stateQueries";
import { counsellingYear } from "@/lib/counselStates";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { readableDate } from "@/lib/pageDates";
import { fitTitle } from "@/lib/seoTitle";
import StructuredData, { breadcrumb, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import DataPageCounsel from "@/components/lead/DataPageCounsel";
import TelegramJoin from "@/components/engage/TelegramJoin";

/**
 * NEET counselling updates (2026-11-11, the competitive review's "news" gap): the newest NEET PG and NEET UG notices
 * from MCC, NBEMS, NMC and every state authority we follow — the notices the alerts bar and the state pages already
 * carry (lib/stateNotices.ts getHubNotices), on one page, each linked to the authority's own file and, where it is a
 * state's, to that state's page. One page, not a page per notice: a notice's own words are the authority's.
 * Words: Admin → Content → "Page: NEET counselling updates".
 */
export const revalidate = 900;
const PATH = "/neet-counselling-updates";

async function load() {
  const [pg, ug, pgStates, ugStates] = await Promise.all([
    getHubNotices("pg", 30),
    getHubNotices("ug", 30),
    getPgStates().catch(() => []),
    getMbbsStateSeats().catch(() => []),
  ]);
  const key = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
  const pgSlug = new Map(pgStates.map((s) => [key(s.name), s.slug] as [string, string]));
  const ugSlug = new Map(ugStates.map((s) => [key(s.name), s.slug] as [string, string]));
  const authorities = new Set([...pg, ...ug].map((n) => n.state).filter(Boolean)).size;
  const year = counsellingYear();
  const copy = await pageCopy("page.counselling_updates", { year, pg: pg.length, ug: ug.length, authorities });
  return { pg, ug, pgSlug, ugSlug, key, year, copy };
}

export async function generateMetadata(): Promise<Metadata> {
  const { year, pg } = await load();
  const newest = pg[0]?.on ? readableDate(pg[0].on.slice(0, 10)) : null;
  return resolveMetadata(PATH, {
    title: fitTitle(
      `NEET Counselling ${year} Latest Updates: MCC & State Notices (PG, UG)`,
      `NEET Counselling ${year} Latest Updates: MCC & State Notices`,
      `NEET Counselling ${year} Latest Updates`,
    ),
    description: `The newest NEET PG and NEET UG counselling notices from MCC, NBEMS and the state authorities${newest ? ` — latest on ${newest}` : ""}: schedules, seat matrices, merit lists and allotments, each linked to the official file.`,
    keywords: `neet pg counselling ${year} latest news, neet pg counselling ${year} update, mcc notice, neet ug counselling ${year} latest news, state counselling notice`,
  });
}

function List({ items, slugs, base, empty, keyOf }: { items: HubNotice[]; slugs: Map<string, string>; base: string; empty: string; keyOf: (s: string) => string }) {
  if (!items.length) return <p className="mt-3 text-[14px] text-muted-foreground">{empty}</p>;
  return (
    <ol className="mt-4 divide-y divide-border rounded-2xl border border-border bg-card">
      {items.map((n) => {
        const slug = n.state ? slugs.get(keyOf(n.state)) : undefined;
        return (
          <li key={(n.url ?? "") + n.title} className="flex gap-3 px-4 py-3">
            <time dateTime={n.on.slice(0, 10)} className="tnum w-[4.6rem] shrink-0 pt-0.5 text-[12.5px] font-semibold text-muted-foreground">
              {readableDate(n.on.slice(0, 10)).replace(/ \d{4}$/, "")}
            </time>
            <div className="min-w-0">
              <p className="text-[14.5px] leading-snug text-foreground">
                {n.url ? (
                  <a href={n.url} target="_blank" rel="noopener" className="font-medium hover:text-primary hover:underline">
                    {n.title}
                    <ExternalLink className="ml-1 inline h-3.5 w-3.5 align-[-2px] text-muted-foreground" aria-hidden="true" />
                  </a>
                ) : (
                  n.title
                )}
              </p>
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                {slug ? (
                  <Link href={`${base}/${slug}`} className="font-semibold text-primary-strong hover:underline dark:text-primary">
                    {n.where}
                  </Link>
                ) : (
                  <span className="font-semibold">{n.where}</span>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default async function CounsellingUpdates() {
  const { pg, ug, pgSlug, ugSlug, key, year, copy } = await load();
  const image = await pageHeroImage("page.counselling_updates.hero", "page.pg_counselling.hero");
  const newest = [pg[0]?.on, ug[0]?.on].filter(Boolean).sort().pop()?.slice(0, 10) ?? null;
  const lastMonth = (xs: HubNotice[]) => xs.filter((n) => Date.parse(n.on) > Date.now() - 30 * 86_400_000).length;

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET counselling updates", path: PATH },
          ]),
          webPage({ name: `NEET counselling ${year} latest updates`, description: copy.subtitle, path: PATH, ...(newest ? { dateModified: newest } : {}) }),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `NEET PG counselling ${year} notices`,
            itemListElement: pg
              .filter((n) => n.url)
              .slice(0, 20)
              .map((n, i) => ({ "@type": "ListItem", position: i + 1, name: n.title, url: n.url })),
          },
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "NEET counselling updates" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "NEET PG notices, 30 days", value: String(lastMonth(pg)) },
          { label: "NEET UG notices, 30 days", value: String(lastMonth(ug)) },
          ...(newest ? [{ label: "Newest", value: readableDate(newest) }] : []),
        ]}
        cta={{ label: "Check your chances for this round", href: "/neet-college-predictor?course=pg" }}
        telegram="hero_counselling_updates"
        image={image}
        topic="authority"
      />

      <div className="container-custom py-10 md:py-14">
        <div className="grid gap-10 lg:grid-cols-2">
          <section aria-labelledby="pg-notices">
            <h2 id="pg-notices" className="font-heading text-2xl font-bold text-foreground">
              {copy.pg_title}
            </h2>
            <List items={pg} slugs={pgSlug} base="/md-ms-india/states" empty={copy.empty} keyOf={key} />
          </section>
          <section aria-labelledby="ug-notices">
            <h2 id="ug-notices" className="font-heading text-2xl font-bold text-foreground">
              {copy.ug_title}
            </h2>
            <List items={ug} slugs={ugSlug} base="/mbbs-india" empty={copy.empty} keyOf={key} />
          </section>
        </div>
        <p className="mt-4 max-w-[80ch] text-[13.5px] text-muted-foreground">{copy.note}</p>

        <div className="mt-12">
          <DataPageCounsel kind="cutoff" name="NEET PG counselling" placement="counsel_counselling_updates" />
        </div>
      </div>

      <TelegramJoin placement="counselling_updates" />
    </main>
  );
}
