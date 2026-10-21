import { ArrowRight, CalendarClock, Phone, TrendingUp } from "lucide-react";
import Link from "@/components/ui/Link";
import CounsellorFaces from "@/components/lead/CounsellorFaces";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { CONTACT_INFO } from "@/lib/constants";

/**
 * The result-day card on a round page (2026-10-21), placed high — before the long tables — because
 * the decision a result forces (report, keep, or try for a better seat) is exactly when a counsellor
 * is worth a call. WhatsApp and a call are one tap; the predictor is the quieter third way.
 * Every word comes from Admin → Content ("Page: NEET PG round result — body").
 */
export default function RoundDecision({
  eyebrow,
  title,
  body,
  fact,
  join,
  waLabel,
  waText,
  callLabel,
  predictorLabel,
  predictorHref,
  placement,
}: {
  eyebrow: string;
  title: string;
  body: string;
  fact?: string;
  join?: string;
  waLabel: string;
  waText: string;
  callLabel: string;
  predictorLabel: string;
  predictorHref: string;
  placement: string;
}) {
  const wa = `https://wa.me/${CONTACT_INFO.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`;
  return (
    <section className="rounded-3xl border border-primary/25 bg-surface-2 p-5 md:p-7" aria-labelledby="round-decision">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="inline-flex items-center rounded-full border border-primary/25 bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-strong dark:text-primary">
            {eyebrow}
          </p>
          <h2 id="round-decision" className="font-heading mt-3 text-[clamp(1.3rem,2.6vw,1.75rem)] font-extrabold leading-tight text-foreground">
            {title}
          </h2>
          <p className="mt-2 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground">{body}</p>
          {(fact || join) && (
            <ul className="mt-4 space-y-2 text-[14px] leading-snug text-foreground">
              {fact && (
                <li className="flex gap-2.5">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{fact}</span>
                </li>
              )}
              {join && (
                <li className="flex gap-2.5">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{join}</span>
                </li>
              )}
            </ul>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3 lg:w-[22rem]">
          {/* Faces only: four named cards stacked made the card a phone's whole screen. */}
          <CounsellorFaces tone="light" />
          <a
            href={wa}
            target="_blank"
            rel="noopener"
            data-placement={placement}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 text-[15px] font-bold text-accent-foreground shadow-sm transition-colors hover:bg-accent/90"
          >
            <WhatsAppIcon size={18} aria-hidden="true" /> {waLabel}
          </a>
          <a
            href={`tel:${CONTACT_INFO.phone}`}
            data-placement={placement}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-[15px] font-bold text-foreground transition-colors hover:border-primary/40"
          >
            <Phone className="h-4 w-4" aria-hidden="true" /> {callLabel}
          </a>
          <Link
            href={predictorHref}
            className="inline-flex items-center justify-center gap-1.5 text-[14px] font-semibold text-primary-strong hover:underline dark:text-primary"
          >
            {predictorLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
