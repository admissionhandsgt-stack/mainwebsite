import { OG_IMAGE } from "@/lib/ogImage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { collegeFaqs, collegeJsonLd, collegePlace } from "@/lib/collegeSeo";
import CollegeFaq from "@/components/colleges/CollegeFaq";
import Link from "next/link";
import Image from "next/image";
import PhotoCredit from "@/components/ui/PhotoCredit";
import { GraduationCap, Landmark, MapPin, Banknote, Users } from "lucide-react";
import {
  getCollege,
  getCollegeCutoffs,
  getCollegeFees,
  getSimilarColleges,
  getCollegeSlugs,
} from "@/lib/collegeQueries";
import { getUgCollegeExtras } from "@/lib/content";
import CollegeRankCheck from "@/components/colleges/CollegeRankCheck";
import CollegeCutoffs from "@/components/colleges/CollegeCutoffs";
import { canSeeDepthServer } from "@/lib/depth";
import { summariseCollegeCutoffs } from "@/lib/seatSummary";
import CtaBand from "@/components/ui/CtaBand";

/**
 * Rendered per request.
 *
 * These pages carry the search traffic and were pre-rendered and cached for
 * a day, which is why they only ever published a fixed eight-row preview:
 * one cached page cannot be two different answers. Closing the table
 * entirely to visitors while keeping it readable by a verified crawler is a
 * per-request decision, so the page has to be one. Every query behind it is
 * still cached, so the database is not re-read.
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

const money = (n: number | null) => {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};
const num = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-IN"));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const college = await getCollege(params.slug, "ug");
  if (!college) return { title: "College not found | AdmissionHands" };

  const extras = await getUgCollegeExtras(params.slug);
  // `collegePlace` drops a place already in the name, so these stop reading
  // "Government Medical College, Kottayam, Kottayam, Kerala".
  const where = collegePlace({ ...college, city: extras?.city ?? college.city });

  return {
    // No brand suffix: the college's own name is what is searched, and the
    // suffix pushed these past the ~60 characters Google shows.
    title: `${college.name} — MBBS Cutoff & Fees 2026`,
    description:
      `NEET UG closing ranks, fees and seat details for ${college.name}` +
      `${where ? `, ${where}` : ""}. Published counselling data, round by round.`,
    alternates: { canonical: `/mbbs-india/colleges/${college.slug}` },
    openGraph: {
      title: `${college.name} — MBBS Cutoff & Fees`,
      description: `NEET UG closing ranks and fees for ${college.name}, from published counselling data.`,
      url: `/mbbs-india/colleges/${college.slug}`,
      type: "article",
      images: [OG_IMAGE],
    },
  };
}

export default async function UgCollegePage({ params }: { params: { slug: string } }) {
  const college = await getCollege(params.slug, "ug");
  if (!college) notFound();

  const [cutoffs, fees, similar, extras, access] = await Promise.all([
    getCollegeCutoffs(params.slug, "ug"),
    getCollegeFees(params.slug, "ug"),
    getSimilarColleges(params.slug, "ug"),
    getUgCollegeExtras(params.slug),
    canSeeDepthServer(),
  ]);

  // All of the rows, or none of them. A slice is what this used to do.
  const cutoffRows = access.full ? cutoffs : [];
  const { summary: cutoffSummary, years: cutoffYears } = summariseCollegeCutoffs(cutoffs);

  const where = [extras?.city, college.state].filter(Boolean).join(", ");

  const bestRank = cutoffs.reduce<number | null>(
    (m, c) => (c.r1Latest != null && (m == null || c.r1Latest < m) ? c.r1Latest : m),
    null,
  );

  // UG fee blocks carry no quota in the source, so a range is the only honest
  // way to show them — see the UG import notes in CLAUDE.md.
  const feeValues = fees.map((f) => f.feeInr).filter((v): v is number => v != null);
  const minFee = feeValues.length ? Math.min(...feeValues) : null;
  const maxFee = feeValues.length ? Math.max(...feeValues) : null;

  const courses = Array.from(new Set(cutoffs.map((c) => c.course))).sort();
  const latestYear = cutoffs.reduce<number | null>(
    (m, c) => (c.latestYear != null && (m == null || c.latestYear > m) ? c.latestYear : m),
    null,
  );

  // Answered from this college's own numbers, and rendered on the page as
  // well as in the markup — see the note in `lib/collegeSeo.ts` about what
  // FAQ schema does and does not buy since Google restricted it.
  const faqs = collegeFaqs(college, cutoffs, fees, "ug");
  const jsonLd = collegeJsonLd({ college, level: "ug", faqs });

  const facts = [
    { icon: MapPin, label: "Location", value: where || "—" },
    { icon: Landmark, label: "Type", value: extras?.collegeType ?? college.ownership ?? "—" },
    { icon: Users, label: "MBBS intake", value: num(extras?.intake ?? null) },
    { icon: GraduationCap, label: "Established", value: college.establishedYear ? String(college.establishedYear) : "—" },
  ];

  return (
    <main className="min-h-screen bg-background">
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
              alt=""
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
            <Link href="/mbbs-india/colleges" className="hover:text-white">Colleges</Link>
          </nav>

          <h1 className="font-heading max-w-[24ch] text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-tight text-white">
            {college.name}
          </h1>
          {where && <p className="mt-2 text-[15px] text-white/70">{where}</p>}

          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/50">
                  <f.icon className="h-3.5 w-3.5" />
                  {f.label}
                </dt>
                <dd className="tnum mt-1 truncate text-[17px] font-bold text-white">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="container-custom py-10 md:py-14">
        {cutoffs.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
            <h2 className="font-heading text-lg font-bold text-foreground">
              No published closing rank for this college yet
            </h2>
            <p className="mx-auto mt-2 max-w-[48ch] text-[15px] leading-relaxed text-muted-foreground">
              It is a recognised college, but the counselling authority has not published a round we
              hold for it. The rank checker below works across every college we do have.
            </p>
            <Link
              href="/neet-college-predictor?course=mbbs"
              className="mt-5 inline-block rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-glow"
            >
              Check your rank across all colleges
            </Link>
          </div>
        ) : (
          <>
            {/* ---------------- the headline numbers ---------------- */}
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Best round 1 close{latestYear ? ` · ${latestYear}` : ""}
                </div>
                <div className="tnum mt-1 text-3xl font-extrabold text-foreground">{num(bestRank)}</div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  The tightest seat here — others go further down.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Courses published
                </div>
                <div className="tnum mt-1 text-3xl font-extrabold text-foreground">{courses.length}</div>
                <p className="mt-1 truncate text-[12px] text-muted-foreground">{courses.join(", ") || "—"}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Banknote className="h-3.5 w-3.5" />
                  Fee per year
                </div>
                <div className="tnum mt-1 text-3xl font-extrabold text-foreground">
                  {minFee == null
                    ? "—"
                    : minFee === maxFee
                      ? money(minFee)
                      : `${money(minFee)} – ${money(maxFee)}`}
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {feeValues.length > 1
                    ? "A range: the source does not say which quota each fee belongs to."
                    : "As published by the source."}
                </p>
              </div>
            </section>

            {/* ---------------- rank check ---------------- */}
            <section className="mt-8">
              <CollegeRankCheck collegeName={college.name} level="ug" />
            </section>

            {/* ---------------- the seats ---------------- */}
            <section className="mt-10">
              <h2 className="font-heading text-xl font-bold text-foreground">
                Every published seat at {college.name}
              </h2>
              <p className="mt-1 max-w-[70ch] text-[14px] leading-relaxed text-muted-foreground">
                One row per course, quota and category. &ldquo;Widest&rdquo; is how far down the list
                the seat actually went that year — later rounds can close tighter than earlier ones,
                so the last round is not the widest.
              </p>

              <CollegeCutoffs
                slug={params.slug}
                level="ug"
                collegeName={college.name}
                showCounselling
                total={cutoffs.length}
                rows={cutoffRows}
                summary={cutoffSummary}
                years={cutoffYears}
              />
            </section>
          </>
        )}

        {/* ---------------- similar colleges ---------------- */}
        {similar.length > 0 && (
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground">Similar colleges</h2>
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
          </section>
        )}

        <CollegeFaq faqs={faqs} />
      </div>

      <CtaBand
        title={`Is ${college.name} within reach of your rank?`}
        body="Send us your NEET UG rank, category and domicile. We check it against every published round for this college and the ones around it, and tell you where it actually sits."
        image="/assets/images/hero/medical-admission-counselling-session.avif"
        primaryLabel="Get a free rank check"
      />
    </main>
  );
}
