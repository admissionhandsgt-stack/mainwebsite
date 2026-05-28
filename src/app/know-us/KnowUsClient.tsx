"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  Mail, Phone, MapPin, 
  Sparkles, CheckCircle2, GraduationCap, Star,
  BookOpen, HeartHandshake, 
  BarChart3, Target, Zap, TrendingUp, Brain, 
  Lightbulb, Shield, Clock, FileCheck
} from 'lucide-react';
import { useCTA } from '@/hooks/useCTA';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { CONTACT_INFO } from '@/lib/constants';

interface KnowUsClientProps {
  backgroundImageUrl?: string;
}

export default function KnowUsClient({ backgroundImageUrl }: KnowUsClientProps) {
  const CTA = useCTA();
  const bgImage = backgroundImageUrl || "/assets/images/hero/knowus_hero.avif";
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      
      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative min-h-[62vh] md:min-h-[68vh] flex items-center overflow-hidden py-16 md:py-24 bg-slate-950 text-white">
        <div className="absolute inset-0 z-0">
          {bgImage && bgImage !== "none" && (
            <Image
              src={bgImage}
              alt="Admission Hands Counselor Background"
              fill
              priority
              sizes="100vw"
              className="object-cover"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMjQwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDcwZTFlIi8+PC9zdmc+"
            />
          )}
          <div className="absolute inset-0 bg-slate-955/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/50" />
        </div>
        
        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-500/10 blur-[100px] pointer-events-none" />
        
        <div className="container-custom relative z-10 max-w-5xl mx-auto text-center lg:text-left">
          <motion.div 
            initial={mounted ? { opacity: 0, y: 15 } : false} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4 sm:space-y-5"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-300 text-[10px] font-black tracking-widest uppercase mb-4 backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-blue-400" /> India&apos;s Most Trusted Medical Admission Advisory
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] font-black text-white leading-[1.1] tracking-tight mb-4">
              We Don&apos;t Just Guide.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">
                We Engineer Admissions.
              </span>
            </h1>
            
            <p className="text-blue-100/90 text-sm md:text-base font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
              For over 12 years, Admission Hands has been the secret weapon behind 2100+ successful MBBS and PG admissions. We combine proprietary cutoff analytics, real-time counselling intelligence, and relentless 1-on-1 mentorship to turn every NEET rank into its highest-value seat.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mt-6">
              <button onClick={() => CTA.call()}
                className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-50 transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <Phone className="w-4 h-4" /> Talk to Our Experts
              </button>
              <button onClick={() => CTA.whatsapp("Hi, I want to learn more about Admission Hands")}
                className="inline-flex items-center justify-center gap-2 border-2 border-white/60 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
              >
                <WhatsAppIcon size={16} /> WhatsApp Us
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ WHO WE ARE — THE STORY ═══════════════ */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-5xl">
          <motion.div 
            initial={mounted ? { opacity: 0, y: 10 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <div className="inline-block px-3 py-1 mb-3 text-[9px] font-black tracking-widest text-blue-600 uppercase bg-blue-50 rounded-full">
              OUR STORY
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
              Built by Obsession. <span className="text-blue-600">Proven by Results.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left — Narrative */}
            <motion.div 
              initial={mounted ? { opacity: 0, x: -15 } : false}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <p className="text-slate-700 text-sm md:text-base font-medium leading-relaxed">
                Admission Hands was founded with a singular vision: <strong className="text-slate-900">every NEET rank — whether 500 or 500,000 — deserves a strategic, expert-driven path to the best possible medical college.</strong>
              </p>
              <p className="text-slate-700 text-sm md:text-base font-medium leading-relaxed">
                Over the past 12+ years, we&apos;ve evolved from a small counselling desk into India&apos;s most analytically rigorous medical admission advisory. Our team reverse-engineers the NEET counselling system every single year — tracking round-wise seat movements, cutoff drift patterns, category-specific vacancy flows, and institutional fee changes across <strong className="text-slate-900">600+ medical colleges in 36 states.</strong>
              </p>
              <p className="text-slate-700 text-sm md:text-base font-medium leading-relaxed">
                While most families navigate the medical admission labyrinth with hearsay and hope, our students enter each counselling round armed with <strong className="text-slate-900">proprietary cutoff intelligence, pre-verified documentation, and a named expert counsellor</strong> who stays with them from Day 1 until they physically report to their college.
              </p>
              <p className="text-slate-700 text-sm md:text-base font-medium leading-relaxed">
                This isn&apos;t generic advice. This is <strong className="text-slate-900">precision admission engineering</strong> — and it&apos;s why 95% of our students secure seats in their top-3 preferred colleges.
              </p>
            </motion.div>

            {/* Right — Key differentiators */}
            <motion.div 
              initial={mounted ? { opacity: 0, x: 15 } : false}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 md:p-6 space-y-4"
            >
              <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1">What Makes Us Different</h3>
              {[
                { icon: Brain, text: "Proprietary cutoff prediction engine with 95%+ historical accuracy", color: "text-blue-600 bg-blue-50" },
                { icon: Target, text: "Named, dedicated counsellor from NEET score release to college reporting", color: "text-emerald-600 bg-emerald-50" },
                { icon: BarChart3, text: "5-year cutoff trend analysis across 600+ medical colleges", color: "text-violet-600 bg-violet-50" },
                { icon: FileCheck, text: "Zero document rejection track record — every paper pre-audited", color: "text-amber-600 bg-amber-50" },
                { icon: Shield, text: "Round-by-round seat upgrade strategy with real-time decision support", color: "text-rose-600 bg-rose-50" },
                { icon: Zap, text: "Parallel AIQ + State Quota management to maximize allotment probability", color: "text-cyan-600 bg-cyan-50" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center shrink-0 mt-0.5`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <p className="text-slate-700 text-xs md:text-sm font-semibold leading-snug">{item.text}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════ WHAT WE DELIVER ═══════════════ */}
      <section className="py-10 md:py-14 bg-white">
        <div className="container-custom max-w-5xl">
          <motion.div 
            initial={mounted ? { opacity: 0, y: 10 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <div className="inline-block px-3 py-1 mb-3 text-[9px] font-black tracking-widest text-indigo-600 uppercase bg-indigo-50 rounded-full">
              WHAT WE DELIVER
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
              End-to-End <span className="text-blue-600">Admission Intelligence</span>
            </h2>
            <p className="text-sm text-slate-600 font-semibold max-w-2xl mx-auto">
              From the moment your NEET score drops to the day you walk into your college — we architect every step.
            </p>
          </motion.div>

          <motion.div 
            initial={mounted ? { opacity: 0, y: 15 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[
              {
                icon: Target,
                title: "Rank-Based Strategy Design",
                desc: "Your rank, category, domicile, and budget are fed into our analytics framework to produce a unique admission blueprint — complete with best-case, realistic, and safety college targets.",
                color: "from-blue-600 to-indigo-600"
              },
              {
                icon: BarChart3,
                title: "Cutoff Intelligence & Predictions",
                desc: "Our proprietary engine processes 5 years of historical cutoff data, seat vacancy trends, and round-wise movement patterns to predict your exact admission probability at each target college.",
                color: "from-emerald-600 to-teal-600"
              },
              {
                icon: BookOpen,
                title: "Strategic Choice Filling",
                desc: "Choice order can make or break your allotment. We build optimized choice lists that balance aspiration with security, ensuring you don't leave a single high-value seat on the table.",
                color: "from-violet-600 to-purple-600"
              },
              {
                icon: FileCheck,
                title: "Bulletproof Documentation",
                desc: "Document rejection is the #1 silent killer of confirmed seats. We pre-audit every certificate, domicile proof, affidavit, and NRI sponsorship document weeks before deadlines.",
                color: "from-amber-500 to-orange-600"
              },
              {
                icon: TrendingUp,
                title: "Round-by-Round Seat Upgrades",
                desc: "Hold, upgrade, or exit? We monitor vacancy patterns in real-time across all rounds — R1, R2, Mop-Up, and Stray — and make split-second upgrade decisions with you.",
                color: "from-rose-500 to-pink-600"
              },
              {
                icon: GraduationCap,
                title: "Post-Allotment & College Reporting",
                desc: "From allotment letter verification to physical reporting logistics, anti-ragging compliance, hostel allotment, and fee payment — we ensure zero last-mile failures.",
                color: "from-cyan-600 to-blue-600"
              }
            ].map((item, idx) => (
              <div 
                key={idx}
                className="bg-slate-50 p-5 rounded-xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-blue-200 group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white mb-3 shadow-sm transition-transform duration-300 group-hover:scale-105">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm md:text-base font-black text-slate-900 mb-1.5 tracking-tight">{item.title}</h3>
                <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ THE ADMISSION HANDS EDGE ═══════════════ */}
      <section className="py-10 md:py-14 bg-gradient-to-b from-slate-50 to-white">
        <div className="container-custom max-w-5xl">
          <motion.div 
            initial={mounted ? { opacity: 0, y: 10 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <div className="inline-block px-3 py-1 mb-3 text-[9px] font-black tracking-widest text-emerald-600 uppercase bg-emerald-50 rounded-full">
              THE ADMISSION HANDS EDGE
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
              Why <span className="text-blue-600">2100+ Families</span> Chose Us
            </h2>
            <p className="text-sm text-slate-600 font-semibold max-w-2xl mx-auto">
              In a landscape filled with noise, here&apos;s what sets us apart — and why families come back year after year.
            </p>
          </motion.div>

          <motion.div 
            initial={mounted ? { opacity: 0, y: 15 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {[
              {
                icon: Brain,
                title: "Data-First, Opinion-Free Advisory",
                desc: "Every recommendation we make is backed by quantifiable data — cutoff trends, seat matrices, historical allotment outcomes. We never speculate. Our families receive college comparison reports with hard numbers, not vague promises.",
                highlight: "600+ colleges analyzed with 5-year trend data"
              },
              {
                icon: HeartHandshake,
                title: "Your Counsellor, Your Champion",
                desc: "You're assigned a single, named senior counsellor who becomes your dedicated admission strategist. No rotating agents. No repeating your story. One expert who knows your rank, your preferences, your budget — and fights for your best outcome.",
                highlight: "1-on-1 dedicated mentorship from Day 1"
              },
              {
                icon: Shield,
                title: "Zero-Error Documentation Standard",
                desc: "Document rejection is the most heartbreaking way to lose a confirmed seat. Our document audit team pre-verifies every single paper — domicile certificates, category proofs, gap year affidavits, NRI sponsorships — against state-specific norms, weeks before deadlines.",
                highlight: "0% document rejection rate across 2100+ students"
              },
              {
                icon: Clock,
                title: "Real-Time, Round-by-Round Command",
                desc: "NEET counselling moves fast. Deadlines shift. Vacancy patterns change. We provide live strategic support during every round — AIQ, State, Mop-Up, Stray — so you make the right call at the right moment, every single time.",
                highlight: "Live support across all 4 counselling rounds"
              }
            ].map((item, idx) => (
              <div 
                key={idx}
                className="bg-white p-5 md:p-6 rounded-xl border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-blue-200 group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 transition-transform duration-300 group-hover:scale-105">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-black text-slate-900 mb-1.5 tracking-tight">{item.title}</h3>
                    <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed mb-3">{item.desc}</p>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" /> {item.highlight}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ OUR PHILOSOPHY ═══════════════ */}
      <section className="py-10 md:py-14 bg-slate-950 text-white">
        <div className="container-custom max-w-4xl text-center">
          <motion.div 
            initial={mounted ? { opacity: 0, scale: 0.95 } : false}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 mb-4 text-[9px] font-black tracking-widest text-blue-300 uppercase bg-white/10 rounded-full border border-white/20"
          >
            OUR PHILOSOPHY
          </motion.div>
          
          <motion.h2 
            initial={mounted ? { opacity: 0, y: 10 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl md:text-4xl font-black text-white tracking-tight mb-4"
          >
            We Measure Success in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">Seats Secured</span>, Not Promises Made
          </motion.h2>
          
          <motion.p 
            initial={mounted ? { opacity: 0 } : false}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-blue-100/80 text-sm md:text-base font-medium leading-relaxed max-w-3xl mx-auto mb-8"
          >
            Our belief is simple: the NEET counselling system rewards preparation, precision, and speed. Families who enter the process armed with data, expert strategy, and airtight documentation consistently outperform those who rely on luck. We exist to deliver that unfair advantage — ethically, transparently, and relentlessly.
          </motion.p>

          <motion.div 
            initial={mounted ? { opacity: 0, y: 15 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {[
              { icon: Lightbulb, title: "Transparency First", desc: "Every fee, every bond clause, every realistic possibility — laid bare. We believe informed families make the best decisions." },
              { icon: Star, title: "Merit-Driven Strategy", desc: "Our strategies are built on data and compliance. We maximize what your rank deserves through the official counselling system." },
              { icon: HeartHandshake, title: "Student-Centric, Always", desc: "Your career is not a transaction. Every recommendation is made with your long-term medical career as the north star." },
            ].map((item, idx) => (
              <div 
                key={idx}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 text-center transition-all duration-300 hover:bg-white/10"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white mb-3 mx-auto shadow-md">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-white mb-1.5">{item.title}</h3>
                <p className="text-blue-100/70 text-xs font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ OUR PROCESS — HOW IT WORKS ═══════════════ */}
      <section className="py-10 md:py-14 bg-white">
        <div className="container-custom max-w-5xl">
          <motion.div 
            initial={mounted ? { opacity: 0, y: 10 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <div className="inline-block px-3 py-1 mb-3 text-[9px] font-black tracking-widest text-violet-600 uppercase bg-violet-50 rounded-full">
              OUR PROCESS
            </div>
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
              From First Call to <span className="text-blue-600">College Reporting</span>
            </h2>
          </motion.div>

          <motion.div 
            initial={mounted ? { opacity: 0, y: 15 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              { step: "01", title: "Free Expert Consultation", desc: "Share your NEET score, category, domicile, and budget. In a free 15-minute call, we map your realistic college options and outline a strategy." },
              { step: "02", title: "Personalized Strategy Blueprint", desc: "Receive a detailed admission playbook with target college lists, cutoff predictions, fee breakdowns, bond clauses, and a timeline for every counselling round." },
              { step: "03", title: "Active Counselling Management", desc: "We manage your MCC/State registrations, build optimized choice-filling lists, handle documentation, and provide real-time support during every round." },
              { step: "04", title: "Seat Secured & College Reporting", desc: "From allotment letter to physical reporting — fee payment, document verification, hostel allotment, anti-ragging compliance — we ensure zero last-mile issues." },
            ].map((item, idx) => (
              <div 
                key={idx}
                className="relative bg-slate-50 p-5 rounded-xl border border-slate-100 hover:shadow-md transition-all duration-300"
              >
                <div className="text-4xl font-black text-slate-100 absolute top-3 right-4 select-none">{item.step}</div>
                <div className="relative z-10">
                  <h3 className="text-sm font-black text-slate-900 mb-1.5 tracking-tight">{item.title}</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════════════ CTA BANNER ═══════════════ */}
      <section className="py-8 md:py-10 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="container-custom max-w-4xl text-center">
          <motion.h2 
            initial={mounted ? { opacity: 0, y: 10 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xl md:text-3xl font-black text-white tracking-tight mb-2"
          >
            Ready to Secure Your MBBS Seat?
          </motion.h2>
          <p className="text-blue-100/90 text-xs md:text-sm font-medium mb-5">
            Get a free, no-obligation strategy call with one of our senior admission experts. Discover exactly what your NEET rank can achieve.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => CTA.call()}
              className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-black text-sm hover:bg-blue-50 transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <Phone className="w-4 h-4" /> Book Free Consultation
            </button>
            <button onClick={() => CTA.whatsapp("Hi, I'd like a free consultation about NEET counselling")}
              className="inline-flex items-center justify-center gap-2 border-2 border-white/60 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            >
              <WhatsAppIcon size={16} /> Message on WhatsApp
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════ CONTACT & MAP ═══════════════ */}
      <section className="py-10 md:py-14 bg-slate-50">
        <div className="container-custom max-w-5xl">
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Visit Our Office</h2>
            <p className="text-xs md:text-sm text-slate-600 font-medium max-w-md mx-auto mt-1">
              Our doors are always open. Walk in for a face-to-face strategy discussion.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Contact Details */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">Get In Touch</h3>
                
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600 shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone</h4>
                    <a href={`tel:${CONTACT_INFO.phone}`} className="text-xs md:text-sm font-black text-slate-800 hover:text-blue-600 transition-colors">
                      {CONTACT_INFO.phone}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email</h4>
                    <a href={`mailto:${CONTACT_INFO.email}`} className="text-xs md:text-sm font-black text-slate-800 hover:text-blue-600 transition-colors">
                      {CONTACT_INFO.email}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="bg-violet-50 p-2 rounded-lg text-violet-600 shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Address</h4>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {CONTACT_INFO.address}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-between">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Office Hours</h4>
                  <p className="text-xs text-slate-700 font-semibold mt-0.5">Mon - Sat: 10:00 AM - 7:00 PM</p>
                </div>
                <div className="flex items-end gap-2 mt-2 sm:mt-0">
                  <button 
                    onClick={() => CTA.call()}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 bg-slate-900 text-white px-3.5 py-2 rounded-lg font-black text-[10px] hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Call Now
                  </button>
                  <button 
                    onClick={() => CTA.whatsapp("Hi, I want to ask about medical admissions")}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 bg-emerald-600 text-white px-3.5 py-2 rounded-lg font-black text-[10px] hover:bg-emerald-700 transition-all cursor-pointer"
                  >
                    <WhatsAppIcon size={12} /> WhatsApp
                  </button>
                </div>
              </div>
            </div>
            
            {/* Embedded Map */}
            <div className="lg:col-span-7 h-[280px] lg:h-auto rounded-xl overflow-hidden shadow-sm border border-slate-100 bg-white">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3502.0154924824307!2d77.3701033!3d28.6303843!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390ce5f55555555%3A0xd6e6726c5fb03344!2sBhutani%20City%20Center%2C%20Sector%2032%2C%20Noida%2C%20Uttar%20Pradesh%20201301!5e0!3m2!1sen!2sin!4v1652888888888!5m2!1sen!2sin" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="AdmissionHands Office Location"
                className="w-full h-full"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
