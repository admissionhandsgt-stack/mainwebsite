import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, MapPin, Search, TrendingDown } from "lucide-react";
import { getBranch, getBranches } from "@/lib/branchQueries";
import StructuredData from "@/components/seo/StructuredData";
import CtaBand from "@/components/ui/CtaBand";

export const revalidate = 86400;

/**
 * One PG branch: where it is offered, and what it closed at.
 *
 * "MD Radiology cutoff", "rank required for MD Dermatology" and their kind are
 * among the highest-intent queries in this market, and the site had no page
 * for any of them — the data was reachable only by knowing which college to
 * open first, which is the opposite of how somebody chooses.
 *
 * The 24 most-taken branches are pre-rendered and the rest are ISR at a day,
 * the same shape the per-college pages use.
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

  // The phrase people type, first, and under 60 characters.
  const title = `${b.name} Cutoff ${b.year ?? 2026} — Colleges, Ranks & Fees`;
  const description =
    `${b.name} closing ranks across ${inr(b.colleges)} colleges and ${b.states} states. ` +
    `Round-1 cuts from rank ${inr(b.bestRank)}, with ${inr(b.seats)} seats — published counselling results, not estimates.`;

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

export default async function BranchPage({ params }: { params: { slug: string } }) {
  const b = await getBranch(params.slug);
  if (!b) notFound();

  const govt = b.colleges_list.filter((c) => c.ownership === "government").length;

  const faqs = [
    {
      q: `What rank is needed for ${b.name}?`,
      a:
        `Round 1 closed anywhere from rank ${inr(b.bestRank)} at the most competitive college to ` +
        `${inr(b.widestRank)} at the most accessible, across ${inr(b.colleges)} colleges in ${b.states} states. ` +
        `Where your own rank lands depends on category, quota and state — the predictor answers that from the same data.`,
    },
    {
      q: `How many ${b.name} seats are there?`,
      a: `${inr(b.seats)} seats across ${inr(b.colleges)} colleges, counted from the published seat matrix${b.year ? ` for ${b.year}` : ""}.`,
    },
    ...(b.movedCount > 0
      ? [
          {
            q: `Does the ${b.name} cutoff loosen in later rounds?`,
            a:
              `For ${inr(b.movedCount)} of its ${inr(b.seats)} seats, yes — a later round reached a worse rank than round 1 did, ` +
              `because upgrades free seats and a freed seat goes to whoever is next. The rest closed tighter or did not move.`,
          },
        ]
      : []),
    ...(b.minFee != null
      ? [
          {
            q: `What do ${b.name} fees start at?`,
            a: `From ${money(b.minFee)} a year at the cheapest college publishing a fee, rising sharply at private and deemed institutions.`,
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
              { "@type": "ListItem", position: 2, name: "MD/MS branches", item: `${SITE}/md-ms-india/branches` },
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
          <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            Every college offering it, what each one closed at, and what it costs — read from the
            counselling authorities&rsquo; published results{b.year ? ` for ${b.year}` : ""}.
          </p>

          <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { k: "Colleges", v: inr(b.colleges) },
              { k: "Seats", v: inr(b.seats) },
              { k: "Best round-1 rank", v: inr(b.bestRank) },
              { k: "Widest reach", v: inr(b.widestRank) },
            ].map(({ k, v }) => (
              <div key={k}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="tnum font-heading mt-1 text-2xl font-extrabold text-white">{v}</dd>
              </div>
            ))}
          </dl>

          <Link
            href={`/neet-college-predictor?course=pg&branch=${encodeURIComponent(b.name)}`}
            className="mt-8 inline-flex h-13 items-center gap-2.5 rounded-xl bg-gradient-brand px-6 py-3.5 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            Check {b.name} against your rank
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="container-custom py-10 md:py-14">
        {/* ----------------------------- colleges ----------------------------- */}
        <section>
          <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">
            Colleges offering {b.name}
          </h2>
          <p className="mt-1.5 max-w-[70ch] text-[14px] leading-relaxed text-muted-foreground">
            Widest reach first — the colleges whose cut travelled furthest down are the ones most
            ranks can actually reach. {govt > 0 && `${inr(govt)} of these are government colleges.`}
          </p>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[640px] table-fixed border-collapse">
              <thead>
                <tr className="bg-surface-2">
                  {[
                    ["College", "w-[40%] text-left"],
                    ["Seats", "w-[12%] text-right"],
                    ["R1 close", "w-[16%] text-right"],
                    ["Widest", "w-[16%] text-right"],
                    ["Fee / yr", "w-[16%] text-right"],
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
                {b.colleges_list.map((c) => (
                  <tr key={c.slug} className="border-t border-border hover:bg-surface-2">
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/md-ms-india/colleges/${c.slug}`}
                        className="text-[14px] font-semibold leading-snug text-foreground hover:text-primary"
                      >
                        {c.name}
                      </Link>
                      <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {c.state ?? "—"}
                        {c.ownership !== "other" && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{c.ownership}</span>
                          </>
                        )}
                      </p>
                    </td>
                    <td className="tnum px-4 py-3 text-right align-top text-[14px] text-foreground">{c.seats}</td>
                    <td className="tnum px-4 py-3 text-right align-top text-[14px] text-muted-foreground">{inr(c.r1)}</td>
                    <td className="tnum px-4 py-3 text-right align-top text-[14px] font-semibold text-foreground">{inr(c.widest)}</td>
                    <td className="tnum px-4 py-3 text-right align-top text-[14px] text-foreground">{money(c.feeInr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {b.colleges_list.length >= 400 && (
            <p className="mt-3 text-[13px] text-muted-foreground">
              Showing the 400 colleges whose cut reached furthest. The predictor narrows all{" "}
              {inr(b.colleges)} to the ones your own rank reaches.
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
        title={`Where does {b.name} actually sit for your rank?`}
        body="The table above is every college, not your shortlist. Bring your rank and category and our counsellors will tell you which of these are realistic, which are a stretch, and the order to put them in."
        image="/assets/images/hero/medical-admission-counselling-session.avif"
        primaryLabel="Ask a counsellor"
      />
    </main>
  );
}
