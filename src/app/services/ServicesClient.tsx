"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useCTA } from '@/hooks/useCTA';
import {
  Target, Search, BarChart3, Map, ShieldCheck, FileCheck,
  Landmark, GraduationCap, Banknote, ArrowUpRight, Phone,
  CheckCircle2, ChevronDown, ChevronUp, Sparkles, Users,
  TrendingUp, Clock, Award, BookOpen, HeartHandshake
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

interface HeroImageRotatorProps {
  images: string[];
}

const services = [
  {
    icon: Target,
    title: "Personalized NEET Counselling",
    tagline: "Your rank. Your strategy. Your seat.",
    color: "from-blue-600 to-indigo-600",
    accent: "blue",
    description: "Every NEET rank has a unique set of possibilities. Our experts analyze your exact rank, category, domicile, and budget to build a customized admission roadmap — not generic advice.",
    features: [
      "1-on-1 sessions with senior NEET counsellors (12+ yrs experience)",
      "Category-specific strategy: General, OBC, SC/ST, EWS, PwD",
      "Domicile advantage mapping for state quota seats",
      "Budget-aligned college recommendations (₹5L to ₹2Cr range)",
      "Multiple scenario planning: best-case, realistic, safety options"
    ],
    stat: { value: "2100+", label: "Students Guided" }
  },
  {
    icon: Search,
    title: "Smart College Shortlisting",
    tagline: "Data-backed picks, not guesswork.",
    color: "from-indigo-600 to-violet-600",
    accent: "indigo",
    description: "We cross-reference 5 years of cutoff trends, seat matrices, bond clauses, and fee structures to generate a shortlist that maximizes your probability of admission at the best possible college.",
    features: [
      "Historical cutoff analysis across 600+ medical colleges",
      "Bond clause and service obligation transparency",
      "NRI/Management quota seat availability tracking",
      "Location & infrastructure quality scoring",
      "College comparison reports delivered within 24 hours"
    ],
    stat: { value: "600+", label: "Colleges Analyzed" }
  },
  {
    icon: BarChart3,
    title: "Advanced Cutoff Analytics",
    tagline: "Predict. Plan. Secure.",
    color: "from-teal-600 to-emerald-600",
    accent: "teal",
    description: "Our proprietary cutoff prediction engine uses 5-year trend data, seat variation analysis, and round-wise movement patterns to forecast your admission probability with high accuracy.",
    features: [
      "State-wise and AIQ cutoff trend visualization",
      "Round-wise seat movement prediction (R1, R2, Mop-Up, Stray)",
      "Category and quota-specific cutoff projections",
      "Real-time updates during live counselling rounds",
      "Probability scoring for each target college"
    ],
    stat: { value: "95%", label: "Prediction Accuracy" }
  },
  {
    icon: Map,
    title: "AIQ & State Quota Mastery",
    tagline: "Navigate the 15%/85% maze with confidence.",
    color: "from-emerald-600 to-green-600",
    accent: "emerald",
    description: "The dual counselling system (All India Quota + State Quota) creates both opportunities and confusion. We help you strategically apply to both, maximizing your chances without missing critical deadlines.",
    features: [
      "Parallel AIQ + State quota application management",
      "State-specific eligibility verification (domicile rules vary)",
      "Optimal choice-filling sequence for maximum allotment",
      "Inter-state migration strategy for better college options",
      "MCC vs State counselling timeline synchronization"
    ],
    stat: { value: "36", label: "States Covered" }
  },
  {
    icon: Landmark,
    title: "Deemed & Private University Strategy",
    tagline: "Premium seats need premium strategy.",
    color: "from-amber-500 to-orange-600",
    accent: "amber",
    description: "Deemed and private medical colleges have their own counselling calendars, fee structures, and seat matrices. We provide dedicated guidance for students targeting these institutions.",
    features: [
      "Complete deemed university counselling (MCC Deemed track)",
      "Private college direct admission negotiation support",
      "Fee structure comparison with hidden cost analysis",
      "Management/NRI quota seat procurement guidance",
      "Scholarship and fee waiver identification"
    ],
    stat: { value: "1-1 Guidance", label: "Support" }
  },
  {
    icon: FileCheck,
    title: "Documentation & Verification",
    tagline: "Zero rejection. Zero surprises.",
    color: "from-violet-600 to-purple-600",
    accent: "violet",
    description: "Document rejection is the #1 reason students lose confirmed seats. We pre-verify every certificate, affidavit, and proof weeks before deadlines to ensure bulletproof applications.",
    features: [
      "Complete document checklist (30+ documents per student)",
      "Domicile certificate validity verification",
      "Gap year affidavit preparation and notarization guidance",
      "NRI sponsorship documentation and embassy attestation",
      "Category certificate cross-verification with state norms"
    ],
    stat: { value: "100%", label: "Success Rate" }
  },
  {
    icon: ShieldCheck,
    title: "MCC Counselling Management",
    tagline: "End-to-end. Every round. Every click.",
    color: "from-blue-700 to-indigo-700",
    accent: "blue",
    description: "From MCC registration to final allotment, we manage every step — choice filling, choice locking, seat acceptance, and upgrade decisions across all rounds including Mop-Up and Stray Vacancy.",
    features: [
      "MCC portal registration and payment assistance",
      "Strategic choice list preparation (order matters enormously)",
      "Real-time choice locking supervision",
      "Round 1 → Round 2 → Mop-Up → Stray tracking",
      "Seat acceptance vs float vs slide decision guidance"
    ],
    stat: { value: "4", label: "Rounds Managed" }
  },
  {
    icon: Banknote,
    title: "Fee & Budget Planning",
    tagline: "Know every rupee before you commit.",
    color: "from-green-600 to-teal-600",
    accent: "green",
    description: "Medical education costs extend far beyond tuition. We provide transparent, complete fee analysis including hostel, mess, security deposits, bank guarantees, and year-on-year escalation clauses.",
    features: [
      "Complete 5-year cost projection for each target college",
      "Hidden fee identification (development fund, caution deposits)",
      "Education loan guidance with bank partner recommendations",
      "Bond clause financial implications analysis",
      "Refund policy and seat surrender cost transparency"
    ],
    stat: { value: "₹5L-2Cr", label: "Budget Range" }
  },
  {
    icon: ArrowUpRight,
    title: "Seat Upgrade Strategy",
    tagline: "Good seat today. Better seat tomorrow.",
    color: "from-rose-500 to-pink-600",
    accent: "rose",
    description: "Knowing when to hold a seat, when to upgrade, and when to exit requires deep understanding of round-wise vacancy patterns. One wrong decision can cost you your dream college or lakhs in fees.",
    features: [
      "Hold vs Upgrade vs Exit decision framework",
      "Vacancy prediction for subsequent rounds",
      "Dual-allotment management (AIQ + State simultaneously)",
      "Fee refund timeline optimization",
      "Emergency seat surrender and re-allotment support"
    ],
    stat: { value: "85%", label: "Upgrade Success" }
  },
  {
    icon: GraduationCap,
    title: "Post-Allotment & Reporting",
    tagline: "From allotment letter to classroom.",
    color: "from-cyan-600 to-blue-600",
    accent: "cyan",
    description: "Getting a seat is half the battle. Physical reporting, document verification at the college, fee payment, hostel allotment, and anti-ragging compliance — we ensure nothing is missed.",
    features: [
      "Physical reporting checklist and timeline management",
      "College-specific document requirement verification",
      "Medical fitness certificate coordination",
      "Anti-ragging undertaking and affidavit preparation",
      "Hostel allotment and initial settling-in guidance"
    ],
    stat: { value: "100%", label: "Reporting Success" }
  }
];

const trustStats = [
  { icon: Users, value: "2100+", label: "Students Placed", color: "text-blue-600" },
  { icon: TrendingUp, value: "95%", label: "Success Rate", color: "text-emerald-600" },
  { icon: Clock, value: "12+", label: "Years Experience", color: "text-violet-600" },
  { icon: Award, value: "36", label: "States Covered", color: "text-amber-600" },
];

function ServiceCard({ service, index, mounted }: { service: typeof services[0]; index: number; mounted: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = service.icon;

  return (
    <div
      className="group bg-white rounded-xl border border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-105 transition-transform duration-300`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug group-hover:text-blue-700 transition-colors">
              {service.title}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {service.tagline}
            </p>
          </div>
          {/* Stat badge */}
          <div className="hidden sm:flex flex-col items-center px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
            <span className="text-xs md:text-sm font-black text-slate-900">{service.stat.value}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{service.stat.label}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs md:text-sm text-slate-700 font-medium leading-relaxed mb-3">
          {service.description}
        </p>

        {/* Expandable features */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors mb-2"
        >
          {expanded ? 'Hide' : 'View'} Details
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-1.5 mb-3"
          >
            {service.features.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-600 font-medium leading-snug">{f}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Mobile stat */}
        <div className="flex sm:hidden items-center gap-2 mb-2">
          <div className="px-2.5 py-1 bg-slate-50 rounded-md border border-slate-100">
            <span className="text-xs font-black text-slate-900">{service.stat.value}</span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">{service.stat.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ServicesClientProps {
  heroImages?: string[];
}

export default function ServicesClient({ heroImages }: ServicesClientProps) {
  const CTA = useCTA();
  const bgImage = (heroImages && heroImages[0]) || "/assets/images/hero/services_hero.avif";
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">

      {/* Hero Section - Reduced padding by 50% and made compact */}
      <section className="relative min-h-[56vh] md:min-h-[62vh] flex items-center overflow-hidden py-14 md:py-20 bg-slate-950 text-white">
        
        {/* Background Image behind the text */}
        <div className="absolute inset-0 z-0">
          {bgImage && bgImage !== "none" && (
            <Image
              src={bgImage}
              alt="Services Hero Background"
              fill
              priority
              sizes="100vw"
              className="object-cover"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMjQwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDcwZTFlIi8+PC9zdmc+"
            />
          )}
          <div className="absolute inset-0 bg-slate-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/50" />
        </div>
        
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-indigo-500/5 blur-[100px] pointer-events-none" />

        <div className="container-custom relative z-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left side Content */}
            <motion.div 
              initial={mounted ? { opacity: 0, y: 15 } : false} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-9 xl:col-span-8 text-center lg:text-left space-y-4 md:space-y-5"
            >
              <div 
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-300 text-xs font-black tracking-widest uppercase mb-1 backdrop-blur-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Expert NEET Counselling
              </div>

              <h1 
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight drop-shadow-md"
              >
                Your Unfair Advantage in{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300 drop-shadow-sm">
                  MBBS Admissions
                </span>
              </h1>

              <p 
                className="text-blue-100/90 text-xs md:text-sm font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 drop-shadow-sm"
              >
                While others guess, our students get data-driven strategy, insider cutoff intelligence, and dedicated counsellors who&apos;ve guided 2100+ students to their dream medical colleges. Every rank has a best-fit seat — we find yours.
              </p>

              {/* Highlights */}
              <ul 
                className="space-y-2 hidden sm:inline-block text-left text-blue-100/80 text-xs font-semibold max-w-md"
              >
                {[
                  "1-on-1 Personalized counseling with senior experts",
                  "95% accuracy in rank-based college predictions",
                  "100% success rate in document verification",
                ].map((point, idx) => (
                  <li key={idx} className="flex items-center gap-2.5">
                    <div className="h-4.5 w-4.5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <ShieldCheck size={12} />
                    </div>
                    {point}
                  </li>
                ))}
              </ul>

              <div 
                className="flex flex-col sm:flex-row gap-2.5 justify-center lg:justify-start"
              >
                <button onClick={() => CTA.call()}
                  className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-5 py-3 rounded-xl font-black text-xs hover:bg-blue-50 transition-all shadow-lg active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" /> Talk to an Expert
                </button>
                <button onClick={() => CTA.whatsapp("Hi, I want to know about your NEET counselling services")}
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/60 backdrop-blur-sm text-white px-5 py-3 rounded-xl font-black text-xs hover:bg-white/10 transition-all active:scale-95"
                >
                  <WhatsAppIcon size={14} /> WhatsApp Us
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Stats Bar - Compact margin */}
      <section className="relative z-20 -mt-6">
        <div className="container-custom">
          <div className="bg-white rounded-xl border border-slate-100 shadow-lg p-3.5 md:p-5">
            <motion.div 
              initial={mounted ? { opacity: 0, y: 10 } : false} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5"
            >
              {trustStats.map((s, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-2.5 justify-center md:justify-start"
                >
                  <div className={`w-9 h-9 md:w-11 md:h-11 rounded-lg bg-slate-50 flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div>
                    <p className="text-base md:text-xl font-black text-slate-900 leading-none">{s.value}</p>
                    <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Students Choose Us - Reduced spacing and margins by 50%, high contrast text */}
      <section className="py-6 md:py-8">
        <div className="container-custom">
          <div className="text-center mb-4 md:mb-5">
            <motion.div 
              initial={mounted ? { opacity: 0 } : false} 
              whileInView={{ opacity: 1 }} 
              viewport={{ once: true }}
              className="inline-block px-3 py-1 mb-2 text-[9px] font-black tracking-widest text-blue-600 uppercase bg-blue-600/10 rounded-full"
            >
              Why Admission Hands
            </motion.div>
            <motion.h2 
              initial={mounted ? { opacity: 0, y: 10 } : false} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="text-xl md:text-3xl font-black text-slate-900 tracking-tight mb-2"
            >
              The <span className="text-blue-600">Competitive Edge</span> You Deserve
            </motion.h2>
            <p className="text-xs md:text-sm text-slate-600 font-semibold max-w-2xl mx-auto">
              NEET counselling is a high-stakes, zero-margin-for-error process. Here&apos;s why 2100+ families trusted us with their child&apos;s medical career.
            </p>
          </div>

          <motion.div 
            initial={mounted ? { opacity: 0, y: 15 } : false} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4"
          >
            {[
              { icon: BookOpen, title: "Data, Not Opinions", desc: "Our recommendations are backed by 5 years of cutoff data, 600+ college analysis, and real allotment outcomes — not surface-level guesswork.", color: "from-blue-600 to-blue-700" },
              { icon: HeartHandshake, title: "Dedicated Counsellor", desc: "You get a single, named expert assigned to your case from Day 1 to final admission. No rotating agents, no repeated explanations.", color: "from-emerald-600 to-teal-600" },
              { icon: ShieldCheck, title: "Zero Document Rejections", desc: "We pre-verify every document against state-specific norms weeks before deadlines. Our students have a 0% rejection rate on documentation.", color: "from-violet-600 to-indigo-600" },
            ].map((item, idx) => (
              <div 
                key={idx}
                className="bg-white p-4 md:p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-3 shadow-md group-hover:scale-105 transition-transform`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm md:text-base font-black text-slate-900 mb-1 tracking-tight">{item.title}</h3>
                <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Services Grid - Spacing and margins reduced, high contrast text */}
      <section className="py-6 md:py-8 bg-white">
        <div className="container-custom">
          <div className="text-center mb-4 md:mb-5">
            <motion.div 
              initial={mounted ? { opacity: 0 } : false} 
              whileInView={{ opacity: 1 }} 
              viewport={{ once: true }}
              className="inline-block px-3 py-1 mb-2 text-[9px] font-black tracking-widest text-indigo-600 uppercase bg-indigo-600/10 rounded-full"
            >
              Our Services
            </motion.div>
            <motion.h2 
              initial={mounted ? { opacity: 0, y: 10 } : false} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="text-xl md:text-3xl font-black text-slate-900 tracking-tight mb-2"
            >
              Complete <span className="text-blue-600">Admission Support</span> System
            </motion.h2>
            <p className="text-xs md:text-sm text-slate-600 font-semibold max-w-2xl mx-auto">
              10 specialized services covering every phase of NEET counselling — from score analysis to college reporting.
            </p>
          </div>

          <motion.div 
            initial={mounted ? { opacity: 0, y: 15 } : false} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4"
          >
            {services.map((service, index) => (
              <ServiceCard key={index} service={service} index={index} mounted={mounted} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Process Timeline - Spacing reduced, high contrast text */}
      <section className="py-6 md:py-8 bg-slate-50">
        <div className="container-custom">
          <div className="text-center mb-4 md:mb-5">
            <motion.h2 
              initial={mounted ? { opacity: 0, y: 10 } : false} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true }}
              className="text-xl md:text-3xl font-black text-slate-900 tracking-tight mb-2"
            >
              How It <span className="text-blue-600">Works</span>
            </motion.h2>
            <p className="text-xs md:text-sm text-slate-600 font-semibold max-w-xl mx-auto">
              From first call to final admission — a streamlined, expert-guided process.
            </p>
          </div>

          <motion.div 
            initial={mounted ? { opacity: 0, y: 15 } : false} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {[
              { step: "01", title: "Free Consultation", desc: "Share your NEET score, category, and preferences. We assess your options in a free 15-min call." },
              { step: "02", title: "Strategy Blueprint", desc: "Receive a personalized admission strategy with target colleges, timelines, and budget breakdown." },
              { step: "03", title: "Active Counselling", desc: "We manage your MCC/State registrations, choice filling, and real-time decision-making across all rounds." },
              { step: "04", title: "Seat Secured", desc: "From allotment letter to physical reporting — we ensure every formality is completed flawlessly." },
            ].map((item, idx) => (
              <div 
                key={idx}
                className="relative bg-white p-4 md:p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="text-3xl md:text-4xl font-black text-slate-100 absolute top-2.5 right-3.5 select-none">{item.step}</div>
                <div className="relative z-10">
                  <h3 className="text-sm font-black text-slate-900 mb-1 tracking-tight">{item.title}</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

    </main>
  );
}
