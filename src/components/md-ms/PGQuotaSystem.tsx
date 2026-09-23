"use client";

import React, { useState, useEffect } from "react";
import type { PgQuota } from '@/lib/pgContent';
import { motion } from "framer-motion";
import { CheckCircle2, Phone } from "lucide-react";
import { useCTA } from "@/hooks/useCTA";

const SHIPPED_QUOTACARDS = [
  {
    title: "All India Quota",
    percentage: "50%",
    colorClass: "blue",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    percentColor: "text-cyan-400",
    iconColor: "text-cyan-400",
    bulletColor: "text-cyan-200/80",
    bullets: [
      "Open to all domiciles",
      "Managed via MCC portal",
      "Government college seats",
    ],
  },
  {
    title: "State Quota",
    percentage: "50%",
    colorClass: "emerald",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    percentColor: "text-emerald-400",
    iconColor: "text-emerald-400",
    bulletColor: "text-emerald-200/80",
    bullets: [
      "Domicile-based allocation",
      "Via state counselling portals",
      "Includes institutional preference",
    ],
  },
  {
    title: "Deemed Universities",
    percentage: "100%",
    colorClass: "violet",
    bg: "bg-teal-500/10",
    border: "border-teal-500/20",
    percentColor: "text-teal-400",
    iconColor: "text-teal-400",
    bulletColor: "text-teal-200/80",
    bullets: [
      "NEET PG based admission",
      "Centralized via MCC",
      "Higher fee structure applies",
    ],
  },
  {
    title: "Central Universities",
    percentage: "100%",
    colorClass: "amber",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    percentColor: "text-amber-400",
    iconColor: "text-amber-400",
    bulletColor: "text-amber-200/80",
    bullets: [
      "AIIMS, JIPMER & similar",
      "Managed via MCC counselling",
      "Highly competitive seats",
    ],
  },
];

export const PGQuotaSystem = ({ items: fromCms }: { items?: PgQuota[] | null } = {}) => {
  // The CMS supplies the words; everything visual stays with the shipped item
  // at the same position, so a design change is a code change and a copy
  // change is not. Extra CMS rows reuse the last item's styling.
  const quotaCards = (() => {
    const cms = fromCms;
    if (!cms?.length) return SHIPPED_QUOTACARDS;
    return cms.map((_, i) => {
      const base = SHIPPED_QUOTACARDS[i] ?? SHIPPED_QUOTACARDS[SHIPPED_QUOTACARDS.length - 1];
      return {
          ...base,
          title: cms[i].title ?? base.title,
          percentage: cms[i].percentage ?? base.percentage,
          bullets: cms[i].bullets ?? base.bullets,
      };
    });
  })();

  const [mounted, setMounted] = useState(false);
  const CTA = useCTA();

  useEffect(() => setMounted(true), []);

  return (
    <section className="py-12 md:py-16 bg-slate-950 text-white">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 15 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border border-white/20 bg-white/10 text-cyan-300 mb-4">
            Quota System
          </span>
          <h2 className="text-2xl md:text-3xl font-black mb-3">
            Understanding PG{" "}
            <span className="bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
              Seat Distribution
            </span>
          </h2>
          <p className="text-sm text-cyan-100/70 max-w-xl mx-auto">
            PG medical seats are distributed across multiple quota systems. Understanding each one is key to maximizing your admission chances.
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Left Column: AIQ + State side-by-side */}
          <motion.div
            initial={mounted ? { opacity: 0, y: 15 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 gap-2.5 md:gap-4"
          >
            {quotaCards.slice(0, 2).map((card) => (
              <div
                key={card.title}
                className={`${card.bg} border ${card.border} rounded-lg md:rounded-xl p-3.5 md:p-5`}
              >
                <p className={`text-2xl md:text-4xl font-black ${card.percentColor} mb-0.5 md:mb-1`}>
                  {card.percentage}
                </p>
                <p className="text-xs md:text-sm font-black text-white mb-2 md:mb-3">{card.title}</p>
                <ul className="space-y-1 md:space-y-2">
                  {card.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-1.5 md:gap-2">
                      <CheckCircle2 className={`w-3 h-3 md:w-3.5 md:h-3.5 ${card.iconColor} flex-shrink-0 mt-0.5`} />
                      <span className={`text-[10.5px] md:text-xs ${card.bulletColor}`}>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>

          {/* Right Column: Deemed + Central stacked */}
          <motion.div
            initial={mounted ? { opacity: 0, y: 15 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-col gap-2.5 md:gap-4"
          >
            {quotaCards.slice(2).map((card) => (
              <div
                key={card.title}
                className={`${card.bg} border ${card.border} rounded-lg md:rounded-xl p-3.5 md:p-5`}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  <div>
                    <p className={`text-2xl md:text-4xl font-black ${card.percentColor} mb-0.5 md:mb-1`}>
                      {card.percentage}
                    </p>
                    <p className="text-xs md:text-sm font-black text-white mb-2 md:mb-3">{card.title}</p>
                  </div>
                  <ul className="space-y-1 md:space-y-2 mt-1 flex-1">
                    {card.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-1.5 md:gap-2">
                        <CheckCircle2 className={`w-3 h-3 md:w-3.5 md:h-3.5 ${card.iconColor} flex-shrink-0 mt-0.5`} />
                        <span className={`text-[10.5px] md:text-xs ${card.bulletColor}`}>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 15 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white/5 rounded-lg md:rounded-xl p-3.5 md:p-5 mt-5 md:mt-6 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <p className="text-xs md:text-sm text-cyan-100/80 font-bold text-center sm:text-left">
            We manage registrations and strategy across ALL quota systems simultaneously.
          </p>
          <button
            onClick={() => CTA.call()}
            className="inline-flex items-center gap-1.5 px-4 py-2 md:px-5 md:py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-600 text-white text-[10px] md:text-xs font-black uppercase tracking-wider hover:shadow-lg hover:shadow-cyan-500/25 transition-all flex-shrink-0"
          >
            <Phone className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Call Us Now
          </button>
        </motion.div>
      </div>
    </section>
  );
};
