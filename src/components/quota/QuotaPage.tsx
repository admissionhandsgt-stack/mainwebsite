import Link from "@/components/ui/Link";
import { AlertTriangle, TrendingDown } from "lucide-react";
import { getQuotaStates, type QuotaOverview } from "@/lib/quotaQueries";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import SectionHead from "@/components/ui/SectionHead";
import TelegramJoin from "@/components/engage/TelegramJoin";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import StructuredData from "@/components/seo/StructuredData";
import CtaBand from "@/components/ui/CtaBand";
import SeatOverview from "@/components/seats/SeatOverview";
import { summariseSeats } from "@/lib/seatSummary";

const SITE = "https://www.admissionhands.com";

/**
 * No seat rows without a session. These carry a fee as well as a rank, which
 * makes them the most valuable rows on the site to harvest — and the fee is the
 * thing people ring up to ask about, so publishing it was giving away the
 * conversation. A verified crawler still gets the table; see `lib/depth.ts`.
 */

const inr = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

const money = (v: number | null | undefined) => {
  if (v == null) return "—";
  if (v >= 10000000) return `₹${+(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${+(v / 100000).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};

export interface Faq {
  q: string;
  a: string;
}

/**
 * One quota family — NRI or management — with its real ranks and real fees.
 *
 * Shared by both pages because the only thing that differs is which seats are
 * in scope. The shape of the answer is identical, and so is the thing that
 * matters most about it: **the rank and the fee on a row are the same seat.**
 * That is the whole reason these pages exist. People search "NRI quota fees"
 * and "management quota rank" as if they were two separate facts; they are one
 * fact, and reading them apart is how somebody ends up expecting a government
 * fee at a management rank.
 *
 * PG seats carry a published fee. UG seats do not — the source publishes
 * unlabelled fee blocks per college and never says which quota each belongs
 * to, so UG shows a rank and an explicit blank. See `lib/quotaQueries.ts`.
 */
export default async function QuotaPage({
  pg,
  ug,
  faqs,
  intro,
}: {
  pg: QuotaOverview | null;
  ug: QuotaOverview | null;
  faqs: Faq[];
  intro: string;
}) {
  // Aggregates only — the per-college rows stay on the server (lib/depth.ts).
  const pgSummary = pg ? summariseSeats(pg.rowsList) : null;
  const ugSummary = ug ? summariseSeats(ug.rowsList) : null;

  const primary = pg ?? ug;
  if (!primary) return null;
  const family = primary.family;
  // Words from Admin → Content → Text & numbers ("Page: Management quota" / "Page: NRI quota fees").
  const key = family.id === "nri" ? "page.quota_nri.hero" : "page.quota_management.hero";
  const [copy, heroImage, states] = await Promise.all([
    pageCopy(key, { year: pg?.year ?? ug?.year ?? "", colleges: inr(pg?.colleges ?? ug?.colleges) }),
    pageHeroImage(key),
    getQuotaStates(family.id, "pg"),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE },
              {
                "@type": "ListItem",
                position: 2,
                name: family.label,
                item: `${SITE}${family.path}`,
              },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />

      {/* ------------------------------- hero ------------------------------- */}
      <DataHero
        crumbs={[{ label: "Home", href: "/" }, { label: family.label }]}
        eyebrow={copy.eyebrow}
        title={copy.title}
        accent={copy.accent}
        subtitle={copy.subtitle || intro}
        stats={
          pg
            ? [
                { label: "PG colleges", value: inr(pg.colleges) },
                // COUNT(*) of seat_options: one per college, course, quota and category — not seats.
                { label: "Seat options", value: inr(pg.seats), note: "college × course × category, not seats" },
                { label: "Typical fee", value: money(pg.medianFee), note: "median published fee" },
                // The middle 80%, not min–max: the extremes are a ₹1,000 slip and a whole-course
                // dollar figure, and a range built on them describes no seat anybody is offered.
                ...(pg.p10Fee && pg.p90Fee
                  ? [{ label: "Most seats", value: `${money(pg.p10Fee)} – ${money(pg.p90Fee)}`, note: "middle 80% of published fees" }]
                  : []),
              ]
            : []
        }
        cta={{ label: copy.cta, href: "/neet-college-predictor?course=pg" }}
        telegram={`hero_quota_${family.id}`}
        source={copy.source}
        image={heroImage}
        topic="money"
        visual={
          states.length > 0 ? (
            <HeroBars
              title={copy.visual_title}
              caption={`MD/MS ${family.short} seats, colleges by state`}
              rows={states.slice(0, 7).map((s) => ({
                label: s.state,
                value: s.colleges,
                display: `${s.colleges} ${s.colleges === 1 ? "college" : "colleges"}`,
                href: `/md-ms-india/states/${s.slug}`,
                note: s.medianFee ? `median published fee ${money(s.medianFee)}` : undefined,
              }))}
              footnote={states.length > 7 ? `And ${states.length - 7} more states.` : undefined}
            />
          ) : undefined
        }
      />

      <div className="container-custom py-10 md:py-14">
        <p className="flex gap-3 rounded-2xl border border-signal-borderline/30 bg-signal-borderline/[0.07] px-5 py-4 text-[14px] leading-relaxed text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-signal-borderline" aria-hidden="true" />
          <span>
            <span className="font-bold">A larger rank is not a cheaper seat.</span> {family.label}{" "}
            seats stay open to ranks the government quota closed long before — and they cost several
            times more. Which of them your rank reaches — and what each would cost you — is the
            first thing a counsellor works out with you.
          </span>
        </p>

        {/* ------------------------------ PG table ------------------------------ */}
        {pg && (
          <section className="mt-9">
            <SectionHead
              icon="college"
              eyebrow={`MD/MS · ${family.short}`}
              title={`MD/MS ${family.short} seats`}
              intro={`${inr(pg.seats)} seat options across ${inr(pg.colleges)} colleges in ${pg.states} states${pg.year ? `, from the ${pg.year} counselling results` : ""}. A seat option is one college, course, quota and category.`}
            />

            <SeatOverview
              summary={pgSummary!}
              ctaHref={`/neet-college-predictor?course=pg&seatType=${encodeURIComponent(family.id)}`}
              ctaLabel={`See my ${family.short} chances`}
            />
          </section>
        )}

        {/* ------------------------------ UG table ------------------------------ */}
        {ug && (
          <section className="mt-12">
            <SectionHead icon="course" eyebrow={`MBBS · ${family.short}`} title={`MBBS ${family.short} seats`} />
            <p className="mt-3 max-w-[74ch] text-[14px] leading-relaxed text-muted-foreground">
              {inr(ug.seats)} seat options across {inr(ug.colleges)} colleges.{" "}
              <span className="font-semibold text-foreground">
                We do not publish a fee for these, because the source does not.
              </span>{" "}
              The UG counselling data lists several unlabelled fee blocks per college and never says
              which quota each belongs to — so any figure here would be a guess, and a guess about
              an {family.short} fee is the most expensive kind to get wrong.
            </p>

            <SeatOverview
              summary={ugSummary!}
              showFee={false}
              ctaHref={`/neet-college-predictor?course=mbbs&seatType=${encodeURIComponent(family.id)}`}
              ctaLabel={`See my MBBS ${family.short} chances`}
            />
          </section>
        )}

        {/* -------------------------------- faq -------------------------------- */}
        <section className="mt-12">
          <SectionHead icon="help" eyebrow="FAQ" title={`Common questions about ${family.label.toLowerCase()} seats`} />
          <dl className="mt-5 divide-y divide-border rounded-2xl border border-border bg-card">
            {faqs.map((f) => (
              <div key={f.q} className="p-5">
                <dt className="font-heading text-[15px] font-bold leading-snug text-foreground md:text-base">
                  {f.q}
                </dt>
                <dd className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Where to go next, which for this reader is almost always "and what
            does the other quota cost?" */}
        <nav aria-label="Related" className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            family.id === "nri"
              ? { href: "/management-quota", t: "Management quota", d: "The other paid route, and usually the cheaper one" }
              : { href: "/nri-quota/fees", t: "NRI quota", d: "Fewer seats, larger ranks, higher fees" },
            family.id === "nri"
              ? { href: "/nri-quota/colleges", t: "Colleges with NRI seats", d: "Every college that filled one, state by state" }
              : { href: "/md-ms-india/branches", t: "Cutoffs by branch", d: "What each specialisation closed at, everywhere" },
            { href: "/neet-college-predictor?course=pg", t: "Check your rank", d: "Which of these your own rank actually reaches" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <span className="font-heading block text-[15px] font-bold text-foreground">{l.t}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">{l.d}</span>
            </Link>
          ))}
        </nav>

        <p className="mt-8 flex gap-3 rounded-2xl border border-border bg-surface-2 px-5 py-4 text-[13.5px] leading-relaxed text-muted-foreground">
          <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Ranks and fees are what the counselling authorities published, not a forecast and not a
            quotation. A college can revise its fee, and the authority&rsquo;s own notice is the
            document that settles it.
          </span>
        </p>
      </div>

      <CtaBand
        title={`Is a ${family.short} seat actually your best option?`}
        body="These are the most expensive seats in Indian medicine, and for some ranks they are unnecessary. Bring your rank and we will tell you honestly whether the government or state quota reaches far enough first."
        image="/assets/images/hero/medical-admission-counselling-session.avif"
        primaryLabel="Ask a counsellor"
      />
      <TelegramJoin placement={`quota_${family.id}`} />
    </main>
  );
}
