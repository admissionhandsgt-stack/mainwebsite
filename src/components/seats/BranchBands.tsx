import Link from "@/components/ui/Link";
import { ArrowRight, Lock } from "lucide-react";
import { BAND_FOOTNOTE, GENERAL_CODES, isMeritQuota, rankBand } from "@/lib/chance";

/**
 * "MD Radiology cutoff" answered college by college, as bands (2026-10-12).
 *
 * The query people search is a branch at a college. One row per college, its
 * merit quota (All India first), the general category only, the closing rank
 * as a band. Any other category on the branch page gets the sign-in prompt
 * instead of bands — those are the chance view.
 */

interface Row {
  college: string;
  slug: string;
  state: string | null;
  quota: string;
  seats: number;
  r1: number | null;
  widest: number | null;
}

const MAX_ROWS = 60;
const allIndia = (q: string) => /all india|aiq/i.test(q);

export default function BranchBands({
  rows,
  branch,
  category,
  ctaHref,
}: {
  rows: Row[];
  branch: string;
  category: string;
  ctaHref: string;
}) {
  if (!GENERAL_CODES.has(category)) {
    return (
      <div className="mt-5 rounded-2xl border border-primary/25 bg-card p-5 text-center">
        <Lock className="mx-auto h-5 w-5 text-primary" aria-hidden="true" />
        <p className="mt-2 text-[14.5px] text-foreground">
          College-wise {branch} cutoffs for the {category} category are shown as your own chance after a free sign-in.
        </p>
        <Link
          href={ctaHref}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-brand px-5 text-[14px] font-bold text-white shadow-glow"
        >
          See my chance <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const byCollege = new Map<string, Row>();
  for (const r of rows) {
    if (!isMeritQuota(r.quota) || !(r.widest ?? r.r1)) continue;
    const prev = byCollege.get(r.slug);
    const better =
      !prev ||
      Number(allIndia(r.quota)) > Number(allIndia(prev.quota)) ||
      (allIndia(r.quota) === allIndia(prev.quota) && r.seats > prev.seats);
    if (better) byCollege.set(r.slug, r);
  }
  const list = [...byCollege.values()]
    .sort((a, b) => (a.widest ?? a.r1 ?? 0) - (b.widest ?? b.r1 ?? 0))
    .slice(0, MAX_ROWS);
  if (!list.length) return null;

  return (
    <div className="mt-6">
      <h3 className="font-heading text-lg font-bold text-foreground">{branch} cutoff by college — general category</h3>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr className="bg-surface-2">
              {["College", "Quota", "Closing band"].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${
                    i === 2 ? "text-right" : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.slug} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link href={`/md-ms-india/colleges/${r.slug}`} className="text-[14px] font-medium text-foreground hover:text-primary">
                    {r.college}
                  </Link>
                  {r.state && <span className="block text-[12px] text-muted-foreground">{r.state}</span>}
                </td>
                <td className="px-4 py-3 text-[13px] text-muted-foreground">{r.quota}</td>
                <td className="tnum px-4 py-3 text-right text-[14.5px] font-bold text-foreground">
                  {rankBand(r.widest ?? r.r1)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border bg-primary-soft/40">
              <td colSpan={3} className="px-4 py-3.5">
                <Link
                  href={ctaHref}
                  className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-primary-strong hover:underline dark:text-primary"
                >
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Other categories, NRI and management — see your own chance, free
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">{BAND_FOOTNOTE}</p>
    </div>
  );
}
