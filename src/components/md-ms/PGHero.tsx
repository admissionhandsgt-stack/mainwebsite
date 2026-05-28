"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Phone, Sparkles, CheckCircle2 } from "lucide-react";
import { useCTA } from "@/hooks/useCTA";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface PGHeroProps {
  backgroundImageUrl?: string;
}

export const PGHero = ({ backgroundImageUrl }: PGHeroProps) => {
  const CTA = useCTA();
  const bgImage = backgroundImageUrl || "/assets/images/hero/pg_hero_bg.avif";
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const trustBadges = [
    "2100+ Students Guided",
    "95%+ Success Rate",
    "250+ PG Colleges",
    "All Quotas Covered",
  ];

  return (
    <section
      id="pg-hero"
      className="relative min-h-[70vh] md:min-h-[80vh] flex items-center overflow-hidden py-16 md:py-24 bg-slate-950 text-white"
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
      <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      {/* Content */}
      <motion.div
        initial={mounted ? { opacity: 0, y: 15 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container-custom relative z-10 max-w-5xl mx-auto text-center lg:text-left"
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-300 text-[10px] font-black tracking-widest uppercase mb-5 backdrop-blur-md">
          <Sparkles className="w-3 h-3 text-blue-400" /> NEET PG 2025-26 · Expert Counselling
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-black text-white leading-[1.08] tracking-tight mb-5">
          Your MBBS Was the Beginning.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">
            Your Specialty Defines Your Legacy.
          </span>
        </h1>

        <p className="text-blue-100/90 text-sm md:text-base font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 mb-7">
          From rank analysis to college reporting — we engineer PG admissions with 5-year cutoff intelligence, dual-quota mastery, and dedicated 1-on-1 mentorship across 250+ medical colleges.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
          <button
            onClick={() => CTA.call()}
            className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-50 transition-all shadow-lg active:scale-95"
          >
            <Phone className="w-4 h-4" /> Book Free PG Strategy Call
          </button>
          <button
            onClick={() => CTA.whatsapp("Hi, I need guidance for NEET PG counselling")}
            className="inline-flex items-center justify-center gap-2 border-2 border-white/60 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-white/10 transition-all active:scale-95"
          >
            <WhatsAppIcon size={16} /> WhatsApp Us
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2">
          {trustBadges.map((badge, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-200/80 uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {badge}
            </span>
          ))}
        </div>
      </motion.div>
    </section>
  );
};
