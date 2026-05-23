import React from 'react';
import SupportSection from './SupportSection';
import { Card, CardContent } from '@/components/ui/card';

const ServicesHero = () => {
  return (
    <section className="relative w-full h-auto min-h-[480px] md:h-screen md:min-h-[700px] flex items-center overflow-hidden mesh-gradient pt-[88px] md:pt-[112px] pb-12 md:pb-0">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/assets/images/hero/medical-admission-counselling-session.png" 
          alt="Personalized Medical Counseling"
          className="w-full h-full object-cover opacity-20 transition-opacity duration-1000"
        />
        <div className="absolute inset-0 bg-slate-900/40" />
      </div>

      {/* Decorative blurred orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full bg-blue-600/20 blur-[100px] md:blur-[120px] pointer-events-none z-1" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] rounded-full bg-teal-500/15 blur-[80px] md:blur-[100px] pointer-events-none z-1" />
      
      <div className="container-custom relative z-10">
        <div className="max-w-4xl mx-auto mb-8 md:mb-10 text-center">
          <div className="inline-block mb-4">
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs md:text-sm font-medium text-blue-100">Trusted by 1200+ medical students</span>
            </div>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 text-white tracking-tight leading-tight">
            Personalized Admission <span className="gradient-text">Solutions</span> for Every Medical Aspirant
          </h1>
          
          <p className="text-sm sm:text-base md:text-lg text-blue-100/80 mb-6 md:mb-8 max-w-3xl mx-auto leading-relaxed">
            At Admission Hands, we provide expert-led counseling designed to help you secure admission in top medical colleges across India — with complete support, stress-free guidance, and absolute clarity at every step.
          </p>
        </div>

        <div className="max-w-4xl mx-auto glass-white rounded-[2rem] md:rounded-3xl overflow-hidden shadow-2xl border border-white/40">
          <div className="p-0">
            <div className="indian-medical-gradient h-1.5 w-full"></div>
            <div className="p-5 sm:p-8 md:p-12">
              <SupportSection />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesHero;
