import { OG_IMAGE } from "@/lib/ogImage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { collegeFaqs, collegeJsonLd, collegePlace } from "@/lib/collegeSeo";
import CollegeFaq from "@/components/colleges/CollegeFaq";
import { branchSlug } from "@/lib/branchSlug";
import Link from "next/link";
import Image from "next/image";
import { BedDouble, GraduationCap, Landmark, MapPin, Banknote, TrendingUp, TrendingDown } from "lucide-react";
import {
  getCollege,
  getCollegeCutoffs,
  getCollegeFees,
  getSimilarColleges,
  getCollegeSlugs,
} from "@/lib/collegeQueries";
import CollegeRankCheck from "@/components/colleges/CollegeRankCheck";
import CollegeCutoffs from "@/components/colleges/CollegeCutoffs";
import { canSeeDepthServer } from "@/lib/depth";
import { summariseCollegeCutoffs } from "@/lib/seatSummary";
import CtaBand from "@/components/ui/CtaBand";
import PhotoCredit from "@/components/ui/PhotoCredit";
import { getPgCollegePhoto } from "@/lib/content";

// The busiest pages are built at deploy time; the long tail is generated on
// first request and then cached, so a 2,168-page build stays quick.
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
 * The hero photograph, or none.
 *
 * There used to be a seven-image rotation hashed from the slug here, and it did
 * not even consult the college's own picture — the curated table holds one for
 * 56 of these and the page showed a stock image anyway. All seven were
 * AI-generated and three carried an institution's name on the building, so
 * "ALL INDIA INSTITUTE OF MEDICAL SCIENCES, NEW DELHI" headed roughly 310 other
 * colleges' pages.
 *
 * The rule is `CollegeVisual`'s: a photograph somebody has verified is this
 * college, or nothing. The gradients below were always doing most of the work.
 */
const money = (n: number | null) => {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};
const num = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-IN"));

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const college = await getCollege(params.slug, "pg");
  if (!college) return { title: "College not found | AdmissionHands" };
  // `collegePlace` drops a place already in the name, which was producing
  // "SMS Medical College, Jaipur, Jaipur, Rajasthan" on every such page.
  const where = collegePlace(college);
  // No brand suffix: the college's own name is what is being searched, and
  // "| AdmissionHands" was pushing these past the ~60 characters Google shows.
  const title = `${college.name} — MD/MS Cutoff & Fees 2026`;
  const description = `Closing ranks, fee structure, stipend and seat matrix for ${college.name}${
    where ? `, ${where}` : ""
  }. ${college.seatsTotal ?? ""} PG seats across ${college.branchCount ?? ""} branches, from published counselling data.`;

  return {
    title,
    description,
    alternates: { canonical: `/md-ms-india/colleges/${college.slug}` },
    // These links get shared into WhatsApp groups constantly, and without
    // these tags they unfurl as a bare URL.
    openGraph: {
      title,
      description,
      url: `/md-ms-india/colleges/${college.slug}`,
      type: "article",
      images: [OG_IMAGE],
    },
  };
}

