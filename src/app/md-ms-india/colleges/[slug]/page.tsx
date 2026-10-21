import { getPgStates } from "@/lib/pgStateQueries";
import { OG_IMAGE } from "@/lib/ogImage";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { collegeFaqs, collegeJsonLd, collegePlace } from "@/lib/collegeSeo";
import CollegeFaq from "@/components/colleges/CollegeFaq";
import { branchSlug } from "@/lib/branchSlug";
import Link from "@/components/ui/Link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { getSimilarColleges } from "@/lib/collegeQueries";
import { loadCollegePage, collegeTitle, collegeDescription } from "@/lib/collegeSnippet";
import CollegeGlance from "@/components/colleges/CollegeGlance";
import NmcRecord from "@/components/colleges/NmcRecord";
import CollegeRankCheck from "@/components/colleges/CollegeRankCheck";
import { approxFee, FEE_FOOTNOTE } from "@/lib/chance";
import { generalBands } from "@/lib/cutoffBands";
import CutoffBands from "@/components/colleges/CutoffBands";
import CounsellorEdge from "@/components/home/CounsellorEdge";
import TelegramJoin from "@/components/engage/TelegramJoin";
import CtaBand from "@/components/ui/CtaBand";
import PhotoCredit from "@/components/ui/PhotoCredit";
import { getPgCollegePhoto } from "@/lib/content";
import TrackView from "@/components/analytics/TrackView";
import { getCollegeSeatMatrix, getCollegeSeatTerms, termsSession } from "@/lib/pgSeatData";
import { pageCopy } from "@/lib/pageCopy";
import MccSeats from "@/components/colleges/MccSeats";
import SeatTerms from "@/components/colleges/SeatTerms";

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

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await loadCollegePage(params.slug, "pg");
  if (!data) return { title: "College not found | AdmissionHands" };
  // Short name + city + "MD/MS Cutoff <year>, Fees & Seats" — or, for a
  // hospital that only runs National Board courses, "DNB Seats, Stipend &
  // Cutoff <year>", so the result speaks to doctors rather than patients
  // (lib/collegeSnippet.ts). No brand suffix: the name is what is searched.
  const title = collegeTitle(data.summary);
  const description = collegeDescription(data.summary);

  return {
    title,
    description,
    alternates: { canonical: `/md-ms-india/colleges/${data.college.slug}` },
    // These links get shared into WhatsApp groups constantly, and without
    // these tags they unfurl as a bare URL.
    openGraph: {
      title,
      description,
      url: `/md-ms-india/colleges/${data.college.slug}`,
      type: "article",
      images: [OG_IMAGE],
    },
  };
}

