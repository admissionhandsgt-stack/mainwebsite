"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Award, ClipboardList, CheckCircle, GraduationCap, FileCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const steps = [
  {
    icon: Award,
    title: "NEET Exam",
    description: "Start with NTA's national level entrance test.",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-50"
  },
  {
    icon: BookOpen,
    title: "Rank & Score",
    description: "Analyze results and identify target colleges.",
    color: "from-teal-500 to-teal-600",
    bg: "bg-teal-50"
  },
  {
    icon: ClipboardList,
    title: "Registration",
    description: "Apply for MCC or State counselling bodies.",
    color: "from-indigo-500 to-indigo-600",
    bg: "bg-indigo-50"
  },
  {
    icon: CheckCircle,
    title: "Choice Filling",
    description: "Strategic locking of college preferences.",
    color: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50"
  },
  {
    icon: GraduationCap,
    title: "Seat Allotment",
    description: "Secure your place in a medical college.",
    color: "from-blue-600 to-blue-700",
    bg: "bg-blue-50"
  },
  {
    icon: FileCheck,
    title: "Reporting",
    description: "Complete formalities and join.",
    color: "from-violet-500 to-violet-600",
    bg: "bg-violet-50"
  }
];

const HowItWorks = () => {
  return (
    <section className="compact-padding bg-slate-50/50 relative overflow-hidden">
      <div className="container-custom relative z-10">
        <div className="text-center mb-8 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1.5 mb-3 text-[10px] font-black tracking-widest text-blue-600 uppercase bg-blue-100/50 border border-blue-200/50 rounded-full"
          >
            How We Secure Your Best Seat
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-3 tracking-tight"
          >
            Your NEET Journey in <span className="text-blue-600">6 Steps</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm md:text-base text-slate-500 max-w-xl mx-auto font-medium leading-relaxed"
          >
            The path to your dream medical college is clear with our expert-designed roadmap.
          </motion.p>
        </div>

        {/* Timeline / Card Hybrid Grid */}
        <div className="relative max-w-5xl mx-auto">
          {/* Animated Connector Line (Desktop only) */}
          <div className="hidden lg:block absolute top-[45px] left-8 right-8 h-1 bg-slate-200/60 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-blue-400 via-indigo-400 to-teal-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-3 relative z-10">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <div className="bg-white lg:bg-transparent lg:border-none border border-slate-100 p-4 lg:p-0 rounded-2xl shadow-sm lg:shadow-none flex flex-row lg:flex-col items-center text-left lg:text-center gap-4 lg:gap-0 h-full transition-all hover:border-blue-200 hover:shadow-md lg:hover:shadow-none">
                  {/* Icon Node */}
                  <div className={`relative z-10 flex-shrink-0 flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-lg lg:mx-auto lg:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <step.icon size={20} className="lg:hidden" />
                    <step.icon size={24} className="hidden lg:block" />
                    <div className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 flex h-5 w-5 lg:h-6 lg:w-6 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-[9px] lg:text-[10px] font-black text-white">
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex-1 lg:mt-2">
                    <h3 className="text-sm lg:text-base font-black text-slate-900 mb-1 lg:mb-2 group-hover:text-blue-600 transition-colors tracking-tight">{step.title}</h3>
                    <p className="text-slate-500 text-[11px] lg:text-xs font-medium leading-snug">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-8 md:mt-12 text-center">
          <Link href="/neet-ug-process">
            <Button size="lg" className="rounded-xl px-6 py-4 md:px-8 md:py-6 text-xs md:text-sm font-black bg-slate-900 hover:bg-blue-600 text-white shadow-lg transition-all active:scale-95 group">
              Detailed NEET Process 
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
