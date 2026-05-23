"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: "Dr. Ananya Sharma",
    course: "MBBS — AIIMS Jodhpur",
    outcome: "Round 1 AIQ Selection",
    text: "Admission Hands gave me a clear roadmap when I was overwhelmed after NEET. Their data-driven approach helped me fill choices strategically, and I got AIIMS Jodhpur in the very first round.",
    avatar: "AS",
    rating: 5,
  },
  {
    name: "Rahul Verma",
    course: "MD Radiology — KMC Manipal",
    outcome: "Deemed PG Selection",
    text: "After scoring well in NEET-PG, I was confused between state and deemed options. The team helped me understand cutoff trends and branch probabilities. I'm now pursuing my dream branch.",
    avatar: "RV",
    rating: 5,
  },
  {
    name: "Priya Nair",
    course: "MBBS — GMC Trivandrum",
    outcome: "State Quota Selection",
    text: "My family was worried about the entire counselling process. Admission Hands handled everything — from registration to document verification. Their transparency made the whole experience stress-free.",
    avatar: "PN",
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section className="compact-padding bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      <div className="container-custom">
        <div className="text-center mb-10">
          <motion.span
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 text-[10px] font-black tracking-[0.2em] text-blue-600 uppercase bg-blue-600/10 rounded-full"
          >
            Student Stories
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-responsive-h2 text-slate-900 mb-4"
          >
            Real Results from <span className="text-blue-600">Real Students</span>
          </motion.h2>
          <p className="text-responsive-body text-slate-600 max-w-2xl mx-auto font-medium">
            Don&apos;t just take our word for it — hear from families who navigated NEET admissions with our guidance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8">
          {testimonials.map((t, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.12 }}
              className="group relative p-6 md:p-8 rounded-3xl md:rounded-[2.5rem] bg-white border border-slate-100 hover:border-blue-200 hover:shadow-2xl transition-all h-full flex flex-col justify-between"
            >
              <div>
                {/* Quote icon */}
                <div className="mb-4 md:mb-6 flex justify-between items-center">
                  <div className="flex gap-1">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={14} className="text-amber-400 fill-amber-400 md:w-4 md:h-4" />
                    ))}
                  </div>
                  <Quote className="w-6 h-6 md:w-8 md:h-8 text-blue-100/50 group-hover:text-blue-200 transition-colors" />
                </div>

                {/* Text */}
                <p className="text-slate-600 leading-relaxed mb-6 md:mb-8 text-[13px] md:text-sm font-medium italic">&ldquo;{t.text}&rdquo;</p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 md:gap-4 pt-4 md:pt-6 border-t border-slate-100">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-lg shadow-blue-900/10">
                  {t.avatar}
                </div>
                <div>
                  <h4 className="text-sm md:text-base font-black text-slate-900 tracking-tight">{t.name}</h4>
                  <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.course}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <p className="text-[9px] md:text-[10px] text-emerald-600 font-black uppercase tracking-widest">{t.outcome}</p>
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
