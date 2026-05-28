"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCTA } from '@/hooks/useCTA';
import {
  Target, Search, BarChart3, Map, ShieldCheck, FileCheck,
  Landmark, GraduationCap, Banknote, ArrowUpRight, Phone,
  CheckCircle2, ChevronDown, ChevronUp, Sparkles, Users,
  TrendingUp, Clock, Award, BookOpen, HeartHandshake
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

const heroBgImages = [
  "/assets/images/hero/medical-admission-counselling-session.png",
  "/assets/images/hero/neet-counselling-students.png",
  "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=1600",
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=1600",
];

function HeroImageRotator() {
  const [current, setCurrent] = React.useState(0);
  React.useEffect(() => {
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
      <div className="absolute inset-0 bg-slate-900/80" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900/90" />
    </div>
  );
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

function ServiceCard({ service, index }: { service: typeof services[0]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = service.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white rounded-2xl md:rounded-3xl border border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      <div className="p-5 md:p-7">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base md:text-lg font-black text-slate-900 tracking-tight leading-snug group-hover:text-blue-700 transition-colors">
              {service.title}
            </h3>
            <p className="text-[11px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {service.tagline}
            </p>
          </div>
          {/* Stat badge */}
          <div className="hidden sm:flex flex-col items-center px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
            <span className="text-sm md:text-base font-black text-slate-900">{service.stat.value}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{service.stat.label}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 font-medium leading-relaxed mb-4">
          {service.description}
        </p>

        {/* Expandable features */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors mb-3"
        >
          {expanded ? 'Hide' : 'View'} Details
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2 mb-4"
          >
            {service.features.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs md:text-sm text-slate-600 font-medium leading-snug">{f}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Mobile stat */}
        <div className="flex sm:hidden items-center gap-2 mb-4">
          <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-sm font-black text-slate-900">{service.stat.value}</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1.5">{service.stat.label}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function ServicesPage() {
  const CTA = useCTA();
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">

      {/* Hero */}
      <section className="relative min-h-[55vh] md:min-h-[65vh] flex items-center overflow-hidden py-14 md:py-20 bg-slate-950 text-white">
        <HeroImageRotator />
        
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-500/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-indigo-500/10 blur-[100px] pointer-events-none" />

        <div className="container-custom relative z-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left side Content */}
            <div className="lg:col-span-7 text-center lg:text-left space-y-5 md:space-y-6">
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-blue-300 text-xs font-black tracking-widest uppercase mb-2 backdrop-blur-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Expert NEET Counselling
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight drop-shadow-lg"
              >
                Your Unfair Advantage in{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300 drop-shadow-md">
                  MBBS Admissions
                </span>
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="text-blue-100/90 text-sm md:text-base font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 drop-shadow-md"
              >
                While others guess, our students get data-driven strategy, insider cutoff intelligence, and dedicated counsellors who&apos;ve guided 2100+ students to their dream medical colleges. Every rank has a best-fit seat — we find yours.
              </motion.p>

              {/* Highlights */}
              <motion.ul initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                className="space-y-3 hidden sm:inline-block text-left text-blue-100/80 text-sm font-semibold max-w-md"
              >
                {[
                  "1-on-1 Personalized counseling with senior experts",
                  "95% accuracy in rank-based college predictions",
                  "100% success rate in document verification",
                ].map((point, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <ShieldCheck size={14} />
                    </div>
                    {point}
                  </li>
                ))}
              </motion.ul>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
              >
                <button onClick={() => CTA.call()}
                  className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-6 py-3.5 rounded-xl font-black text-sm hover:bg-blue-50 transition-all shadow-xl active:scale-95"
                >
                  <Phone className="w-4 h-4" /> Talk to an Expert
                </button>
                <button onClick={() => CTA.whatsapp("Hi, I want to know about your NEET counselling services")}
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/60 backdrop-blur-sm text-white px-6 py-3.5 rounded-xl font-black text-sm hover:bg-white/10 transition-all active:scale-95"
                >
                  <WhatsAppIcon size={16} /> WhatsApp Us
                </button>
              </motion.div>
            </div>

            {/* Right side - Counselor / Stat Card */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
              className="lg:col-span-5"
            >
              <div className="relative p-6 md:p-8 rounded-[2.5rem] bg-slate-900/60 backdrop-blur-xl border border-white/10 dark:border-slate-800/80 shadow-2xl space-y-6 overflow-hidden max-w-md mx-auto">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
                
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-blue-400/50 flex-shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=200"
                      alt="Senior Admissions Team"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white leading-tight">Senior Admissions Team</h3>
                    <p className="text-xs text-blue-300 font-bold flex items-center gap-1.5 mt-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Counselling Session
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-2">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <p className="text-[10px] font-black text-blue-300 uppercase tracking-wider mb-1">Experience</p>
                    <p className="text-lg font-black text-white leading-none">12+ Years</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <p className="text-[10px] font-black text-blue-300 uppercase tracking-wider mb-1">Guidance</p>
                    <p className="text-lg font-black text-white leading-none">1-on-1</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <p className="text-[10px] font-black text-blue-300 uppercase tracking-wider mb-1">Success Rate</p>
                    <p className="text-lg font-black text-white leading-none">95%</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <p className="text-[10px] font-black text-blue-300 uppercase tracking-wider mb-1">Accuracy</p>
                    <p className="text-lg font-black text-white leading-none">95%</p>
                  </div>
                </div>

                <div className="pt-2 text-center text-xs text-slate-300/80 font-medium italic border-t border-white/5">
                  "Pre-verifying all documentation to guarantee zero rejections."
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <section className="relative z-20 -mt-8">
        <div className="container-custom">
          <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-100 shadow-xl p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {trustStats.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 justify-center md:justify-start"
                >
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-50 flex items-center justify-center ${s.color}`}>
                    <s.icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <p className="text-lg md:text-2xl font-black text-slate-900 leading-none">{s.value}</p>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Students Choose Us */}
      <section className="py-8 md:py-12">
        <div className="container-custom">
          <div className="text-center mb-6 md:mb-8">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="inline-block px-4 py-1.5 mb-4 text-[10px] font-black tracking-widest text-blue-600 uppercase bg-blue-600/10 rounded-full"
            >
              Why Admission Hands
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-3"
            >
              The <span className="text-blue-600">Competitive Edge</span> You Deserve
            </motion.h2>
            <p className="text-sm md:text-base text-slate-500 font-medium max-w-2xl mx-auto">
              NEET counselling is a high-stakes, zero-margin-for-error process. Here&apos;s why 2100+ families trusted us with their child&apos;s medical career.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {[
              { icon: BookOpen, title: "Data, Not Opinions", desc: "Our recommendations are backed by 5 years of cutoff data, 600+ college analysis, and real allotment outcomes — not surface-level guesswork.", color: "from-blue-600 to-blue-700" },
              { icon: HeartHandshake, title: "Dedicated Counsellor", desc: "You get a single, named expert assigned to your case from Day 1 to final admission. No rotating agents, no repeated explanations.", color: "from-emerald-600 to-teal-600" },
              { icon: ShieldCheck, title: "Zero Document Rejections", desc: "We pre-verify every document against state-specific norms weeks before deadlines. Our students have a 0% rejection rate on documentation.", color: "from-violet-600 to-indigo-600" },
            ].map((item, idx) => (
              <motion.div key={idx}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-5 md:p-7 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base md:text-lg font-black text-slate-900 mb-2 tracking-tight">{item.title}</h3>
                <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-8 md:py-12 bg-white">
        <div className="container-custom">
          <div className="text-center mb-6 md:mb-8">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              className="inline-block px-4 py-1.5 mb-4 text-[10px] font-black tracking-widest text-indigo-600 uppercase bg-indigo-600/10 rounded-full"
            >
              Our Services
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-3"
            >
              Complete <span className="text-blue-600">Admission Support</span> System
            </motion.h2>
            <p className="text-sm md:text-base text-slate-500 font-medium max-w-2xl mx-auto">
              10 specialized services covering every phase of NEET counselling — from score analysis to college reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
            {services.map((service, index) => (
              <ServiceCard key={index} service={service} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Process Timeline */}
      <section className="py-8 md:py-12 bg-slate-50">
        <div className="container-custom">
          <div className="text-center mb-6 md:mb-8">
            <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight mb-3"
            >
              How It <span className="text-blue-600">Works</span>
            </motion.h2>
            <p className="text-sm md:text-base text-slate-500 font-medium max-w-xl mx-auto">
              From first call to final admission — a streamlined, expert-guided process.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { step: "01", title: "Free Consultation", desc: "Share your NEET score, category, and preferences. We assess your options in a free 15-min call." },
              { step: "02", title: "Strategy Blueprint", desc: "Receive a personalized admission strategy with target colleges, timelines, and budget breakdown." },
              { step: "03", title: "Active Counselling", desc: "We manage your MCC/State registrations, choice filling, and real-time decision-making across all rounds." },
              { step: "04", title: "Seat Secured", desc: "From allotment letter to physical reporting — we ensure every formality is completed flawlessly." },
            ].map((item, idx) => (
              <motion.div key={idx}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="text-4xl md:text-5xl font-black text-slate-100 absolute top-3 right-4 select-none">{item.step}</div>
                <div className="relative z-10">
                  <h3 className="text-base font-black text-slate-900 mb-2 tracking-tight">{item.title}</h3>
                  <p className="text-xs md:text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


    </main>
  );
}
