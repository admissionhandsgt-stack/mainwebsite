"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, PieChart, BarChart3, CheckCircle2, Stethoscope, GraduationCap, BookOpen, ShieldCheck, ClipboardCheck } from 'lucide-react';

const insightCards = [
  {
    title: "Govt vs Private Seats",
    value: "45% : 55%",
    description: "Detailed breakdown of seat availability across college types.",
    icon: PieChart,
    color: "from-blue-600 to-indigo-700"
  },
  {
    title: "AIQ vs State Distribution",
    value: "15% : 85%",
    description: "Understanding your probability across quotas.",
    icon: BarChart3,
    color: "from-teal-600 to-emerald-700"
  },
  {
    title: "PG Branch Competition",
    value: "High Intensity",
    description: "Trend analysis of expected cutoff shifts.",
    icon: TrendingUp,
    color: "from-purple-600 to-rose-700"
  }
];

const eligibilityPoints = [
  { icon: GraduationCap, text: "Must qualify NEET UG with minimum required percentile (50th General / 40th OBC-SC-ST)" },
  { icon: BookOpen, text: "10+2 with Physics, Chemistry, Biology/Biotechnology & English as mandatory subjects" },
  { icon: Stethoscope, text: "Minimum 50% aggregate in PCB for General, 40% for reserved categories" },
  { icon: CheckCircle2, text: "Age requirement: Minimum 17 years at the time of admission" },
  { icon: ShieldCheck, text: "Indian Nationals, NRIs, OCIs, and PIOs are eligible for MBBS admission via NEET" },
];

const admissionInsights = [
  "AIQ counselling is centralized by MCC (DGHS) for all-India seats",
  "85% seats filled via state counselling; 15% via All India Quota",
  "Deemed university seats are filled through separate MCC counselling rounds",
  "NRI quota seats available in private & deemed colleges (15% of total)",
  "Multiple counselling rounds ensure maximum seat utilization",
  "Budget planning is critical — private college fees range ₹10L to ₹25L/year",
];

const DataInsights = () => {
  return (
    <section className="compact-padding bg-slate-900 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/10 blur-[120px] -z-0 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-teal-500/5 blur-[100px] -z-0 pointer-events-none" />

      <div className="container-custom relative z-10">
        {/* Section Header */}
        <div className="text-center mb-8 md:mb-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 mb-4 text-[10px] font-black tracking-widest text-blue-400 uppercase bg-blue-500/10 rounded-full border border-blue-500/20"
          >
            Admission Intelligence
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-responsive-h2 text-white mb-4"
          >
            Data-Driven <span className="text-blue-400">Insights</span> & Eligibility
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-responsive-body text-slate-400 font-medium max-w-2xl mx-auto"
          >
            Essential admission data combined with eligibility criteria — everything you need to plan your MBBS journey strategically.
          </motion.p>
        </div>

        {/* Top Row: Data Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mb-6 md:mb-8">
          {insightCards.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl md:rounded-[2rem] p-5 sm:p-6 border border-white/10 hover:border-white/20 transition-all group flex items-start gap-4"
            >
              <div className={`flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform`}>
                <item.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <h3 className="text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{item.title}</h3>
                <div className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">{item.value}</div>
                <p className="text-slate-400 text-[11px] md:text-sm font-medium leading-relaxed">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Row: Two balanced columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Left: Essential Admission Insights */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white/[0.04] backdrop-blur-md rounded-2xl md:rounded-[2rem] p-5 md:p-7 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider">Essential Admission Insights</h3>
            </div>
            <div className="space-y-3">
              {admissionInsights.map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 group"
                >
                  <div className="mt-0.5 w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/30 transition-colors">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  </div>
                  <p className="text-slate-300 text-xs md:text-sm font-medium leading-relaxed">{point}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: MBBS Eligibility Criteria */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white/[0.04] backdrop-blur-md rounded-2xl md:rounded-[2rem] p-5 md:p-7 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <ClipboardCheck className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider">MBBS Eligibility Criteria</h3>
            </div>
            <div className="space-y-3">
              {eligibilityPoints.map((point, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 group"
                >
                  <div className="mt-0.5 w-5 h-5 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/30 transition-colors">
                    <point.icon className="w-3 h-3 text-blue-400" />
                  </div>
                  <p className="text-slate-300 text-xs md:text-sm font-medium leading-relaxed">{point.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DataInsights;
