"use client";

import React, { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { University, GraduationCap, Award, Phone, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCTA } from '@/hooks/useCTA';
import { useContactInfo } from '@/hooks/useContactInfo';

const DeemedCollegesListing = dynamic(
  () => import('@/components/mbbs/DeemedCollegesListing').then(mod => ({ default: mod.DeemedCollegesListing })),
  { loading: () => <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading College Data...</div>, ssr: false }
);

const heroBgImages = [
  "/assets/images/colleges/deemed-campus-1.png",
  "/assets/images/colleges/medical-campus-2.png",
  "/assets/images/colleges/medical-campus-3.png",
  "/assets/images/colleges/medical-campus-4.png",
];

function HeroImageRotator() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % heroBgImages.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 -z-10 bg-slate-950">
      {heroBgImages.map((src, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms]"
          style={{
            backgroundImage: `url(${src})`,
            opacity: i === current ? 0.45 : 0,
          }}
        />
      ))}
      {/* ~55% dark overlay */}
      <div className="absolute inset-0 bg-slate-900/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900/80" />
    </div>
  );
}

export default function DeemedUniversities() {
  const CTA = useCTA();
  const { contactInfo } = useContactInfo();
  const phoneNumber = contactInfo?.phone_number || "+919310301949";

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Deemed Universities for MBBS in India - AdmissionHands",
    "description": "Explore India's top deemed universities for MBBS with expert admission guidance, seat details, and counselling support.",
    "publisher": { "@type": "Organization", "name": "AdmissionHands" },
  };

  return (
    <div className="flex flex-col flex-grow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <div className="flex-grow">
        {/* ─── Hero Section ─── */}
        <section className="relative min-h-[75vh] md:min-h-[85vh] flex items-center overflow-hidden text-white">
          <HeroImageRotator />

          <div className="container-custom relative z-10 py-12 md:py-16">
            <div className="max-w-3xl mx-auto text-center lg:text-left lg:mx-0">
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-300 text-xs font-black tracking-widest uppercase mb-5 backdrop-blur-sm"
              >
                <Sparkles className="w-3.5 h-3.5" /> Premier Deemed Medical Universities
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight mb-5"
              >
                India&apos;s Finest <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Deemed Universities</span> for MBBS
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-blue-100/85 text-sm sm:text-base lg:text-lg font-medium leading-relaxed max-w-2xl mb-8"
              >
                Discover world-class deemed medical institutions offering autonomous curricula, global research exposure, and NMC-recognized MBBS programs — with expert-guided admission support through every MCC counselling round.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
              >
                <a href={`tel:${phoneNumber}`}
                  className="inline-flex justify-center items-center gap-2 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-teal-500/30 text-slate-900 dark:text-teal-400 px-5 py-3 rounded-xl font-black text-sm hover:bg-blue-50 dark:hover:bg-slate-900/60 transition-all shadow-xl active:scale-95"
                >
                  <Phone className="w-4 h-4" /> Get Expert Guidance
                </a>
                <a href="#deemed-listing"
                  className="inline-flex justify-center items-center gap-2 border-2 border-white/60 text-white px-5 py-3 rounded-xl font-black text-sm hover:bg-white/10 transition-all active:scale-95"
                >
                  Explore Colleges <ArrowRight className="w-4 h-4" />
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── Understanding Deemed Universities ─── */}
        <section className="compact-padding bg-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.3) 1px, transparent 0)',
            backgroundSize: '32px 32px'
          }} />

          <div className="container-custom relative z-10">
            <div className="text-center mb-8">
              <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="inline-block px-4 py-1.5 mb-4 text-[10px] font-black tracking-widest text-blue-600 uppercase bg-blue-600/10 rounded-full"
              >
                What Makes Them Special
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="text-responsive-h2 text-slate-900 mb-3"
              >
                Understanding <span className="text-blue-600">Deemed Universities</span>
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                className="text-responsive-body text-slate-500 max-w-2xl mx-auto font-medium"
              >
                Autonomous institutions with global standards, advanced research, and centralized MCC counselling.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {[
                { icon: University, title: "Autonomous Status", desc: "Freedom to design curricula aligned with global medical standards, ensuring cutting-edge education.", color: "from-blue-600 to-blue-700" },
                { icon: GraduationCap, title: "All-India Quota", desc: "Centralized MCC counseling based on NEET-UG merit ranks — transparent and merit-driven admissions.", color: "from-teal-600 to-emerald-700" },
                { icon: Award, title: "Academic Excellence", desc: "State-of-the-art infrastructure, renowned faculty, and strong emphasis on clinical research and innovation.", color: "from-indigo-600 to-violet-700" },
              ].map((box, idx) => (
                <motion.div key={idx}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-5 md:p-7 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <div className={`w-11 h-11 md:w-13 md:h-13 rounded-xl md:rounded-2xl bg-gradient-to-br ${box.color} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <box.icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <h3 className="text-base md:text-lg font-black text-slate-900 mb-2 tracking-tight">{box.title}</h3>
                  <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">{box.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── College Listing (Supabase-driven) ─── */}
        <div id="deemed-listing">
          <Suspense fallback={<div className="py-20 text-center text-slate-300 uppercase tracking-widest font-black">Preparing College List...</div>}>
            <DeemedCollegesListing />
          </Suspense>
        </div>

        {/* ─── CTA Section ─── */}
        <section className="py-8 md:py-10 relative overflow-hidden bg-slate-50 border-t border-slate-100">
          {/* Light background effects */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e110_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e110_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none rounded-full" />
          
          <div className="container-custom relative z-10">
            <div className="bg-white rounded-[2rem] p-5 md:p-8 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-10 items-center">
                <div>
                  <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 text-[10px] font-black tracking-widest text-blue-600 uppercase bg-blue-50 border border-blue-100 rounded-full"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Direct Support
                  </motion.div>
                  <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                    className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 leading-tight tracking-tight mb-3"
                  >
                    Need Help with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Deemed University</span> Admissions?
                  </motion.h2>
                  <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                    className="text-slate-600 text-sm font-medium mb-5 leading-relaxed max-w-lg"
                  >
                    Our counselors navigate the complex admission process, choose the right university, and maximize your chances of securing a seat.
                  </motion.p>
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
                    className="flex flex-wrap gap-3"
                  >
                    <a href={`tel:${phoneNumber}`} className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 font-black py-3 px-6 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 active:scale-95">
                      <Phone className="w-4 h-4" /> Call Our Experts
                    </a>
                    <button onClick={() => CTA.whatsapp("Hi, I need guidance for deemed university MBBS admission")}
                      className="bg-slate-50 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-black py-3 px-6 rounded-xl text-sm transition-all active:scale-95"
                    >
                      WhatsApp Us
                    </button>
                  </motion.div>
                </div>
  
                <div className="bg-slate-50/50 p-4 md:p-6 rounded-2xl md:rounded-[1.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <h3 className="text-base md:text-lg font-black text-slate-900 mb-4 tracking-tight relative z-10">Our Support Highlights</h3>
                  <div className="space-y-2 relative z-10">
                    {[
                      { icon: University, title: "University Selection", desc: "Personalized recommendation based on your NEET score." },
                      { icon: GraduationCap, title: "Counseling Assistance", desc: "Step-by-step support during MCC counselling." },
                      { icon: Award, title: "Documentation Support", desc: "Complete assistance with all required documents." },
                    ].map((s, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + (idx * 0.1) }}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white transition-colors duration-300"
                      >
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 border border-slate-100 shadow-sm shrink-0">
                          <s.icon className="w-4 h-4" />
                        </div>
                        <div className="pt-0.5">
                          <h4 className="text-[10px] md:text-xs font-black text-slate-800 uppercase tracking-widest mb-0.5">{s.title}</h4>
                          <p className="text-slate-500 text-xs font-medium leading-relaxed line-clamp-1">{s.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
