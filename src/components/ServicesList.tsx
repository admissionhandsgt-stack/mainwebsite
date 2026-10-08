"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowRight, X, Phone } from 'lucide-react';
import Link from "@/components/ui/Link";
import { useCTA } from '@/hooks/useCTA';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import BlockIcon from '@/components/ui/BlockIcon';
import { pick } from '@/lib/copy';

export interface Service {
  title: string;
  description: string;
  icon?: string | null;
  /** No link means the card opens the consultation modal instead. */
  href?: string | null;
  cta?: string | null;
}

const PALETTE = [
  { gradient: "from-cyan-600 to-teal-600", iconBg: "bg-gradient-to-br from-cyan-500 to-cyan-700" },
  { gradient: "from-teal-600 to-emerald-600", iconBg: "bg-gradient-to-br from-teal-500 to-emerald-700" },
  { gradient: "from-teal-600 to-teal-600", iconBg: "bg-gradient-to-br from-teal-500 to-teal-700" },
];

const FALLBACK_SERVICES: Service[] = [
  {
    title: "MBBS Admission (UG)",
    description: "Govt | Private | Deemed Colleges — Complete guidance from NEET registration to final seat allotment across all categories.",
    icon: "BookOpen",
    href: "/mbbs-india",
    cta: "Explore MBBS Admissions",
  },
  {
    title: "MD/MS Admission (PG)",
    description: "Branch Selection + AIQ Strategy — Data-backed counselling to secure your dream PG branch at the best institution.",
    icon: "GraduationCap",
    href: "/md-ms-india",
    cta: "Explore PG Admissions",
  },
  {
    title: "1:1 Counselling",
    description: "Personalized Admission Strategy — A dedicated expert analyzes your rank, budget, and goals to build your unique roadmap.",
    icon: "Users",
    href: null,
    cta: "Book Consultation",
  },
];

export interface ServicesCopy {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

const SERVICES_DEFAULTS: Required<ServicesCopy> = {
  eyebrow: 'What We Offer',
  title: 'Our Comprehensive Services',
  subtitle:
    'From your first NEET score to the day you wear your white coat \u2014 we guide you every step of the way.',
};

const ServicesList = ({
  services: fromCms,
  copy,
}: {
  services?: Service[];
  copy?: ServicesCopy;
}) => {
  const text = { ...SERVICES_DEFAULTS, ...pick(copy) };
  const services = fromCms?.length ? fromCms : FALLBACK_SERVICES;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const CTA = useCTA();

  return (
    <>
      <section id="services" className="compact-padding relative bg-white overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent opacity-30" />
        <div className="absolute inset-0 bg-slate-50/30 -z-10" />

        <div className="container-custom relative z-10">
          <div className="text-center mb-10 md:mb-14">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="inline-flex items-center justify-center px-3 py-1.5 mb-4 text-[10px] font-black tracking-widest text-cyan-600 uppercase bg-cyan-50 border border-cyan-100 rounded-full"
            >
              {text.eyebrow}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight"
            >
              {text.title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: 0.2 }}
              className="text-sm md:text-base text-slate-500 max-w-xl mx-auto font-medium leading-relaxed"
            >
              {text.subtitle}
            </motion.p>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {services.map((service, index) => {
              const tone = PALETTE[index % PALETTE.length];
              const cta = service.cta || "Book Consultation";
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="group relative rounded-2xl md:rounded-[2rem] bg-white border border-slate-100/60 p-4 md:p-8 flex flex-col justify-between h-auto min-h-[170px] md:h-[340px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${tone.gradient} opacity-[0.03] rounded-full blur-2xl group-hover:opacity-10 transition-opacity duration-500`} />

                  <div className={`w-9 h-9 md:w-14 md:h-14 rounded-xl md:rounded-2xl ${tone.iconBg} flex items-center justify-center text-white mb-3 md:mb-6 shadow-md md:shadow-lg group-hover:scale-110 transition-transform duration-300 relative z-10 shrink-0`}>
                    <BlockIcon name={service.icon} fallback="Stethoscope" className="w-5 h-5 md:w-6 md:h-6" />
                  </div>

                  <div className="relative z-10 flex-1 flex flex-col min-w-0 w-full break-words">
                    <h3 className="text-sm md:text-xl font-black text-slate-900 mb-1 md:mb-2 leading-tight group-hover:text-cyan-600 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-slate-500 text-[13px] md:text-sm font-medium leading-relaxed mb-3 md:mb-6 flex-1">
                      {service.description}
                    </p>

                    <div className="mt-auto">
                      {service.href ? (
                        <Link
                          href={service.href}
                          className="inline-flex items-center text-[13px] md:text-sm font-black text-slate-900 hover:text-cyan-600 group/btn transition-colors"
                        >
                          {cta}
                          <ArrowRight className="ml-1 w-1.5 h-1.5 md:ml-1.5 md:w-4 md:h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      ) : (
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="inline-flex items-center text-[13px] md:text-sm font-black text-slate-900 hover:text-cyan-600 group/btn transition-colors"
                        >
                          {cta}
                          <ArrowRight className="ml-1 w-1.5 h-1.5 md:ml-1.5 md:w-4 md:h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modern Compact Consultation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-[320px] bg-white rounded-[2rem] shadow-2xl p-6 pointer-events-auto relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-500 to-teal-500" />
                
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>

                <div className="text-center mb-6 pt-2">
                  <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Users size={24} className="text-cyan-600" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">Connect with Expert</h3>
                  <p className="text-xs text-slate-500 font-bold">Choose your preferred way to talk.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      CTA.whatsapp("Hi, I want to book a 1:1 consultation.");
                      setIsModalOpen(false);
                    }}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 transition-all active:scale-95"
                  >
                    <WhatsAppIcon size={24} />
                    <span className="text-[10px] font-black uppercase tracking-wider">WhatsApp</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      CTA.call();
                      setIsModalOpen(false);
                    }}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-100 text-cyan-700 transition-all active:scale-95"
                  >
                    <Phone size={24} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Call Now</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default ServicesList;
