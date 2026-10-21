"use client";

import React, { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { University, GraduationCap, Award, Phone, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCTA } from '@/hooks/useCTA';
import PhotoCredit from '@/components/ui/PhotoCredit';

const DeemedCollegesListing = dynamic(
  () => import('@/components/mbbs/DeemedCollegesListing').then(mod => ({ default: mod.DeemedCollegesListing })),
  { loading: () => <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">Loading College Data...</div>, ssr: false }
);

/**
 * A backdrop and, where it is somebody else's photograph, its credit.
 *
 * The first slot is a real Wikimedia photograph of a real Indian medical
 * college now — the AI-generated image it replaces invented
 * "ROYAL INTERNATIONAL MEDICAL UNIVERSITY" on a European campus, under the
 * heading "India's Finest Deemed Universities". CC BY-SA is free *and*
 * conditional: name the photographer, so the credit rotates with the image.
 */
export interface HeroShot {
  src: string;
  /** Which college it is. Three of these four are government colleges, and the
   *  heading above them reads "India's Finest Deemed Universities". */
  subject?: string | null;
  credit?: string | null;
  license?: string | null;
}

// No CMS rows, no backdrop. The list that used to sit here was five
// AI-generated campuses — "ST. JUDE GRAND HOSPITAL", "UNIVERSITY OF HEALTH
// SCIENCES", "MEDICAL ACADEMY" and a D.Y. Patil building that is not theirs —
// rotating under the heading "India's Finest Deemed Universities".
const fallbackHeroBgImages: HeroShot[] = [];

interface HeroImageRotatorProps {
  images: HeroShot[];
}

function HeroImageRotator({ images }: HeroImageRotatorProps) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % images.length), 5000);
    return () => clearInterval(t);
  }, [images]);

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-border bg-surface-3 shadow-lift">
      {images.map((shot, i) => (
        <div
          key={i}
          className="pointer-events-none absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms]"
          style={{
            backgroundImage: `url(${shot.src})`,
            opacity: i === current ? 1 : 0,
          }}
          aria-hidden="true"
        />
      ))}
      {/* The credit follows the photograph on show. */}
      <PhotoCredit
        subject={images[current]?.subject}
        attribution={images[current]?.credit}
        license={images[current]?.license}
        tone="chip"
        className="absolute right-2.5 top-2.5"
      />
    </div>
  );
}

interface DeemedUniversitiesClientProps {
  heroImages?: HeroShot[];
  phoneNumber?: string;
}

