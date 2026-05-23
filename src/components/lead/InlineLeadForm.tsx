"use client";
import React, { useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export const InlineLeadForm = ({ source = 'PG Page' }: { source?: string }) => {
  const [formData, setFormData] = useState({ name: '', phone: '', rank: '', honeypot: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setStatus('success');
      trackEvent('lead_submit', { source });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-emerald-50 rounded-2xl p-8 text-center border border-emerald-100 max-w-md mx-auto w-full shadow-sm">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-emerald-800 mb-2">Request Received!</h3>
        <p className="text-sm text-emerald-600">
          Our expert counselors will contact you shortly on the provided phone number.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md mx-auto w-full relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
      
      <div className="text-center mb-6">
        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Get Expert Guidance</h3>
        <p className="text-sm text-slate-500">Fill out this quick form and we'll call you back with personalized college options.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot field - hidden from users */}
        <input 
          type="text" 
          name="honeypot" 
          value={formData.honeypot} 
          onChange={e => setFormData({...formData, honeypot: e.target.value})} 
          style={{ display: 'none' }} 
          tabIndex={-1} 
          autoComplete="off" 
        />

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
          <input
            type="text"
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            placeholder="Dr. John Doe"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">Phone Number *</label>
          <input
            type="tel"
            required
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            placeholder="+91 9876543210"
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">NEET PG Rank (Optional)</label>
          <input
            type="text"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            placeholder="e.g. 15000"
            value={formData.rank}
            onChange={e => setFormData({...formData, rank: e.target.value})}
          />
        </div>

        {status === 'error' && (
          <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 mt-2"
        >
          {status === 'loading' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Request Callback</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
        <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
          By submitting, you agree to receive communications from AdmissionHands.
        </p>
      </form>
    </div>
  );
};
