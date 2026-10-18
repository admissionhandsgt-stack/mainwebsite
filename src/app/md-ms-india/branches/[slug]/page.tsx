import { fitTitle, fitDescription } from "@/lib/seoTitle";
import { OG_IMAGE } from "@/lib/ogImage";
import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import { notFound } from "next/navigation";
import { AlertTriangle, Building2, TrendingDown } from "lucide-react";
import { getBranch, getBranches, getBranchStates, DEFAULT_CATEGORY } from "@/lib/branchQueries";
import DataHero from "@/components/hero/DataHero";
import HeroBars from "@/components/hero/HeroBars";
import TelegramJoin from "@/components/engage/TelegramJoin";
import { pageCopy, pageHeroImage } from "@/lib/pageCopy";
import { branchImage } from "@/lib/branchImage";
import StructuredData from "@/components/seo/StructuredData";
import CtaBand from "@/components/ui/CtaBand";
import SeatOverview from "@/components/seats/SeatOverview";
import BranchBands from "@/components/seats/BranchBands";
import { summariseSeats } from "@/lib/seatSummary";

/**
 * Rendered per request, deliberately.
 *
 * The page has to decide whether this caller may see the seat rows, and that
 * is a question about their cookies and their IP — a cached page is the same
 * page for everyone, so it cannot answer it. The queries behind this stay
 * cached for a day (`getBranch`), so what is paid per request is the render.
 */
export const dynamic = "force-dynamic";

/**
 * One PG branch: where it is offered, and what each seat closed at.
 *
 * **Every row is one seat type.** College, quota and category together, so the
 * round-1 close, the widest reach and the fee on a row all describe the same
 * seat. An earlier version collapsed a college into one row and took the best
 * rank, the widest rank and the cheapest fee from wherever each happened to
 * be lowest — which produced rows like "KVG Medical College, reaches rank
 * 2,20,761, ₹7.83 lakh a year", where the seat at that rank is actually
 * management and costs up to ₹1.6 crore. See `lib/branchQueries.ts`.
 *
 * The category is chosen, never averaged over: a candidate is in exactly one,
 * and a general rank beside a reserved one is not a comparison.
 */
const SITE = "https://www.admissionhands.com";

/**
 * Nobody sees a seat row without signing in — except a verified search engine.
 *
 * This used to publish 40. That was a reasonable trade for search, and it is
 * now unnecessary: `canSeeDepthServer()` hands the whole table to a crawler
 * whose IP is in Google's published ranges, and the JSON-LD below declares the
 * gate so doing so is a paywall rather than cloaking. A visitor who has not
 * signed in gets `summariseSeats()` — counts, and per-quota rank and fee
 * ranges — which is a real answer that cannot be turned back into rows.
 */

const inr = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

const money = (v: number | null | undefined) => {
  if (v == null) return "—";
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const b = await getBranch(params.slug);
  if (!b) return { title: "Branch not found | AdmissionHands" };

  // Searched as "dnb obstetrics and gynaecology closing rank", "dnb ent",
  // "md radiology cutoff 2025". The year is the data's own, never a default.
  const y = b.year ? ` ${b.year}` : "";
  const title = fitTitle(
    `${b.name} Cutoff${y}: Closing Rank, Seats & Colleges`,
    `${b.name} Cutoff${y}: Closing Rank & Seats`,
    `${b.name} Cutoff${y}`,
  );
  const description = fitDescription(
    // "Seats" here used to print the number of seat options (college × quota × category),
    // which is not a count of seats. Colleges and states are.
    `${b.name} closing rank${y}: ${inr(b.colleges)} colleges across ${b.states} states — quota by quota and category by category, with fees and stipend. Published counselling results.`,
    `${b.name} closing rank${y}: ${inr(b.colleges)} colleges across ${b.states} states, by quota and category, with fees.`,
    `${b.name} closing ranks across ${inr(b.colleges)} colleges, by quota and category.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/md-ms-india/branches/${b.slug}` },
    openGraph: {
      title,
      description,
      url: `/md-ms-india/branches/${b.slug}`,
      type: "article",
      images: [OG_IMAGE],
    },
  };
}

