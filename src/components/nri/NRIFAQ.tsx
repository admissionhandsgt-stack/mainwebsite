
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const NRIFAQ = () => {
  return (
    <section id="faq" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-900 -z-10" />
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-blue-100/70 text-lg font-medium">
            Get answers to commonly asked questions about NRI quota medical admissions.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-6">
            {[
              {
                q: "What is NRI quota in medical colleges?",
                a: "NRI quota refers to seats reserved in medical colleges for Non-Resident Indians (NRIs), Person of Indian Origin (PIO), Overseas Citizens of India (OCI), and foreign nationals. Typically, 15% of seats in private and deemed universities are allocated under the NRI/Management quota."
              },
              {
                q: "Does every medical college have NRI quota seats?",
                a: "No, not all medical colleges offer NRI quota seats. Most private medical colleges, deemed universities, and some government medical colleges have NRI quota seats. The availability and number of seats vary by institution and are typically regulated by respective state authorities."
              },
              {
                q: "Is NEET mandatory for NRI quota admissions?",
                a: "Yes, as per the Supreme Court ruling, NEET qualification is mandatory for admission to medical courses in India, including through the NRI quota. Some institutions may have specific additional requirements for foreign nationals."
              },
              {
                q: "Can a student sponsored by an NRI apply under NRI quota?",
                a: "Yes, many institutions accept NRI-sponsored candidates. The sponsor must be a blood relative (parent, sibling, or specific cousins/uncles/aunts). Relationship requirements vary by institution."
              },
              {
                q: "What documents are required to prove NRI status?",
                a: "Common documents include a valid passport with visa stamps, overseas address proof, employment proof, NRI bank statements, and tax documents from the foreign country."
              }
            ].map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="glass-dark rounded-3xl border border-white/10 overflow-hidden shadow-2xl group">
                <AccordionTrigger className="px-8 py-6 text-xl font-bold text-white hover:text-blue-400 text-left transition-all no-underline hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-8 text-blue-100/70 text-lg leading-relaxed font-medium border-t border-white/5 pt-6">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default NRIFAQ;
