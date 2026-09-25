"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface RoundStep {
  tag: string;
  title: string;
  summary: string;
  detail: string[];
  /** The thing that costs people a seat in this round. */
  watch?: string;
}

/**
 * The counselling rounds, in order, each one openable.
 *
 * A timeline rather than a table because the order is the whole point — what
 * you may do in round 3 depends entirely on what you did in round 2, and a
 * table invites reading the interesting row first.
 *
 * Only one is open at a time: these are long, and a page of everything
 * expanded is a page nobody reads.
 */
export default function RoundTimeline({ steps }: { steps: RoundStep[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ol className="relative space-y-3">
      {steps.map((step, i) => {
        const isOpen = open === i;
        return (
          <li key={step.tag} className="relative">
            {/* The spine, drawn between the markers rather than behind them. */}
            {i < steps.length - 1 && (
              <span
                className="absolute left-[22px] top-12 bottom-[-12px] w-px bg-border"
                aria-hidden="true"
              />
            )}

            <div
              className={`relative rounded-2xl border transition-colors ${
                isOpen ? "border-primary/40 bg-primary-soft/40" : "border-border bg-card"
              }`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-start gap-4 p-4 text-left md:p-5"
              >
                <span
                  className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[12px] font-extrabold tracking-tight ${
                    isOpen
                      ? "bg-gradient-brand text-white shadow-glow"
                      : "border border-border bg-surface-2 text-muted-foreground"
                  }`}
                >
                  {step.tag}
                </span>

                <span className="min-w-0 flex-grow">
                  <span className="font-heading block text-[16px] font-bold leading-snug text-foreground md:text-[17px]">
                    {step.title}
                  </span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-muted-foreground">
                    {step.summary}
                  </span>
                </span>

                <ChevronDown
                  className={`mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div className="border-t border-border/70 px-4 pb-5 pt-4 md:px-5 md:pl-[76px]">
                  <ul className="space-y-2.5">
                    {step.detail.map((d) => (
                      <li key={d} className="flex gap-2.5 text-[14.5px] leading-relaxed text-foreground/90">
                        <span
                          className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          aria-hidden="true"
                        />
                        {d}
                      </li>
                    ))}
                  </ul>

                  {step.watch && (
                    <p className="mt-4 rounded-xl border border-signal-borderline/30 bg-signal-borderline/[0.07] px-4 py-3 text-[14px] leading-relaxed text-foreground">
                      <span className="font-bold text-signal-borderline">Where people lose a seat: </span>
                      {step.watch}
                    </p>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
