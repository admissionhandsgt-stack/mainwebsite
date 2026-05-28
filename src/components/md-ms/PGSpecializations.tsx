"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Baby,
  Sparkles,
  BrainCircuit,
  Wind,
  Zap,
  Activity,
  Siren,
  Scissors,
  Bone,
  Eye,
  Ear,
  HeartPulse,
  ScanLine,
  Pill,
  Wand2,
  Microscope,
  Bug,
  FlaskConical,
  Atom,
  PersonStanding,
  Users,
  Shield,
  Stethoscope,
} from "lucide-react";
import { useCTA } from "@/hooks/useCTA";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const specializations = {
  clinical: {
    label: "Clinical",
    gradient: "from-blue-500 to-blue-600",
    items: [
      { name: "General Medicine", icon: Heart, duration: "3 Years" },
      { name: "Pediatrics", icon: Baby, duration: "3 Years" },
      { name: "Dermatology", icon: Sparkles, duration: "3 Years" },
      { name: "Psychiatry", icon: BrainCircuit, duration: "3 Years" },
      { name: "Respiratory Medicine", icon: Wind, duration: "3 Years" },
      { name: "Radiotherapy", icon: Zap, duration: "3 Years" },
      { name: "Physical Medicine", icon: Activity, duration: "3 Years" },
      { name: "Emergency Medicine", icon: Siren, duration: "3 Years" },
    ],
  },
  surgical: {
    label: "Surgical",
    gradient: "from-emerald-500 to-emerald-600",
    items: [
      { name: "General Surgery", icon: Scissors, duration: "3 Years" },
      { name: "Orthopedics", icon: Bone, duration: "3 Years" },
      { name: "Ophthalmology", icon: Eye, duration: "3 Years" },
      { name: "ENT", icon: Ear, duration: "3 Years" },
      { name: "Obstetrics & Gynecology", icon: HeartPulse, duration: "3 Years" },
      { name: "Radiology", icon: ScanLine, duration: "3 Years" },
      { name: "Anesthesiology", icon: Pill, duration: "3 Years" },
      { name: "Plastic Surgery", icon: Wand2, duration: "3 Years" },
    ],
  },
  "non-clinical": {
    label: "Non-Clinical",
    gradient: "from-violet-500 to-violet-600",
    items: [
      { name: "Pathology", icon: Microscope, duration: "3 Years" },
      { name: "Microbiology", icon: Bug, duration: "3 Years" },
      { name: "Pharmacology", icon: FlaskConical, duration: "3 Years" },
      { name: "Biochemistry", icon: Atom, duration: "3 Years" },
      { name: "Physiology", icon: Activity, duration: "3 Years" },
      { name: "Anatomy", icon: PersonStanding, duration: "3 Years" },
      { name: "Community Medicine", icon: Users, duration: "3 Years" },
      { name: "Forensic Medicine", icon: Shield, duration: "3 Years" },
    ],
  },
};

const tabStyles: Record<string, { active: string }> = {
  clinical: { active: "from-blue-500 to-blue-600" },
  surgical: { active: "from-emerald-500 to-emerald-600" },
  "non-clinical": { active: "from-violet-500 to-violet-600" },
};

export const PGSpecializations = () => {
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState("clinical");
  const CTA = useCTA();

  useEffect(() => setMounted(true), []);

  const currentData = specializations[activeCategory as keyof typeof specializations];

  return (
    <section className="py-12 md:py-16 bg-white dark:bg-slate-950">
      <div className="container-custom">
        {/* Header */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 15 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mb-4">
            Explore Specializations
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-3">
            Find Your <span className="text-blue-600 dark:text-blue-400">Perfect Medical Specialty</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Browse through all MD/MS branches across clinical, surgical, and non-clinical disciplines available through NEET PG counselling.
          </p>
        </motion.div>

        {/* Tab Buttons */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 15 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center gap-2 mb-8"
        >
          {Object.entries(specializations).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                activeCategory === key
                  ? `bg-gradient-to-r ${tabStyles[key].active} text-white shadow-lg`
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </motion.div>

        {/* Cards Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            {currentData.items.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <motion.div
                  key={item.name}
                  initial={mounted ? { opacity: 0, y: 15 } : false}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04 }}
                  className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg bg-gradient-to-br ${currentData.gradient} flex items-center justify-center flex-shrink-0`}
                    >
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                        {item.duration}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Note */}
        <motion.div
          initial={mounted ? { opacity: 0, y: 15 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-100 dark:border-slate-800"
        >
          <p className="text-sm text-slate-600 dark:text-slate-400 font-bold">
            Not sure which branch suits your rank and career goals?
          </p>
          <button
            onClick={() => CTA.whatsapp("Hi, I need help choosing the right PG specialization for my rank.")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-black uppercase tracking-wider hover:shadow-lg transition-all flex-shrink-0"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Ask on WhatsApp
          </button>
        </motion.div>
      </div>
    </section>
  );
};
