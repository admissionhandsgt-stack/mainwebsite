"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search, SearchX } from "lucide-react";
import { useCTA } from "@/hooks/useCTA";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const categories = [
  { id: "eligibility", name: "Eligibility & Basics" },
  { id: "process", name: "Counselling & Process" },
  { id: "financials", name: "Fees & Bonds" },
];

const faqItems = [
  {
    category: "eligibility",
    question: "What is the eligibility for NEET PG counselling?",
    answer:
      "You need an MBBS degree from a recognized institution, completed 1-year compulsory rotating internship, and valid NMC/State Medical Council registration. Your NEET PG score must meet the qualifying cutoff (50th percentile for General/EWS category).",
  },
  {
    category: "process",
    question: "What is the difference between AIQ and State Quota?",
    answer:
      "All India Quota (AIQ) reserves 50% of government medical college PG seats for candidates from any state, managed by MCC. State Quota is the remaining 50%, reserved for domicile candidates and managed by respective state counselling authorities. We recommend registering for both to maximize options.",
  },
  {
    category: "process",
    question: "How many counselling rounds are there?",
    answer:
      "Typically 4 rounds: Round 1, Round 2, Mop-Up Round, and Stray Vacancy Round. Each round has its own registration, choice filling, and allotment schedule. Seats vacated in earlier rounds become available in subsequent rounds, sometimes at lower cutoffs.",
  },
  {
    category: "eligibility",
    question: "Can I apply for both MD and MS programs?",
    answer:
      "Yes, absolutely. During choice filling, you can include both MD (Medicine) and MS (Surgery) programs in your preference list. Your allotment depends on your rank and the availability of seats in your chosen combinations.",
  },
  {
    category: "financials",
    question: "What is the fee structure for PG medical seats?",
    answer:
      "Fees vary dramatically. Government colleges charge ₹15,000-₹1,00,000 per year. Private colleges range from ₹5-25 lakhs per year. Deemed universities can go up to ₹30-50 lakhs per year. Many colleges also have bond clauses requiring rural service or monetary penalties.",
  },
  {
    category: "financials",
    question: "Do PG students receive a stipend?",
    answer:
      "Yes, government medical college PG students receive monthly stipends ranging from ₹40,000 to ₹1,00,000+ depending on the state and year of residency. Most private and deemed universities do not offer stipends, though some provide nominal amounts.",
  },
  {
    category: "financials",
    question: "What are bond clauses in PG admissions?",
    answer:
      "Many state government colleges require PG graduates to serve in rural/government hospitals for 1-3 years after completion, or pay a bond penalty (₹10-50 lakhs). We help you understand each college's bond terms before choice filling so there are no surprises.",
  },
  {
    category: "process",
    question: "Can I upgrade my seat in later rounds?",
    answer:
      'Yes. If you are allotted a seat in Round 1, you can choose to "float" (retain current seat while participating in next round for a better option) or "resign" (give up current seat). Our experts provide round-by-round upgrade strategies based on real-time vacancy analysis.',
  },
  {
    category: "process",
    question: "What happens if I miss a counselling deadline?",
    answer:
      "Missing any deadline — registration, choice filling, fee payment, or reporting — typically results in forfeiture of your seat and security deposit. There is usually no appeal process. This is why our deadline management service is critical.",
  },
  {
    category: "eligibility",
    question: "How is Admission Hands different from other counselling services?",
    answer:
      "We are data-first: our recommendations are backed by 5-year cutoff analytics, not opinions. You get a single named expert counsellor from Day 1 through college reporting. We manage AIQ + State + Deemed quotas in parallel. And we have a 0% document rejection rate across 2100+ students.",
  },
];

export const PGFAQ = () => {
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState("eligibility");
  const [searchQuery, setSearchQuery] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const CTA = useCTA();

  useEffect(() => setMounted(true), []);

  // Filter FAQs based on active category and search query
  const filteredFaqs = faqItems.filter((item) => {
    const matchesCategory = item.category === activeCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Reset expanded index when category or search changes
  useEffect(() => {
    setOpenIndex(null);
  }, [activeCategory, searchQuery]);

  return (
    <section className="py-10 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 border-t border-slate-100 dark:border-slate-800/40">
      <div className="container-custom max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 dark:bg-blue-955/40 dark:text-blue-400 mb-2">
            Got Questions? We Have Answers
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
            NEET PG Counselling <span className="text-blue-600 dark:text-blue-400">FAQs</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold max-w-xl mx-auto leading-relaxed">
            Quickly find answers to essential questions regarding eligibility, rounds, seat upgrades, stipends, and quotas.
          </p>
        </div>

        {/* Search and Tabs Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 shadow-xs">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:text-slate-200"
            />
          </div>
        </div>

        {/* FAQs Accordion Block */}
        <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 p-1.5 md:p-3 shadow-xs">
          <AnimatePresence mode="wait">
            {filteredFaqs.length > 0 ? (
              <motion.div
                key={activeCategory + searchQuery}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="divide-y divide-slate-100 dark:divide-slate-800/50"
              >
                {filteredFaqs.map((item, idx) => {
                  const isOpen = openIndex === idx;
                  return (
                    <div key={idx} className="first:pt-0 last:pb-0 py-2">
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : idx)}
                        className="w-full text-left py-2 flex justify-between items-center gap-4 group focus:outline-none"
                        aria-expanded={isOpen}
                      >
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">
                          {item.question}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform duration-200 ${
                            isOpen ? "rotate-180 text-blue-600" : ""
                          }`}
                        />
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <p className="text-xs sm:text-sm text-slate-650 dark:text-slate-400 leading-relaxed pb-2 font-medium">
                              {item.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-10 text-center flex flex-col items-center justify-center"
              >
                <SearchX className="w-10 h-10 text-slate-305 dark:text-slate-700 mb-3" />
                <h3 className="text-sm font-black text-slate-800 dark:text-white">No matches found</h3>
                <p className="text-slate-550 dark:text-slate-450 text-[11px] font-bold mt-1">Try a different search query or select another category tab.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom WhatsApp Contact Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="text-center sm:text-left">
            <p className="text-xs text-slate-800 dark:text-slate-350 font-black leading-snug">Still have unanswered questions?</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">Connect instantly with our senior advisors for 1-on-1 support.</p>
          </div>
          <button
            onClick={() =>
              CTA.whatsapp("Hi, I have a question about NEET PG counselling.")
            }
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#128C7E] text-white text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
            Chat on WhatsApp
          </button>
        </div>
      </div>
    </section>
  );
};
