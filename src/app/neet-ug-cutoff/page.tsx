import CiteThis from "@/components/seo/CiteThis";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import SectionHead from "@/components/ui/SectionHead";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { getUgAiqCuts, type YearCuts } from "@/lib/cutoffHubQueries";
import { getMbbsStates, resolveMetadata } from "@/lib/content";
import CategoryCutTable from "@/components/cutoffs/CategoryCutTable";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";

/**
 * "NEET cutoff for MBBS", "MBBS cutoff for government college", "NEET cutoff
 * for OBC" — the most-typed admission searches, answered from the All India
 * Quota's own closing ranks. Ranges per category, both ends named; the seat
 * rows stay on each college's page behind the gate. See lib/cutoffHubQueries.ts.
 */

const PATH = "/neet-ug-cutoff";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

/** The newest year whose counselling ran to round 3 — a year still in progress is shown apart. */
const complete = (years: YearCuts[]) => years.find((y) => y.rounds.includes("R3")) ?? years[0];
const open = (y: YearCuts | undefined) => y?.categories.find((c) => c.category === "UR") ?? y?.categories[0];

export async function generateMetadata(): Promise<Metadata> {
  const years = await getUgAiqCuts("MBBS");
  const mbbs = complete(years);
  // The year in progress leads the title once it has rounds: people search the
  // current year, and the page already carries its round 1 and 2.
  const later = years.find((y) => mbbs && y.year > mbbs.year);
  const span = later ? `${later.year} & ${mbbs?.year}` : `${mbbs?.year ?? ""}`;
  return resolveMetadata(PATH, {
    title: `NEET UG Cutoff ${span}: MBBS & BDS Closing Rank by Category`,
    description: `NEET UG ${mbbs?.year ?? ""} All India Quota closing ranks for MBBS and BDS, by category — the round-1 close and the last rank admitted, from MCC's published results.`,
    keywords:
      "NEET UG cutoff, NEET cutoff for MBBS, MBBS cutoff for government college, NEET cutoff for OBC, NEET cutoff for SC, BDS cutoff, AIQ cutoff, NEET closing rank",
  });
}

function YearBlock({ title, y, note }: { title: string; y: YearCuts; note?: string }) {
  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
      <div className="mt-3">
        <CategoryCutTable cuts={y.categories} />
      </div>
    </div>
  );
}

