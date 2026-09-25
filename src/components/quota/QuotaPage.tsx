import Link from "next/link";
import { AlertTriangle, ArrowRight, MapPin, Search, TrendingDown } from "lucide-react";
import type { QuotaOverview } from "@/lib/quotaQueries";
import StructuredData from "@/components/seo/StructuredData";
import CtaBand from "@/components/ui/CtaBand";

const SITE = "https://www.admissionhands.com";

const inr = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

const money = (v: number | null | undefined) => {
  if (v == null) return "—";
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
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
export default function QuotaPage({
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
  const primary = pg ?? ug;
  if (!primary) return null;
  const family = primary.family;

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
      <section className="relative overflow-hidden bg-slate-950">
        <div className="ambient-blob pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] opacity-50" aria-hidden="true" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-[0.07]" aria-hidden="true" />

        <div className="container-custom relative py-12 md:py-16">
          <h1 className="font-heading max-w-[24ch] text-[clamp(2rem,4.2vw,3.1rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-white">
            {family.label} seats: the rank <em className="not-italic text-cyan-300">and</em> the fee
          </h1>
          <p className="mt-3 max-w-[66ch] text-[15px] leading-relaxed text-slate-300 md:text-base">
            {intro}
          </p>

          {pg && (
            <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { k: "PG colleges", v: inr(pg.colleges) },
                { k: "PG seats", v: inr(pg.seats) },
                { k: "Typical fee / yr", v: money(pg.medianFee) },
                { k: "Fee range", v: `${money(pg.minFee)} – ${money(pg.maxFee)}` },
              ].map(({ k, v }) => (
                <div key={k}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                  <dd className="tnum font-heading mt-1 text-xl font-extrabold text-white md:text-2xl">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <Link
            href="/neet-college-predictor?course=pg"
            className="mt-8 inline-flex items-center gap-2.5 rounded-xl bg-gradient-brand px-6 py-3.5 text-[15px] font-bold text-white shadow-glow transition-all hover:-translate-y-0.5"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            Check your own rank against these
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="container-custom py-10 md:py-14">
        <p className="flex gap-3 rounded-2xl border border-signal-borderline/30 bg-signal-borderline/[0.07] px-5 py-4 text-[14px] leading-relaxed text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-signal-borderline" aria-hidden="true" />
          <span>
            <span className="font-bold">A larger rank is not a cheaper seat.</span> {family.label}{" "}
            seats stay open to ranks the government quota closed long before — and they cost several
            times more. Every row below keeps its rank and its own fee together, so the two are
            never read apart.
          </span>
        </p>

        {/* ------------------------------ PG table ------------------------------ */}
        {pg && (
          <section className="mt-9">
            <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">
              MD/MS {family.short} seats — rank and fee
            </h2>
            <p className="mt-1.5 max-w-[72ch] text-[14px] leading-relaxed text-muted-foreground">
              {inr(pg.seats)} seats across {inr(pg.colleges)} colleges in {pg.states} states
              {pg.year ? `, from the ${pg.year} counselling results` : ""}. Widest reach first.
            </p>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[820px] table-fixed border-collapse">
                <thead>
                  <tr className="bg-surface-2">
                    {[
                      ["College", "w-[28%] text-left"],
                      ["Branch", "w-[20%] text-left"],
                      ["Quota", "w-[18%] text-left"],
                      ["R1 close", "w-[11%] text-right"],
                      ["Widest", "w-[11%] text-right"],
                      ["Fee / yr", "w-[12%] text-right"],
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
                  {pg.rowsList.map((r, i) => (
                    <tr key={`${r.slug}-${r.course}-${r.quota}-${i}`} className="border-t border-border hover:bg-surface-2">
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
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-[13.5px] leading-snug text-foreground">{r.course}</td>
                      <td className="px-4 py-3 align-top text-[12.5px] leading-snug text-muted-foreground">{r.quota}</td>
                      <td className="tnum px-4 py-3 text-right align-top text-[14px] text-muted-foreground">{inr(r.r1)}</td>
                      <td className="tnum px-4 py-3 text-right align-top text-[14px] font-semibold text-foreground">{inr(r.widest)}</td>
                      <td className="tnum px-4 py-3 text-right align-top text-[14px] font-semibold text-foreground">{money(r.feeInr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pg.truncated && (
              <p className="mt-3 text-[13px] text-muted-foreground">
                Showing the {pg.rowsList.length} seats whose cut reached furthest, of {inr(pg.seats)}.
                The predictor narrows them to the ones your own rank reaches.
              </p>
            )}
          </section>
        )}

        {/* ------------------------------ UG table ------------------------------ */}
        {ug && (
          <section className="mt-12">
            <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">
              MBBS {family.short} seats — rank only
            </h2>
            <p className="mt-1.5 max-w-[74ch] text-[14px] leading-relaxed text-muted-foreground">
              {inr(ug.seats)} seats across {inr(ug.colleges)} colleges.{" "}
              <span className="font-semibold text-foreground">
                We do not publish a fee for these, because the source does not.
              </span>{" "}
              The UG counselling data lists several unlabelled fee blocks per college and never says
              which quota each belongs to — so any figure here would be a guess, and a guess about
              an {family.short} fee is the most expensive kind to get wrong.
            </p>

            <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[680px] table-fixed border-collapse">
                <thead>
                  <tr className="bg-surface-2">
                    {[
                      ["College", "w-[38%] text-left"],
                      ["Quota", "w-[26%] text-left"],
                      ["Seats", "w-[10%] text-right"],
                      ["R1 close", "w-[13%] text-right"],
                      ["Widest", "w-[13%] text-right"],
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
                  {ug.rowsList.slice(0, 120).map((r, i) => (
                    <tr key={`${r.slug}-${r.quota}-${i}`} className="border-t border-border hover:bg-surface-2">
                      <td className="px-4 py-3 align-top">
                        <Link
                          href={`/mbbs-india/colleges/${r.slug}`}
                          className="text-[14px] font-semibold leading-snug text-foreground hover:text-primary"
                        >
                          {r.college}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {r.state ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-[12.5px] leading-snug text-muted-foreground">{r.quota}</td>
                      <td className="tnum px-4 py-3 text-right align-top text-[14px] text-foreground">{r.seats}</td>
                      <td className="tnum px-4 py-3 text-right align-top text-[14px] text-muted-foreground">{inr(r.r1)}</td>
                      <td className="tnum px-4 py-3 text-right align-top text-[14px] font-semibold text-foreground">{inr(r.widest)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* -------------------------------- faq -------------------------------- */}
        <section className="mt-12">
          <h2 className="font-heading text-xl font-bold text-foreground md:text-2xl">
            Common questions about {family.label.toLowerCase()} seats
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
    </main>
  );
}
