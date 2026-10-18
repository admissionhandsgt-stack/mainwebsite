import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { ChevronDown, Info, MapPin } from "lucide-react";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import SectionHead from "@/components/ui/SectionHead";
import InsightCards, { type Insight } from "@/components/ui/InsightCards";
import TelegramJoin from "@/components/engage/TelegramJoin";
import LeadCapture from "@/components/lead/LeadCapture";
import OpenOnHash from "@/components/ui/OpenOnHash";
import StructuredData, { breadcrumb, faqPage, webPage } from "@/components/seo/StructuredData";
import { resolveMetadata } from "@/lib/content";
import { fitTitle, fitDescription } from "@/lib/seoTitle";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { approxFee } from "@/lib/chance";
import { getNriColleges, NRI_STREAMS, type NriStream } from "@/lib/nriColleges";

/**
 * Colleges with NRI seats, from the counselling results (rebuilt 2026-10-18).
 *
 * It was eight hand-typed cards — AIIMS Delhi "₹15–20 L a year, 7 NRI seats"
 * among them, an institute with no NRI quota. Everything here is counted in
 * `lib/nriColleges.ts`; the words are in Admin → Content ("Page: Colleges with
 * NRI seats"). No closing rank for any college, as everywhere since 2026-10-12.
 */

const PATH = "/nri-quota/colleges";
const SITE = "https://www.admissionhands.com";

const STREAM: Record<NriStream, { label: string; noun: string; predictor: string; level: "ug" | "pg" }> = {
  mbbs: { label: "MBBS", noun: "MBBS", predictor: "mbbs", level: "ug" },
  bds: { label: "BDS", noun: "dental", predictor: "bds", level: "ug" },
  pg: { label: "MD/MS", noun: "MD/MS", predictor: "pg", level: "pg" },
};

type Props = { searchParams: { course?: string } };

const pick = (v?: string): NriStream => (v === "bds" || v === "pg" ? v : "mbbs");
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));
const money = (v: number | null | undefined) => {
  if (v == null) return "—";
  if (v >= 10_000_000) return `₹${+(v / 10_000_000).toFixed(2)} Cr`;
  if (v >= 100_000) return `₹${+(v / 100_000).toFixed(1)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};
const list = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? "" : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const hrefOf = (s: NriStream) => (s === "mbbs" ? PATH : `${PATH}?course=${s}`);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const stream = pick(searchParams.course);
  const data = await getNriColleges();
  const y = data?.year ? ` ${data.year}` : "";
  const c = data?.streams;

  const base = await resolveMetadata(PATH, {
    title: c
      ? fitTitle(
          `NRI Quota Medical Colleges${y}: ${n(c.mbbs.colleges)} MBBS Colleges by State`,
          `NRI Quota MBBS Colleges${y}: ${n(c.mbbs.colleges)} Colleges by State`,
          "NRI Quota Medical Colleges in India",
        )
      : "NRI Quota Medical Colleges in India",
    description: c
      ? fitDescription(
          `${n(c.mbbs.colleges)} MBBS, ${n(c.bds.colleges)} BDS and ${n(c.pg.colleges)} MD/MS colleges filled NRI seats in the${y} counselling — state by state, with who allots each college's NRI seats. Check your chance free.`,
          `${n(c.mbbs.colleges)} MBBS, ${n(c.bds.colleges)} BDS and ${n(c.pg.colleges)} MD/MS colleges with NRI seats in the${y} counselling, state by state.`,
        )
      : "Medical colleges that filled NRI quota seats in the published counselling results, state by state.",
    keywords:
      "NRI quota medical colleges, NRI quota MBBS colleges, NRI quota colleges in India, NRI quota BDS colleges, NRI quota MD MS colleges, NRI seat medical college list, NRI quota deemed university",
  });
  if (stream === "mbbs" || !c) return base;

  // A course view is its own page for the searches that name the course.
  const s = c[stream];
  const title =
    stream === "bds"
      ? fitTitle(`NRI Quota BDS Colleges${y}: ${n(s.colleges)} Dental Colleges by State`, `NRI Quota BDS Colleges${y}`)
      : fitTitle(`NRI Quota MD/MS Colleges${y}: ${n(s.colleges)} Colleges, Fees by State`, `NRI Quota MD/MS Colleges${y}`);
  const description =
    stream === "bds"
      ? fitDescription(
          `${n(s.colleges)} dental colleges filled NRI BDS seats in the${y} counselling, across ${n(s.states.length)} states — with who allots each college's NRI seats.`,
        )
      : fitDescription(
          `${n(s.colleges)} MD/MS colleges filled NRI seats in the${y} counselling — ${n(s.privateCount)} private, ${n(s.deemedCount)} deemed — with each college's published NRI fee bracket, state by state.`,
        );
  return { ...base, title, description, alternates: { canonical: hrefOf(stream) } };
}

