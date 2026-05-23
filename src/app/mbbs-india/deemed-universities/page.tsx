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

// Hero background images for rotation
const heroBgImages = [
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1600",
  "https://images.unsplash.com/photo-1580281658626-ee379f384018?auto=format&fit=crop&q=80&w=1600",
  "https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&q=80&w=1600",
];

function HeroImageRotator() {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % heroBgImages.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 -z-10">
      {heroBgImages.map((src, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms]"
          style={{
            backgroundImage: `url(${src})`,
            opacity: i === current ? 1 : 0,
          }}
        />
      ))}
      {/* ~65% dark overlay */}
      <div className="absolute inset-0 bg-slate-900/65" />
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
        <section className="relative min-h-[75vh] md:min-h-[85vh] flex items-center overflow-hidden">
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
                <span className="gradient-text">Deemed Universities</span> for MBBS
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-blue-100/80 text-sm sm:text-base lg:text-lg font-medium leading-relaxed max-w-2xl mb-8"
              >
                Discover world-class deemed medical institutions offering autonomous curricula, global research exposure, and NMC-recognized MBBS programs — with expert-guided admission support through every MCC counselling round.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
              >
                <a href={`tel:${phoneNumber}`}
                  className="inline-flex justify-center items-center gap-2 bg-white text-slate-900 px-5 py-3 rounded-xl font-black text-sm hover:bg-blue-50 transition-all shadow-xl shadow-blue-500/10 active:scale-95"
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
        <section className="compact-padding relative overflow-hidden">
          <div className="absolute inset-0 bg-slate-900 -z-20" />
          <div className="absolute inset-0 mesh-gradient opacity-40 -z-10" />

          <div className="container-custom">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div>
                <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight mb-5"
                >
                  Need Help with <span className="gradient-text">Deemed University</span> Admissions?
                </motion.h2>
                <p className="text-blue-100/70 text-sm md:text-base font-medium mb-8 leading-relaxed">
                  Our counselors navigate the complex admission process, choose the right university, and maximize your chances of securing a seat.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a href={`tel:${phoneNumber}`} className="bg-white text-slate-900 hover:bg-slate-100 font-black py-3 px-6 rounded-xl text-sm transition-all shadow-lg flex items-center gap-2 active:scale-95">
                    <Phone className="w-4 h-4" /> Call Our Experts
                  </a>
                  <button onClick={() => CTA.whatsapp("Hi, I need guidance for deemed university MBBS admission")}
                    className="border-2 border-white text-white hover:bg-white/10 font-black py-3 px-6 rounded-xl text-sm transition-all active:scale-95"
                  >
                    WhatsApp Us
                  </button>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-white/10 shadow-xl">
                <h3 className="text-xl font-black text-white mb-6 tracking-tight">Our Admission Support</h3>
                <div className="space-y-5">
                  {[
                    { icon: University, title: "University Selection", desc: "Personalized recommendation based on your NEET score and preferences." },
                    { icon: GraduationCap, title: "Counseling Assistance", desc: "Step-by-step support during the MCC counselling and admission process." },
                    { icon: Award, title: "Documentation Support", desc: "Complete assistance with preparation of all required documents." },
                  ].map((s, idx) => (
                    <div key={idx} className="flex items-start gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                        <s.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-[0.15em] mb-1">{s.title}</h4>
                        <p className="text-blue-100/60 text-xs md:text-sm font-medium leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
