"use client";

import React, { useState, useEffect } from "react";
import type { PgDocument } from '@/lib/pgContent';
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { useCTA } from "@/hooks/useCTA";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

// MCC's list for NEET PG 2026 (information bulletin, chapter 12.2 and FAQ 6), checked 19 Nov 2026. The earlier
// list had a "NEET PG attempt certificate" no authority asks for, invented copy counts, and no allotment letter.
const SHIPPED_DOCUMENTS = [
  { name: "MCC allotment letter", note: "Or your state counselling's — print it from your login" },
  { name: "NEET PG 2026 admit card", note: "Issued by NBEMS" },
  { name: "NEET PG 2026 result / rank letter", note: "Issued by NBEMS" },
  { name: "MBBS mark sheets", note: "1st, 2nd and 3rd professional examinations" },
  { name: "MBBS degree or provisional certificate", note: "MCC marks it essential — no admission without it" },
  { name: "Internship completion certificate", note: "Or the head of institution's certificate that it ends by 30 Sep 2026" },
  { name: "State Medical Council registration", note: "Permanent; provisional only if the internship ends by 30 Sep 2026" },
  { name: "Class 10 or birth certificate", note: "Proof of date of birth" },
  { name: "Photo ID", note: "Driving licence, voter ID, passport or Aadhaar" },
  { name: "SC/ST, OBC-NCL or EWS certificate", note: "If you claim it — in MCC's format; OBC on the Central List; income for the year ending 31 Mar 2026" },
  { name: "PwD eligibility certificate", note: "If you claim it — only from MCC's authorised medical board, with your UDID card" },
  { name: "Your state counselling's own extras", note: "Domicile, bonds, an NOC or an MBBS attempt certificate — each state's own list" },
];

export const PGDocumentChecklist = ({ items: fromCms }: { items?: PgDocument[] | null } = {}) => {
  // The CMS supplies the words; everything visual stays with the shipped item
  // at the same position, so a design change is a code change and a copy
  // change is not. Extra CMS rows reuse the last item's styling.
  const documents = (() => {
    const cms = fromCms;
    if (!cms?.length) return SHIPPED_DOCUMENTS;
    return cms.map((_, i) => {
      const base = SHIPPED_DOCUMENTS[i] ?? SHIPPED_DOCUMENTS[SHIPPED_DOCUMENTS.length - 1];
      return {
          ...base,
          name: cms[i].name ?? base.name,
          note: cms[i].note ?? base.note,
      };
    });
  })();

  const [mounted, setMounted] = useState(false);
  const CTA = useCTA();
  useEffect(() => setMounted(true), []);

  return (
    <section className="py-12 md:py-16 bg-white dark:bg-slate-950">
      <div className="container-custom">
        <motion.div initial={mounted ? { opacity: 0, y: 15 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
          <span className="inline-block text-xs font-black tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-4 py-1.5 rounded-full mb-4">DOCUMENT READINESS</span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">
            Essential Documents for <span className="text-primary-strong dark:text-cyan-400">NEET PG</span> Counselling
          </h2>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-3 max-w-2xl mx-auto">MCC's list for NEET PG 2026, from its information bulletin. Originals at reporting — a missing one can cost the seat.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-3">
          {documents.map((doc, i) => (
            <motion.div key={i} initial={mounted ? { opacity: 0, y: 15 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}
              className="bg-slate-50 dark:bg-slate-900 p-2.5 md:p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-cyan-200 dark:hover:border-cyan-800 transition flex items-start gap-2.5 md:gap-3">
              <div className="w-5.5 h-5.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 text-primary-strong dark:text-cyan-400 font-black text-[13px] md:text-xs flex items-center justify-center flex-shrink-0">{i + 1}</div>
              <div className="min-w-0">
                <p className="font-bold text-xs md:text-sm text-slate-900 dark:text-white leading-tight">{doc.name}</p>
                <p className="text-[13px] md:text-xs text-slate-500 dark:text-slate-400 mt-0.5">{doc.note}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={mounted ? { opacity: 0, y: 15 } : false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3.5 md:p-5 mt-5 md:mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="w-8.5 h-8.5 md:w-10 md:h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4.5 h-4.5 md:w-5 md:h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 font-bold">
              <span className="text-slate-900 dark:text-white font-extrabold">Need help preparing your documents?</span>{" "}
              Our team pre-audits every paper before deadlines.{" "}
              <a href="/neet-pg-documents" className="text-primary-strong underline underline-offset-2 dark:text-primary">
                MCC&apos;s and each state&apos;s official list →
              </a>
            </p>
          </div>
          <button onClick={() => CTA.whatsapp("Hi, I need help with document preparation for NEET counselling.")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/90 text-white min-h-11 md:min-h-0 text-[13px] md:text-sm font-black uppercase tracking-wider px-4 py-2 md:px-5 md:py-2.5 rounded-lg transition-colors flex-shrink-0">
            <WhatsAppIcon className="w-3.5 h-3.5" /> Chat With Us
          </button>
        </motion.div>
      </div>
    </section>
  );
};
