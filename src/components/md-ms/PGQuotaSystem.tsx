"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Globe2, Map, Building2, Landmark, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const QuotaCard = ({ title, icon: Icon, percentage, description, points, color }: { title: string, icon: any, percentage: string, description: string, points: string[], color: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="bg-slate-50 rounded-[2rem] p-8 border border-slate-200/60 flex flex-col h-full relative overflow-hidden"
  >
    <div className={cn("absolute top-0 right-0 w-40 h-40 blur-3xl opacity-10", color)} />
    
    <div className="flex items-center gap-4 mb-6 relative z-10">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", color.replace('bg-', 'bg-').replace('blur-3xl', 'bg-opacity-10'))}>
        <Icon className={cn("w-7 h-7", color.replace('bg-', 'text-'))} />
      </div>
      <div>
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <span className={cn("text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-md", color.replace('bg-', 'bg-').replace('blur-3xl', 'bg-opacity-10'), color.replace('bg-', 'text-'))}>
          {percentage} Seats
        </span>
      </div>
    </div>

    <p className="text-slate-600 font-medium mb-8 leading-relaxed relative z-10">
      {description}
    </p>

    <ul className="space-y-4 mt-auto relative z-10">
      {points.map((point, i) => (
        <li key={i} className="flex items-start gap-3">
          <CheckCircle2 className={cn("w-5 h-5 shrink-0 mt-0.5", color.replace('bg-', 'text-'))} />
          <span className="text-sm font-semibold text-slate-700">{point}</span>
        </li>
      ))}
    </ul>
  </motion.div>
);

export const PGQuotaSystem = () => {
  return (
    <section className="py-24 bg-slate-50/50">
      <div className="container-custom">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            Understanding the <span className="text-blue-600">Quota System</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            NEET PG counselling is divided into various quotas. Knowing which one you qualify for is the first step to your dream seat.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuotaCard 
            title="All India Quota (AIQ)"
            icon={Globe2}
            percentage="50%"
            description="50% of seats in all Government medical colleges across India."
            points={[
              "MCC conducts counselling",
              "National level access",
              "5% PwD reservation",
              "Open to all NEET PG qualifiers"
            ]}
            color="bg-blue-600 text-blue-600"
          />
          <QuotaCard 
            title="State Quota"
            icon={Map}
            percentage="50%"
            description="The remaining 50% seats in Government and 100% in Private colleges."
            points={[
              "State counselling authorities",
              "Domicile rules apply",
              "State-specific reservation",
              "Institutional preferences"
            ]}
            color="bg-emerald-600 text-emerald-600"
          />
          <QuotaCard 
            title="Deemed Universities"
            icon={Building2}
            percentage="100%"
            description="All seats in Deemed medical universities across India."
            points={[
              "Counselling via MCC",
              "No domicile restriction",
              "Higher fee structure",
              "Premium infrastructure"
            ]}
            color="bg-amber-600 text-amber-600"
          />
          <QuotaCard 
            title="Central Universities"
            icon={Landmark}
            percentage="100%"
            description="Includes AMU, BHU, DU, and other central institutions."
            points={[
              "100% seats via MCC",
              "Institutional internal rules",
              "Includes DU internal quota",
              "Elite national ranking"
            ]}
            color="bg-indigo-600 text-indigo-600"
          />
        </div>
        
        <div className="mt-12 p-6 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-4 max-w-3xl mx-auto">
          <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />
          <p className="text-sm font-semibold text-blue-800 leading-relaxed">
            <span className="font-black underline">Note:</span> DNB seats and Management Quota seats follow separate guidelines. Consult our experts to map your eligibility across all possible quotas.
          </p>
        </div>
      </div>
    </section>
  );
};
