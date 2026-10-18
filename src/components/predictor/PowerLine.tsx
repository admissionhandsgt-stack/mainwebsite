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
    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-[14px] font-bold text-slate-900 shadow-sm transition-transform hover:-translate-y-0.5";
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 p-5 text-white shadow-lift sm:flex-row sm:items-center sm:justify-between md:px-7">
      <p className="flex items-start gap-3 text-[15px] leading-snug">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
        <span>
          <span className="text-cyan-50/85">{lead} </span>
          <span className="font-heading font-extrabold text-transparent bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text">
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