export default async function CollegePage({ params }: { params: { slug: string } }) {
  const college = await getCollege(params.slug, "pg");
  if (!college) notFound();

  const [cutoffs, fees, similar, access, photo] = await Promise.all([
    getCollegeCutoffs(params.slug, "pg"),
    getCollegeFees(params.slug, "pg"),
    getSimilarColleges(params.slug, "pg"),
    canSeeDepthServer(),
    getPgCollegePhoto(params.slug),
  ]);

  // All of the rows, or none of them. A slice is what this used to do.
  const cutoffRows = access.full ? cutoffs : [];
  const { summary: cutoffSummary, years: cutoffYears } = summariseCollegeCutoffs(cutoffs);

  const where = collegePlace(college);
  const bestRank = cutoffs.reduce<number | null>(
    (m, c) => (c.r1Latest != null && (m == null || c.r1Latest < m) ? c.r1Latest : m),
    null,
  );
  const minFee = fees.reduce<number | null>(
    (m, f) => (f.feeInr != null && (m == null || f.feeInr < m) ? f.feeInr : m),
    null,
  );
  const maxStipend = fees.reduce<number | null>(
    (m, f) => (f.stipendY1Inr != null && (m == null || f.stipendY1Inr > m) ? f.stipendY1Inr : m),
    null,
  );

  // Three years of stipend against fees, the number families actually care about.
  const threeYearNet =
    minFee != null && maxStipend != null ? maxStipend * 36 - minFee * 3 : null;

  // Answered from this college's own numbers, and rendered on the page as
  // well as in the markup — see the note in `lib/collegeSeo.ts` about what
  // FAQ schema does and does not buy since Google restricted it.
  // Distinct branches, for the sidebar. Sorted by the tightest cut, so the
  // list opens with what this college is known for.
  const branches = Array.from(
    cutoffs.reduce((m, c) => {
      const best = m.get(c.course);
      if (c.r1Latest != null && (best == null || c.r1Latest < best)) m.set(c.course, c.r1Latest);
      else if (!m.has(c.course)) m.set(c.course, null);
      return m;
    }, new Map<string, number | null>()),
  ).sort((a, b) => (a[1] ?? Infinity) - (b[1] ?? Infinity));

  const faqs = collegeFaqs(college, cutoffs, fees, "pg");
  const jsonLd = collegeJsonLd({ college, level: "pg", faqs });

  return (
    <main className="min-h-screen bg-background">
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden bg-slate-950">
        {photo && (
          <Image
            src={photo.imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-45"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/50" />
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="ambient-blob animate-drift -left-24 -top-32 h-[24rem] w-[24rem] bg-primary/25" />
        </div>
        <PhotoCredit
          subject={photo ? college.name : null}
          attribution={photo?.imageAttribution}
          license={photo?.imageLicense}
          className="absolute bottom-1.5 right-2 z-10"
        />

        <div className="container-custom relative z-10 py-12 md:py-16">
          <nav className="mb-5 text-[13px] text-slate-400" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-cyan-300">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/md-ms-india" className="hover:text-cyan-300">MD/MS</Link>
            <span className="mx-2">›</span>
            <Link href="/md-ms-india/colleges" className="hover:text-cyan-300">Colleges</Link>
            <span className="mx-2">›</span>
            <span className="text-slate-200">{college.name}</span>
          </nav>

          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-cyan-200 backdrop-blur-sm">
              {college.ownership}
            </span>
            {college.establishedYear && (
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-200 backdrop-blur-sm">
                Est. {college.establishedYear}
              </span>
            )}
          </div>

          <h1 className="font-heading max-w-[20ch] text-[clamp(1.9rem,4.4vw,3.2rem)] font-extrabold leading-[1.06] tracking-[-0.032em] text-white">
            {college.name}
          </h1>
          {(where || college.university) && (
            <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-slate-300">
              {where && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {where}
                </span>
              )}
              {college.university && <span className="block sm:inline sm:before:mx-2 sm:before:content-['·']">{college.university}</span>}
            </p>
          )}

          <div className="mt-9 grid grid-cols-2 gap-5 border-t border-white/15 pt-7 sm:gap-8 md:max-w-4xl md:grid-cols-5">
            {[
              { icon: GraduationCap, v: num(college.seatsTotal), l: "PG seats" },
              { icon: Landmark, v: num(college.branchCount), l: "Branches" },
              { icon: Banknote, v: money(minFee), l: "Fee from / yr" },
              { icon: Banknote, v: money(maxStipend), l: "Stipend / month" },
              { icon: BedDouble, v: num(college.beds), l: "Hospital beds" },
            ].map((s) => (
              <div key={s.l}>
                <div className="tnum font-heading text-2xl font-extrabold leading-none text-white md:text-[28px]">{s.v}</div>
                <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-custom py-10 md:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            {/* -------- Cutoffs -------- */}
            <section>
              <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">Closing ranks by branch</h2>
              <p className="mt-1.5 text-[15px] text-muted-foreground">
                As published by the counselling authority. &ldquo;Widest&rdquo; is the furthest the cut reached in
                any round that year — not the last round, which can close far tighter.
              </p>

              {cutoffs.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-border bg-card p-8 text-center">
                  <p className="text-[15px] text-muted-foreground">
                    No closing rank has been published for this college in the years we hold. Its seat and fee data
                    is below.
                  </p>
                </div>
              ) : (
                <CollegeCutoffs
                  slug={params.slug}
                  level="pg"
                  collegeName={college.name}
                  total={cutoffs.length}
                  rows={cutoffRows}
                  summary={cutoffSummary}
                  years={cutoffYears}
                />
              )}
            </section>

            {/* -------- Fees -------- */}
            {fees.length > 0 && (
              <section className="mt-12">
                <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">Fees, hostel and stipend</h2>
                <p className="mt-1.5 text-[15px] text-muted-foreground">
                  Published per seat. Where a figure is missing the authority did not publish it — we do not
                  estimate one.
                </p>
                <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
                  <table className="w-full min-w-[640px] border-collapse">
                    <thead>
                      <tr className="bg-surface-2">
                        <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Branch</th>
                        <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Quota</th>
                        <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fee</th>
                        <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hostel</th>
                        <th scope="col" className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stipend / mo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.slice(0, 40).map((f, i) => (
                        <tr key={i} className="border-t border-border transition-colors hover:bg-surface-2">
                          <td className="px-4 py-3 text-[14px] font-medium text-foreground">{f.course}</td>
                          <td className="px-4 py-3 text-[13px] text-muted-foreground">{f.quota}</td>
                          <td className="tnum px-4 py-3 text-right text-[14px] text-foreground">
                            {f.feeInr != null ? money(f.feeInr) : <span className="text-muted-foreground">{f.feeNullReason ?? "Not published"}</span>}
                          </td>
                          <td className="tnum px-4 py-3 text-right text-[14px] text-muted-foreground">{money(f.hostelMinInr)}</td>
                          <td className="tnum px-4 py-3 text-right text-[14px] font-semibold text-signal-safe">{money(f.stipendY1Inr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>

          {/* ---------------- Sidebar ---------------- */}
          <aside className="space-y-5">
            <CollegeRankCheck collegeName={college.name} />

            {threeYearNet != null && (
              <div className="rounded-2xl border border-signal-safe/30 bg-signal-safe/[0.06] p-5">
                <h2 className="font-heading text-[15px] font-bold text-foreground">Three years, net</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Best stipend here against the lowest published fee.
                </p>
                <div className="tnum font-heading mt-3 text-3xl font-extrabold text-signal-safe">
                  {threeYearNet >= 0 ? "+" : "−"}
                  {money(Math.abs(threeYearNet))}
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                  {threeYearNet >= 0
                    ? "The stipend outweighs the fee over the course."
                    : "The fee outweighs the stipend over the course."}{" "}
                  Hostel and one-time deposits are not included.
                </p>
              </div>
            )}

            {branches.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-heading text-[15px] font-bold text-foreground">
                  Branches here
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  See what each one closed at across every college.
                </p>
                <ul className="mt-3 space-y-1">
                  {branches.slice(0, 14).map(([name]) => (
                    <li key={name}>
                      <Link
                        href={`/md-ms-india/branches/${branchSlug(name)}`}
                        className="block truncate rounded-lg px-2 py-2 text-[14px] text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary-strong dark:hover:text-primary"
                      >
                        {name}
                      </Link>
                    </li>
                  ))}
                </ul>
                {branches.length > 14 && (
                  <Link
                    href="/md-ms-india/branches"
                    className="mt-2 block px-2 text-[14px] font-semibold text-primary"
                  >
                    All {branches.length} branches
                  </Link>
                )}
              </div>
            )}

            {similar.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-heading text-[15px] font-bold text-foreground">Others in {college.state}</h2>
                <ul className="mt-3 space-y-1">
                  {similar.map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={`/md-ms-india/colleges/${s.slug}`}
                        className="block truncate rounded-lg px-2 py-2 text-[14px] text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary-strong dark:hover:text-primary"
                      >
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/md-ms-india/colleges"
                  className="mt-2 block px-2 text-[14px] font-semibold text-primary"
                >
                  All PG colleges
                </Link>
              </div>
            )}
          </aside>
        </div>

        <CollegeFaq faqs={faqs} />
      </div>

      <CtaBand
        title={`Is ${college.name.split(",")[0]} the right pick for your rank?`}
        body="The numbers above are the same ones our counsellors work from. Bring your rank and we will tell you where this college should sit in your preference order — or whether it should be on the list at all."
        image="/assets/images/hero/medical-admission-counselling-session.avif"
        primaryLabel="Ask a counsellor"
      />
    </main>
  );
}
