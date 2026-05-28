"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Target, Brain, FileCheck, CheckCircle2 } from "lucide-react";

const cards = [
  {
    icon: BarChart3,
    gradient: "from-blue-600 to-indigo-600",
    title: "Cutoff Intelligence Engine",
    desc: "Our proprietary system processes 5 years of closing rank data across 250+ colleges and 60+ branches. We calculate your exact admission probability at each target institution — no guesswork, pure data.",
    highlight: "95%+ prediction accuracy",
  },
  {
    icon: Target,
    gradient: "from-emerald-600 to-teal-600",
    title: "Dual Quota Mastery",
    desc: "AIQ and State Quota run in parallel with different rules, different deadlines, and different strategies. We manage both simultaneously — registrations, choice filling, seat acceptance — to maximize your allotment probability.",
    highlight: "AIQ + State managed in parallel",
  },
  {
    icon: Brain,
    gradient: "from-violet-600 to-purple-600",
    title: "Branch Strategy Architect",
    desc: "Clinical, Surgical, or Non-Clinical? Your branch choice impacts your entire career. We analyze market demand, lifestyle factors, earning potential, and your rank to recommend the branches that truly fit your future.",
    highlight: "Career-aligned branch selection",
  },
  {
    icon: FileCheck,
    gradient: "from-amber-500 to-orange-600",
    title: "Zero Document Failures",
    desc: "Internship completion certificates, NMC registration, domicile proofs, category certificates — PG documentation is more complex than UG. Our audit team pre-verifies every paper weeks before deadlines.",
    highlight: "0% rejection rate across 2100+ students",
  },
];

export const PGWhyUs = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <section className="py-12 md:py-16 bg-white dark:bg-slate-950">
      <div className="container-custom max-w-5xl">
        <div className="text-center mb-10">
          <motion.div
            initial={mounted ? { opacity: 0, y: 10 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] font-black tracking-widest uppercase mb-3"
          >
            Why Admission Hands
          </motion.div>
          <motion.h2
            initial={mounted ? { opacity: 0, y: 10 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3"
          >
            The <span className="text-blue-600 dark:text-blue-400">Competitive Edge</span> Your PG Journey Deserves
          </motion.h2>
          <motion.p
            initial={mounted ? { opacity: 0, y: 10 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium max-w-2xl mx-auto"
          >
            NEET PG counselling is high-stakes with zero margin for error. Here&apos;s why 2100+ families trusted us with their PG admission journey.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={mounted ? { opacity: 0, y: 15 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="group bg-slate-50 dark:bg-slate-900 p-5 md:p-6 rounded-xl border border-slate-100 dark:border-slate-800 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-base text-slate-900 dark:text-white mb-1.5">{card.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{card.desc}</p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{card.highlight}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
