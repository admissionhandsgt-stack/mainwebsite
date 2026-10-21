import React from "react";
import { mbbsData } from "@/data/mbbs-india";
import type { MbbsContent } from "@/lib/pageContent";
import type { CopyFields } from "@/lib/pageCopyDefaults";
import { ShieldCheck, Target, Zap, Clock, FileSearch, Headphones, TrendingUp, Search, Heart, UserCheck } from "lucide-react";

const icons = [Target, Zap, ShieldCheck, Clock, FileSearch, Headphones];
const whyIcons = [TrendingUp, Search, Heart, UserCheck];

/**
 * "How we help you secure the best MBBS seat" — the four phases — and, under them, why students trust
 * Admission Hands (owner, 2026-10-21: nothing hidden). The second was a section of its own; it had been
 * switched off as making the same case, and its four points are back here, compactly. Each part follows
 * its row in Admin → Content → Page layout ("College selection guide", "Why Admission Hands").
 */
export const CollegeSelectionGuide = ({
  data = mbbsData,
  why = null,
  phases = true,
}: {
  data?: MbbsContent;
  why?: CopyFields<"page.mbbs.why"> | null;
  phases?: boolean;
}) => {
  const { whatWeDo, whyUs } = data;
  const whyPoints = why ? whyUs.points.filter((p) => p.title) : [];
  // The admin's title, with "Secure" picked out when it has the word.
  const at = whatWeDo.title.indexOf("Secure");
  const title =
    at >= 0 ? (
      <>
        {whatWeDo.title.slice(0, at)}
        <span className="text-primary-strong dark:text-primary">Secure</span>
        {whatWeDo.title.slice(at + "Secure".length)}
      </>
    ) : (
      whatWeDo.title
    );
  const WhyHeading = phases ? "h3" : "h2";

  return (
    <section className="bg-background py-12 md:py-16">
      <div className="container-custom">
        {phases && (
          <>
            <div className="mx-auto mb-7 max-w-3xl text-center md:mb-10">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-[11.5px] font-black uppercase tracking-widest text-primary-strong dark:text-primary">
                <Target className="h-3.5 w-3.5" aria-hidden="true" />
                Strategic Approach
              </p>
              <h2 className="font-heading mt-4 text-[1.75rem] font-black leading-tight tracking-tight text-foreground [text-wrap:balance] md:text-4xl">
                {title}
              </h2>
              {whatWeDo.subtitle && (
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{whatWeDo.subtitle}</p>
              )}
            </div>

            {/* Two up on a phone: the "Phase N" line carries the order the arrows used to. */}
            <ol className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
              {whatWeDo.points.map((point, idx) => {
                const Icon = icons[idx] || Target;
                return (
                  <li key={idx} className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-3.5 shadow-sm md:p-5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground md:h-11 md:w-11">
                        <Icon className="h-[18px] w-[18px] md:h-5 md:w-5" aria-hidden="true" />
                      </span>
                      <span className="tnum font-heading select-none text-2xl font-black leading-none text-primary/15 md:text-4xl" aria-hidden="true">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="mt-3 text-[11.5px] font-black uppercase tracking-widest text-primary-strong dark:text-primary">Phase {idx + 1}</p>
                    <h3 className="mt-1 break-words text-[14.5px] font-black leading-snug text-foreground md:text-base">{point.title}</h3>
                    <p className="mt-1 break-words text-[13px] leading-relaxed text-muted-foreground md:text-[13.5px]">{point.desc}</p>
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {why && whyPoints.length > 0 && (
          <div className={`rounded-2xl border border-border bg-surface-1 p-4 md:p-6 ${phases ? "mt-6 md:mt-8" : ""}`}>
            <div className="md:flex md:items-end md:justify-between md:gap-8">
              <WhyHeading className="font-heading text-xl font-black leading-tight tracking-tight text-foreground md:text-2xl">
                {why.title}
              </WhyHeading>
              {why.intro && <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground md:mt-0 md:max-w-md md:text-right">{why.intro}</p>}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {whyPoints.map((p, i) => {
                const Icon = whyIcons[i] || ShieldCheck;
                return (
                  <li key={`${i}-${p.title}`} className="flex min-w-0 gap-3 rounded-xl border border-border bg-card p-3 md:p-4">
                    <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-strong dark:text-primary sm:flex" aria-hidden="true">
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <p className="break-words text-[14.5px] font-bold leading-snug text-foreground">{p.title}</p>
                      {p.desc && <p className="mt-0.5 break-words text-[13px] leading-snug text-muted-foreground">{p.desc}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};