export default async function NeetUgCutoffPage() {
  const [mbbsYears, bdsYears, states] = await Promise.all([getUgAiqCuts("MBBS"), getUgAiqCuts("BDS"), getMbbsStates()]);
  const mbbs = complete(mbbsYears);
  const bds = complete(bdsYears);
  const mbbsLater = mbbsYears.find((y) => mbbs && y.year > mbbs.year);
  const ur = open(mbbs);
  const bdsUr = open(bds);
  const obc = mbbs?.categories.find((c) => c.category === "OBC");
  const sc = mbbs?.categories.find((c) => c.category === "SC");
  // Words from Admin → Content → Text & numbers ("Page: NEET UG cutoff"); photo from Admin → Media.
  const [copy, heroImage] = await Promise.all([
    pageCopy("page.neet_ug_cutoff.hero", { year: mbbs?.year ?? "" }),
    pageHeroImage("page.neet_ug_cutoff.hero"),
  ]);

  const faqs = [
    ...(ur && mbbs
      ? [
          {
            question: `What was the NEET UG ${mbbs.year} cutoff for MBBS in a government college (general category)?`,
            answer: `In the All India Quota, the most sought-after general-category MBBS seat closed at AIR ${n(ur.bestR1)} in round 1, and the last general-category seat was taken at AIR ${n(ur.widest)} across all rounds. Each college closed somewhere in between — sign in to see your own chance at each.`,
          },
        ]
      : []),
    ...(obc && sc && mbbs
      ? [
          {
            question: `What was the NEET ${mbbs.year} MBBS cutoff for OBC and SC?`,
            answer: `All India Quota MBBS: OBC seats were taken up to AIR ${n(obc.widest)} and SC seats up to AIR ${n(sc.widest)}, across all rounds of ${mbbs.year}.`,
          },
        ]
      : []),
    ...(bdsUr && bds
      ? [
          {
            question: `What NEET rank is needed for BDS?`,
            answer: `In ${bds.year}, All India Quota BDS seats for the general category closed between AIR ${n(bdsUr.bestR1)} (round 1, the tightest) and AIR ${n(bdsUr.widest)} (the last admitted). State quota seats close on each state's own merit list.`,
          },
        ]
      : []),
    {
      question: "Is the NEET qualifying cutoff the same as the admission cutoff?",
      answer:
        "No. The qualifying cutoff is a percentile — 50th for general, 40th for OBC, SC and ST, 45th for general PwD — that only makes you eligible for counselling. The admission cutoff is the rank at which seats actually ran out, which is what the tables on this page show.",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NEET UG cutoff", path: PATH },
          ]),
          webPage({ name: `NEET UG cutoff ${mbbs?.year ?? ""}`, description: "All India Quota closing ranks by category for MBBS and BDS.", path: PATH }),
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "NEET UG cutoff" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={
          ur
            ? [
                { label: "MBBS, general", value: `AIR ${n(ur.widest)}`, note: `last admitted, ${mbbs?.year}` },
                { label: "MBBS colleges", value: n(ur.colleges), note: "All India Quota" },
                ...(bdsUr ? [{ label: "BDS, general", value: `AIR ${n(bdsUr.widest)}`, note: `last admitted, ${bds?.year}` }] : []),
              ]
            : []
        }
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=mbbs" }}
        telegram="hero_neet_ug_cutoff"
        source={copy.source}
        image={heroImage}
        topic="chart"
        visual={
          mbbs && mbbs.categories.length > 0 ? (
            <HeroBars
              title={copy.visual_title}
              caption="MBBS, All India Quota, last rank admitted in any round"
              rows={[...mbbs.categories]
                .filter((c) => c.widest != null)
                .sort((a, b) => (a.widest ?? 0) - (b.widest ?? 0))
                .slice(0, 7)
                .map((c) => ({
                  label: c.category,
                  value: c.widest ?? 0,
                  display: `AIR ${n(c.widest)}`,
                  note: `${n(c.colleges)} colleges · round 1 from AIR ${n(c.bestR1)}`,
                }))}
              footnote="A range over every college in the All India Quota. BDS and each state are below."
            />
          ) : undefined
        }
      />

      <section className="container-custom py-10 md:py-14">
        <SectionHead
          icon="college"
          eyebrow="MBBS · All India Quota"
          title="MBBS cutoff — All India Quota"
          intro="The All India Quota is 15% of the seats in every state government medical college, filled by MCC on All India Rank and open to candidates from any state. Ranks below are AIR."
        />
        {mbbs && <YearBlock title={`${mbbs.year}, all rounds`} y={mbbs} />}
        {mbbsLater && (
          <YearBlock
            title={`${mbbsLater.year}, rounds published so far (${mbbsLater.rounds.join(", ")})`}
            y={mbbsLater}
            note={`Counselling for ${mbbsLater.year} is still running and these are the rounds released so far — later rounds usually reach further.`}
          />
        )}
      </section>

      {bds && (
        <section className="border-t border-border bg-surface-1 py-10 md:py-14">
          <div className="container-custom">
            <SectionHead icon="course" eyebrow="BDS · All India Quota" title="BDS cutoff — All India Quota" />
            <p className="mt-2 max-w-[70ch] text-muted-foreground">
              Government dental colleges&apos; All India Quota seats, same counselling, same rank list.{" "}
              <Link href="/bds-india" className="font-semibold text-primary-strong hover:underline">Every BDS college, by state →</Link>
            </p>
            <YearBlock title={`${bds.year}, all rounds`} y={bds} />
          </div>
        </section>
      )}

      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="map" eyebrow="85% state quota" title="State quota cutoffs" />
        <p className="mt-2 max-w-[70ch] text-muted-foreground">
          The other 85% of government seats, and private college seats, are filled by each state on its own merit list — a
          state rank, not AIR. Open your state for its colleges and the counselling that fills them.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {states.map((s) => (
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

      <section className="border-t border-border bg-surface-1 py-10 md:py-14">
        <div className="container-custom">
          <SectionHead icon="help" eyebrow="FAQ" title="NEET UG cutoff: common questions" />
          <div className="mt-6 space-y-3">
            {faqs.map((f) => (
              <details key={f.question} className="rounded-2xl border border-border bg-card p-5">
                <summary className="cursor-pointer font-semibold text-foreground">{f.question}</summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="container-custom pb-10">
        <CiteThis title={`NEET UG cutoff ${mbbs?.year ?? ""} — MBBS and BDS by category`} path="/neet-ug-cutoff" source={"MCC's All India Quota results"} />
      </section>

      <LeadCapture
        level="ug"
        source="NEET UG cutoff page"
        title="Know your rank? Get a choice list built on these numbers"
        body="A counsellor orders your MBBS and BDS choices against the published closing ranks — AIQ and your state — and stays with you through every round."
      />
      <TelegramJoin placement="neet_ug_cutoff" />
    </main>
  );
}
