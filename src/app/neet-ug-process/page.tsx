"use client";

import React from 'react';
import Image from 'next/image';
import { 
  ShieldAlert, 
  Search, 
  Map, 
  Settings2, 
  FileCheck, 
  UserCheck, 
  Phone, 
  MessageCircle, 
  AlertTriangle,
  ChevronRight,
  GraduationCap,
  ClipboardCheck,
  Building2,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProcessAccordion from '@/components/neet-ug-process/ProcessAccordion';
import { CONTACT_INFO } from '@/lib/constants';

const NeetUgProcessPage = () => {
  const scrollToSteps = () => {
    document.getElementById('steps-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-white">
      {/* 1. HERO SECTION */}
      <section className="relative h-[85vh] md:h-[70vh] min-h-[550px] md:min-h-[600px] flex items-start justify-center overflow-hidden pt-[210px] md:pt-[180px] lg:pt-[200px]">
        <Image
          src="/assets/images/hero/neet-hero.webp"
          alt="Medical college campus"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-transparent" />
        <div className="container-custom relative z-10 text-white">
          <div className="max-w-3xl space-y-4 md:space-y-6">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight">
              NEET UG Admission Process – <span className="text-primary">Complete Step-by-Step Guide</span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-slate-200 max-w-2xl">
              Understand the full MBBS admission journey from exam to college joining with expert guidance.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 md:pt-4">
              <a 
                href={`tel:${CONTACT_INFO.phone}`}
                className="inline-flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 text-white px-8 py-3.5 text-sm md:text-base font-bold transition-all shadow-lg hover:shadow-primary/20"
              >
                Start Consultation
              </a>
              <button 
                onClick={scrollToSteps}
                className="inline-flex items-center justify-center rounded-full border-white/60 bg-white/10 text-white hover:bg-white hover:text-slate-900 px-8 py-3.5 text-sm md:text-base font-bold transition-all backdrop-blur-sm"
              >
                Explore Steps
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OVERVIEW SECTION */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3">Overview of Admission Lifecycle</h2>
                <p className="text-slate-600 text-base leading-relaxed">
                  NEET UG is the single national-level entrance examination for MBBS admissions in India. The process is managed by multiple authorities depending on the quota and college type.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { title: "NTA", desc: "Conducts NEET UG exam & declares results", icon: ClipboardCheck },
                  { title: "MCC", desc: "Handles AIQ, Deemed & Central counselling", icon: Building2 },
                  { title: "State Authorities", desc: "Manage state quota (85%) and private admissions", icon: Users }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 transition-hover hover:shadow-sm">
                    <div className="bg-white p-2.5 rounded-lg shadow-sm text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{item.title}</h3>
                      <p className="text-slate-500 text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-amber-50 rounded-xl border border-amber-100 flex gap-4">
                <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-900 text-sm font-medium italic">
                  Navigating this process correctly is crucial, as small mistakes can cost valuable seats.
                </p>
              </div>
            </div>
            <div className="relative aspect-video lg:aspect-auto h-full min-h-[300px] md:min-h-[400px] rounded-2xl overflow-hidden shadow-lg">
              <Image
                src="/assets/images/exam/neet-exam.webp"
                alt="NEET UG Examination Hall"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE PROCESS SECTION */}
      <section id="steps-section" className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 mb-3">Step-by-Step Journey</h2>
            <p className="text-slate-500 text-sm md:text-base">We break down the 15 critical milestones of your admission process.</p>
          </div>
          
          <ProcessAccordion />

          {/* MID CTA */}
          <div className="mt-12 md:mt-16 p-8 md:p-12 rounded-3xl bg-gradient-to-br from-primary to-blue-700 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <GraduationCap size={100} />
            </div>
            <div className="relative z-10">
              <h3 className="text-xl md:text-3xl font-bold mb-3">Not sure which counselling route is right for you?</h3>
              <p className="text-blue-100 mb-8 max-w-xl mx-auto text-sm">Get a personalized roadmap based on your predicted rank and budget.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <a 
                  href={`tel:${CONTACT_INFO.phone}`}
                  className="inline-flex items-center justify-center rounded-full bg-white text-primary hover:bg-slate-100 px-8 py-3.5 text-sm md:text-base font-bold transition-all"
                >
                  Talk to Expert
                </a>
                <a 
                  href={`https://api.whatsapp.com/send?phone=${CONTACT_INFO.whatsapp}`}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-full border-white/30 bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 text-sm md:text-base font-bold transition-all"
                >
                  <MessageCircle className="mr-2 h-5 w-5" /> WhatsApp Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. COMMON MISTAKES SECTION */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Common Mistakes to Avoid</h2>
            <p className="text-slate-500 text-sm">Every year, thousands of students lose their seats due to these avoidable errors.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              "Filling limited choices",
              "Ignoring state counselling",
              "Not understanding quota benefits",
              "Missing deadlines",
              "Wrong category selection"
            ].map((mistake, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-rose-50 border border-rose-100 group transition-all hover:bg-rose-100 hover:-translate-y-1">
                <div className="mb-3 text-rose-500 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-slate-900 leading-tight text-sm">{mistake}</h4>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 bg-slate-900 rounded-xl text-center">
            <p className="text-slate-300 text-sm font-medium">
              <span className="text-rose-400 font-black uppercase tracking-widest mr-2 text-xs">Critical:</span> 
              These mistakes often result in losing better colleges.
            </p>
          </div>
        </div>
      </section>

      {/* 5. HOW ADMISSION HANDS HELPS */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">How Admission Hands Helps</h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm">We provide the data, strategy, and peace of mind you need for a successful admission.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "Rank-based College Shortlisting", icon: Search },
              { title: "Multi-counselling Strategy", icon: Map },
              { title: "Smart Choice Filling", icon: Settings2 },
              { title: "Budget & Quota Optimization", icon: FileCheck },
              { title: "Documentation Support", icon: UserCheck },
              { title: "End-to-End Guidance", icon: ShieldAlert }
            ].map((feature, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 group text-center md:text-left">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-primary mb-5 transition-colors group-hover:bg-primary group-hover:text-white mx-auto md:mx-0">
                  <feature.icon size={24} />
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed">Expert intervention at every step to ensure you get the best college for your rank.</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="py-16 md:py-24 bg-white relative overflow-hidden">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1 text-center lg:text-left">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
                Secure Your MBBS Seat with <span className="text-primary">Expert Guidance</span>
              </h2>
              <ul className="space-y-3 mb-8 inline-block text-left">
                {[
                  "Personalized counselling strategy",
                  "Strategic admission planning",
                  "Full support till college joining"
                ].map((point, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-base text-slate-700 font-medium">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <ChevronRight size={14} />
                    </div>
                    {point}
                  </li>
                ))}
              </ul>
              <div className="hidden md:flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a 
                  href={`tel:${CONTACT_INFO.phone}`}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 hover:bg-slate-800 text-white px-10 h-14 text-base font-bold transition-all"
                >
                  <Phone className="mr-2 h-5 w-5" /> Call Now
                </a>
                <a 
                  href={`https://api.whatsapp.com/send?phone=${CONTACT_INFO.whatsapp}`}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-10 h-14 text-base font-bold transition-all"
                >
                  <MessageCircle className="mr-2 h-5 w-5" /> WhatsApp Now
                </a>
              </div>
            </div>
            <div className="order-1 lg:order-2 relative aspect-[4/3] rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-xl md:rotate-2">
              <Image
                src="/assets/images/colleges/medical-college.webp"
                alt="Premium Medical College"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 7. DISCLAIMER */}
      <section className="py-8 bg-slate-50 border-t border-slate-100">
        <div className="container-custom text-center">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Disclaimer</h5>
          <p className="text-xs text-slate-500 leading-relaxed italic max-w-4xl mx-auto">
            All information is for guidance purposes only. Admission processes, seat matrix, eligibility, and counselling rules are subject to updates by NTA, MCC, and respective State Authorities. We strongly advise students to verify details from official portals regularly.
          </p>
        </div>
      </section>


    </main>
  );
};

export default NeetUgProcessPage;
