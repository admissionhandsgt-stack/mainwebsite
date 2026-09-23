"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import BlockIcon from '@/components/ui/BlockIcon';
import { pick } from '@/lib/copy';

export interface Reason {
  title: string;
  description: string;
  icon?: string | null;
}

const PALETTE = [
  { gradient: "from-cyan-500 to-teal-600", bg: "bg-cyan-50", iconColor: "text-cyan-600" },
  { gradient: "from-teal-500 to-emerald-600", bg: "bg-teal-50", iconColor: "text-teal-600" },
  { gradient: "from-teal-500 to-teal-600", bg: "bg-teal-50", iconColor: "text-teal-600" },
  { gradient: "from-emerald-500 to-rose-600", bg: "bg-emerald-50", iconColor: "text-emerald-600" },
];

const FALLBACK_REASONS: Reason[] = [
  { icon: "Database", title: "Data-Driven Strategy", description: "Analyzing years of MCC data & seat matrices." },
  { icon: "Target", title: "MCC-Aligned Process", description: "Mirrors exact counselling workflow used by MCC." },
  { icon: "Eye", title: "100% Transparent", description: "No hidden charges, zero fake promises." },
  { icon: "MapPinned", title: "Personalized Plan", description: "Custom roadmap based on rank and budget." },
];

export interface WhyCopy {
  eyebrow?: string;
  title?: string;
  titleAccent?: string;
  subtitle?: string;
  points?: string[];
}

const WHY_DEFAULTS = {
  eyebrow: 'Why Choose Us',
  title: 'Why Families Trust',
  titleAccent: 'Admission Hands',
  subtitle:
    'In a landscape full of misinformation, we bring clarity, credibility, and real outcomes. Our track record speaks louder than promises.',
};

// "95% Success Rate" was a number nobody can verify. The scale of the data
// is verifiable, and it is the actual differentiator.
const DEFAULT_POINTS = ['2.7 Lakh Closing Ranks', '2100+ Families Guided', 'Pan-India Coverage', 'Zero Hidden Fees'];

const WhyAdmissionHands = ({ reasons: fromCms, copy }: { reasons?: Reason[]; copy?: WhyCopy }) => {
  const reasons = fromCms?.length ? fromCms : FALLBACK_REASONS;
  const text = { ...WHY_DEFAULTS, ...pick(copy) };
  const points = copy?.points?.filter(Boolean).length ? copy.points!.filter(Boolean) : DEFAULT_POINTS;

  return (
    <section className="compact-padding bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-200">
      {/* Soft background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-cyan-100/40 dark:bg-cyan-900/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="inline-flex items-center justify-center px-3 py-1.5 mb-4 text-[10px] font-black tracking-widest text-cyan-600 dark:text-cyan-400 uppercase bg-cyan-100/50 dark:bg-cyan-950/40 border border-cyan-200/50 dark:border-cyan-900/30 rounded-full"
            >
              {text.eyebrow}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-tight"
            >
              {text.title}{' '}
              <br className="hidden lg:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-600 dark:from-cyan-400 dark:to-teal-400">
                {text.titleAccent}
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed"
            >
              {text.subtitle}
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-left">
              {points.map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                    <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm tracking-tight">{point}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reasons.map((item, index) => {
              const tone = PALETTE[index % PALETTE.length];
              return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="group relative bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[2rem] border border-slate-100/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Animated Gradient Border Bottom */}
                <div className={`absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r ${tone.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />

                <div className={`w-12 h-12 rounded-2xl ${tone.bg} dark:bg-slate-950/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <BlockIcon name={item.icon} fallback="ShieldCheck" size={24} className={tone.iconColor} />
                </div>
                
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyAdmissionHands;
