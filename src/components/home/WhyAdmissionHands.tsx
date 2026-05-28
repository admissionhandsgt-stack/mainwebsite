"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Database, Target, Eye, MapPinned, CheckCircle2 } from 'lucide-react';

const reasons = [
  {
    icon: Database,
    title: "Data-Driven Strategy",
    description: "Analyzing years of MCC data & seat matrices.",
    gradient: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: Target,
    title: "MCC-Aligned Process",
    description: "Mirrors exact counselling workflow used by MCC.",
    gradient: "from-teal-500 to-emerald-600",
    bg: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  {
    icon: Eye,
    title: "100% Transparent",
    description: "No hidden charges, zero fake promises.",
    gradient: "from-indigo-500 to-violet-600",
    bg: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  {
    icon: MapPinned,
    title: "Personalized Plan",
    description: "Custom roadmap based on rank and budget.",
    gradient: "from-pink-500 to-rose-600",
    bg: "bg-pink-50",
    iconColor: "text-pink-600",
  },
];

const WhyAdmissionHands = () => {
  return (
    <section className="compact-padding bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-200">
      {/* Soft background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-blue-100/40 dark:bg-blue-900/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="inline-flex items-center justify-center px-3 py-1.5 mb-4 text-[10px] font-black tracking-widest text-blue-600 dark:text-blue-400 uppercase bg-blue-100/50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/30 rounded-full"
            >
              Why Choose Us
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight leading-tight"
            >
              Why Families Trust{' '}
              <br className="hidden lg:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-450 dark:to-indigo-400">
                Admission Hands
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              className="text-sm md:text-base text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed"
            >
              In a landscape full of misinformation, we bring clarity, credibility, and real outcomes. Our track record speaks louder than promises.
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-left">
              {["95% Success Rate", "2100+ Families Guided", "Pan-India Coverage", "Zero Hidden Fees"].map((point, i) => (
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
                  <span className="text-slate-700 dark:text-slate-350 font-bold text-xs sm:text-sm tracking-tight">{point}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reasons.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="group relative bg-white dark:bg-slate-900 p-5 md:p-6 rounded-[2rem] border border-slate-100/60 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Animated Gradient Border Bottom */}
                <div className={`absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r ${item.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
                
                <div className={`w-12 h-12 rounded-2xl ${item.bg} dark:bg-slate-950/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon size={24} className={item.iconColor} />
                </div>
                
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyAdmissionHands;
