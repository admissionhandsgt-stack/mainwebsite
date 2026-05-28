"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, TrendingUp, Phone } from "lucide-react";
import { useCTA } from "@/hooks/useCTA";

const counsellingQuotas = [
  {
    title: "All India Quota (AIQ)",
    gradient: "from-blue-600 to-indigo-600",
    items: [
      { label: "Counselling Body", value: "MCC (Centralized)" },
      { label: "Seat Scope", value: "50% Govt College Seats" },
      { label: "Counselling Rounds", value: "R1, R2, R3, Stray" },
      { label: "Upgradation", value: "Allowed R1 to R2 & R3" },
      { label: "Domicile Rule", value: "Open to all qualified ranks" },
    ],
  },
  {
    title: "State Quota",
    gradient: "from-emerald-600 to-teal-600",
    items: [
      { label: "Counselling Body", value: "State DME / KEA / CET" },
      { label: "Seat Scope", value: "50% Govt + 100% Private" },
      { label: "Counselling Rounds", value: "R1, R2, Mop-Up, Stray" },
      { label: "Upgradation", value: "As per state-specific norms" },
      { label: "Domicile Rule", value: "State domicile mandatory" },
    ],
  },
  {
    title: "Deemed Universities",
    gradient: "from-violet-600 to-purple-600",
    items: [
      { label: "Counselling Body", value: "MCC Portal (Centralized)" },
      { label: "Seat Scope", value: "100% Deemed College Seats" },
      { label: "Counselling Rounds", value: "R1, R2, R3, Stray" },
      { label: "Security Deposit", value: "Mandatory central deposit" },
      { label: "Domicile Rule", value: "Open to all qualified ranks" },
    ],
  },
];

export const PGCutoffInsights = () => {
  const [mounted, setMounted] = useState(false);
  const CTA = useCTA();

  useEffect(() => setMounted(true), []);

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 15 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="inline-block text-xs font-black tracking-widest text-indigo-600 bg-blue-50 dark:text-indigo-400 dark:bg-indigo-950/40 px-4 py-1.5 rounded-full mb-4">
            QUOTA METRICS
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
            Counselling <span className="text-blue-600 dark:text-blue-400">Process Parameters</span>
          </h2>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-3 max-w-2xl mx-auto font-medium">
            Core parameters governing NEET PG seat allocation across centralized and state-level quota systems.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {counsellingQuotas.map((quota, i) => (
            <motion.div
              key={i}
              initial={mounted ? { opacity: 0, y: 15 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              <div className={`h-1.5 bg-gradient-to-r ${quota.gradient}`} />
              <div className="p-5">
                <h3 className="font-black text-base text-slate-900 dark:text-white mb-4">
                  {quota.title}
                </h3>
                <div className="space-y-3">
                  {quota.items.map((item, j) => (
                    <div
                      key={j}
                      className="flex flex-col py-1.5 border-b border-slate-50 dark:border-slate-800/40 last:border-0"
                    >
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {item.label}
                      </span>
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 15 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-slate-900 dark:bg-slate-900/50 rounded-xl p-5 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm text-slate-300">
              <span className="font-bold text-white">
                Counselling rules, seat matrices, and state policies change every year.
              </span>{" "}
              Our experts build your customized strategy using real-time seat availability and historical trends.
            </p>
          </div>
          <button
            onClick={() => CTA.call()}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors flex-shrink-0"
          >
            <Phone className="w-4 h-4" />
            Get Strategic Counselling Support
          </button>
        </motion.div>
      </div>
    </section>
  );
};
