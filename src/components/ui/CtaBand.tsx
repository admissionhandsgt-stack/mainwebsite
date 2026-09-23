"use client";

import Image from "next/image";
import { Phone, ArrowRight } from "lucide-react";
import { useCTA } from "@/hooks/useCTA";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface CtaBandProps {
  /** Headline. State the stake, not a slogan. */
  title: string;
  body: string;
  image: string;
  /** Label on the primary button. Says exactly what happens. */
  primaryLabel?: string;
  className?: string;
}

/**
 * The conversion band used part-way down long pages.
 *
 * Placed where a reader has already got something useful — after the process
 * explanation, after the college list — never as an interruption on arrival.
 */
export default function CtaBand({
  title,
  body,
  image,
  primaryLabel = "Talk to a counsellor",
  className = "",
}: CtaBandProps) {
  const CTA = useCTA();

  return (
    <section className={`container-custom py-12 md:py-16 ${className}`}>
      <div className="relative overflow-hidden rounded-3xl border border-border bg-slate-950">
        <Image
          src={image}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 1200px"
          className="object-cover object-center opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30" />
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="ambient-blob animate-drift-slow right-[-5rem] top-[-6rem] h-[18rem] w-[18rem] bg-primary/30" />
        </div>

        <div className="relative z-10 flex flex-col gap-7 p-8 md:flex-row md:items-center md:justify-between md:p-12">
          <div className="max-w-[56ch]">
            <h2 className="font-heading text-2xl md:text-[32px] font-extrabold leading-tight tracking-[-0.025em] text-white">
              {title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-300">{body}</p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <button
              onClick={() => CTA.call()}
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-6 py-3.5 text-sm font-bold text-white shadow-glow transition-all duration-200 hover:shadow-glow-lg hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <Phone className="h-4 w-4" />
              {primaryLabel}
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <button
              onClick={() => CTA.whatsapp()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/15 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <WhatsAppIcon size={16} />
              WhatsApp
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
