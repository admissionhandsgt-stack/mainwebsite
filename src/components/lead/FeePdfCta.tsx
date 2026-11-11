import { FileDown } from "lucide-react";
import { pageCopy } from "@/lib/pageCopy";
import { refFor } from "@/lib/feePdfRefs";
import { hasFeePdf } from "@/lib/feePdfs";

/**
 * "Get the <State> PG fee & stipend PDF on WhatsApp" (2026-11-11): a plain link that opens WhatsApp on the official
 * number with the request typed; the reply with the PDF comes from lib/waPdf.ts. Shown only for a state whose PDF is
 * built. A link, not a script: no pop-up, no stacking on the nudges. Taps reach GA4 and AutoLoom through ClickTracker
 * (`whatsapp_click` with this placement). Words: Admin → Content → "Site: PG fee PDF on WhatsApp".
 */
export default async function FeePdfCta({ state, placement, className = "" }: { state: string; placement: string; className?: string }) {
  if (!(await hasFeePdf(state))) return null;
  const ref = refFor(state);
  const c = await pageCopy("site.fee_pdf", { state, ref });
  const number = c.number.replace(/\D/g, "");
  if (!/^91\d{10}$/.test(number)) return null;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(c.prefill)}`;
  return (
    <section className={`container-custom pt-6 ${className}`}>
    <div className="rounded-2xl border border-accent/30 bg-accent-soft/60 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-white" aria-hidden="true">
            <FileDown className="h-5 w-5" />
          </span>
          <div>
            <p className="font-heading text-[16px] font-bold text-foreground">{c.title}</p>
            <p className="mt-0.5 text-[14px] leading-relaxed text-muted-foreground">{c.body}</p>
          </div>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          data-placement={placement}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-[14.5px] font-bold text-white hover:brightness-95"
        >
          {c.button}
        </a>
      </div>
    </div>
    </section>
  );
}