export default async function CollegePage({ params }: { params: { slug: string } }) {
  const data = await loadCollegePage(params.slug, "pg");
  if (!data) notFound();
  const { college, cutoffs, fees, nmc, summary: s } = data;

  const [pgStates, similar, photo, matrix, terms] = await Promise.all([
    getPgStates(),
    getSimilarColleges(params.slug, "pg", 5),
    getPgCollegePhoto(params.slug),
    // MCC's own seat matrix (official) and the per-seat bond/stipend/exit terms (third-party,
    // shown with its caveat) — lib/pgSeatData.ts.
    getCollegeSeatMatrix(college.slug),
    getCollegeSeatTerms(college.slug),
  ]);
  // Words from Admin → Content ("Page: PG college pages — MCC seats, bond and stipend").
  const [seatsCopy, termsCopy] = await Promise.all([
    pageCopy("page.college_pg.mcc", { college: s.short, year: matrix?.year, total: matrix?.total.toLocaleString("en-IN") }),
    pageCopy("page.college_pg.mcc", { college: s.short, year: termsSession(terms), count: Math.max(0, terms.length - 6) }),
  ]);
  // The state page, linked from the breadcrumb: every college pointing at its
  // state is what makes the 35 state pages more than an index entry.
  const stateSlug = pgStates.find((st) => st.name === college.state)?.slug ?? null;

  const where = collegePlace(college);

  // Answered from this college's own numbers, and rendered on the page as
  // well as in the markup — see the note in `lib/collegeSeo.ts` about what
  // FAQ schema does and does not buy since Google restricted it.
  // Distinct branches with how many quota seat options each publishes.
  // Alphabetical: ordering by the tightest cut would publish the cut's order.
  const branches = Array.from(
    cutoffs.reduce((m, c) => m.set(c.course, (m.get(c.course) ?? 0) + 1), new Map<string, number>()),
  ).sort((a, b) => a[0].localeCompare(b[0]));
  const quotas = Array.from(new Set(cutoffs.map((c) => c.quota).filter(Boolean)));
  const counsellings = Array.from(new Set(cutoffs.map((c) => c.counselling).filter(Boolean))) as string[];
  const bands = generalBands(cutoffs, 20);

  const faqs = collegeFaqs(college, cutoffs, fees, "pg");
  const jsonLd = collegeJsonLd({
    college,
    level: "pg",
    faqs,
    shortName: s.short,
    state: stateSlug && college.state ? { name: college.state, path: `/md-ms-india/states/${stateSlug}` } : null,
  });

  return (
    <main className="min-h-screen bg-background">
      <TrackView event="college_viewed" props={{ college_slug: params.slug, course: "md-ms", state: college.state }} />
      {jsonLd.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* ---------------- Hero (light since 2026-10-21; the college's own photograph framed beside it) ---------------- */}
      <section className="relative isolate overflow-hidden border-b border-border bg-background">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/80 via-background to-background" />
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_55%_at_75%_10%,#000,transparent)]" />
        </div>

        <div className="container-custom relative py-9 md:py-12">
          <div className={photo ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center lg:gap-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]" : ""}>
            <div className="min-w-0">
              <nav className="mb-5 text-[13px] text-muted-foreground" aria-label="Breadcrumb">
                <Link href="/" className="hover:text-foreground hover:underline">Home</Link>
                <span className="mx-2 text-border" aria-hidden="true">/</span>
                <Link href="/md-ms-india" className="hover:text-foreground hover:underline">MD/MS</Link>
                <span className="mx-2 text-border" aria-hidden="true">/</span>
                {stateSlug && college.state ? (
                  <>
                    <Link href={`/md-ms-india/states/${stateSlug}`} className="hover:text-foreground hover:underline">
                      {college.state}
                    </Link>
                    <span className="mx-2 text-border" aria-hidden="true">/</span>
                  </>
                ) : null}
                <Link href="/md-ms-india/colleges" className="hover:text-foreground hover:underline">Colleges</Link>
                <span className="mx-2 text-border" aria-hidden="true">/</span>
                <span className="font-medium text-foreground" aria-current="page">{s.short}</span>
              </nav>

              {s.kind === "dnb" && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-primary/25 bg-primary-soft px-3 py-1 text-[11.5px] font-bold uppercase tracking-wider text-primary-strong">
                    DNB / National Board seats
                  </span>
                </div>
              )}

              <h1 className="font-heading max-w-[22ch] text-[clamp(1.9rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground [text-wrap:balance]">
                {s.short}
              </h1>
              {s.official !== s.short && <p className="mt-3 max-w-[70ch] text-[14px] text-muted-foreground">{s.official}</p>}
              {(where || college.university) && (
                <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground">
                  {where && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <MapPin className="h-4 w-4 text-primary-strong" aria-hidden="true" />
                      {where}
                    </span>
                  )}
                  {college.university && <span className="block sm:inline sm:before:mx-2 sm:before:content-['·']">{college.university}</span>}
                </p>
              )}
            </div>

            {photo && (
              <div className="relative min-w-0">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border border-border bg-surface-3 shadow-lift">
              <Image src={photo.imageUrl} alt={`${college.name} campus`} fill priority sizes="(min-width: 1280px) 26rem, (min-width: 1024px) 24rem, 100vw" className="object-cover" />
              <PhotoCredit
                subject={college.name}
                attribution={photo.imageAttribution}
                license={photo.imageLicense}
                tone="chip"
                className="absolute right-2.5 top-2.5"
              />
            </div>
              </div>
            )}
          </div>

          <CollegeGlance s={s} />
        </div>
      </section>

      <div className="container-custom py-10 md:py-14">
        {/* -------- your chance, straight under the summary -------- */}
        <div className="mb-10">
          <CollegeRankCheck collegeName={s.short} course="pg" slug={college.slug} wide />
        </div>

        {/* -------- NMC's own record: approved seats course by course -------- */}
        {nmc && (
          <div className="-mt-2 mb-10">
            <NmcRecord nmc={nmc} level="pg" />
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {/* -------- How admission works -------- */}
            <section>
              <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">
                Branches and how admission works
              </h2>
              {cutoffs.length === 0 ? (
                <p className="mt-1.5 text-[15px] text-muted-foreground">
                  No counselling round has been published for this college in the years we hold. Its seat and fee
                  data is below.
                </p>
              ) : (
                <>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-muted-foreground">
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
                        {quotas.length > 6 ? ` and ${quotas.length - 6} more` : ""} — the same branch closes at very
                        different ranks and fees under each.
                      </li>
                    )}
                    <li>
                      Later rounds often reach far beyond round 1. Whether to float or freeze a seat here is the
                      decision that costs people a year — talk it through before you lock it.
                    </li>
                  </ul>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {branches.map(([name, n]) => (
                      <Link
                        key={name}
                        href={`/md-ms-india/branches/${branchSlug(name)}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:border-primary/40"
                      >
                        {name}
                        <span className="tnum text-[11.5px] text-muted-foreground">
                          {n} option{n === 1 ? "" : "s"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </section>

            {bands.length > 0 && (
              <div className="mt-12">
                <CutoffBands rows={bands} collegeName={college.name} level="pg" ctaHref="/neet-college-predictor?course=pg" />
              </div>
            )}

            {/* -------- MCC's seat matrix: seats, not ranks -------- */}
            {matrix && (
              <div className="mt-12">
                <MccSeats
                  matrix={matrix}
                  branchPages={new Set(branches.map(([name]) => name))}
                  copy={{
                    eyebrow: seatsCopy.seats_eyebrow,
                    title: seatsCopy.seats_title,
                    intro: seatsCopy.seats_intro,
                    source: seatsCopy.seats_source,
                    pwd: seatsCopy.seats_pwd,
                    total: seatsCopy.seats_total,
                    link: seatsCopy.seats_link,
                  }}
                />
              </div>
            )}

            {/* -------- Fees -------- */}
            {fees.length > 0 && (
              <section className="mt-12">
                <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">Fees, hostel and stipend</h2>
                <p className="mt-1.5 text-[15px] text-muted-foreground">
                  Approximate brackets from the published fee schedule; stipend as published. Where a figure is
                  missing the authority did not publish it.
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
                            {f.feeInr != null && f.feeInr > 0 ? (
                              approxFee(f.feeInr)
                            ) : (
                              <span className="text-muted-foreground">{f.feeNullReason ?? "Not published"}</span>
                            )}
                          </td>
                          <td className="tnum px-4 py-3 text-right text-[14px] text-muted-foreground">
                            {approxFee(f.hostelMinInr) ?? "—"}
                          </td>
                          <td className="tnum px-4 py-3 text-right text-[14px] font-semibold text-signal-safe">{money(f.stipendY1Inr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11.5px] text-muted-foreground">{FEE_FOOTNOTE}</p>
              </section>
            )}

            {/* -------- bond, stipend by year, seat-leaving penalty -------- */}
            {terms.length > 0 && (
              <div className="mt-12">
                <SeatTerms
                  terms={terms}
                  copy={{
                    eyebrow: termsCopy.terms_eyebrow,
                    title: termsCopy.terms_title,
                    intro: termsCopy.terms_intro,
                    caveat: termsCopy.terms_caveat,
                    stipend: termsCopy.terms_stipend,
                    bond: termsCopy.terms_bond,
                    exit: termsCopy.terms_exit,
                    hostel: termsCopy.terms_hostel,
                    more: termsCopy.terms_more,
                    link: termsCopy.terms_link,
                  }}
                />
              </div>
            )}
          </div>

          {/* ---------------- Sidebar ---------------- */}
          <aside className="space-y-5">
            {branches.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-heading text-[15px] font-bold text-foreground">
                  Branches here
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  How each branch fills across India, and where it sits for your rank.
                </p>
                <ul className="mt-3 space-y-1">
                  {branches.slice(0, 14).map(([name]) => (
                    <li key={name}>
                      <Link
                        href={`/md-ms-india/branches/${branchSlug(name)}`}
                        className="block rounded-lg px-2 py-2 text-[14px] leading-snug text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary-strong dark:hover:text-primary"
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
                        className="block rounded-lg px-2 py-2 text-[14px] leading-snug text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary-strong dark:hover:text-primary"
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

        <div className="mt-12">
          <CounsellorEdge compact />
        </div>

        <TelegramJoin placement="college_pg" bare className="mt-6" />

        <CollegeFaq faqs={faqs} />
      </div>

      <CtaBand
        title={`Is ${s.short} the right pick for your rank?`}
        body="Our counsellors work from every published round for this college. Bring your rank and we will tell you where it should sit in your preference order — or whether it should be on the list at all."
        image="/assets/images/hero/medical-admission-counselling-session.avif"
        primaryLabel="Ask a counsellor"
      />
    </main>
  );
}
