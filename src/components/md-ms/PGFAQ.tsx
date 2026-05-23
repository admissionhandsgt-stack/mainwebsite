"use client";

import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, MessageCircleQuestion } from 'lucide-react';
import { CONTACT_INFO } from '@/lib/constants';

const faqs = [
  {
    question: "What is the eligibility criteria for MD/MS admission in India?",
    answer: "Candidates must possess an MBBS degree from a medical college recognized by the NMC/MCI and must have completed their mandatory one-year rotating internship. Additionally, qualifying for the NEET PG entrance exam is mandatory."
  },
  {
    question: "How are seats divided between All India Quota and State Quota?",
    answer: "In Government medical colleges, 50% of the PG seats are reserved for the All India Quota (AIQ), filled through MCC. The remaining 50% are under the State Quota, filled by respective state counseling authorities."
  },
  {
    question: "Can I apply for Deemed Universities if I am from a different state?",
    answer: "Yes, Deemed Universities are open to candidates from all over India regardless of their domicile. The counseling for 100% of seats in Deemed Universities is conducted by the MCC."
  },
  {
    question: "What is a Mop-up Round in PG counselling?",
    answer: "A Mop-up Round is conducted after the completion of Round 1 and Round 2 to fill any remaining vacant seats. It provides another opportunity for candidates who didn't secure a seat in earlier rounds."
  },
  {
    question: "Is there any age limit for NEET PG?",
    answer: "As of current guidelines, there is no upper age limit for appearing in the NEET PG exam or seeking MD/MS admissions in India."
  }
];

export const PGFAQ = () => {
  return (
    <section className="py-24 bg-white">
      <div className="container-custom">
        <div className="grid lg:grid-cols-12 gap-16">
          {/* Left Side: Header */}
          <div className="lg:col-span-5">
            <div className="sticky top-32">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <HelpCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                Frequently Asked <br />
                <span className="text-blue-600">Questions</span>
              </h2>
              <p className="text-lg text-slate-500 font-medium leading-relaxed mb-8">
                Get quick answers to common queries regarding NEET PG counseling, seat allotment, and admission procedures.
              </p>
              
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <MessageCircleQuestion className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Still have questions?</p>
                  <a 
                    href={`https://wa.me/${CONTACT_INFO.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent("Hi, I have some questions about MD/MS admissions.")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-black text-blue-600 hover:underline cursor-pointer uppercase tracking-tight"
                  >
                    Chat with our experts now
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Accordions */}
          <div className="lg:col-span-7">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, i) => (
                <AccordionItem 
                  key={i} 
                  value={`item-${i}`} 
                  className="border border-slate-100 rounded-2xl px-6 bg-slate-50/30 hover:bg-white hover:border-blue-100 hover:shadow-lg hover:shadow-blue-900/5 transition-all"
                >
                  <AccordionTrigger className="text-lg font-bold text-slate-800 text-left hover:no-underline py-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-600 text-base leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};
