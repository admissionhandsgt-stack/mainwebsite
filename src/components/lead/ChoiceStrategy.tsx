import { Check, ListOrdered, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import CounsellorFaces from "@/components/lead/CounsellorFaces";
import { CONTACT_INFO } from "@/lib/constants";
import { pageCopy } from "@/lib/pageCopy";

/**
 * "Filling choices is the form; the order is the strategy" (owner, 2026-11-09: "choice filling will not get you the best
 * seat, an expert counsellor's strategy will … badhiya information lines but less gimmick … sab admin se"). Facts about
 * how MCC allots — order, upgrades, fee/bond/stipend, Freeze vs Float, rounds that move — then what a counsellor does,
 * and Expert Counselling on WhatsApp or a call. Never a promise of a seat (the note says counselling allots it, as
 * ExpertCompare and TrustShield do). Words: Admin → Content → "Page: NEET PG choice filling — strategy" (lists one
 * item per line). Tokens: {round}, {year}, {upgraded}, {last_year}; a line whose token has no value is left out.
 */
export default async function ChoiceStrategy({
  placement,
  tokens,
}: {
  placement: string;
  tokens: { round?: string; year: number; upgraded?: string; last_year?: string };
}) {
  const round = tokens.round || "this round";
  // Tokens without a value are not passed, so they stay "{upgraded}" and their line is dropped below.
  const c = await pageCopy("page.pg_choice_filling.strategy", {
    year: tokens.year,
    round,
    ...(tokens.upgraded ? { upgraded: tokens.upgraded } : {}),
    ...(tokens.last_year ? { last_year: tokens.last_year } : {}),
  });
  const lines = (v: string) =>
    String(v ?? "")
      .split("\n")
      .map((s) => s.trim())
      // A line that needs a figure we do not have (no earlier year's round 2) goes, rather than print a blank.
      .filter((s) => s && !/\{\w+\}/.test(s));
  const facts = lines(c.points);
  const helps = lines(c.expert_points);
  const wa = `https://wa.me/${CONTACT_INFO.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(c.wa_text)}`;

  return (
    <section className="container-custom py-10 md:py-14" aria-labelledby={`strategy-${placement}`}>
      <div className="max-w-[78ch]">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-strong dark:text-primary">
          <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" /> {c.eyebrow}
        </p>
        <h2 id={`strategy-${placement}`} className="font-heading mt-3 text-[clamp(1.35rem,2.8vw,2rem)] font-extrabold leading-tight text-foreground">
          {c.title}
        </h2>
        <p className="mt-2 text-[15.5px] leading-relaxed text-muted-foreground">{c.intro}</p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <div>
          {c.facts_title && <h3 className="font-heading mb-3 text-lg font-extrabold text-foreground">{c.facts_title}</h3>}
          <ol className="grid gap-3 min-[1800px]:grid-cols-2">
            {facts.map((f, i) => {
              // "Wrong order, wrong seat. MCC gives you …" — the first sentence is the point, in bold.
              const cut = f.search(/\.\s/);
              const head = cut > 0 && cut < 70 ? f.slice(0, cut + 1) : null;
              const rest = head ? f.slice(cut + 2) : f;
              return (
                <li key={f} className="flex gap-3 rounded-2xl border border-border bg-card p-4 text-[14.5px] leading-relaxed text-foreground">
                  <span className="tnum mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[12px] font-bold text-primary-strong dark:text-primary">
                    {i + 1}
                  </span>
                  <span>
                    {head && <strong className="font-bold">{head} </strong>}
                    {rest}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="rounded-3xl border-2 border-primary/40 bg-primary-soft/50 p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-heading text-lg font-extrabold text-foreground">{c.expert_title}</h3>
            <CounsellorFaces tone="light" />
          </div>
          <ul className="mt-4 space-y-3">
            {helps.map((item) => (
              <li key={item} className="flex gap-2.5 text-[14.5px] leading-snug text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong dark:text-primary" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={wa}
              target="_blank"
              rel="noopener"
              data-placement={`strategy_${placement}`}
              className="inline-flex min-h-12 flex-[1_1_13rem] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 text-[15px] font-bold text-accent-foreground shadow-sm transition-colors hover:bg-accent/90"
            >
              <WhatsAppIcon size={18} aria-hidden="true" /> {c.cta}
            </a>
            <a
              href={`tel:${CONTACT_INFO.phone}`}
              data-placement={`strategy_${placement}`}
              className="inline-flex min-h-12 flex-[1_1_11rem] items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-6 text-[15px] font-bold text-foreground transition-colors hover:border-primary/40"
            >
              <Phone className="h-4 w-4" aria-hidden="true" /> {c.call}
            </a>
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">{c.note}</p>
        </div>
      </div>
    </section>
  );
}
