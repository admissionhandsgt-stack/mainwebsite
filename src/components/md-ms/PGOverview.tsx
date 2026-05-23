"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Calendar, Scale, Users2, Landmark, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

const OverviewCard = ({ icon: Icon, title, content, subtext, color }: { icon: any, title: string, content: string, subtext?: string, color: string }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group"
  >
    <div className={cn("absolute top-0 right-0 w-32 h-32 blur-3xl opacity-5 transition-opacity group-hover:opacity-10", color)} />
    <div className="flex items-start gap-5 relative z-10">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", color.replace('bg-', 'bg-').replace('blur-3xl', 'bg-opacity-10'))}>
        <Icon className={cn("w-7 h-7", color.replace('bg-', 'text-'))} />
      </div>
      <div>
        <h3 className="text-slate-900 font-bold text-lg mb-2">{title}</h3>
        <p className="text-slate-600 font-semibold leading-relaxed mb-1">{content}</p>
        {subtext && <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{subtext}</p>}
      </div>
    </div>
  </motion.div>
);

export const PGOverview = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container-custom">
        <div className="mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            NEET PG 2026 <span className="text-blue-600">Essential Overview</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl font-medium">
            Stay informed with the critical data points and requirements for the MD/MS admission cycle in India.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <OverviewCard 
            icon={GraduationCap}
            title="Eligibility"
            content="MBBS Degree from recognized institute with MCI/NMC registration."
            subtext="MANDATORY REQUIREMENT"
            color="bg-blue-600 text-blue-600"
          />
          <OverviewCard 
            icon={ClipboardCheck}
            title="NEET PG Requirement"
            content="Must qualify NEET PG entrance exam with required percentile."
            subtext="QUALIFYING CRITERIA"
            color="bg-emerald-600 text-emerald-600"
          />
          <OverviewCard 
            icon={Calendar}
            title="Internship Deadline"
            content="Completion of one-year rotating internship by the cutoff date."
            subtext="IMPORTANT DEADLINE"
            color="bg-amber-600 text-amber-600"
          />
          <OverviewCard 
            icon={Landmark}
            title="Counselling Authorities"
            content="MCC for All India Quota & Deemed; State Authorities for State Quota."
            subtext="OFFICIAL CHANNELS"
            color="bg-indigo-600 text-indigo-600"
          />
          <OverviewCard 
            icon={Scale}
            title="Reservation Rules"
            content="SC/ST/OBC/EWS/PwD categories as per Government norms."
            subtext="QUOTA GUIDELINES"
            color="bg-purple-600 text-purple-600"
          />
          <OverviewCard 
            icon={Users2}
            title="Counselling Rounds"
            content="Round 1, Round 2, Mop-up Round, and Stray Vacancy Round."
            subtext="PROCESS OVERVIEW"
            color="bg-rose-600 text-rose-600"
          />
        </div>
      </div>
    </section>
  );
};
