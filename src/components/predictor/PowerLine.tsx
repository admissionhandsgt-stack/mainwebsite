import Link from "@/components/ui/Link";
import { ArrowRight, Sparkles } from "lucide-react";
import { CONTACT_INFO } from "@/lib/constants";

/**
 * One line that says what a counsellor changes, set where a student is
 * looking at their own numbers. No hooks, so it works in server and client
 * trees alike.
 */
export default function PowerLine({
  lead,
  punch = "The difference is your counsellor.",
  cta = "Talk to an expert counsellor",
  href,
}: {
  lead: string;
  punch?: string;
  cta?: string;
  /** Defaults to WhatsApp. */
  href?: string;
}) {
  const wa = `https://wa.me/${CONTACT_INFO.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
    "Hello AdmissionHands, I would like to talk to an expert counsellor about my NEET admission.",
  )}`;
  const target = href ?? wa;
  const external = !href;
  const cls =
    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-primary-strong px-4 text-[14px] font-bold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5";
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-primary/25 bg-primary-soft p-5 text-foreground sm:flex-row sm:items-center sm:justify-between md:px-7">
      <p className="flex items-start gap-3 text-[15px] leading-snug">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong dark:text-primary" aria-hidden="true" />
        <span>
          <span className="text-muted-foreground">{lead} </span>
          <span className="font-heading font-extrabold text-primary-strong dark:text-primary">
            {punch}
          </span>
        </span>
      </p>
      {external ? (
        <a href={target} target="_blank" rel="noopener noreferrer" className={cls}>
          {cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      ) : (
        <Link href={target} className={cls}>
          {cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
