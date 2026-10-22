import { ExternalLink, Landmark } from "lucide-react";
import type { StateAuthorityInfo } from "@/lib/stateAuthorities";

/**
 * "Who allots the state-quota seats here, and where": the state counselling
 * authority with its official website, beside MCC for the All India Quota
 * (2026-10-18). The details live in Admin → Content ("State counselling
 * authorities"), checked against each year's notices.
 */
export default function StateAuthority({
  a,
  state,
  level,
}: {
  a: StateAuthorityInfo | null;
  state: string;
  level: "ug" | "pg";
}) {
  if (!a || (level === "pg" && a.scope !== "UG and PG")) return null;
  const what = level === "ug" ? "MBBS and BDS" : "MD/MS";
  return (
    <section
      aria-label={`Counselling authority in ${state}`}
      className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_18px_40px_-26px_rgb(8_145_178/0.45)] md:p-7"
    >
      <span className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br from-cyan-400/20 to-teal-400/10 blur-2xl" aria-hidden="true" />
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex items-start gap-4">
          <span
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-glow"
            aria-hidden="true"
          >
            <Landmark className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-primary-strong">Who runs counselling here</p>
            <h2 className="font-heading mt-1 text-lg font-bold leading-snug text-foreground md:text-xl">{a.authority}</h2>
            <p className="mt-1.5 max-w-[70ch] text-[14.5px] leading-relaxed text-muted-foreground">
              {/* MBBS: 15% of a state government college's seats are All India Quota; MD/MS: 50%. */}
              Allots the state-quota {what} seats in {state}. The {level === "ug" ? "15%" : "50%"} All India Quota and
              deemed universities are counselled by MCC, at mcc.nic.in.
            </p>
            {a.note && <p className="mt-2 max-w-[70ch] text-[13px] leading-relaxed text-muted-foreground">{a.note}</p>}
          </div>
        </div>
        <div className="flex flex-col items-start gap-1.5 md:items-end">
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-cyan-600 to-teal-600 px-5 text-[14px] font-semibold text-white shadow-glow transition-opacity hover:opacity-95"
          >
            {a.label} <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <span className="text-[12px] text-muted-foreground">Official website · checked {a.checked}</span>
        </div>
      </div>
    </section>
  );
}