export default function DeemedUniversitiesClient({ heroImages, phoneNumber = "+919873133846" }: DeemedUniversitiesClientProps) {
  const CTA = useCTA();
  const imagesToUse = heroImages && heroImages.length > 0 ? heroImages : fallbackHeroBgImages;

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
        {/* ─── Hero — light since 2026-10-21 ─── */}
        <section className="relative isolate overflow-hidden border-b border-border bg-background py-10 md:py-14">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/80 via-background to-background" />
            <div className="absolute -right-40 -top-48 h-[32rem] w-[32rem] rounded-full bg-secondary/10 blur-[110px]" />
            <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_55%_at_75%_10%,#000,transparent)]" />
          </div>

          <div className={`container-custom relative grid gap-10 ${imagesToUse.length ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-center lg:gap-14" : ""}`}>
            <div className="min-w-0">
              <p className="mb-4 flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-strong">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft ring-1 ring-primary/15">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </span>
                MBBS · deemed universities
              </p>

              <h1 className="font-heading max-w-[22ch] text-[clamp(2rem,4.4vw,3.35rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground [text-wrap:balance]">
                Deemed universities <span className="text-primary-strong">for MBBS in India</span>
              </h1>

              <p className="mt-5 max-w-[60ch] text-[15.5px] leading-relaxed text-muted-foreground md:text-[17px]">
                Deemed universities fill their MBBS seats through MCC&apos;s own deemed-university counselling, with fees of their own. See each one&apos;s fees, seats and counselling, and have a counsellor beside you through every round.
              </p>

              <div className="mt-7 flex flex-col gap-3 xs:flex-row">
                <a
                  href={`tel:${phoneNumber}`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-strong px-6 text-[15px] font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
                >
                  <Phone className="h-4 w-4 shrink-0" aria-hidden="true" /> Get expert guidance
                </a>
                <a
                  href="#deemed-listing"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-[15px] font-semibold text-foreground transition-colors hover:border-primary/40"
                >
                  Explore the universities <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </div>

            {imagesToUse.length > 0 && (
              <div className="relative min-w-0">
                <HeroImageRotator images={imagesToUse} />
              </div>
            )}
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
                className="inline-block px-4 py-1.5 mb-4 text-[10px] font-black tracking-widest text-cyan-600 uppercase bg-cyan-600/10 rounded-full"
              >
                What Makes Them Special
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="text-responsive-h2 text-slate-900 mb-3"
              >
                Understanding <span className="text-cyan-600">Deemed Universities</span>
              </motion.h2>
              <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
                className="text-responsive-body text-slate-500 max-w-2xl mx-auto font-medium"
              >
                Autonomous institutions with global standards, advanced research, and centralized MCC counselling.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              {[
                { icon: University, title: "Autonomous Status", desc: "Freedom to design curricula aligned with global medical standards, ensuring cutting-edge education.", color: "from-cyan-600 to-cyan-700" },
                { icon: GraduationCap, title: "All-India Quota", desc: "Centralized MCC counseling based on NEET-UG merit ranks — transparent and merit-driven admissions.", color: "from-teal-600 to-emerald-700" },
                { icon: Award, title: "Academic Excellence", desc: "State-of-the-art infrastructure, renowned faculty, and strong emphasis on clinical research and innovation.", color: "from-teal-600 to-teal-700" },
              ].map((box, idx) => (
                <motion.div key={idx}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-5 md:p-7 rounded-2xl md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <div className={`w-11 h-11 md:w-13 md:h-13 rounded-xl md:rounded-2xl bg-gradient-to-br ${box.color} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <box.icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <h2 className="text-base md:text-lg font-black text-slate-900 mb-2 tracking-tight">{box.title}</h2>
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
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-400/10 blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none rounded-full" />
          
          <div className="container-custom relative z-10">
            <div className="bg-white rounded-[2rem] p-5 md:p-8 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-teal-500" />
              
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-10 items-center">
                <div>
                  <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 text-[10px] font-black tracking-widest text-cyan-600 uppercase bg-cyan-50 border border-cyan-100 rounded-full"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Direct Support
                  </motion.div>
                  <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
                    className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 leading-tight tracking-tight mb-3"
                  >
                    Need Help with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-600">Deemed University</span> Admissions?
                  </motion.h2>
                  <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
                    className="text-slate-600 text-sm font-medium mb-5 leading-relaxed max-w-lg"
                  >
                    Our counselors navigate the complex admission process, choose the right university, and maximize your chances of securing a seat.
                  </motion.p>
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
                    className="flex flex-col xs:flex-row gap-3"
                  >
                    <a href={`tel:${phoneNumber}`} className="bg-gradient-to-br from-cyan-600 to-teal-600 text-white hover:from-cyan-700 hover:to-teal-700 font-black py-2.5 px-4 sm:py-3 sm:px-6 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 active:scale-95 w-full xs:w-auto">
                      <Phone className="w-4 h-4 shrink-0" /> Call Our Experts
                    </a>
                    <button onClick={() => CTA.whatsapp("Hi, I need guidance for deemed university MBBS admission")}
                      className="bg-slate-50 border-2 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 font-black py-2.5 px-4 sm:py-3 sm:px-6 rounded-xl text-xs sm:text-sm transition-all active:scale-95 w-full xs:w-auto"
                    >
                      WhatsApp Us
                    </button>
                  </motion.div>
                </div>
  
                <div className="bg-slate-50/50 p-4 md:p-6 rounded-2xl md:rounded-[1.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/5 to-teal-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <h2 className="text-base md:text-lg font-black text-slate-900 mb-4 tracking-tight relative z-10">Our Support Highlights</h2>
                  <div className="space-y-2 relative z-10">
                    {[
                      { icon: University, title: "University Selection", desc: "Personalized recommendation based on your NEET score." },
                      { icon: GraduationCap, title: "Counseling Assistance", desc: "Step-by-step support during MCC counselling." },
                      { icon: Award, title: "Documentation Support", desc: "Complete assistance with all required documents." },
                    ].map((s, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + (idx * 0.1) }}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white transition-colors duration-300"
                      >
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white flex items-center justify-center text-cyan-600 border border-slate-100 shadow-sm shrink-0">
                          <s.icon className="w-4 h-4" />
                        </div>
                        <div className="pt-0.5">
                          <h3 className="text-[13px] md:text-xs font-black text-slate-800 uppercase tracking-widest mb-0.5">{s.title}</h3>
                          <p className="text-slate-500 text-xs font-medium leading-relaxed">{s.desc}</p>
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
