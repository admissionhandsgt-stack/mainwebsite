import { BookOpen, Building2, CheckCircle2, Clock, GraduationCap, RotateCcw, ShieldCheck, TrendingUp, type LucideIcon } from "lucide-react";
import { CTAButton } from "@/components/CTAButton";
import type { PgCard, PgQuota, PgQuotaFacts } from "@/lib/pgContent";
import type { CopyFields } from "@/lib/pageCopyDefaults";

/**
 * What MD/MS admission involves, the quota system and the counselling parameters — one section (owner,
 * 2026-10-21: "do it properly — no regression, and no information hidden").
 *
 * These were three sections: "Everything you need to know" (six cards), a dark "Understanding PG seat
 * distribution" band (switched off earlier the same day) and "Counselling process parameters" far down
 * the page. Every card, bullet and parameter of the three is here; the parameters are a table, AIQ beside
 * the state quota, because they were always a comparison. Words come from the admin — the collections
 * `pg_overview`, `pg_quotas` and `pg_cutoff_quotas`, and the copy group "Page: MD/MS — overview, quotas &
 * counselling parameters" — and each part follows its own row in Admin → Content → Page layout.
 */

const SHIPPED_OVERVIEW: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: GraduationCap, title: "Eligibility", desc: "MBBS degree from a recognized institution with completed 1-year internship and NMC/State Medical Council registration." },
  { icon: BookOpen, title: "NEET PG Exam", desc: "National-level entrance by NBEMS. Computer-based, 180 MCQs in 2026. The qualifying percentile is notified each year." },
  { icon: Clock, title: "Internship", desc: "1-year compulsory rotating internship must be completed before counselling. Completion certificate mandatory." },
  { icon: Building2, title: "Counselling Bodies", desc: "MCC handles AIQ, Deemed & Central seats. State authorities manage State Quota. Both run in parallel." },
  { icon: ShieldCheck, title: "Reservation", desc: "SC, ST, OBC-NCL, EWS, PwD — each category has specific cutoffs, seat pools, and documentation requirements." },
  { icon: RotateCcw, title: "Counselling Rounds", desc: "4 rounds typically: Round 1, Round 2, Mop-Up, and Stray Vacancy. Each round opens new opportunities." },
];

const SHIPPED_QUOTAS: PgQuota[] = [
  { title: "All India Quota", percentage: "50%", bullets: ["Open to all domiciles", "Managed via MCC portal", "Government college seats"] },
  { title: "State Quota", percentage: "50%", bullets: ["Domicile-based allocation", "Via state counselling portals", "Includes institutional preference"] },
  { title: "Deemed Universities", percentage: "100%", bullets: ["No domicile requirement", "Counselled through MCC", "Higher fee structure"] },
];

const SHIPPED_PARAMS: PgQuotaFacts[] = [
  {
    title: "All India Quota (AIQ)",
    items: [
      { label: "Counselling Body", value: "MCC (Centralized)" },
      { label: "Seat Scope", value: "50% Govt College Seats" },
      { label: "Counselling Rounds", value: "R1, R2, R3, Stray" },
      { label: "Upgradation", value: "Allowed R1 to R2 & R3" },
      { label: "Domicile Rule", value: "Open to all qualified ranks" },
    ],
  },
  {
    title: "State Quota",
    items: [
      { label: "Counselling Body", value: "State authority" },
      { label: "Seat Scope", value: "50% Govt College Seats" },
      { label: "Counselling Rounds", value: "Varies by state" },
      { label: "Upgradation", value: "State-specific rules" },
      { label: "Domicile Rule", value: "Domicile candidates only" },
    ],
  },
];

