"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { PencilLine, Trophy, UserPlus, ListChecks, CheckCircle, Hospital, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CONTACT_INFO } from '@/lib/constants';

const steps = [
  {
    title: "NEET PG Exam",
    description: "The gateway to PG medical admissions in India conducted by NBE.",
    icon: PencilLine,
    color: "bg-blue-600",
    status: "Step 01"
  },
  {
    title: "Rank Generation",
    description: "Results are declared and All India Ranks (AIR) are assigned to qualifiers.",
    icon: Trophy,
    color: "bg-emerald-600",
    status: "Step 02"
  },
  {
    title: "Registration",
    description: "Candidates register on MCC (for AIQ) or State portals for counselling.",
    icon: UserPlus,
    color: "bg-amber-600",
    status: "Step 03"
  },
  {
    title: "Choice Filling",
    description: "Strategic selection and locking of preferred colleges and specializations.",
    icon: ListChecks,
    color: "bg-indigo-600",
    status: "Step 04"
  },
  {
    title: "Seat Allotment",
    description: "Seats are allocated based on rank, category, and locked preferences.",
    icon: CheckCircle,
    color: "bg-purple-600",
    status: "Step 05"
  },
  {
    title: "Reporting",
    description: "Candidates report to the allotted college for document verification.",
    icon: Hospital,
    color: "bg-rose-600",
    status: "Step 06"
  },
  {
    title: "Mop-up Round",
    description: "Final rounds to fill remaining vacant seats across all categories.",
    icon: ClipboardList,
    color: "bg-slate-600",
    status: "Step 07"
  }
];

export const PGAdmissionProcess = () => {
  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white to-transparent" />
      
      <div className="container-custom relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            The Admission <span className="text-blue-600">Journey</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            From the exam hall to the hospital campus, we guide you through every critical milestone of the MD/MS admission process.
          </p>
        </div>

        <div className="relative">
          <div className="grid lg:grid-cols-7 gap-8 relative z-10">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex lg:flex-col items-center gap-6 lg:gap-0 lg:text-center group"
              >
                {/* Icon Container */}
                <div className="relative mb-6">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-6",
                    step.color, "text-white"
                  )}>
                    <step.icon className="w-8 h-8" />
                  </div>
                  <div className="absolute -top-3 -right-3 px-2 py-1 bg-white rounded-lg shadow-md border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none">
                      {step.status}
                    </span>
                  </div>
                </div>

                {/* Text Content */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight lg:px-4">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed lg:px-2 line-clamp-3">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-20 p-8 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-blue-900 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <h4 className="text-2xl font-bold mb-2">Strategy is key for PG seats.</h4>
            <p className="text-blue-100/60 font-medium">
              Rank is important, but <span className="text-white">Choice Filling Strategy</span> determines your success in MD/MS India. Let our experts build your preference list.
            </p>
          </div>
          <a 
            href={`tel:${CONTACT_INFO.phone.replace(/[+\s-]/g, '')}`}
            className="px-8 py-4 rounded-xl bg-white text-blue-900 font-bold hover:bg-blue-50 transition-colors shadow-lg active:scale-95 whitespace-nowrap inline-block"
          >
            Build My Strategy
          </a>
        </div>
      </div>
    </section>
  );
};
