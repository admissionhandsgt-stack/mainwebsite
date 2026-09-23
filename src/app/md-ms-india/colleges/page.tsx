import type { Metadata } from "next";
import { resolveMetadata } from '@/lib/content';
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { listColleges, getCollegeFacets, type CollegeFilters } from "@/lib/collegeQueries";
import PageHero from "@/components/ui/PageHero";
import CollegeFilterBar from "@/components/colleges/CollegeFilterBar";
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic";

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata('/md-ms-india/colleges', {
    title: "MD/MS Colleges in India — Seats, Fees, Stipend & Cutoffs | AdmissionHands",
    description: "All 2,168 PG medical colleges with published seat counts, fee structures, stipends and closing ranks. Filter by state, ownership and fee.",
  });
}

const money = (n: number | null) => {
  if (n == null) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

interface PageProps {
  searchParams: {
    q?: string;
    states?: string;
    ownership?: string;
    maxFee?: string;
    sort?: string;
    page?: string;
  };
}

export default async function PGCollegesPage({ searchParams }: PageProps) {
  const filters: CollegeFilters = {
    level: "pg",
    search: searchParams.q,
    states: searchParams.states?.split(",").filter(Boolean),
    ownership: searchParams.ownership?.split(",").filter(Boolean),
    maxFee: searchParams.maxFee ? Number(searchParams.maxFee) : null,
    sort: (searchParams.sort as CollegeFilters["sort"]) ?? "seats",
    page: Number(searchParams.page) || 1,
    perPage: 24,
  };

  const [{ items, total, page, perPage }, facets] = await Promise.all([
    listColleges(filters),
    getCollegeFacets("pg"),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = {
      q: searchParams.q,
      states: searchParams.states,
      ownership: searchParams.ownership,
      maxFee: searchParams.maxFee,
      sort: searchParams.sort,
      page: searchParams.page,
      ...patch,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    const s = p.toString();
    return s ? `/md-ms-india/colleges?${s}` : "/md-ms-india/colleges";
  };

  return (
    <main className="min-h-screen bg-background">
      <StructuredData
        data={[
          webPage({
            name: "PG Medical Colleges in India",
            description:
              "Every PG medical college with published closing ranks, filterable by state, branch and quota.",
            path: "/md-ms-india/colleges",
          }),
          breadcrumb([{ name: "Home", path: "/" }, { name: "MD/MS India", path: "/md-ms-india" }, { name: "Colleges", path: "/md-ms-india/colleges" }]),
        ]}
      />
      <PageHero
        eyebrow="MD / MS · NEET PG"
        eyebrowIcon="building"
        title="Every PG medical college,"
        titleAccent="with the numbers behind it"
        subtitle="Seat counts, fee structures, stipends and the closing rank each seat actually went to — as published by the counselling authorities, for all 2,168 colleges."
        image="/assets/images/hero/india-medical-college-campus.avif"
        tone="dark"
        stats={[
          { value: "2,168", label: "Colleges" },
          { value: String(facets.states.length), label: "States" },
          { value: "58,279", label: "Seats tracked" },
          { value: "2024–25", label: "Cutoff years" },
        ]}
      />

      <div className="container-custom py-9 md:py-12">
        <CollegeFilterBar
          facets={facets}
          current={{
            q: searchParams.q ?? "",
            states: searchParams.states?.split(",").filter(Boolean) ?? [],
            ownership: searchParams.ownership?.split(",").filter(Boolean) ?? [],
            maxFee: searchParams.maxFee ?? "",
            sort: searchParams.sort ?? "seats",
          }}
          total={total}
        />

        {items.length === 0 ? (
          <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-border bg-card p-8 text-center">
            <h2 className="font-heading text-lg font-bold text-foreground">Nothing matches these filters</h2>
            <p className="mx-auto mt-2 max-w-[42ch] text-[15px] leading-relaxed text-muted-foreground">
              {searchParams.q
                ? `No college matched “${searchParams.q}”. Check the spelling, or search by city or state instead.`
                : "Try widening the fee ceiling or removing a state."}
            </p>
            <Link
              href="/md-ms-india/colleges"
              className="mt-5 inline-block rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary/40"
            >
              Clear all filters
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/md-ms-india/colleges/${c.slug}`}
                    className="card-lift group flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-2">
                      <h2 className="flex-grow text-[16px] font-bold leading-snug text-foreground group-hover:text-primary">
                        {c.name}
                      </h2>
                      <span className="mt-0.5 shrink-0 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {c.ownership}
                      </span>
                    </div>

                    <p className="mt-1.5 text-[13px] text-muted-foreground">
                      {[c.district, c.state].filter(Boolean).join(", ") || "—"}
                      {c.establishedYear ? ` · est. ${c.establishedYear}` : ""}
                    </p>

                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">
                      <div>
                        <dd className="tnum font-heading text-lg font-extrabold leading-none text-foreground">
                          {c.seatsTotal?.toLocaleString("en-IN") ?? "—"}
                        </dd>
                        <dt className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">PG seats</dt>
                      </div>
                      <div>
                        <dd className="tnum font-heading text-lg font-extrabold leading-none text-foreground">
                          {c.branchCount ?? "—"}
                        </dd>
                        <dt className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Branches</dt>
                      </div>
                      <div>
                        <dd className="tnum font-heading text-lg font-extrabold leading-none text-foreground">
                          {money(c.minFee)}
                        </dd>
                        <dt className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Fee from</dt>
                      </div>
                      <div>
                        <dd className="tnum font-heading text-lg font-extrabold leading-none text-signal-safe">
                          {money(c.maxStipend)}
                        </dd>
                        <dt className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Stipend / mo</dt>
                      </div>
                    </dl>

                    <div className="mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-primary">
                      {c.bestRank != null ? (
                        <span className="tnum">Best cut {c.bestRank.toLocaleString("en-IN")}</span>
                      ) : (
                        <span>See cutoffs</span>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <nav className="mt-9 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
              {page > 1 && (
                <Link
                  href={qs({ page: String(page - 1) })}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-[14px] font-semibold text-foreground transition-colors hover:border-primary/40"
                >
                  Previous
                </Link>
              )}
              <span className="tnum px-3 text-[14px] text-muted-foreground">
                Page {page} of {lastPage}
              </span>
              {page < lastPage && (
                <Link
                  href={qs({ page: String(page + 1) })}
                  className="rounded-xl bg-gradient-brand px-5 py-2.5 text-[14px] font-bold text-white shadow-glow transition-all hover:shadow-glow-lg"
                >
                  Next
                </Link>
              )}
            </nav>
          </>
        )}

        <section className="mt-14 rounded-2xl border border-border bg-surface-2 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <Building2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Looking for a college at your rank?</h2>
              <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-muted-foreground">
                This list is every college. The predictor narrows it to the seats your rank actually reaches, split
                by how safely it reaches them.
              </p>
              <Link
                href="/neet-college-predictor?course=pg"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-3 text-sm font-bold text-white shadow-glow transition-all hover:shadow-glow-lg hover:-translate-y-0.5"
              >
                Open the predictor
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