export function PGOverviewQuotas({
  copy,
  overviewItems,
  quotaItems,
  paramItems,
  overview = true,
  quotas = true,
  params = true,
}: {
  copy: CopyFields<"page.md_ms.overview">;
  overviewItems?: PgCard[] | null;
  quotaItems?: PgQuota[] | null;
  paramItems?: PgQuotaFacts[] | null;
  overview?: boolean;
  quotas?: boolean;
  params?: boolean;
}) {
  // The CMS supplies the words; the shipped item at the same position supplies the icon.
  const cards = overviewItems?.length
    ? overviewItems.map((c, i) => ({ ...(SHIPPED_OVERVIEW[i] ?? SHIPPED_OVERVIEW[SHIPPED_OVERVIEW.length - 1]), title: c.title, desc: c.desc }))
    : SHIPPED_OVERVIEW;
  const quotaCards = (quotaItems?.length ? quotaItems : SHIPPED_QUOTAS).filter((q) => q.title);
  const table = (paramItems?.length ? paramItems : SHIPPED_PARAMS).filter((q) => q.title);
  // Rows of the table: every parameter any quota lists, in the order they first appear.
  const rows: string[] = [];
  for (const q of table) for (const it of q.items) if (it.label && !rows.includes(it.label)) rows.push(it.label);
  const valueOf = (q: PgQuotaFacts, label: string) => q.items.find((it) => it.label === label)?.value || "—";

  const showQuotas = quotas && quotaCards.length > 0;
  const showParams = params && table.length > 0 && rows.length > 0;
  if (!overview && !showQuotas && !showParams) return null;
  // The call band sits under the table when the quota cards stand beside it, so the two columns end
  // level; full width under the section otherwise.
  const beside = showQuotas && showParams;
  // The section's heading: the overview's, or — with the cards switched off — the first part's own.
  const [title, accent] = overview ? [copy.title, copy.accent] : showQuotas ? [copy.quota_title, ""] : [copy.params_title, ""];
  const band =
    (showQuotas || showParams) && (copy.cta_strong || copy.cta_body) ? (
      <div
        className={`flex flex-col items-start gap-4 rounded-2xl border border-primary/20 bg-primary-soft/60 p-4 md:p-5 ${
          beside ? "mt-4" : "mt-6 sm:flex-row sm:items-center sm:justify-between md:mt-8"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden="true">
            <TrendingUp className="h-[18px] w-[18px]" />
          </span>
          <p className="text-[14px] leading-relaxed text-foreground/85">
            {copy.cta_strong && <strong className="font-bold text-foreground">{copy.cta_strong}</strong>} {copy.cta_body}
          </p>
        </div>
        {copy.cta_button && (
          <CTAButton action="call" icon="phone" className={`min-h-11 w-full shrink-0 rounded-xl px-5 text-[14px] sm:w-auto ${beside ? "sm:ml-12" : ""}`}>
            {copy.cta_button}
          </CTAButton>
        )}
      </div>
    ) : null;

  return (
    <section aria-labelledby="pg-overview-title" className="bg-background py-12 md:py-16">
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          {copy.eyebrow && (
            <p className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-[11.5px] font-black uppercase tracking-widest text-primary-strong dark:text-primary">
              {copy.eyebrow}
            </p>
          )}
          <h2 id="pg-overview-title" className="font-heading mt-3 text-[1.75rem] font-black leading-tight tracking-tight text-foreground [text-wrap:balance] md:text-4xl">
            {title}
            {accent && <> <span className="text-primary-strong dark:text-primary">{accent}</span></>}
          </h2>
          {overview && copy.intro && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground md:text-base">{copy.intro}</p>}
        </div>

        {overview && (
          <ul className="mt-7 grid grid-cols-2 gap-3 md:mt-9 md:gap-4 lg:grid-cols-3">
            {cards.map(({ icon: Icon, title, desc }, i) => (
              <li key={`${i}-${title}`} className="min-w-0 rounded-2xl border border-border bg-card p-3.5 shadow-sm md:p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground md:h-10 md:w-10 md:rounded-xl" aria-hidden="true">
                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                  </span>
                  <h3 className="min-w-0 break-words text-[14.5px] font-black leading-snug text-foreground md:text-base">{title}</h3>
                </div>
                <p className="mt-2 break-words text-[13px] leading-relaxed text-muted-foreground md:text-[14px]">{desc}</p>
              </li>
            ))}
          </ul>
        )}

        {(showQuotas || showParams) && (
          <div
            className={`grid items-start gap-6 ${overview ? "mt-10 md:mt-12" : "mt-7 md:mt-9"} ${
              showQuotas && showParams ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-8" : ""
            }`}
          >
            {showQuotas && (
              <div>
                {/* Its heading is the section's when the overview cards are switched off. */}
                {overview && <h3 className="font-heading text-xl font-black tracking-tight text-foreground md:text-2xl">{copy.quota_title}</h3>}
                {copy.quota_intro && <p className={`${overview ? "mt-1.5" : ""} text-[14px] leading-relaxed text-muted-foreground`}>{copy.quota_intro}</p>}
                <ul className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {quotaCards.map((q, qi) => (
                    <li key={`${qi}-${q.title}`} className="flex min-w-0 gap-3.5 rounded-2xl border border-border bg-card p-3.5 shadow-sm sm:flex-col lg:flex-row md:p-4">
                      {q.percentage && (
                        <span className="tnum font-heading w-[5.25rem] shrink-0 whitespace-nowrap text-[1.6rem] font-black leading-none text-primary-strong dark:text-primary sm:w-auto lg:w-[5.25rem]">
                          {q.percentage}
                        </span>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-[15px] font-black leading-snug text-foreground">{q.title}</h4>
                        <ul className="mt-1.5 space-y-1">
                          {q.bullets.map((b, bi) => (
                            <li key={`${bi}-${b}`} className="flex gap-1.5 text-[13.5px] leading-snug text-muted-foreground">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showParams && (
              <div className="min-w-0">
                {(overview || showQuotas) && (
                  <h3 className="font-heading text-xl font-black tracking-tight text-foreground md:text-2xl">{copy.params_title}</h3>
                )}
                {copy.params_intro && (
                  <p className={`${overview || showQuotas ? "mt-1.5" : ""} text-[14px] leading-relaxed text-muted-foreground`}>{copy.params_intro}</p>
                )}
                <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                  <table className="w-full min-w-[320px] border-collapse text-left">
                    <thead>
                      <tr className="bg-surface-1">
                        <th scope="col" className="w-[30%] px-3 py-3 text-[12px] font-bold uppercase tracking-[0.08em] text-muted-foreground md:px-4">
                          Parameter
                        </th>
                        {table.map((q, qi) => (
                          <th key={`${qi}-${q.title}`} scope="col" className="px-3 py-3 text-[14px] font-black leading-snug text-foreground md:px-4 md:text-[15px]">
                            {q.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((label) => (
                        <tr key={label} className="border-t border-border align-top">
                          <th scope="row" className="px-3 py-2.5 text-[13px] font-semibold leading-snug text-muted-foreground md:px-4 md:py-3">
                            {label}
                          </th>
                          {table.map((q, qi) => (
                            <td key={`${qi}-${q.title}`} className="px-3 py-2.5 text-[13.5px] font-semibold leading-snug text-foreground md:px-4 md:py-3 md:text-[14px]">
                              {valueOf(q, label)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {beside && band}
              </div>
            )}
          </div>
        )}

        {!beside && band}
      </div>
    </section>
  );
}
