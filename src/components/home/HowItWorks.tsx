"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import BlockIcon from '@/components/ui/BlockIcon';
import { pick } from '@/lib/copy';

export interface Step {
  title: string;
  description: string;
  icon?: string | null;
}

// Editors control the words and the icon; the colour run stays in code so the
// section keeps its rhythm however many steps are added.
const PALETTE = [
  { color: "from-cyan-500 to-cyan-600", bg: "bg-cyan-50" },
  { color: "from-teal-500 to-teal-600", bg: "bg-teal-50" },
  { color: "from-teal-500 to-teal-600", bg: "bg-teal-50" },
  { color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50" },
  { color: "from-cyan-600 to-cyan-700", bg: "bg-cyan-50" },
  { color: "from-teal-500 to-teal-600", bg: "bg-teal-50" },
];

const FALLBACK_STEPS: Step[] = [
  { icon: "Award", title: "NEET Exam", description: "Start with NTA's national level entrance test." },
  { icon: "BookOpen", title: "Rank & Score", description: "Analyze results and identify target colleges." },
  { icon: "ClipboardList", title: "Registration", description: "Apply for MCC or State counselling bodies." },
  { icon: "CheckCircle", title: "Choice Filling", description: "Strategic locking of college preferences." },
  { icon: "GraduationCap", title: "Seat Allotment", description: "Secure your place in a medical college." },
  { icon: "FileCheck", title: "Reporting", description: "Complete formalities and join." },
];

export interface StepsCopy {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  button?: string;
}

const STEPS_DEFAULTS: Required<StepsCopy> = {
  eyebrow: 'How We Secure Your Best Seat',
  title: 'Your NEET Journey',
  subtitle: 'The path to your dream medical college is clear with our expert-designed roadmap.',
  button: 'Detailed NEET Process',
};

const HowItWorks = ({ steps: fromCms, copy }: { steps?: Step[]; copy?: StepsCopy }) => {
  const steps = fromCms?.length ? fromCms : FALLBACK_STEPS;
  const text = { ...STEPS_DEFAULTS, ...pick(copy) };

  return (
    <section className="compact-padding bg-slate-50/50 dark:bg-slate-950 relative overflow-hidden">
      <div className="container-custom relative z-10">
        <div className="text-center mb-8 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="inline-block px-3 py-1.5 mb-3 text-[10px] font-black tracking-widest text-cyan-600 dark:text-cyan-400 uppercase bg-cyan-100/50 dark:bg-cyan-950/40 border border-cyan-200/50 dark:border-cyan-900/30 rounded-full"
          >
            {text.eyebrow}
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tight"
          >
            {text.title} in{' '}
            <span className="text-cyan-600 dark:text-cyan-400">{steps.length} Steps</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.2 }}
            className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium leading-relaxed"
          >
            {text.subtitle}
          </motion.p>
        </div>

        {/* Timeline / Card Hybrid Grid */}
        <div className="relative max-w-5xl mx-auto">
          {/* Animated Connector Line (Desktop only) */}
          <div className="hidden lg:block absolute top-[55px] left-12 right-12 h-1 bg-slate-200/60 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.3 }}
              className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-teal-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-3 relative z-10">
            {steps.map((step, index) => {
              const tone = PALETTE[index % PALETTE.length];
              return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="relative group"
              >
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 lg:p-6 lg:pt-8 lg:pb-6 rounded-2xl shadow-sm flex flex-row lg:flex-col items-center text-left lg:text-center gap-4 lg:gap-0 h-full transition-all hover:border-cyan-200 dark:hover:border-cyan-900/60 hover:shadow-md dark:hover:shadow-zinc-950/50 lg:min-h-[240px]">
                  {/* Icon Node */}
                  <div className={`relative z-10 flex-shrink-0 flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-gradient-to-br ${tone.color} text-white shadow-lg lg:mx-auto lg:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <BlockIcon name={step.icon} fallback="ClipboardCheck" size={20} className="lg:hidden" />
                    <BlockIcon name={step.icon} fallback="ClipboardCheck" size={24} className="hidden lg:block" />
                    <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 flex h-5 w-5 lg:h-6 lg:w-6 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 bg-gradient-brand text-[12px] lg:text-[10px] font-bold text-white">
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex-1 lg:mt-2">
                    <h3 className="text-sm lg:text-base font-black text-slate-900 dark:text-white mb-1 lg:mb-2 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors tracking-tight">{step.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-[13px] lg:text-xs font-medium leading-snug">{step.description}</p>
                  </div>
                </div>
              </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 md:mt-12 text-center">
          <Link href="/neet-ug-process">
            <Button size="lg" className="rounded-xl px-6 py-4 md:px-8 md:py-6 text-xs md:text-sm font-bold bg-gradient-brand text-white shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all active:translate-y-0 group border-0">
              {text.button}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
