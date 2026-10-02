import { InlineLeadForm } from "@/components/lead/InlineLeadForm";

/**
 * The enquiry block, wrapped so a page can drop it in with one line.
 *
 * Before this, a form existed on four pages only — not on the homepage, not on
 * the cutoff or college pages. Those are the pages someone reads at eleven at
 * night, and they had no way to leave a number.
 */
export default function LeadCapture({
  level = "pg",
  source,
  title,
  body,
  points,
}: {
  level?: "ug" | "pg";
  source: string;
  title?: string;
  body?: string;
  points?: string[];
}) {
  /**
   * Blank is absent, which `??` does not believe.
   *
   * The homepage was rendering an **empty `<h2>`** above the enquiry form: the
   * heading comes from `site_settings`, an unset setting arrives as `""`, and
   * `??` only falls back on null or undefined. This is the trap `pick()` in
   * `lib/copy.ts` exists for, applied here so the component is safe whoever
   * calls it rather than only when the caller remembers.
   */
  const given = (v?: string) => (v && v.trim() ? v : undefined);

  const heading =
    given(title) ??
    (level === "ug"
      ? "Tell us your rank. We will tell you where it actually lands."
      : "Tell us your rank. We will tell you where it actually lands.");

  const blurb =
    given(body) ??
    (level === "ug"
      ? "Send your NEET UG rank, category and domicile. We check it against every published round we hold and come back with the colleges it genuinely reaches — not a guess."
      : "Send your NEET PG rank and category. We check it against every published round we hold and come back with the seats it genuinely reaches — not a guess.");

  const bullets =
    points?.filter(Boolean).length
      ? points!.filter(Boolean)
      : level === "ug"
        ? [
            "Checked against published closing ranks, both years",
            "All India and your state counselling, side by side",
            "Fees and seat details where the authority published them",
            "A counsellor replies, not an autoresponder",
          ]
        : [
            "Checked against two years of published closing ranks",
            "AIQ and state counselling handled together",
            "Fees, stipend and bond resolved into a net cost",
            "A counsellor replies, not an autoresponder",
          ];

  return (
    <section
      id="enquiry"
      className="container-custom mb-16 mt-4 scroll-mt-24"
      aria-labelledby="enquiry-heading"
    >
      <div className="relative overflow-hidden rounded-xl border border-transparent bg-gradient-to-br from-slate-900 to-cyan-950 p-6 text-white shadow-2xl dark:border-slate-800 dark:from-slate-950 dark:to-cyan-950/80 md:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-500 opacity-20 mix-blend-multiply blur-3xl" />

        <div className="relative z-10 grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2
              id="enquiry-heading"
              className="mb-3 text-2xl font-black leading-tight tracking-tight md:text-3xl"
            >
              {heading}
            </h2>
            <p className="mb-5 text-sm font-bold leading-relaxed text-cyan-100/70 md:text-base">
              {blurb}
            </p>
            <ul className="space-y-2">
              {bullets.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500"
                  >
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-sm font-bold text-cyan-50">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-md">
            <InlineLeadForm source={source} level={level} />
          </div>
        </div>
      </div>
    </section>
  );
}
