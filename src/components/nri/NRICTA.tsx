"use client";

import type { NriBenefit } from '@/lib/nriContent';

const SHIPPED_BENEFITS: NriBenefit[] = [
                { title: "Personalized Counseling", desc: "One-on-one sessions to understand your profile and suggest the best options." },
                { title: "End-to-End Support", desc: "From document preparation to final admission, we handle it all." },
                { title: "Direct College Connections", desc: "We have established relationships with top medical colleges across India." }
];

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, ArrowRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { checkPhone } from '@/lib/phone';
import { checkName, checkEmail } from '@/lib/formRules';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import { useCTA } from '@/hooks/useCTA';

const NRICTA = ({ benefits: fromCms }: { benefits?: NriBenefit[] | null } = {}) => {
  const benefits = fromCms?.length ? fromCms : SHIPPED_BENEFITS;

  const CTA = useCTA();

  /*
    This form used to go nowhere. It had no submit handler and its inputs no
    names, so "Submit Query" reloaded the page and the enquiry vanished — the
    leads table has no NRI-page lead at all before 2026-10-06. It now posts to
    /api/leads like every other form, with the same checks. A foreign number
    is accepted with its +country code: most NRI families are abroad.
  */
  const [form, setForm] = useState({ name: '', phone: '', email: '', nriType: '', message: '', honeypot: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    const n = checkName(form.name);
    if (!n.ok) return setError(n.error);
    const ph = checkPhone(form.phone, { allowInternational: true });
    if (!ph.ok) return setError(ph.error);
    const em = checkEmail(form.email);
    if (!em.ok) return setError(em.error);
    if (form.message.length > 2000) return setError('Please keep the query under 2,000 characters.');
    setError(null);
    setState('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: n.value,
          phone: ph.e164,
          email: em.value || undefined,
          quota_interest: form.nriType ? `NRI quota (${form.nriType})` : 'NRI quota',
          message: form.message || undefined,
          level: 'ug',
          source: 'NRI quota page',
          honeypot: form.honeypot || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send that. Please try again.');
      setState('sent');
    } catch (err) {
      setState('idle');
      setError(err instanceof Error ? err.message : 'Could not send that. Please try again.');
    }
  };
  
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
            <p className="text-cyan-100/70 text-xl font-medium leading-relaxed">
              Don't navigate the complex admission process alone. Our experts have helped hundreds of students 
              secure medical seats through NRI quota across top colleges in India.
            </p>
            
            <div className="space-y-8">
              {benefits.map((item, idx) => (
                <div key={idx} className="flex gap-6 items-start group">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10 group-hover:bg-cyan-600 transition-all shadow-xl">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400 group-hover:text-white">
                      <path d="M22 11.0801V12.0001C21.9988 14.1565 21.3005 16.2548 20.0093 17.9819C18.7182 19.7091 16.9033 20.9726 14.8354 21.584C12.7674 22.1954 10.5573 22.122 8.53447 21.3747C6.51168 20.6274 4.78465 19.2462 3.61096 17.4372C2.43727 15.6281 1.87979 13.4882 2.02168 11.3364C2.16356 9.18467 2.99721 7.13443 4.39828 5.49718C5.79935 3.85994 7.69279 2.71553 9.79619 2.24025C11.8996 1.76497 14.1003 1.98245 16.07 2.86011M22 4.00011L12 14.0101L9 11.0101" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-white tracking-tight mb-2">{item.title}</h3>
                    <p className="text-cyan-100/60 font-medium">{item.desc}</p>
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
            {state === 'sent' ? (
              <div role="status" className="flex flex-col items-center gap-4 py-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" aria-hidden="true" />
                <p className="text-xl font-black text-white">Thank you — we have your query.</p>
                <p className="max-w-sm text-cyan-100/70">
                  An NRI quota counsellor will call you shortly. For a faster reply, message us on WhatsApp.
                </p>
              </div>
            ) : (
            <form className="space-y-6" onSubmit={submit} noValidate>
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.honeypot} onChange={set('honeypot')} style={{ display: 'none' }} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-black text-cyan-100/50 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    autoComplete="name"
                    required
                    value={form.name}
                    onChange={set('name')}
                    placeholder="Your name"
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-medium"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-black text-cyan-100/50 uppercase tracking-widest ml-1">Phone Number</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="98765 12345 or +971 50 123 4567"
                    className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-medium"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-black text-cyan-100/50 uppercase tracking-widest ml-1">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="Your email address"
                  className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-medium"
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-medium opacity-90">Candidate Category</label>
                <select
                  id="category"
                  name="nriType"
                  value={form.nriType}
                  onChange={set('nriType')}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="" className="bg-medical-800">Select your category</option>
                  <option value="NRI" className="bg-medical-800">NRI</option>
                  <option value="NRI Sponsored" className="bg-medical-800">NRI Sponsored</option>
                  <option value="OCI/PIO" className="bg-medical-800">OCI/PIO</option>
                  <option value="Foreign National" className="bg-medical-800">Foreign National</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium opacity-90">Your Query</label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  maxLength={2000}
                  value={form.message}
                  onChange={set('message')}
                  placeholder="Tell us about your requirements"
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/20"
                ></textarea>
              </div>
              
              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}

              <Button type="submit" disabled={state === 'sending'} className="w-full bg-white text-medical-800 hover:bg-gray-100" size="lg">
                {state === 'sending' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Sending…
                  </>
                ) : (
                  <>
                    Submit Query <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NRICTA;
