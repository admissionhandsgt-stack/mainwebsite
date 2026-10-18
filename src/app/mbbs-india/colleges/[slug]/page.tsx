import { OG_IMAGE } from "@/lib/ogImage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { collegeFaqs, collegeJsonLd } from "@/lib/collegeSeo";
import CollegeFaq from "@/components/colleges/CollegeFaq";
import Link from "@/components/ui/Link";
import Image from "next/image";
import PhotoCredit from "@/components/ui/PhotoCredit";
import { getSimilarColleges } from "@/lib/collegeQueries";
import { getMbbsStates } from "@/lib/content";
import { loadCollegePage, collegeTitle, collegeDescription } from "@/lib/collegeSnippet";
import CollegeGlance from "@/components/colleges/CollegeGlance";
import NmcRecord from "@/components/colleges/NmcRecord";
import { extractStateName } from "@/lib/stateQueries";
import CollegeRankCheck from "@/components/colleges/CollegeRankCheck";
import { generalBands } from "@/lib/cutoffBands";
import CutoffBands from "@/components/colleges/CutoffBands";
import CounsellorEdge from "@/components/home/CounsellorEdge";
import TelegramJoin from "@/components/engage/TelegramJoin";
import CtaBand from "@/components/ui/CtaBand";
import TrackView from "@/components/analytics/TrackView";

/**
 * Rendered per request. Since 2026-10-12 the page is the same for everybody —
 * no closing rank for this college is shown to anyone (see lib/depth.ts) — so
 * it could be cached again; it stays dynamic until the (site) route group
 * moves the host check out of the root layout (CLAUDE.md, "Still open" 1).
 */
export const dynamic = "force-dynamic";

/**
 * The 200 most-searched colleges are built ahead of time; the remaining ~1,500
 * are rendered on first request and then cached for a day. Building all 1,727
 * at once would add minutes to every deploy for pages most of which are never
 * visited in a given week.
 */

/**
 * The header photograph, or none.
 *
 * There used to be a six-image rotation hashed from the slug here. All six were
 * AI-generated and three of them carried an institution's name on the building:
 * "ALL INDIA INSTITUTE OF MEDICAL SCIENCES, NEW DELHI", "ST. JUDE GRAND
 * HOSPITAL", "SWAMI VIVEKANANDA MEDICAL COLLEGE AND HOSPITAL". Hashed across
 * 1,727 colleges, that put AIIMS Delhi's name at the top of roughly 290 other
 * colleges' pages — and these are the pages that carry the site's search
 * traffic, 3,479 of ~3,700 sitemap URLs.
 *
 * So the rule is `CollegeVisual`'s: a photograph somebody has verified is this
 * college, or nothing. The gradient below was always doing most of the work,
 * and a dark header claims nothing.
 */

const num = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-IN"));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await loadCollegePage(params.slug, "ug");
  if (!data) return { title: "College not found | AdmissionHands" };
  // Short name + city + "<course> Cutoff <year>, Fees & Seats", and a
  // description of the numbers the summary box shows (lib/collegeSnippet.ts).
  // No brand suffix: the college's own name is what is searched.
  const title = collegeTitle(data.summary);
  const description = collegeDescription(data.summary);
  return {
    title,
    description,
    alternates: { canonical: `/mbbs-india/colleges/${data.college.slug}` },
    openGraph: {
      title,
      description,
      url: `/mbbs-india/colleges/${data.college.slug}`,
      type: "article",
      images: [OG_IMAGE],
    },
  };
}

