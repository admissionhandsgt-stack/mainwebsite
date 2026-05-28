"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Phone } from "lucide-react";
import { useCTA } from "@/hooks/useCTA";

const quotaCards = [
  {
    title: "All India Quota",
    percentage: "50%",
    colorClass: "blue",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    percentColor: "text-blue-400",
    iconColor: "text-blue-400",
    bulletColor: "text-blue-200/80",
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
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    percentColor: "text-violet-400",
    iconColor: "text-violet-400",
    bulletColor: "text-violet-200/80",
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

export const PGQuotaSystem = () => {
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
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border border-white/20 bg-white/10 text-blue-300 mb-4">
            Quota System
          </span>
          <h2 className="text-2xl md:text-3xl font-black mb-3">
            Understanding PG{" "}
            <span className="bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
              Seat Distribution
            </span>
          </h2>
          <p className="text-sm text-blue-100/70 max-w-xl mx-auto">
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
            className="grid grid-cols-2 gap-4"
          >
            {quotaCards.slice(0, 2).map((card) => (
              <div
                key={card.title}
                className={`${card.bg} border ${card.border} rounded-xl p-5`}
              >
                <p className={`text-4xl font-black ${card.percentColor} mb-1`}>
                  {card.percentage}
                </p>
                <p className="text-sm font-black text-white mb-3">{card.title}</p>
                <ul className="space-y-2">
                  {card.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${card.iconColor} flex-shrink-0 mt-0.5`} />
                      <span className={`text-xs ${card.bulletColor}`}>{bullet}</span>
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
            className="flex flex-col gap-4"
          >
            {quotaCards.slice(2).map((card) => (
              <div
                key={card.title}
                className={`${card.bg} border ${card.border} rounded-xl p-5`}
              >
                <div className="flex items-start gap-4">
                  <div>
                    <p className={`text-4xl font-black ${card.percentColor} mb-1`}>
                      {card.percentage}
                    </p>
                    <p className="text-sm font-black text-white mb-3">{card.title}</p>
                  </div>
                  <ul className="space-y-2 mt-1">
                    {card.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${card.iconColor} flex-shrink-0 mt-0.5`} />
                        <span className={`text-xs ${card.bulletColor}`}>{bullet}</span>
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
          className="bg-white/5 rounded-xl p-5 mt-6 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <p className="text-sm text-blue-100/80 font-medium">
            We manage registrations and strategy across ALL quota systems simultaneously.
          </p>
          <button
            onClick={() => CTA.call()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:shadow-lg hover:shadow-blue-500/25 transition-all flex-shrink-0"
          >
            <Phone className="w-4 h-4" />
            Call Us Now
          </button>
        </motion.div>
      </div>
    </section>
  );
};
