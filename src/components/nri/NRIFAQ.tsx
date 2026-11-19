
import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { pick } from "@/lib/copy";

export interface NriFaq {
  q: string;
  a: string;
}

const FALLBACK_ITEMS: NriFaq[] = [
  {
    q: "What is NRI quota in medical colleges?",
    a: "Seats set aside for Non-Resident Indians and candidates an NRI relative sponsors, OCI and PIO cardholders and foreign nationals. In deemed universities MCC allots 15% of the seats as NRI seats; in private colleges each state decides whether there is an NRI quota and how big it is."
  },
  {
    q: "Does every medical college have NRI quota seats?",
    a: "No. MCC's NRI seats are in the deemed universities; in private colleges each state's rules decide whether a college keeps NRI seats and how many. A state's NRI seat follows that state's own information bulletin, so check the bulletin of every counselling you register for."
  },
  {
    q: "Is NEET mandatory for NRI quota admissions?",
    a: "Yes, as per the Supreme Court ruling, NEET qualification is mandatory for admission to medical courses in India, including through the NRI quota. Some institutions may have specific additional requirements for foreign nationals."
  },
  {
    q: "Can a student sponsored by an NRI apply under NRI quota?",
    a: "Yes, within MCC's rule (from the Supreme Court's Anshul Tomar case): a parent or a real brother or sister who is an NRI; or your nearest NRI relation — a real uncle or aunt on either side, a grandparent or a first cousin — who has looked after you as your guardian, with evidence and an affidavit, and who sponsors the whole course fee. State counsellings set their own rules."
  },
  {
    q: "What documents are required to prove NRI status?",
    a: "For MCC: an NRI certificate from the Indian embassy or consulate, your valid passport, a notarised affidavit by the NRI sponsor to pay the whole course fee and living costs backed by an NRE passbook, and the relationship verified by a revenue officer such as a Tehsildar — plus your Class 10 and 12 certificates and the NEET score card. The full list, category by category, is on our NRI documents page."
  }
];

export interface NriFaqCopy {
  title?: string;
  subtitle?: string;
}

const NRI_DEFAULTS: Required<NriFaqCopy> = {
  title: 'Frequently Asked Questions',
  subtitle: 'Get answers to commonly asked questions about NRI quota medical admissions.',
};

const NRIFAQ = ({ items: fromCms, copy }: { items?: NriFaq[]; copy?: NriFaqCopy }) => {
  const items = fromCms?.length ? fromCms : FALLBACK_ITEMS;
  const text = { ...NRI_DEFAULTS, ...pick(copy) };

  return (
    <section id="faq" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-surface-2 -z-10" />
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-6 tracking-tight">
            {text.title}
          </h2>
          <p className="text-muted-foreground text-lg font-medium">
            {text.subtitle}
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <Accordion type="single" collapsible className="space-y-6">
            {items.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm group">
                <AccordionTrigger className="px-8 py-6 text-xl font-bold text-foreground hover:text-primary-strong text-left transition-all no-underline hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-8 text-muted-foreground text-lg leading-relaxed font-medium border-t border-border pt-6">
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
