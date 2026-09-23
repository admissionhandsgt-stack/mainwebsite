"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { pick } from '@/lib/copy';

export interface Testimonial {
  name: string;
  course: string;
  outcome: string;
  text: string;
  rating: number;
}

/** Initials are derived, not stored — an editor should never have to keep
 *  them in step with the name. */
const initials = (name: string) =>
  name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    name: "Dr. Ananya Sharma",
    course: "MBBS — AIIMS Jodhpur",
    outcome: "Round 1 AIQ Selection",
    text: "Admission Hands gave me a clear roadmap when I was overwhelmed after NEET. Their data-driven approach helped me fill choices strategically, and I got AIIMS Jodhpur in the very first round.",
    rating: 5,
  },
  {
    name: "Rahul Verma",
    course: "MD Radiology — KMC Manipal",
    outcome: "Deemed PG Selection",
    text: "After scoring well in NEET-PG, I was confused between state and deemed options. The team helped me understand cutoff trends and branch probabilities. I'm now pursuing my dream branch.",
    rating: 5,
  },
  {
    name: "Priya Nair",
    course: "MBBS — GMC Trivandrum",
    outcome: "State Quota Selection",
    text: "My family was worried about the entire counselling process. Admission Hands handled everything — from registration to document verification. Their transparency made the whole experience stress-free.",
    rating: 5,
  },
];

export interface TestimonialsCopy {
  eyebrow?: string;
  title?: string;
  titleAccent?: string;
  subtitle?: string;
}

const T_DEFAULTS: Required<TestimonialsCopy> = {
  eyebrow: 'Student Stories',
  title: 'Real Results from',
  titleAccent: 'Real Students',
  subtitle:
    'Don\u2019t just take our word for it \u2014 hear from families who navigated NEET admissions with our guidance.',
};

const Testimonials = ({
  testimonials: fromCms,
  copy,
}: {
  testimonials?: Testimonial[];
  copy?: TestimonialsCopy;
}) => {
  const testimonials = fromCms?.length ? fromCms : FALLBACK_TESTIMONIALS;
  const text = { ...T_DEFAULTS, ...pick(copy) };

  return (
    <section className="compact-padding bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 relative overflow-hidden transition-colors duration-200">
      <div className="container-custom">
        <div className="text-center mb-10">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            className="inline-block px-4 py-1.5 mb-4 text-[10px] font-black tracking-[0.2em] text-cyan-600 dark:text-cyan-400 uppercase bg-cyan-600/10 dark:bg-cyan-900/20 rounded-full"
          >
            {text.eyebrow}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.1 }}
            className="text-responsive-h2 text-slate-900 dark:text-white mb-4"
          >
            {text.title} <span className="text-cyan-600 dark:text-cyan-400">{text.titleAccent}</span>
          </motion.h2>
          <p className="text-responsive-body text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-medium">
            {text.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8">
          {testimonials.map((t, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.2 + index * 0.12 }}
              className="group relative p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-cyan-200 dark:hover:border-cyan-800 hover:shadow-2xl transition-all h-full flex flex-col justify-between"
            >
              <div>
                {/* Quote icon */}
                <div className="mb-4 md:mb-6 flex justify-between items-center">
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, Math.max(0, t.rating || 5)) }).map((_, i) => (
                      <Star key={i} size={14} className="text-amber-400 fill-amber-400 md:w-4 md:h-4" />
                    ))}
                  </div>
                  <Quote className="w-6 h-6 md:w-8 md:h-8 text-cyan-100/50 dark:text-cyan-900/10 group-hover:text-cyan-200 dark:group-hover:text-cyan-800 transition-colors" />
                </div>

                {/* Text */}
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 md:mb-8 text-[13px] md:text-sm font-medium italic">&ldquo;{t.text}&rdquo;</p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 md:gap-4 pt-4 md:pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-800 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-lg shadow-cyan-900/10">
                  {initials(t.name)}
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-black text-slate-900 dark:text-white tracking-tight">{t.name}</h4>
                  <p className="text-[9px] md:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{t.course}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <p className="text-[9px] md:text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">{t.outcome}</p>
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

export default Testimonials;
