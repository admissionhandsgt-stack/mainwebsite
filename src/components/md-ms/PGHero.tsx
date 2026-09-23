"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Phone, Sparkles, CheckCircle2 } from "lucide-react";
import { useCTA } from "@/hooks/useCTA";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface PGHeroStats {
  pgColleges: number;
  pgRanks: number;
  pgBranches: number;
}

interface PGHeroProps {
  /** Real counts from `src/lib/dataStats.ts`. Absent = the badge is dropped. */
  stats?: PGHeroStats;
  backgroundImageUrl?: string;
}

export const PGHero = ({ backgroundImageUrl, stats }: PGHeroProps) => {
  const CTA = useCTA();
  const bgImage = backgroundImageUrl || "/assets/images/hero/pg_hero_bg.avif";
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Counted from the database, not written by hand. The old list said
  // "250+ PG Colleges" against a real 2,168, and "95%+ Success Rate", which
  // is not a thing anyone can verify — the first student who checks is the
  // one deciding whether to trust us.
  const trustBadges = [
    stats?.pgColleges ? `${stats.pgColleges.toLocaleString("en-IN")} PG colleges` : null,
    stats?.pgRanks ? `${(stats.pgRanks / 100000).toFixed(1)} lakh closing ranks` : null,
    stats?.pgBranches ? `${stats.pgBranches} branches` : null,
    "2100+ students guided",
  ].filter(Boolean) as string[];

  return (
    <section
      id="pg-hero"
      className="relative flex items-center overflow-hidden py-12 md:py-16 bg-slate-950 text-white"
      role="banner"
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {bgImage && bgImage !== "none" && (
          <Image
            src={bgImage}
            alt="PG Medical Residents in Hospital"
            fill
            priority
            sizes="100vw"
            className="object-cover"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMjQwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDcwZTFlIi8+PC9zdmc+"
          />
        )}
        <div className="absolute inset-0 bg-slate-950/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/60" />
      </div>

      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Content */}
      <motion.div
        initial={mounted ? { opacity: 0, y: 15 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container-custom relative z-10 max-w-5xl mx-auto text-center lg:text-left"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-cyan-300 text-[10px] font-black tracking-widest uppercase mb-5 backdrop-blur-md">
          <Sparkles className="w-3 h-3 text-cyan-400" /> NEET PG 2025-26 · Expert Counselling
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-black text-white leading-[1.08] tracking-tight mb-5">
          Your MBBS Was the Beginning.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-300">
            Your Specialty Defines Your Legacy.
          </span>
        </h1>

        <p className="text-cyan-100/90 text-sm md:text-base font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 mb-7">
          From rank analysis to college reporting — every recommendation is checked against{" "}
          {stats?.pgRanks ? `${(stats.pgRanks / 100000).toFixed(1)} lakh published closing ranks` : "published closing ranks"}{" "}
          across {stats?.pgColleges ? stats.pgColleges.toLocaleString("en-IN") : "every"} PG college, with dual-quota
          handling and one named counsellor throughout.
        </p>

        <div className="flex flex-col xs:flex-row gap-3 justify-center lg:justify-start mb-8">
          <button
            onClick={() => CTA.call()}
            className="inline-flex items-center justify-center gap-2 bg-white dark:!bg-cyan-600 text-slate-900 dark:!text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-black text-xs sm:text-sm hover:bg-cyan-50 dark:!hover:bg-cyan-500 transition-all shadow-lg active:scale-95 w-full xs:w-auto"
          >
            <Phone className="w-4 h-4 shrink-0" /> Talk to a PG Expert
          </button>
          <button
            onClick={() => CTA.whatsapp("Hi, I need guidance for NEET PG counselling")}
            className="inline-flex items-center justify-center gap-2 border-2 border-white/60 backdrop-blur-sm text-white px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-black text-xs sm:text-sm hover:bg-white/10 transition-all active:scale-95 w-full xs:w-auto"
          >
            <WhatsAppIcon size={16} /> WhatsApp Us
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2">
          {trustBadges.map((badge, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-[10px] font-black text-cyan-200/80 uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {badge}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
};
