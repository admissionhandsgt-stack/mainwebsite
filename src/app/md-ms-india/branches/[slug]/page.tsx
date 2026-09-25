import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, Building2, MapPin, Search, TrendingDown } from "lucide-react";
import { getBranch, getBranches, DEFAULT_CATEGORY } from "@/lib/branchQueries";
import StructuredData from "@/components/seo/StructuredData";
import CtaBand from "@/components/ui/CtaBand";

export const revalidate = 86400;

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

export async function generateStaticParams() {
  const branches = await getBranches();
  return branches.slice(0, 24).map((b) => ({ slug: b.slug }));
}

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

  const title = `${b.name} Cutoff ${b.year ?? 2026} — Colleges, Ranks & Fees`;
  const description =
    `${b.name} closing ranks across ${inr(b.colleges)} colleges and ${b.states} states, ` +
    `by quota and category. ${inr(b.seats)} seats — published counselling results, not estimates.`;

  return {
    title,
    description,
    alternates: { canonical: `/md-ms-india/branches/${b.slug}` },
    openGraph: {
      title,
      description,
      url: `/md-ms-india/branches/${b.slug}`,
      type: "article",
      images: ["/assets/images/logos/logo-4k.avif"],
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

  const faqs = [
    {
      q: `What rank is needed for ${b.name}?`,
      a:
        `It depends on the quota as much as on the rank. In the ${b.category} category, round 1 closed ` +
        `from rank ${inr(b.bestRank)} at the most competitive college. Management and NRI seats at the ` +
        `same colleges stay open to far larger ranks, but cost several times more — so a large rank ` +
        `does not mean a cheap seat. The table on this page keeps each seat's rank and its own fee ` +
        `on the same row for exactly that reason.`,
    },
    {
      q: `How many ${b.name} seats are there?`,
      a: `${inr(b.seats)} seats across ${inr(b.colleges)} colleges in ${b.states} states, counted from the published seat matrix${b.year ? ` for ${b.year}` : ""}.`,
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
      <section className="relative overflow-hidden bg-slate-950">
        <div className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] opacity-50" aria-hidden="true" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true" />

        <div className="container-custom relative py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="text-[13px] text-slate-400">
            <Link href="/md-ms-india/branches" className="hover:text-white">
              MD/MS branches
            </Link>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <span className="text-slate-300">{b.name}</span>
          </nav>

          <h1 className="font-heading mt-4 max-w-[22ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            {b.name}
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            Every seat, with its own quota, its own closing rank and its own fee — read from the
            counselling authorities&rsquo; published results{b.year ? ` for ${b.year}` : ""}.
          </p>

          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "Colleges", v: inr(b.colleges) },
              { k: "Seats", v: inr(b.seats) },
              { k: `Best R1 (${DEFAULT_CATEGORY})`, v: inr(b.bestRank) },
              { k: "States", v: inr(b.states) },
            ].map(({ k, v }) => (
              <div key={k}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="tnum font-heading mt-1 text-2xl font-extrabold text-white">{v}</dd>
              </div>
            ))}
          </dl>

          <Link
            href={`/neet-college-predictor?course=pg&branch=${encodeURIComponent(b.name)}`}
            className="mt-8 inline-flex items-center gap-2.5 rounded-xl bg-gradient-brand px-6 py-3.5 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            Check {b.name} against your rank
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

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
            One row per college and quota, widest reach first — the seats most ranks can actually
            get to. Everything on a row describes that one seat.
          </p>

          {b.rowsList.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center text-[14px] text-muted-foreground">
              No {b.category} seats are published for this branch. Try another category above.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[760px] table-fixed border-collapse">
                <thead>
                  <tr className="bg-surface-2">
                    {[
                      ["College", "w-[32%] text-left"],
                      ["Quota", "w-[20%] text-left"],
                      ["Seats", "w-[10%] text-right"],
                      ["R1 close", "w-[12%] text-right"],
                      ["Widest", "w-[13%] text-right"],
                      ["Fee / yr", "w-[13%] text-right"],
                    ].map(([h, cls]) => (
                      <th
                        key={h}
                        scope="col"
                        className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${cls}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rowsList.map((r) => (
                    <tr key={`${r.slug}-${r.quota}`} className="border-t border-border hover:bg-surface-2">
                      <td className="px-4 py-3 align-top">
                        <Link
                          href={`/md-ms-india/colleges/${r.slug}`}
                          className="text-[14px] font-semibold leading-snug text-foreground hover:text-primary"
                        >
                          {r.college}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {r.state ?? "—"}
                          {r.ownership !== "other" && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="capitalize">{r.ownership}</span>
                            </>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-[13px] leading-snug text-foreground">
                        {r.quota}
                      </td>
                      <td className="tnum px-4 py-3 text-right align-top text-[14px] text-foreground">
                        {r.seats}
                      </td>
                      <td className="tnum px-4 py-3 text-right align-top text-[14px] text-muted-foreground">
                        {inr(r.r1)}
                      </td>
                      <td className="tnum px-4 py-3 text-right align-top text-[14px] font-semibold text-foreground">
                        {inr(r.widest)}
                      </td>
                      <td className="tnum px-4 py-3 text-right align-top text-[14px] text-foreground">
                        {money(r.feeInr)}
                        {r.feeMaxInr != null && (
                          <span className="block text-[11px] text-muted-foreground">
                            to {money(r.feeMaxInr)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {b.truncated && (
            <p className="mt-3 text-[13px] text-muted-foreground">
              Showing the 300 seats whose cut reached furthest. The predictor narrows all of them to
              the ones your own rank reaches.
            </p>
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
    </main>
  );
}
