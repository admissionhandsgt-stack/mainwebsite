import { Phone } from "lucide-react";
import QuickPgForm from "@/components/lead/QuickPgForm";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { CONTACT_INFO } from "@/lib/constants";
import { getContactInfo } from "@/lib/content";
import { pageCopy } from "@/lib/pageCopy";

/**
 * The quick PG enquiry (2026-11-11, from the competitive review: a short form where the reader already has the
 * answer). Two ways in, side by side: WhatsApp with the college or topic already written ("Hi, I need PG admission
 * guidance for SMS Medical College, Jaipur…"), or name + mobile + rank for a call back. The lead's source names the
 * page, so the counsellor opens knowing what was being read. Words: Admin → Content → "Site: quick PG enquiry".
 *
 * `college` on a college page, `topic` on a data page ("MD Radiology in Rajasthan", "NEET PG cut off").
 */
export default async function QuickAsk({
  college,
  topic,
  source,
  placement,
  className = "",
}: {
  college?: string;
  topic?: string;
  source: string;
  placement: string;
  className?: string;
}) {
  const subject = college ?? topic ?? "PG admission";
  const [copy, contact] = await Promise.all([pageCopy("site.quick_form", { college: subject, topic: subject }), getContactInfo().catch(() => null)]);
  const waNumber = (contact?.whatsappNumber || CONTACT_INFO.whatsapp).replace(/\D/g, "");
  const phone = contact?.phoneNumber || CONTACT_INFO.phone;
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(copy.wa_text)}`;
  const title = college ? copy.title : copy.title_topic;
  if (!title) return null;
  return (
    <section className={`rounded-3xl border border-primary/25 bg-gradient-to-br from-primary-soft to-background p-5 md:p-6 ${className}`} aria-labelledby={`qa-${placement}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 id={`qa-${placement}`} className="font-heading text-[clamp(1.15rem,2.2vw,1.45rem)] font-extrabold leading-tight text-foreground">
            {title}
          </h2>
          {copy.body && <p className="mt-1.5 max-w-[70ch] text-[14.5px] leading-relaxed text-muted-foreground">{copy.body}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={waHref}
            target="_blank"
            rel="noopener"
            data-placement={`${placement}_wa`}
            className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-4 text-[14.5px] font-bold text-accent-foreground hover:bg-accent/90"
          >
            <WhatsAppIcon size={17} aria-hidden="true" /> {copy.wa}
          </a>
          <a
            href={`tel:${phone}`}
            data-placement={`${placement}_call`}
            aria-label={`Call ${phone}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-card px-3 text-foreground hover:border-primary/40"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className="mt-4">
        <QuickPgForm
          source={source}
          waHref={waHref}
          copy={{ name: copy.name, phone: copy.phone, rank: copy.rank, rank_hint: copy.rank_hint, button: copy.button, done: copy.done, privacy: copy.privacy }}
        />
      </div>
    </section>
  );
}
