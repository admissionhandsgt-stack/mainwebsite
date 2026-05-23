"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, ArrowRight } from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useCTA } from '@/hooks/useCTA';

const NRICTA = () => {
  const CTA = useCTA();
  
  return (
    <section id="contact" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-900 -z-20" />
      <div className="absolute inset-0 mesh-gradient opacity-40 -z-10" />
      
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <h2 className="text-3xl md:text-6xl font-black text-white leading-tight tracking-tight">
              Get Expert Guidance for <span className="gradient-text">NRI Quota</span> Admissions
            </h2>
            <p className="text-blue-100/70 text-xl font-medium leading-relaxed">
              Don't navigate the complex admission process alone. Our experts have helped hundreds of students 
              secure medical seats through NRI quota across top colleges in India.
            </p>
            
            <div className="space-y-8">
              {[
                { title: "Personalized Counseling", desc: "One-on-one sessions to understand your profile and suggest the best options." },
                { title: "End-to-End Support", desc: "From document preparation to final admission, we handle it all." },
                { title: "Direct College Connections", desc: "We have established relationships with top medical colleges across India." }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6 items-start group">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 group-hover:bg-blue-600 transition-all shadow-xl">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-400 group-hover:text-white">
                      <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.584C12.7674 22.1954 10.5573 22.122 8.53447 21.3747C6.51168 20.6274 4.78465 19.2462 3.61096 17.4372C2.43727 15.6281 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13443 4.39828 5.49718C5.79935 3.85994 7.69279 2.71553 9.79619 2.24025C11.8996 1.76497 14.1003 1.98245 16.07 2.86011M22 4.00011L12 14.0101L9 11.0101" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-white tracking-tight mb-2">{item.title}</h3>
                    <p className="text-blue-100/60 font-medium">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-6 flex flex-wrap gap-6">
              <Button onClick={CTA.call} className="bg-white text-slate-900 hover:bg-slate-100 rounded-2xl px-10 py-7 text-lg font-black shadow-2xl shadow-white/10" size="lg">
                <div className="flex items-center">
                  <Phone className="mr-3 h-5 w-5" />
                  Call Now
                </div>
              </Button>
              
              <Button onClick={() => CTA.whatsapp("Hi, I need guidance for NRI quota admissions")} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-10 py-7 text-lg font-black shadow-2xl shadow-emerald-900/40" size="lg">
                <WhatsAppIcon className="mr-3" size={20} />
                WhatsApp Connect
              </Button>
            </div>
          </div>
          
          <div className="glass-dark rounded-[3.5rem] p-10 md:p-14 border border-white/10 shadow-[0_0_50px_rgba(37,99,235,0.15)]">
            <h3 className="text-3xl font-black text-white mb-10 tracking-tight">Get Free Counseling</h3>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-black text-blue-100/50 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    placeholder="Your name"
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-black text-blue-100/50 uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    placeholder="Your phone number"
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-black text-blue-100/50 uppercase tracking-widest ml-1">Email Address</label>
                <input
                  type="email"
                  id="email"
                  placeholder="Your email address"
                  className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium opacity-90">Candidate Category</label>
                <select
                  id="category"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="" className="bg-medical-800">Select your category</option>
                  <option value="nri" className="bg-medical-800">NRI</option>
                  <option value="nri-sponsored" className="bg-medical-800">NRI Sponsored</option>
                  <option value="oci" className="bg-medical-800">OCI/PIO</option>
                  <option value="foreign" className="bg-medical-800">Foreign National</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium opacity-90">Your Query</label>
                <textarea
                  id="message"
                  rows={4}
                  placeholder="Tell us about your requirements"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20"
                ></textarea>
              </div>
              
              <Button className="w-full bg-white text-medical-800 hover:bg-gray-100" size="lg">
                Submit Query <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NRICTA;
