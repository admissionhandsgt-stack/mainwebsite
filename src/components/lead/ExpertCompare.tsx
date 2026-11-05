import { ArrowRight, Check, Phone, Sparkles } from "lucide-react";
import Link from "@/components/ui/Link";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import CounsellorFaces from "@/components/lead/CounsellorFaces";
import { CONTACT_INFO } from "@/lib/constants";
import { pageCopy } from "@/lib/pageCopy";

/**
 * Free rank check vs Expert Counselling (owner, 2026-11-05): what the free side gives and what a counsellor adds, side
 * by side, with "Get Expert Counselling" as the one action. No package fees on the site — the counsellor tells the
 * family before anything starts — and no promise of a seat (the note says counselling allots it, as TrustShield does).
 * Words: Admin → Content → "Free check vs Expert Counselling" (lists one item per line).
 * On the predictor right after the tool, where a free report has just been read, and on /services.
 */
/** `freeLink`: the free card ends with a link to the predictor (not on the predictor itself). */
export default async function ExpertCompare({ placement, freeLink = false }: { placement: string; freeLink?: boolean }) {
  const c = await pageCopy("page.expert", {});
  const lines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);
  const free = lines(c.free_items);
  const expert = lines(c.expert_items);
  const wa = `https://wa.me/${CONTACT_INFO.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(c.wa_text)}`;

  return (
    <section className="container-custom py-10 md:py-14" aria-labelledby={`expert-${placement}`}>
      <div className="max-w-[78ch]">
        <p className="inline-flex items-center rounded-full border border-primary/25 bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-strong dark:text-primary">
          {c.eyebrow}
        </p>
        <h2 id={`expert-${placement}`} className="font-heading mt-3 text-[clamp(1.35rem,2.8vw,2rem)] font-extrabold leading-tight text-foreground">
          {c.title}
        </h2>
        <p className="mt-2 text-[15.5px] leading-relaxed text-muted-foreground">{c.intro}</p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        {/* The free side: plain, so the eye goes to the right. */}
        <div className="rounded-3xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{c.free_badge}</span>
            <h3 className="font-heading text-lg font-extrabold text-foreground">{c.free_title}</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {free.map((item) => (
              <li key={item} className="flex gap-2.5 text-[14.5px] leading-snug text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {freeLink && (
            <Link
              href="/neet-college-predictor"
              className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary-strong hover:underline dark:text-primary"
            >
              {c.free_link} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>

        {/* Expert Counselling: the card the section is for. */}
        <div className="rounded-3xl border-2 border-primary/40 bg-primary-soft/50 p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-strong px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground">
                <Sparkles className="h-3 w-3" aria-hidden="true" /> {c.expert_badge}
              </span>
              <h3 className="font-heading text-xl font-extrabold text-foreground">{c.expert_title}</h3>
            </div>
            <CounsellorFaces tone="light" />
          </div>
          <ul className="mt-4 grid gap-x-6 gap-y-3 md:grid-cols-2">
            {expert.map((item) => (
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
              data-placement={`expert_${placement}`}
              className="inline-flex min-h-12 flex-[1_1_15rem] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-6 text-[15px] font-bold text-accent-foreground shadow-sm transition-colors hover:bg-accent/90"
            >
              <WhatsAppIcon size={18} aria-hidden="true" /> {c.cta}
            </a>
            <a
              href={`tel:${CONTACT_INFO.phone}`}
              data-placement={`expert_${placement}`}
              className="inline-flex min-h-12 flex-[1_1_12rem] items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-6 text-[15px] font-bold text-foreground transition-colors hover:border-primary/40"
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
