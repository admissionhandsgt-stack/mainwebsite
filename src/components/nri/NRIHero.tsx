
import React from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const NRIHero = () => {
  return (
    <section className="relative w-full h-screen min-h-[700px] flex items-center overflow-hidden mesh-gradient pt-[112px]">
      {/* Background Image Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/assets/images/hero/india-medical-college-campus.png" 
          alt="Indian Medical College"
          className="w-full h-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-slate-900/50" />
      </div>

      {/* Decorative blurred orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none z-1" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-teal-500/15 blur-[100px] pointer-events-none z-1" />
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
          <div className="space-y-4 sm:space-y-5 animate-fade-in">
            <div className="inline-block px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="text-sm font-bold uppercase tracking-widest text-blue-300">NRI Quota Medical Admissions</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
              Secure Your <span className="gradient-text">Medical Seat</span> Through NRI Quota
            </h1>
            <p className="text-xl text-blue-100/80 leading-relaxed font-medium">
              Expert guidance for NRI, NRI-sponsored, OCI, PIO, and foreign national candidates seeking MBBS & BDS seats in top medical colleges across India.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 pt-4">
              <Link href="/nri-quota/colleges" className="indian-medical-gradient text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-xl shadow-blue-900/40 text-center hover:scale-105 active:scale-95">
                Explore NRI Colleges <ArrowRight className="inline-block ml-2 h-5 w-5" />
              </Link>
              <a href="#eligibility" className="glass py-4 px-8 rounded-2xl font-bold text-white border border-white/20 text-center hover:bg-white/10 transition-all">
                Check Eligibility
              </a>
            </div>
          </div>
          <div className="relative h-[400px] lg:h-[550px] group hidden lg:block">
            <div className="absolute -inset-4 bg-gradient-to-br from-blue-600/30 to-teal-500/30 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <img
              src="/assets/images/hero/india-medical-college-campus.png"
              alt="Medical college campus"
              className="relative inset-0 w-full h-full object-cover rounded-[2.5rem] shadow-2xl border border-white/20"
              loading="lazy"
            />
            <div className="absolute bottom-10 -left-10 glass-white p-6 rounded-3xl shadow-2xl border border-white/40 max-w-xs group-hover:translate-x-2 transition-transform">
              <div className="flex items-start gap-4">
                <div className="shrink-0 bg-blue-600 text-white p-3 rounded-2xl shadow-lg">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Why NRI Quota?</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">Higher chances of admission with specialized seats reserved exclusively for NRI candidates.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NRIHero;
