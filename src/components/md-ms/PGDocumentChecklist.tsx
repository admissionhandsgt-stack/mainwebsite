"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useCTA } from "@/hooks/useCTA";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const documents = [
  { name: "NEET PG Scorecard & Rank Letter", note: "Original + 3 self-attested copies" },
  { name: "MBBS Degree Certificate", note: "Or provisional certificate from university" },
  { name: "Internship Completion Certificate", note: "With exact dates of completion" },
  { name: "NMC/State Medical Council Registration", note: "Valid and current registration" },
  { name: "All MBBS Year Mark Sheets", note: "1st through Final year including supplementary" },
  { name: "Attempt Certificate", note: "Confirming NEET PG attempt number" },
  { name: "Photo ID Proof", note: "Aadhaar / Passport / PAN / Voter ID" },
  { name: "Date of Birth Certificate", note: "Or Class 10th certificate as proof" },
  { name: "Category/Caste Certificate", note: "If applicable — issued by competent authority" },
  { name: "Domicile Certificate", note: "Required for State Quota counselling" },
  { name: "Passport Size Photographs", note: "10-15 copies with white background" },
  { name: "Migration Certificate", note: "From university of MBBS graduation" },
];

export const PGDocumentChecklist = () => {
  const [mounted, setMounted] = useState(false);
  const CTA = useCTA();
  useEffect(() => setMounted(true), []);

  return (
    <section className="py-12 md:py-16 bg-white dark:bg-slate-950">
      <div className="container-custom">
        <motion.div initial={mounted ? { opacity: 0, y: 15 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <span className="inline-block text-xs font-black tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-4 py-1.5 rounded-full mb-4">DOCUMENT READINESS</span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
            Essential Documents for <span className="text-blue-600 dark:text-blue-400">NEET PG</span> Counselling
          </h2>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-3 max-w-2xl mx-auto">Missing even one document can cost you your confirmed seat. Here is your complete checklist.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {documents.map((doc, i) => (
            <motion.div key={i} initial={mounted ? { opacity: 0, y: 15 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}
              className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 transition flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center flex-shrink-0">{i + 1}</div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-slate-900 dark:text-white">{doc.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{doc.note}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={mounted ? { opacity: 0, y: 15 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">Need help preparing your documents?</span>{" "}
              Our team pre-audits every paper before deadlines.
            </p>
          </div>
          <button onClick={() => CTA.whatsapp("Hi, I need help with document preparation for NEET PG counselling.")}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors flex-shrink-0">
            <WhatsAppIcon className="w-4 h-4" /> Chat With Us
          </button>
        </motion.div>
      </div>
    </section>
  );
};
