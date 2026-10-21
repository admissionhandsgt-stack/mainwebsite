import React from "react";
import { CheckCircle2, FileText, Phone, XCircle } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { CONTACT_INFO } from "@/lib/constants";
import { pageCopy } from "@/lib/pageCopy";

const lines = (v: string) =>
  v
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/**
 * Who qualifies for an NRI seat (rebuilt 2026-10-21).
 *
 * The four groups — NRI, NRI-sponsored, OCI/PIO, foreign national — were tabs, so three of the four were
 * out of sight until clicked (owner: "koi bhi information hide na ho"). They are four cards side by side
 * now, every requirement and document in view, and every word is the admin's: Admin → Content → Text &
 * numbers → "Page: NRI quota — eligibility" (lists one item per line). `#eligibility` is the hero's
 * "Check eligibility" link.
 */
export default async function NRIEligibility() {
  const copy = await pageCopy("page.nri.eligibility");
  const c = copy as Record<string, string>;
  const groups = [1, 2, 3, 4]
    .map((n) => ({
      title: c[`g${n}_title`],
      def: c[`g${n}_def`],
      points: lines(c[`g${n}_points`]),
      not: lines(c[`g${n}_not`]),
      docs: c[`g${n}_docs`],
    }))
    .filter((g) => g.title);
  const general = lines(copy.general_points);
  const wa = `https://wa.me/${CONTACT_INFO.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(copy.wa_text)}`;

  return (
    <section id="eligibility" aria-labelledby="nri-eligibility-title" className="scroll-mt-24 bg-surface-1 py-12 md:py-16">
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="nri-eligibility-title" className="font-heading text-[1.75rem] font-black leading-tight tracking-tight text-foreground [text-wrap:balance] md:text-4xl">
            {copy.title} {copy.accent && <span className="text-primary-strong dark:text-primary">{copy.accent}</span>}
          </h2>
          {copy.intro && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground md:text-base">{copy.intro}</p>}
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {groups.map((g, gi) => (
            <li key={`${gi}-${g.title}`} className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
              <h3 className="font-heading text-[17px] font-black leading-snug text-foreground">{g.title}</h3>
              {g.def && <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{g.def}</p>}
              {(g.points.length > 0 || g.not.length > 0) && (
                <ul className="mt-3 space-y-1.5">
                  {g.points.map((p, pi) => (
                    <li key={`p${pi}-${p}`} className="flex gap-2 text-[14px] font-semibold leading-snug text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-strong dark:text-primary" aria-hidden="true" />
                      <span>{p}</span>
                    </li>
                  ))}
                  {g.not.map((p, pi) => (
                    <li key={`n${pi}-${p}`} className="flex gap-2 text-[14px] font-semibold leading-snug text-foreground">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
              {g.docs && (
                <div className="mt-auto pt-4">
                  <div className="rounded-xl border border-primary/15 bg-primary-soft/60 p-3">
                    <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-primary-strong dark:text-primary">
                      <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                      {copy.docs_label}
                    </p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-foreground/85">{g.docs}</p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {general.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6">
              <h3 className="font-heading text-xl font-black tracking-tight text-foreground">{copy.general_title}</h3>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {general.map((item, ii) => (
                  <li key={`${ii}-${item}`} className="flex items-start gap-2.5 text-[14.5px] font-semibold leading-snug text-foreground">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary ring-4 ring-primary-soft" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-col justify-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft/60 p-4 md:p-6">
            <p className="font-heading text-lg font-extrabold leading-snug text-foreground md:text-xl">
              {copy.cta_title} {copy.cta_accent && <span className="text-primary-strong dark:text-primary">{copy.cta_accent}</span>}
            </p>
            {copy.cta_body && <p className="text-[14px] leading-relaxed text-foreground/80">{copy.cta_body}</p>}
            <div className="flex flex-wrap gap-2.5">
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#25D366] px-5 text-[14px] font-bold text-white hover:bg-[#1fbf5b]"
              >
                <WhatsAppIcon className="h-4 w-4" /> {copy.cta_whatsapp}
              </a>
              <a
                href={`tel:${CONTACT_INFO.phone}`}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-5 text-[14px] font-bold text-foreground hover:border-primary/50"
              >
                <Phone className="h-4 w-4 text-primary-strong dark:text-primary" aria-hidden="true" /> {copy.cta_call}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
