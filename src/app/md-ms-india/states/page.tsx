import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { getPgStates } from "@/lib/pgStateQueries";
import { getStipends } from "@/lib/cutoffHubQueries";
import { resolveMetadata } from "@/lib/content";
import StructuredData, { breadcrumb, webPage } from "@/components/seo/StructuredData";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { ArrowRight, Building2, Landmark, MapPinned } from "lucide-react";
import SectionHead from "@/components/ui/SectionHead";
import LeadCapture from "@/components/lead/LeadCapture";
import TelegramJoin from "@/components/engage/TelegramJoin";

/** Index of the PG state pages — and the link that makes them reachable. */

const PATH = "/md-ms-india/states";

export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata(PATH, {
    title: "PG Medical Seats by State: NEET PG Cutoff & Fees in Every State",
    description:
      "MD/MS colleges state by state — how many, government or private, the counselling that fills them, NEET PG closing ranks and fees by quota, and the stipend.",
    keywords: "PG seats state wise, NEET PG state quota, MD MS colleges state wise, state quota PG cutoff, PG medical seats in India",
  });
}

export default async function PgStatesIndex() {
  const [states, stipends] = await Promise.all([getPgStates(), getStipends()]);
  const stipendOf = new Map(stipends.states.map((s) => [s.state, s.median]));
  // MD/MS colleges and DNB hospitals counted apart: our PG list has one row per college and one per
  // DNB hospital, and a hospital with both is two rows — never one total of "PG colleges".
  const mdms = states.reduce((a, s) => a + s.mdms, 0);
  const dnb = states.reduce((a, s) => a + s.dnb, 0);
  const topStipend = stipends.states[0];
  // Words from Admin → Content → Text & numbers ("Page: PG states"); photo from Admin → Media.
  const [copy, heroImage] = await Promise.all([
    pageCopy("page.pg_states.hero", { colleges: mdms.toLocaleString("en-IN"), dnb: dnb.toLocaleString("en-IN"), states: states.length }),
    pageHeroImage("page.pg_states.hero"),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "MD/MS in India", path: "/md-ms-india" },
            { name: "PG by state", path: PATH },
          ]),
          webPage({ name: "PG medical seats by state", description: "MD/MS colleges, cutoffs and fees in every state.", path: PATH }),
        ]}
      />
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS in India", href: "/md-ms-india" }, { label: "PG by state" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "MD/MS colleges", value: mdms.toLocaleString("en-IN") },
          { label: "DNB hospitals", value: dnb.toLocaleString("en-IN") },
          { label: "States & UTs", value: String(states.length) },
          ...(topStipend ? [{ label: "Highest stipend", value: `₹${topStipend.median.toLocaleString("en-IN")}`, note: `${topStipend.state}, median / month` }] : []),
        ]}
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram="hero_pg_states"
        source={copy.source}
        image={heroImage}
        topic="map"
        visual={
          <HeroBars
            title={copy.visual_title}
            caption="MD/MS colleges with published NEET PG closing ranks"
            rows={[...states]
              .sort((a, b) => b.mdms - a.mdms)
              .slice(0, 7)
              .map((s) => ({
                label: s.name,
                value: s.mdms,
                display: `${s.mdms} colleges`,
                href: `${PATH}/${s.slug}`,
                note: [s.dnb ? `${s.dnb} DNB hospitals` : "", stipendOf.get(s.name) ? `stipend ₹${stipendOf.get(s.name)!.toLocaleString("en-IN")}/month` : ""]
                  .filter(Boolean)
                  .join(" · ") || undefined,
              }))}
          />
        }
      />
      {/* How the seats are filled — words from the admin, so a counsellor can correct them. */}
      <section className="container-custom relative z-10 -mt-8">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_16px_40px_-20px_rgb(8_145_178/0.35)] md:p-8">
          <SectionHead icon="route" eyebrow="Before you pick a state" title={copy.how_title} />
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { Icon: Landmark, t: "All India Quota · MCC", d: copy.how_aiq },
              { Icon: MapPinned, t: "State quota · the state", d: copy.how_state },
              { Icon: Building2, t: "Deemed & central · MCC", d: copy.how_deemed },
            ].map(({ Icon, t, d }) => (
              <li key={t} className="rounded-2xl border border-border bg-surface-2 p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-strong" aria-hidden="true">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-heading mt-3 text-[15px] font-bold text-foreground">{t}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-custom py-10 md:py-14">
        <SectionHead icon="map" eyebrow={`${states.length} states and UTs`} title="Pick a state" intro="Most MD/MS colleges first. Each page has the state's quotas and where they closed, its fees, branches and stipend." />
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...states]
            .sort((a, b) => b.mdms - a.mdms || b.colleges - a.colleges)
            .map((s) => (
              <li key={s.slug}>
                <Link
                  href={`${PATH}/${s.slug}`}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_12px_28px_-16px_rgb(8_145_178/0.55)]"
                >
                  <span
                    className="font-heading inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-[13px] font-extrabold text-white"
                    aria-hidden="true"
                  >
                    {s.name
                      .split(/\s+/)
                      .filter((w) => !/^(and|of)$/i.test(w))
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-heading text-[15px] font-bold text-foreground group-hover:text-primary-strong">
                      PG in {s.name}
                    </span>
                    <span className="tnum mt-0.5 block text-[12.5px] text-muted-foreground">
                      {s.mdms} MD/MS colleges{s.dnb ? ` · ${s.dnb} DNB hospitals` : ""}
                      {stipendOf.get(s.name) ? ` · ₹${stipendOf.get(s.name)!.toLocaleString("en-IN")}/month stipend` : ""}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
                </Link>
              </li>
            ))}
        </ul>
      </section>

      <LeadCapture
        level="pg"
        source="PG states index"
        title="Not sure which state's counselling to bet on?"
        body="A counsellor weighs your domicile, the All India Quota and each state's own round against your rank and budget — and tells you where to put your effort."
      />
      <TelegramJoin placement="pg_states" />
    </main>
  );
}