export default async function NriCollegesPage({ searchParams }: Props) {
  const stream = pick(searchParams.course);
  const data = await getNriColleges();
  if (!data) return <Unavailable />;

  const { mbbs, bds, pg } = data.streams;
  const s = data.streams[stream];
  const meta = STREAM[stream];
  const states = new Set(NRI_STREAMS.flatMap((k) => data.streams[k].states.map((x) => x.state)));

  const mccDeemed = mbbs.byCounselling.find((c) => c.label === "MCC · deemed universities")?.colleges ?? 0;
  const stateBodies = mbbs.byCounselling.filter((c) => !c.label.startsWith("MCC"));
  const govtLine =
    data.govtNriColleges > 0
      ? ` — ${data.govtNriCounselling ? `${data.govtNriCounselling}'s counselling` : "one state's counselling"} lists "Govt. NRI" seats at ${n(data.govtNriColleges)} colleges`
      : "";

  // Words from Admin → Content → Text & numbers ("Page: Colleges with NRI seats"); photo from Admin → Media.
  const [copy, body, heroImage] = await Promise.all([
    pageCopy("page.nri_colleges.hero", { mbbs: n(mbbs.colleges), bds: n(bds.colleges), pg: n(pg.colleges), year: data.year ?? "" }),
    pageCopy("page.nri_colleges.body", {
      mbbs: n(mbbs.colleges),
      year: data.year ?? "",
      mbbs_states: n(mbbs.states.length),
      top_states: list(mbbs.states.slice(0, 3).map((x) => x.state)),
      mcc_deemed: n(mccDeemed),
      state_counsellings: list(stateBodies.slice(0, 6).map((c) => `${c.label.replace(/ · .*$/, "")} (${n(c.colleges)})`)),
      pg_private: n(pg.privateCount),
      pg_deemed: n(pg.deemedCount),
      govt_line: govtLine,
      pg_fee_p10: money(pg.p10Fee),
      pg_fee_p90: money(pg.p90Fee),
      pg_fee_median: money(pg.medianFee),
    }),
    pageHeroImage("page.nri_colleges.hero"),
  ]);

  const faqs = [1, 2, 3, 4, 5]
    .map((i) => ({
      question: body[`faq${i}_q` as keyof typeof body],
      answer: body[`faq${i}_a` as keyof typeof body],
    }))
    .filter((f) => f.question && f.answer);

  const insights: Insight[] =
    stream === "pg"
      ? [
          { icon: "college", label: "Private colleges", value: n(pg.privateCount), note: "with NRI MD/MS seats" },
          { icon: "authority", label: "Deemed universities", value: n(pg.deemedCount), note: "with NRI MD/MS seats" },
          { icon: "spark", label: "Middle NRI fee", value: money(pg.medianFee), note: "median published fee" },
          {
            icon: "compare",
            label: "Most NRI fees",
            value: `${money(pg.p10Fee)} – ${money(pg.p90Fee)}`,
            note: "the middle 80% of published fees",
          },
        ]
      : [
          { icon: "college", label: `${meta.label} colleges`, value: n(s.colleges), note: `across ${n(s.states.length)} states` },
          {
            icon: "authority",
            label: "Through MCC",
            value: n(s.byCounselling.find((c) => c.label === "MCC · deemed universities")?.colleges ?? 0),
            note: "deemed universities",
          },
          {
            icon: "compare",
            label: "State counsellings",
            value: n(s.byCounselling.filter((c) => !c.label.startsWith("MCC")).length),
            note: `that allot NRI ${meta.label} seats`,
          },
          ...(s.states[0]
            ? [{ icon: "people" as const, label: "Most colleges", value: s.states[0].state, note: `${n(s.states[0].colleges.length)} colleges` }]
            : []),
        ];

  const predictor = `/neet-college-predictor?course=${meta.predictor}&seatType=nri`;
  const listed = s.states.flatMap((x) => x.colleges);

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          webPage({ name: `Medical colleges with NRI quota seats — ${meta.label}`, description: copy.subtitle, path: hrefOf(stream) }),
          breadcrumb([
            { name: "Home", path: "/" },
            { name: "NRI quota", path: "/nri-quota" },
            { name: "Colleges with NRI seats", path: PATH },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `${meta.label} colleges with NRI quota seats`,
            numberOfItems: listed.length,
            itemListElement: listed.slice(0, 100).map((c, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: c.name,
              url: `${SITE}${c.href}`,
            })),
          },
          faqPage(faqs),
        ]}
      />

      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: "NRI quota", href: "/nri-quota" }, { label: "Colleges with NRI seats" }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle}
        stats={[
          { label: "MBBS colleges", value: n(mbbs.colleges), note: "with NRI seats" },
          { label: "BDS colleges", value: n(bds.colleges), note: "with NRI seats" },
          { label: "MD/MS colleges", value: n(pg.colleges), note: "with NRI seats" },
          { label: "States", value: n(states.size) },
        ]}
        cta={{ label: copy.cta, href: predictor }}
        telegram="hero_nri_colleges"
        source={copy.source}
        image={heroImage}
        topic="college"
        visual={
          <HeroBars
            title={copy.visual_title}
            caption={`${meta.label} colleges with NRI seats, by state`}
            rows={s.states.slice(0, 7).map((x) => ({
              label: x.state,
              value: x.colleges.length,
              display: `${n(x.colleges.length)} ${x.colleges.length === 1 ? "college" : "colleges"}`,
              href: `${hrefOf(stream)}#${x.slug}`,
            }))}
            footnote={s.states.length > 7 ? `And ${s.states.length - 7} more states — every college is listed below.` : undefined}
          />
        }
      />

      <div className="container-custom py-10 md:py-14">
        {/* ------------------------------ course ------------------------------ */}
        <nav id="list" aria-label="Course" className="flex scroll-mt-28 flex-wrap gap-2">
          {NRI_STREAMS.map((k) => {
            const on = k === stream;
            return (
              <Link
                key={k}
                href={`${hrefOf(k)}#list`}
                aria-current={on ? "page" : undefined}
                className={
                  on
                    ? "inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 px-5 text-[14px] font-bold text-white shadow-glow"
                    : "inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-card px-5 text-[14px] font-semibold text-foreground transition-colors hover:border-primary/50"
                }
              >
                {STREAM[k].label}
                <span className={`tnum text-[12.5px] ${on ? "text-white/80" : "text-muted-foreground"}`}>{n(data.streams[k].colleges)}</span>
              </Link>
            );
          })}
        </nav>

        <InsightCards items={insights} className="mt-6" />

        <p className="mt-6 flex gap-3 rounded-2xl border border-primary/20 bg-primary-soft/50 px-5 py-4 text-[14px] leading-relaxed text-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong" aria-hidden="true" />
          <span>{stream === "pg" ? body.pg_fee_note : body.ug_fee_note}</span>
        </p>

        {/* ------------------------------ colleges ----------------------------- */}
        <section className="mt-12">
          <SectionHead
            icon="college"
            eyebrow={`${meta.label} · NRI quota`}
            title={`${meta.label} colleges with NRI seats, state by state`}
            intro={body.list_intro}
          />

          <nav aria-label="Jump to a state" className="mt-6 flex flex-wrap gap-2">
            {s.states.map((x) => (
              <a
                key={x.slug}
                href={`#${x.slug}`}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:border-primary/50"
              >
                {x.state} <span className="tnum text-muted-foreground">{x.colleges.length}</span>
              </a>
            ))}
          </nav>

          {/* One fold per state, the largest open: every college stays in the HTML, and a
              phone is not asked to scroll 47,000px to reach its own state. */}
          <OpenOnHash />
          <div className="mt-8 space-y-3">
            {s.states.map((x, i) => (
              <details
                key={x.slug}
                id={x.slug}
                open={i === 0}
                className="group/state scroll-mt-28 rounded-3xl border border-border bg-card/60 open:bg-surface-1"
              >
                <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 rounded-3xl px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
                  <h3 className="flex min-w-0 items-baseline gap-2 font-heading text-[1.05rem] font-bold text-foreground md:text-lg">
                    <MapPin className="h-4 w-4 shrink-0 self-center text-primary" aria-hidden="true" />
                    {x.state}
                    <span className="tnum text-[13px] font-normal text-muted-foreground">
                      · {n(x.colleges.length)} {x.colleges.length === 1 ? "college" : "colleges"}
                    </span>
                  </h3>
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open/state:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <ul className="grid gap-3 px-3 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5 lg:grid-cols-3">
                  {x.colleges.map((c) => {
                    const fee = stream === "pg" ? approxFee(c.minFee, c.maxFee)?.replace(/ \/yr\*$/, "") : null;
                    return (
                      <li key={c.slug}>
                        <Link
                          href={c.href}
                          className="group flex h-full flex-col rounded-2xl border border-border bg-card p-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift sm:p-4"
                        >
                          <span className="font-heading text-[15px] font-bold leading-snug text-foreground group-hover:text-primary-strong">
                            {c.name}
                          </span>
                          <span className="mt-2.5 flex flex-wrap gap-1.5">
                            {c.ownership && (
                              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11.5px] font-semibold text-primary-strong">
                                {c.ownership === "deemed" ? "Deemed university" : "Private"}
                              </span>
                            )}
                            {c.counsellings.map((l) => (
                              <span key={l} className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11.5px] text-muted-foreground">
                                {l}
                              </span>
                            ))}
                          </span>
                          {stream === "pg" && (
                            <span className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-[12.5px]">
                              <span>
                                <span className="block text-muted-foreground">NRI branches</span>
                                <span className="tnum font-semibold text-foreground">{n(c.courses.length)}</span>
                              </span>
                              <span>
                                <span className="block text-muted-foreground">Published NRI fee*</span>
                                <span className="tnum font-semibold text-foreground">{fee ?? "Not published"}</span>
                              </span>
                            </span>
                          )}
                          <span className="mt-auto pt-3 text-[11.5px] leading-snug text-muted-foreground">
                            Quota as published: {c.quotas.join(" · ")}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </details>
            ))}
          </div>
          {stream === "pg" && (
            <p className="mt-8 text-[12.5px] leading-relaxed text-muted-foreground">
              *An approximate bracket of the NRI fees this college published across its branches. {body.pg_fee_note}
            </p>
          )}
        </section>

        {/* ------------------------------ who allots ---------------------------- */}
        <section className="mt-14">
          <SectionHead
            icon="authority"
            eyebrow="Who allots the seats"
            title={`The counsellings that fill NRI ${meta.label} seats`}
            intro="An NRI seat is allotted by a counselling, not by the college on its own — so the counselling's rules, dates and documents are the ones that decide whether you get it."
          />
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {s.byCounselling.map((c) => {
              const max = s.byCounselling[0]?.colleges || 1;
              return (
                <li key={c.label} className="rounded-2xl border border-border bg-card px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                    <span className="font-semibold text-foreground">{c.label}</span>
                    <span className="tnum shrink-0 text-muted-foreground">
                      {n(c.colleges)} {c.colleges === 1 ? "college" : "colleges"}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400"
                      style={{ width: `${Math.max(4, (c.colleges / max) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* -------------------------------- faq -------------------------------- */}
        <section className="mt-14">
          <SectionHead icon="help" eyebrow="FAQ" title="NRI quota colleges: common questions" />
          <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
            {faqs.map((f) => (
              <div key={f.question} className="p-5">
                <dt className="font-heading text-[15px] font-bold leading-snug text-foreground md:text-base">{f.question}</dt>
                <dd className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav aria-label="Related" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/nri-quota", t: "NRI quota, explained", d: "Who qualifies and how the quota works" },
            { href: "/nri-quota/fees", t: "NRI quota fees", d: "What NRI seats cost, state by state" },
            { href: "/nri-quota/documents", t: "NRI documents", d: "The papers counselling asks for" },
            { href: predictor, t: "Check your chance", d: "Which NRI seats your rank reaches" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
              <span className="font-heading block text-[15px] font-bold text-foreground">{l.t}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">{l.d}</span>
            </Link>
          ))}
        </nav>
      </div>

      <LeadCapture level={meta.level} source={`NRI colleges (${meta.label})`} />
      <TelegramJoin placement="nri_colleges" />
    </main>
  );
}

function Unavailable() {
  return (
    <main className="container-custom py-24 text-center">
      <h1 className="font-heading text-3xl font-bold text-foreground">Colleges with NRI seats</h1>
      <p className="mx-auto mt-3 max-w-[56ch] text-muted-foreground">
        This list is being refreshed. A counsellor can tell you which colleges hold NRI seats this year.
      </p>
      <Link href="/contact" className="mt-6 inline-flex min-h-[44px] items-center rounded-full bg-primary px-6 font-semibold text-primary-foreground">
        Talk to a counsellor
      </Link>
    </main>
  );
}

