import { ArrowRight, BadgeCheck, Building2, Database, FileCheck2, ShieldCheck, Users } from "lucide-react";
import Link from "@/components/ui/Link";
import { OFFICE } from "@/lib/constants";
import { pageCopy } from "@/lib/pageCopy";

/**
 * The refund promise, and the team's {students} figure made checkable without naming a student (owner, 2026-11-27).
 *
 * `strip`: one line — the promise, the small print and the terms link — inside a conversion block (Expert Counselling's
 * card, the homepage trust band, the ads page's form). `full` (Know Us, Services): the promise beside "{students}
 * students in {years} years — and why their names are not here", with four things a family can check for itself.
 * The promise's words are the owner's policy and sit, in the same terms, in the payment & refund policy
 * (/terms#payment). Words: Admin → Content → "Site: refund promise and our students".
 */
const TERMS = "/terms#payment";
const ICONS = [FileCheck2, Users, Building2, Database];

export default async function RefundPromise({
  variant = "full",
  placement,
  className = "",
}: {
  variant?: "full" | "strip";
  placement: string;
  className?: string;
}) {
  const figures = await pageCopy("page.services.figures");
  const c = await pageCopy("site.promise", {
    students: figures.students,
    years: figures.years,
    office: `${OFFICE.street}, ${OFFICE.locality}`,
    hours: OFFICE.hoursShort,
  });

  if (variant === "strip") {
    return (
      <div className={`flex items-start gap-3 rounded-2xl border border-accent/35 bg-accent-soft px-4 py-3 ${className}`}>
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
        <p className="text-[14px] leading-snug text-foreground">
          <strong className="font-bold">{c.title}.</strong> <span className="text-muted-foreground">{c.fine}</span>{" "}
          <Link href={TERMS} data-placement={`promise_${placement}`} className="whitespace-nowrap font-semibold text-accent underline-offset-2 hover:underline">
            {c.terms_link} →
          </Link>
        </p>
      </div>
    );
  }

  const checks = c.verify_items
    .split("\n")
    .map((l) => l.split("|").map((s) => s.trim()))
    .filter(([title, text, href]) => title && text && href?.startsWith("/"));

  return (
    <section className={`container-custom py-10 md:py-14 ${className}`} aria-labelledby={`promise-${placement}`}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-stretch">
        <div className="flex flex-col rounded-3xl border-2 border-accent/40 bg-accent-soft p-6 md:p-7">
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {c.badge}
          </p>
          <h2 id={`promise-${placement}`} className="font-heading mt-4 text-[clamp(1.35rem,2.6vw,1.85rem)] font-extrabold leading-tight text-foreground">
            {c.title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-foreground">{c.text}</p>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{c.fine}</p>
          <Link
            href={TERMS}
            data-placement={`promise_${placement}`}
            className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[14.5px] font-semibold text-accent hover:underline"
          >
            {c.terms_link} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 md:p-7">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-strong dark:text-primary">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> {figures.students} · {figures.years} years
          </p>
          <h2 className="font-heading mt-3 text-[clamp(1.2rem,2.3vw,1.6rem)] font-extrabold leading-tight text-foreground">{c.count_title}</h2>
          <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">{c.count_text}</p>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {checks.map(([title, text, href], i) => {
              const Icon = ICONS[i % ICONS.length];
              return (
                <li key={title}>
                  <Link
                    href={href}
                    className="flex h-full min-h-12 gap-3 rounded-2xl border border-border bg-surface-1 p-3.5 transition-colors hover:border-primary/40"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-[14.5px] font-bold leading-snug text-foreground">{title}</span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{text}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
