"use client";

import Image from "next/image";
import { useCTA } from "@/hooks/useCTA";
import { ArrowRight, Building2, Users, GraduationCap, ShieldCheck, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export default function Hero() {
  const CTA = useCTA();
  return (
    <section className="relative w-full min-h-[calc(100svh-112px)] flex items-center overflow-hidden bg-white">
      {/* Background Image (College Campus) */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/assets/images/hero/india-medical-college-campus.png"
          alt="Medical College Campus"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-15 md:opacity-100 transition-all duration-700"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/80 md:from-white/95 md:via-white/85 md:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white md:hidden" />
      </div>

      <div className="container-custom relative z-10 w-full flex flex-col lg:flex-row items-center justify-between gap-8 h-full py-8 lg:py-0">
        {/* Left Content Area */}
        <div className="w-full lg:w-[55%] flex flex-col text-center lg:text-left">
          {/* Badge */}
          <div className="inline-flex items-center justify-center lg:justify-start gap-2 mb-4 self-center lg:self-start">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-black text-[10px] md:text-xs tracking-wider uppercase">
                Secure Your MBBS Seat — 2026 Admissions
              </span>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(2rem,5vw,4.5rem)] font-black leading-[1.1] tracking-tight text-slate-900 mb-4 md:mb-5">
            MBBS & PG <br className="hidden lg:block" /> Admission in India <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Made Simple
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-sm md:text-base text-slate-600 mb-8 max-w-xl mx-auto lg:mx-0 font-bold leading-relaxed">
            Expert guidance for NEET-based admissions in top medical colleges. Trusted counselling, transparent process, real results.
          </p>

          {/* CTA Buttons — Compact, Premium, Modern */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start w-full sm:w-auto mb-8 lg:mb-10">
            <button
              onClick={() => CTA.counselling()}
              className="group relative overflow-hidden bg-slate-900 hover:bg-blue-600 text-white rounded-xl px-5 py-3 md:px-6 md:py-3.5 shadow-lg shadow-slate-900/20 text-xs md:text-sm font-black flex items-center justify-center gap-2 transition-all duration-300 active:scale-95"
            >
              <div className="absolute inset-0 bg-white/20 -skew-x-12 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <Users className="w-4 h-4" />
              <span className="relative z-10">Get Expert Guidance</span>
              <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('top-medical-institutes');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="group bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 rounded-xl px-5 py-3 md:px-6 md:py-3.5 text-xs md:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-all duration-300 active:scale-95"
            >
              <Building2 className="w-4 h-4 text-blue-600" />
              Top Tier Medical Institutes
            </button>
          </div>

          {/* Trust Row — Compact inline on mobile, icon-boxes on desktop */}
          <div className="flex flex-wrap justify-center lg:justify-start gap-4 md:gap-8 lg:gap-12 pt-6 border-t border-slate-200/60">
            {[
              { icon: Users, value: "2100+", label: "Students Guided", color: "text-emerald-600", bg: "bg-emerald-50" },
              { icon: Building2, value: "Top", label: "Medical Colleges", color: "text-blue-600", bg: "bg-blue-50" },
              { icon: GraduationCap, value: "NEET", label: "Experts", color: "text-indigo-600", bg: "bg-indigo-50" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`hidden md:flex w-10 h-10 rounded-xl ${item.bg} items-center justify-center shadow-inner`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-base md:text-lg font-black text-slate-900 leading-none mb-0.5">{item.value}</span>
                  <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Area - Doctors Cutout — HIDDEN on mobile, shown on desktop */}
        <div className="hidden lg:flex w-full lg:w-[45%] relative justify-center lg:justify-end items-end h-[400px] sm:h-[500px] lg:h-[calc(100svh-112px)] max-h-[700px]">
          {/* Doctors Image (Cutout) */}
          <div className="relative w-full h-[90%] max-w-[500px] z-10">
            <Image
              src="/assets/images/hero/indian_doctors.png"
              alt="Medical Experts"
              fill
              priority
              className="object-contain object-bottom drop-shadow-2xl"
            />

            {/* Embedded Floating Card */}
            <div className="absolute bottom-12 -right-4 lg:-right-8 z-20 w-[320px] bg-white/90 backdrop-blur-xl rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 p-4 flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1 group">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => CTA.whatsapp()}
                  className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center hover:bg-emerald-100 transition-colors shrink-0"
                  aria-label="WhatsApp Expert"
                >
                  <WhatsAppIcon size={20} className="text-emerald-600" />
                </button>
                <div className="flex flex-col text-left">
                  <h3 className="font-black text-slate-900 text-sm leading-tight">
                    Confused About Admission?
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Talk to our NEET experts
                  </p>
                </div>
              </div>
              <button
                onClick={() => CTA.call()}
                className="w-full h-10 rounded-xl bg-slate-900 hover:bg-blue-600 flex items-center justify-center gap-2 text-white shadow-md transition-all active:scale-95 text-xs font-black"
                aria-label="Call Expert"
              >
                <Phone size={14} />
                Call Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}