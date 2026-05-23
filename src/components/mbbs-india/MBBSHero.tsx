"use client";

import React from "react";
import Image from "next/image";
import { mbbsData } from "@/data/mbbs-india";
import { CTAButton } from "@/components/CTAButton";
import { ArrowRight, ShieldCheck, Phone, Sparkles } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

export const MBBSHero = () => {
  const { hero } = mbbsData;

  return (
    <section className="relative w-full min-h-[420px] md:min-h-[600px] md:h-screen flex items-center overflow-hidden bg-white">
      {/* Background with DY Patil College Mumbai */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <Image
          src="/assets/images/hero/dy-patil-mumbai.png"
          alt="DY Patil Medical College Mumbai"
          fill
          priority
          className="object-cover object-[75%_center] md:object-center opacity-60 scale-105 transition-all duration-700 aspect-[4/5] md:aspect-auto"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/30 to-white/80 md:from-white/85 md:via-white/20 md:to-white/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/70 to-transparent hidden md:block" />
      </div>

      <div className="container-custom relative z-10 pt-2 pb-2 md:pt-4 md:pb-4 h-full flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Side Content - Original */}
          <div className="lg:col-span-8 space-y-4 md:space-y-6 text-center md:text-left pt-4 md:pt-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/5 border border-blue-600/10 rounded-full backdrop-blur-md self-center md:self-start">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-blue-900 text-[10px] font-black uppercase tracking-widest">
                Trusted, Data-Driven Guidance for AIQ & State Counselling
              </span>
            </div>

            <h1 className="text-responsive-h1 text-slate-900">
              MBBS <span className="text-blue-600">Admission</span> in India Made Simple
            </h1>

            {/* Promising Info - Minimal */}
            <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center md:justify-start gap-3 md:gap-x-8 md:gap-y-3 py-3 md:py-4">
              {hero.promisingInfo.map((stat, idx) => (
                <div key={idx} className="flex items-center gap-2 md:gap-3">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-600" />
                  <div className="text-left">
                    <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] md:tracking-[0.2em] leading-none mb-1">{stat.label}</p>
                    <p className="text-sm md:text-lg font-black text-slate-900 leading-none">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3 md:pt-4 justify-center md:justify-start">
              <CTAButton action="counselling" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl md:rounded-2xl px-5 md:px-10 py-3.5 md:py-6 text-sm md:text-lg font-black shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                Secure Your MBBS Seat
                <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
              </CTAButton>
              
              <CTAButton action="call" variant="ghost" className="rounded-xl md:rounded-2xl px-5 md:px-4 py-3.5 md:py-3 text-sm text-blue-600 hover:bg-blue-50 font-black border-2 border-slate-200 bg-white">
                <Phone className="w-4 h-4 mr-2" />
                Call Expert
              </CTAButton>
            </div>
          </div>

          {/* Right Side - New Block */}
          <div className="lg:col-span-4 hidden lg:block">
            <div className="p-8 rounded-[3rem] bg-white/60 backdrop-blur-2xl border border-white shadow-2xl space-y-6 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-700" />
              
              <div className="space-y-4 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-amber-900 text-[10px] font-black uppercase tracking-[0.2em]">
                    Start Your Journey
                  </span>
                </div>
                
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  Secure Your <br/> <span className="text-blue-600">MBBS Seat</span> Now
                </h2>
                
                <p className="text-sm text-slate-600 font-bold leading-relaxed">
                  Every rank has a best-fit college. Don't let yours go waste. Talk to our experts and get the best possible seat for your rank.
                </p>

                <div className="pt-2">
                  <CTAButton action="call" className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl py-4 font-black flex items-center justify-center gap-2 shadow-lg">
                    <Phone size={18} />
                    Talk to an Expert
                  </CTAButton>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