export default async function UgCollegePage({ params }: { params: { slug: string } }) {
  const data = await loadCollegePage(params.slug, "ug");
  if (!data) notFound();
  const { college, cutoffs, fees, extras, nmc, summary: s } = data;
  // The state page, linked from the breadcrumb (see the PG college page).
  const [states, similar] = await Promise.all([getMbbsStates(), getSimilarColleges(params.slug, "ug", 5)]);
  const stateSlug = states.find((st) => extractStateName(st) === college.state)?.slug ?? null;

  const where = [extras?.city, college.state].filter(Boolean).join(", ");
  const quotas = Array.from(new Set(cutoffs.map((c) => c.quota).filter(Boolean)));
  const counsellings = Array.from(new Set(cutoffs.map((c) => c.counselling).filter(Boolean))) as string[];
  const bands = generalBands(cutoffs, 8);
  const courseLabel = s.course;

  const courses = Array.from(new Set(cutoffs.map((c) => c.course))).sort();
  const latestYear = cutoffs.reduce<number | null>(
    (m, c) => (c.latestYear != null && (m == null || c.latestYear > m) ? c.latestYear : m),
    null,
  );

  // Answered from this college's own numbers, and rendered on the page as
  // well as in the markup — see the note in `lib/collegeSeo.ts` about what
  // FAQ schema does and does not buy since Google restricted it.
  const faqs = collegeFaqs(college, cutoffs, fees, "ug");
  const jsonLd = collegeJsonLd({
    college,
    level: "ug",
    faqs,
    shortName: s.short,
    state: stateSlug && college.state ? { name: `MBBS in ${college.state}`, path: `/mbbs-india/${stateSlug}` } : null,
  });
  // The predictor opens on this college's course (it has MBBS, BDS and PG).
  const predictorCourse = courseLabel === "BDS" ? "bds" : "mbbs";

  return (
    <main className="min-h-screen bg-background">
      <TrackView event="college_viewed" props={{ college_slug: params.slug, course: "mbbs", state: college.state }} />
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* ---------------- header ---------------- */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-slate-950">
          {extras?.imageUrl && (
            <Image
              src={extras.imageUrl}
              alt={`${college.name} campus`}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          )}
          <div
            className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/60"
            aria-hidden="true"
          />
          <PhotoCredit
            subject={extras?.imageUrl ? college.name : null}
            attribution={extras?.imageAttribution}
            license={extras?.imageLicense}
            className="absolute bottom-1.5 right-2"
          />
        </div>

        <div className="container-custom relative z-10 py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-white/60">
            <Link href="/mbbs-india" className="hover:text-white">MBBS India</Link>
            <span className="mx-2">/</span>
            {stateSlug && college.state ? (
              <>
                <Link href={`/mbbs-india/${stateSlug}`} className="hover:text-white">
                  MBBS in {college.state}
                </Link>
                <span className="mx-2">/</span>
              </>
            ) : null}
            <Link href="/mbbs-india/colleges" className="hover:text-white">Colleges</Link>
          </nav>

          <h1 className="font-heading max-w-[24ch] text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-tight text-white">
            {s.short}
          </h1>
          {s.official !== s.short && <p className="mt-2 max-w-[70ch] text-[14px] text-white/60">{s.official}</p>}
          {where && <p className="mt-1.5 text-[15px] text-white/70">{where}</p>}

          <CollegeGlance s={s} />
        </div>
      </header>

      <div className="container-custom py-10 md:py-14">
        {/* ---------------- your chance, straight under the summary ---------------- */}
        <CollegeRankCheck collegeName={s.short} course={predictorCourse} slug={college.slug} wide />

        {/* ---------------- the headline facts ---------------- */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Courses{latestYear ? ` · ${latestYear} counselling` : ""}
            </div>
            <div className="tnum mt-1 text-3xl font-extrabold text-foreground">{courses.length || "—"}</div>
            <p className="mt-1 truncate text-[12px] text-muted-foreground">{courses.join(", ") || "—"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Seat options
            </div>
            <div className="tnum mt-1 text-3xl font-extrabold text-foreground">{num(cutoffs.length || null)}</div>
            <p className="mt-1 truncate text-[12px] text-muted-foreground">
              {quotas.length
                ? `${quotas.length} quota${quotas.length === 1 ? "" : "s"}: ${quotas.slice(0, 3).join(", ")}`
                : "Course × quota × category"}
            </p>
          </div>
        </section>

        {/* ---------------- NMC's own record ---------------- */}
        <NmcRecord nmc={nmc} level="ug" />

        {bands.length > 0 && (
          <div className="mt-8">
            <CutoffBands
              rows={bands}
              collegeName={college.name}
              level="ug"
              ctaHref={`/neet-college-predictor?course=${predictorCourse}`}
            />
          </div>
        )}

        {/* ---------------- how admission works, and your chance ---------------- */}
        <section className="mt-8">
          <div className="rounded-2xl border border-border bg-surface-2 p-6">
            <h2 className="font-heading text-xl font-bold text-foreground">How admission here works</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[14.5px] leading-relaxed text-muted-foreground">
              {counsellings.length > 0 && (
                <li>
                  Seats are allotted through{" "}
                  <b className="text-foreground">{counsellings.slice(0, 3).join(", ")}</b>
                  {counsellings.length > 3 ? ` and ${counsellings.length - 3} more` : ""}.
                </li>
              )}
              {quotas.length > 0 && (
                <li>
                  Quotas published: <b className="text-foreground">{quotas.slice(0, 6).join(", ")}</b>
                  {quotas.length > 6 ? ` and ${quotas.length - 6} more` : ""} — each closes at a very different
                  rank and fee.
                </li>
              )}
              <li>
                Your chance depends on your rank, category, domicile and the round. Later rounds often reach much
                further than round 1 — which is where families lose a seat by freezing too early.
              </li>
            </ul>
          </div>
        </section>

        <div className="mt-12">
          <CounsellorEdge compact />
        </div>

        <TelegramJoin placement="college_ug" bare className="mt-6" />

        {/* ---------------- similar colleges ---------------- */}
        {similar.length > 0 && (
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Other {courseLabel} colleges{college.state ? ` in ${college.state}` : ""}
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => (
                <Link
                  key={s.slug}
                  href={`/mbbs-india/colleges/${s.slug}`}
                  className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                >
                  <div className="font-semibold text-foreground">{s.name}</div>
                  <div className="mt-0.5 text-[13px] text-muted-foreground">{s.state ?? "—"}</div>
                </Link>
              ))}
            </div>
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px]">
              {stateSlug && college.state && (
                <Link href={`/mbbs-india/${stateSlug}`} className="font-semibold text-primary hover:underline">
                  All MBBS colleges in {college.state}
                </Link>
              )}
              <Link href={courseLabel === "BDS" ? "/bds-india" : "/neet-ug-cutoff"} className="font-semibold text-primary hover:underline">
                {courseLabel === "BDS" ? "BDS cutoff and colleges in India" : "NEET UG cutoff by category"}
              </Link>
            </p>
          </section>
        )}

        <CollegeFaq faqs={faqs} />
      </div>

      <CtaBand
        title={`Is ${s.short} within reach of your rank?`}
        body="Send us your NEET UG rank, category and domicile. We check it against every published round for this college and the ones around it, and tell you where it actually sits."
        image="/assets/images/hero/medical-admission-counselling-session.avif"
        primaryLabel="Get a free rank check"
      />
    </main>
  );
}