export default async function BranchPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { category?: string };
}) {
  const category = (searchParams.category ?? DEFAULT_CATEGORY).toUpperCase().slice(0, 24);
  const b = await getBranch(params.slug, category);
  if (!b) notFound();

  // Aggregates only — the per-college rows stay on the server (lib/depth.ts).
  const summary = summariseSeats(b.rowsList);
  // Words from Admin → Content → Text & numbers ("Page: PG branch pages"); photo from Admin → Media.
  const [where, copy, heroImage] = await Promise.all([
    getBranchStates(b.name),
    pageCopy("page.pg_branch.hero", { branch: b.name, year: b.year ?? "the latest" }),
    // The admin's photo for this branch, else the specialty's picture from Admin → PG branches.
    pageHeroImage(`page.pg_branch.${b.slug}.hero`).then((img) => img ?? branchImage(b.name)),
  ]);

  const faqs = [
    {
      q: `What rank is needed for ${b.name}?`,
      a:
        `It depends on the quota as much as on the rank. In the ${b.category} category, round 1 closed ` +
        `from rank ${inr(b.bestRank)} at the most competitive college. Management and NRI seats at the ` +
        `same colleges stay open to far larger ranks, but cost several times more — so a large rank ` +
        `does not mean a cheap seat. Sign in to see your own chance at each college in plain words; ` +
        `your counsellor takes you through the seat-by-seat detail.`,
    },
    {
      q: `How many colleges offer ${b.name}?`,
      a: `${inr(b.colleges)} colleges in ${b.states} states, in the published counselling results${b.year ? ` for ${b.year}` : ""} — ${inr(b.seats)} seat options in all, where a seat option is one college, quota and category.`,
    },
    ...(b.movedCount > 0
      ? [
          {
            q: `Does the ${b.name} cutoff loosen in later rounds?`,
            a:
              `For ${inr(b.movedCount)} of the ${inr(b.seatsInCategory)} ${b.category} seats, yes — a later round reached a ` +
              `worse rank than round 1 did, because upgrades free seats and a freed seat goes to whoever ` +
              `is next. The rest closed tighter or did not move.`,
          },
        ]
      : []),
  ];

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
                name: "MD/MS branches",
                item: `${SITE}/md-ms-india/branches`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: b.name,
                item: `${SITE}/md-ms-india/branches/${b.slug}`,
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
        crumbs={[{ label: "Home", href: "/" }, { label: "MD/MS branches", href: "/md-ms-india/branches" }, { label: b.name }]}
        eyebrow={copy.eyebrow}
        title={b.name}
        subtitle={copy.subtitle}
        stats={[
          { label: "Colleges", value: inr(b.colleges) },
          // A seat option is one college + quota + category in the published results — not a count of seats.
          { label: "Seat options", value: inr(b.seats), note: "college × quota × category" },
          { label: "States", value: inr(b.states) },
          { label: "Categories", value: inr(b.categories.length) },
        ]}
        cta={{ label: copy.cta, href: `/neet-college-predictor?course=pg&branch=${encodeURIComponent(b.name)}` }}
        telegram="hero_pg_branch"
        source={copy.source}
        image={heroImage}
        topic="branch"
        visual={
          where.length > 0 ? (
            <HeroBars
              title={copy.visual_title}
              caption="Colleges offering this branch, by state"
              rows={where.slice(0, 7).map((w) => ({
                label: w.state,
                value: w.colleges,
                display: `${w.colleges} ${w.colleges === 1 ? "college" : "colleges"}`,
                href: `/md-ms-india/states/${w.slug}`,
              }))}
              footnote={where.length > 7 ? `And ${where.length - 7} more states. Every college is listed below.` : undefined}
            />
          ) : undefined
        }
      />

      <div className="container-custom py-10 md:py-14">
        {/* --------------------------- the warning --------------------------- */}
        <p className="flex gap-3 rounded-2xl border border-signal-borderline/30 bg-signal-borderline/[0.07] px-5 py-4 text-[14px] leading-relaxed text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-signal-borderline" aria-hidden="true" />
          <span>
            <span className="font-bold">Read the quota column with the rank.</span> The same college
            often has a government seat closing at a few thousand and a management or NRI seat open
            to two lakh — at many times the fee. A large rank here does not mean a cheap seat.
          </span>
        </p>

        {/* --------------------------- categories --------------------------- */}
        {b.categories.length > 1 && (
          <div className="mt-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Category
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {b.categories.map((c) => (
                <Link
                  key={c}
                  href={`/md-ms-india/branches/${b.slug}?category=${encodeURIComponent(c)}`}
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-[13px] font-semibold transition-colors ${
                    c === b.category
                      ? "border-primary bg-primary-soft text-primary-strong dark:text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ----------------------------- the seats ----------------------------- */}
        <section className="mt-8">
          <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">
            {b.name} seats in the {b.category} category
          </h2>
          <p className="mt-1.5 max-w-[72ch] text-[14px] leading-relaxed text-muted-foreground">
            How this branch fills, quota by quota, across every college that offers it. Which colleges your
            own rank reaches — and how likely each one is — is shown after a free sign-in.
          </p>

          {b.rowsList.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-[14px] text-muted-foreground">
              No {b.category} seats are published for this branch. Try another category above.
            </p>
          ) : (
            <SeatOverview
              summary={summary}
              ctaHref={`/neet-college-predictor?course=pg&category=${encodeURIComponent(b.category)}&branch=${encodeURIComponent(b.name)}`}
              ctaLabel={`See my chance in ${b.name}`}
            />
          )}
          {b.rowsList.length > 0 && (
            <BranchBands
              rows={b.rowsList}
              branch={b.name}
              category={b.category}
              ctaHref={`/neet-college-predictor?course=pg&category=${encodeURIComponent(b.category)}&branch=${encodeURIComponent(b.name)}`}
            />
          )}

        </section>

        {/* ------------------------------- faq ------------------------------- */}
        <section className="mt-12">
          <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">
            Common questions about {b.name}
          </h2>
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

        <p className="mt-8 flex gap-3 rounded-2xl border border-border bg-surface-2 px-5 py-4 text-[13.5px] leading-relaxed text-muted-foreground">
          <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            These are historical closing ranks, not a forecast. They say where the cut actually
            landed in published rounds; nothing here predicts what this year will do.
          </span>
        </p>

        <Link
          href="/md-ms-india/branches"
          className="mt-8 inline-flex items-center gap-2 text-[15px] font-semibold text-primary"
        >
          <Building2 className="h-4 w-4" aria-hidden="true" />
          All MD/MS branches
        </Link>
      </div>

      <CtaBand
        title={`Where does ${b.name} actually sit for your rank?`}
        body="The table above is every seat, not your shortlist. Bring your rank, category and quota and our counsellors will tell you which of these are realistic, which are a stretch, and the order to put them in."
        image="/assets/images/hero/medical-admission-counselling-session.avif"
        primaryLabel="Ask a counsellor"
      />
      <TelegramJoin placement="pg_branch" />
    </main>
  );
}
