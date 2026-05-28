"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Clock, Building2, ShieldCheck, RotateCcw } from "lucide-react";

const overviewItems = [
  { icon: GraduationCap, gradient: "from-blue-600 to-blue-700", title: "Eligibility", desc: "MBBS degree from a recognized institution with completed 1-year internship and NMC/State Medical Council registration." },
  { icon: BookOpen, gradient: "from-indigo-600 to-indigo-700", title: "NEET PG Exam", desc: "National-level entrance by NBE. Computer-based, 200 MCQs. Qualifying cutoff at 50th percentile for General/EWS." },
  { icon: Clock, gradient: "from-violet-600 to-violet-700", title: "Internship", desc: "1-year compulsory rotating internship must be completed before counselling. Completion certificate mandatory." },
  { icon: Building2, gradient: "from-emerald-600 to-emerald-700", title: "Counselling Bodies", desc: "MCC handles AIQ, Deemed & Central seats. State authorities manage State Quota. Both run in parallel." },
  { icon: ShieldCheck, gradient: "from-amber-500 to-amber-600", title: "Reservation", desc: "SC, ST, OBC-NCL, EWS, PwD — each category has specific cutoffs, seat pools, and documentation requirements." },
  { icon: RotateCcw, gradient: "from-rose-500 to-rose-600", title: "Counselling Rounds", desc: "4 rounds typically: Round 1, Round 2, Mop-Up, and Stray Vacancy. Each round opens new opportunities." },
];

export const PGOverview = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="container-custom max-w-5xl">
        <div className="text-center mb-10">
          <motion.div initial={mounted ? { opacity: 0, y: 10 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black tracking-widest uppercase mb-3">
            PG Admission Overview
          </motion.div>
          <motion.h2 initial={mounted ? { opacity: 0, y: 10 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
            Everything You Need to Know About <span className="text-blue-600 dark:text-blue-400">MD/MS Admissions</span>
          </motion.h2>
          <motion.p initial={mounted ? { opacity: 0, y: 10 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium max-w-2xl mx-auto">
            The PG medical admission landscape is complex — multiple exams, parallel counselling systems, and high-stakes decisions at every step.
          </motion.p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {overviewItems.map((item, i) => (
            <motion.div key={i} initial={mounted ? { opacity: 0, y: 15 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-100 dark:border-slate-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:scale-105 transition-transform`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-black text-base text-slate-900 dark:text-white mb-1.5">{item.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
