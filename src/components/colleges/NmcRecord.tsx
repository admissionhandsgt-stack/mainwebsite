import { ExternalLink, Landmark } from "lucide-react";
import { nmcDate, type NmcFacts } from "@/lib/nmcData";

/**
 * A college's entry in the National Medical Commission's register (2026-10-18):
 * ownership, university, approved seats per course and recognition status, in
 * NMC's own words, with the date NMC last updated it. The figures the summary
 * box takes from NMC are these ones, so the two never disagree.
 */
const NMC_SEARCH = "https://nmc.org.in/information-desk-college-and-course-search/";
const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-IN"));

export default function NmcRecord({ nmc, level }: { nmc: NmcFacts | null; level: "ug" | "pg" }) {
  if (!nmc) return null;
  const courses = level === "pg" ? nmc.pg : [];
  const shown = courses.slice(0, 12);
  const more = courses.slice(12);
  const updated = nmcDate(nmc.updated);
  const mbbsChange =
    nmc.mbbsSeats != null && nmc.mbbsPrevious != null && nmc.mbbsPrevious !== nmc.mbbsSeats ? nmc.mbbsPrevious : null;

  const facts: { label: string; value: string; sub?: string }[] = [];
  if (nmc.management) facts.push({ label: "Ownership", value: nmc.management, sub: "as NMC records it" });
  if (nmc.mbbsSeats != null)
    facts.push({
      label: "MBBS seats",
      value: n(nmc.mbbsSeats),
      sub: mbbsChange != null ? `${nmc.mbbsSeats > mbbsChange ? "up" : "down"} from ${n(mbbsChange)}` : "approved intake",
    });
  if (level === "pg" && nmc.pgSeats) facts.push({ label: "MD/MS seats", value: n(nmc.pgSeats), sub: `${nmc.pg.length} courses` });
  if (nmc.ssSeats) facts.push({ label: "DM/M.Ch. seats", value: n(nmc.ssSeats), sub: `${nmc.ss.length} courses` });
  if (nmc.inceptionYear) facts.push({ label: "MBBS since", value: String(nmc.inceptionYear) });

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_18px_40px_-26px_rgb(8_145_178/0.45)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-1 px-5 py-4 md:px-6">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white"
            aria-hidden="true"
          >
            <Landmark className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">Official record · National Medical Commission</h2>
            <p className="text-[13px] text-muted-foreground">
              {nmc.name}
              {updated ? ` · updated by NMC on ${updated}` : ""}
            </p>
          </div>
        </div>
        <a
          href={NMC_SEARCH}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-border bg-card px-4 text-[13px] font-semibold text-primary-strong transition-colors hover:border-primary/50"
        >
          Check on NMC <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <div className="px-5 py-5 md:px-6">
        {facts.length > 0 && (
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="rounded-2xl bg-surface-2 px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                <dd className="tnum font-heading mt-1 text-xl font-extrabold text-foreground">{f.value}</dd>
                {f.sub && <dd className="text-[12px] text-muted-foreground">{f.sub}</dd>}
              </div>
            ))}
          </dl>
        )}

        {nmc.university && (
          <p className="mt-4 text-[14px] text-muted-foreground">
            Affiliated to <span className="font-semibold text-foreground">{nmc.university}</span>
          </p>
        )}

        {shown.length > 0 && (
          <div className="mt-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Approved seats, course by course</h3>
            <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
              {shown.map((c) => (
                <li key={c.name} className="flex items-baseline justify-between gap-3 border-b border-border/70 py-2 text-[14px]">
                  <span className="text-foreground">{c.name}</span>
                  <span className="tnum shrink-0 font-semibold text-foreground">{n(c.seats)}</span>
                </li>
              ))}
            </ul>
            {more.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[13.5px] font-semibold text-primary-strong">
                  {more.length} more course{more.length === 1 ? "" : "s"}
                </summary>
                <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
                  {more.map((c) => (
                    <li key={c.name} className="flex items-baseline justify-between gap-3 border-b border-border/70 py-2 text-[14px]">
                      <span className="text-foreground">{c.name}</span>
                      <span className="tnum shrink-0 font-semibold text-foreground">{n(c.seats)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {nmc.recognition && (
          <details className="mt-5 rounded-2xl border border-border bg-surface-1 px-4 py-3">
            <summary className="cursor-pointer text-[14px] font-semibold text-foreground">Recognition status (MBBS), as NMC states it</summary>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{nmc.recognition}</p>
          </details>
        )}

        <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
          From NMC&rsquo;s college and course search. NMC&rsquo;s register is the authority on approved seats; the seats
          a counselling round offers in a given year come from its own seat matrix.
        </p>
      </div>
    </section>
  );
}
