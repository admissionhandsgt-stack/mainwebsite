'use client';
import React, { useState, useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';
import { 
  Send, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  User, 
  Phone, 
  Award, 
  MapPin, 
  Sparkles, 
  Check, 
  ChevronRight, 
  ArrowLeft, 
  Clock,
  Heart,
  MessageSquare
} from 'lucide-react';
import { useCTA } from '@/hooks/useCTA';
import { useContactInfo } from '@/hooks/useContactInfo';
import { toast } from 'sonner';

// Top medical states in India for selection chips
const AVAILABLE_STATES = [
  'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Uttar Pradesh', 
  'Delhi', 'Andhra Pradesh', 'Gujarat', 'West Bengal', 
  'Rajasthan', 'Pondicherry'
];

// Specialization branch suggestions
const BRANCH_SUGGESTIONS = [
  'Radiology', 'Dermatology', 'General Medicine', 'Pediatrics',
  'Orthopedics', 'General Surgery', 'Ob-Gyn', 'Anaesthesia',
  'Ophthalmology', 'Pathology'
];

interface RankAnalysis {
  specialties: string[];
  zones: string;
  strategy: string;
}

// Frontend rule-based rank analysis engine
const getRankAnalysis = (rankNum: number): RankAnalysis => {
  if (rankNum <= 3000) {
    return {
      specialties: ['MD Radiology', 'MD Dermatology', 'MD Gen Medicine'],
      zones: 'AIQ Govt (Top Tier) & State Quota',
      strategy: 'Excellent rank. Target top-tier government medical colleges.'
    };
  } else if (rankNum <= 10000) {
    return {
      specialties: ['MD Pediatrics', 'MS Orthopedics', 'MS Gen Surgery'],
      zones: 'AIQ Gov (Mid-Tier), State Quota Gov (Top)',
      strategy: 'Core clinical branch in state and national government institutions.'
    };
  } else if (rankNum <= 25000) {
    return {
      specialties: ['MD Anaesthesia', 'MS Ophthalmology', 'MD Pathology'],
      zones: 'State Gov (Lower), DNB Programs, Top Private',
      strategy: 'Parallel strategy: DNB programs and state quota private seats.'
    };
  } else if (rankNum <= 50000) {
    return {
      specialties: ['MD Pathology', 'MD Anaesthesia', 'Core Clinical (Deemed)'],
      zones: 'Deemed Universities, State Quota Private',
      strategy: 'Best clinical choices lie under Deemed University channels.'
    };
  } else {
    return {
      specialties: ['MD Pathology', 'Non-Clinical (Govt)', 'Clinical (Deemed)'],
      zones: 'Deemed Universities & Management Quotas',
      strategy: 'Focus on Deemed clinical choices and management quota options.'
    };
  }
};

export const InlineLeadForm = ({ source = 'PG Page' }: { source?: string }) => {
  const { contactInfo } = useContactInfo();
  // Form steps: 1 = Clinical Profile, 2 = Contact Information
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    rank: '',
    preferred_branch: '',
    preferred_state: [] as string[],
    quota_interest: 'AIQ' as string, // Active quick selection
    internship_status: 'Completed' as string,
    honeypot: ''
  });

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const cta = useCTA();

  // Auto-redirect to WhatsApp after 3 seconds on successful lead capture
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        try {
          const recipientNumber = (contactInfo?.lead_notification_phone || contactInfo?.whatsapp_number || '919310301949')
            .replace(/[+\s-]/g, '');

          const baseText = `Hi, I submitted my PG Intake Form.
Name: ${formData.name}
NEET PG Rank: ${formData.rank}
Branch: ${formData.preferred_branch || 'Not Specified'}
State Prefs: ${formData.preferred_state.join(', ') || 'Not Specified'}
Quota: ${formData.quota_interest}
Internship: ${formData.internship_status}`;

          const waUrl = `https://wa.me/${recipientNumber}?text=${encodeURIComponent(baseText)}`;
          window.location.href = waUrl;
        } catch (err) {
          console.error('[WhatsApp Auto-Redirect] Failed:', err);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [status, contactInfo, formData]);

  // Dynamic Opportunity Analyzer state
  const rankVal = parseInt(formData.rank.replace(/,/g, ''), 10);
  const showAnalysis = !isNaN(rankVal) && rankVal > 0;
  const analysisData = showAnalysis ? getRankAnalysis(rankVal) : null;

  const handleStateToggle = (stateName: string) => {
    setFormData(prev => {
      const selected = prev.preferred_state.includes(stateName)
        ? prev.preferred_state.filter(s => s !== stateName)
        : [...prev.preferred_state, stateName];
      return { ...prev, preferred_state: selected };
    });
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rank) {
      setErrorMsg('Please enter your expected/current NEET PG rank to continue.');
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;

    if (!formData.name.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg('Phone Number is required');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    const payload = {
      name: formData.name,
      phone: formData.phone,
      rank: formData.rank,
      preferred_branch: formData.preferred_branch,
      preferred_state: formData.preferred_state.join(', '),
      quota_interest: formData.quota_interest,
      internship_status: formData.internship_status,
      source,
      honeypot: formData.honeypot
    };

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setStatus('success');
      toast.success('Query Submitted Successfully! 🩺');
      trackEvent('lead_submit', { source, rank: formData.rank });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong. Please check your network and try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/20 max-w-md mx-auto w-full shadow-2xl text-center flex flex-col items-center justify-center py-10 space-y-4">
        <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-950/50">
          <CheckCircle2 className="w-7 h-7 animate-bounce" />
        </div>
        
        <div>
          <h3 className="text-base font-black text-emerald-400 mb-1">Submitted Successfully!</h3>
          <p className="text-xs text-slate-350 font-bold max-w-xs mx-auto">
            Opening your prefilled advice strategy chat on WhatsApp...
          </p>
        </div>

        {/* Reassuring loading animation dots */}
        <div className="flex items-center gap-1.5 justify-center py-2">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '500ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 dark:bg-slate-950/60 backdrop-blur-xl rounded-2xl p-5 md:p-6 shadow-2xl border border-white/10 max-w-md mx-auto w-full relative overflow-hidden text-left">
      {/* 1. Elite Operational Header */}
      <div className="border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              PG Advisory Desk Active
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Response ~15 mins</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
          <span>👥 2100+ Doctors Guided</span>
          <span>🎯 AIQ • STATE • DEEMED • NRI</span>
        </div>
      </div>

      <div className="mb-5">
        <h3 className="text-base font-black text-white tracking-tight mb-1">
          Get Your Personalized PG Admission Strategy
        </h3>
        <p className="text-[11px] text-slate-400 font-bold leading-normal">
          Provide your NEET PG details below to generate a pathway analysis and schedule a counseling callback.
        </p>
      </div>

      {/* 2. Step Form Layout */}
      {step === 1 ? (
        <form onSubmit={handleNextStep} className="space-y-4">
          {/* Rank Field */}
          <div>
            <label className="block text-[10px] font-black text-slate-350 uppercase tracking-wider mb-1.5 ml-0.5">
              Expected / Current NEET PG Rank
            </label>
            <div className="relative">
              <Award className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-950/40 border border-white/10 focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/20 rounded-xl transition-all text-xs text-white placeholder-slate-600 outline-none"
                placeholder="e.g. 4500"
                value={formData.rank}
                onChange={e => setFormData({ ...formData, rank: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <p className="text-[9px] text-slate-500 font-bold mt-1 ml-0.5">
              Used to estimate realistic counseling opportunities.
            </p>
          </div>

          {/* Dynamic Rank Opportunity Analyzer */}
          {showAnalysis && analysisData && (
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3.5 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-1.5 text-[10.5px] font-black text-blue-400">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Estimated Opportunity Zones (AIR {formData.rank})</span>
              </div>
              <div className="text-[10px] text-slate-300 leading-relaxed font-bold">
                <span className="text-slate-400 font-normal">Pathway:</span> {analysisData.zones}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {analysisData.specialties.map((spec, i) => (
                  <span key={i} className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-300 font-black px-2 py-0.5 rounded-md">
                    {spec}
                  </span>
                ))}
              </div>
              <p className="text-[9px] text-slate-400 leading-normal font-bold">
                💡 <span className="text-slate-350">{analysisData.strategy}</span>
              </p>
            </div>
          )}

          {/* Preferred Branch */}
          <div>
            <label className="block text-[10px] font-black text-slate-355 uppercase tracking-wider mb-1.5 ml-0.5">
              Preferred Specialty Branch
            </label>
            <select
              className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/20 rounded-xl transition-all text-xs text-white outline-none cursor-pointer"
              value={formData.preferred_branch}
              onChange={e => setFormData({ ...formData, preferred_branch: e.target.value })}
            >
              <option className="bg-slate-950" value="">-- Select Preferred Specialty --</option>
              {BRANCH_SUGGESTIONS.map((branch, i) => (
                <option key={i} className="bg-slate-950" value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>

          {/* Preferred State Selector (Interactive Chips) */}
          <div>
            <label className="block text-[10px] font-black text-slate-355 uppercase tracking-wider mb-1.5 ml-0.5">
              Preferred States (Select Multiple)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
              {AVAILABLE_STATES.map((state, i) => {
                const isSelected = formData.preferred_state.includes(state);
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => handleStateToggle(state)}
                    className={`text-[9.5px] px-2 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600/25 border-blue-500 text-blue-300' 
                        : 'bg-slate-950/20 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    {state} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quota Pills & Internship Toggle */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Quota Selector */}
            <div>
              <label className="block text-[10px] font-black text-slate-355 uppercase tracking-wider mb-1.5 ml-0.5">
                Quota Focus
              </label>
              <div className="flex gap-1 bg-slate-950/40 p-1 border border-white/5 rounded-xl">
                {['AIQ', 'State', 'Deemed'].map((quota) => {
                  const isActive = formData.quota_interest === quota;
                  return (
                    <button
                      type="button"
                      key={quota}
                      onClick={() => setFormData({ ...formData, quota_interest: quota })}
                      className={`flex-1 text-[9.5px] py-1 rounded-lg font-black transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/20' 
                          : 'text-slate-450 hover:text-white border border-transparent'
                      }`}
                    >
                      {quota}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Internship Completion */}
            <div>
              <label className="block text-[10px] font-black text-slate-355 uppercase tracking-wider mb-1.5 ml-0.5">
                Internship Status
              </label>
              <div className="flex gap-1 bg-slate-950/40 p-1 border border-white/5 rounded-xl">
                {['Completed', 'Ongoing'].map((statusOption) => {
                  const isActive = formData.internship_status === statusOption;
                  return (
                    <button
                      type="button"
                      key={statusOption}
                      onClick={() => setFormData({ ...formData, internship_status: statusOption })}
                      className={`flex-1 text-[9.5px] py-1 rounded-lg font-black transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/20' 
                          : 'text-slate-450 hover:text-white border border-transparent'
                      }`}
                    >
                      {statusOption === 'Completed' ? 'Done' : 'Ongoing'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-1.5 p-2 bg-red-950/40 text-red-400 rounded-lg text-[10px] font-medium border border-red-900/40">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white py-2.5 rounded-xl font-bold shadow-md shadow-blue-500/10 transition-all mt-1 cursor-pointer"
          >
            <span className="text-xs uppercase tracking-wider">Generate Strategy</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
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

          {/* Full Name */}
          <div>
            <label className="block text-[10px] font-black text-slate-355 uppercase tracking-wider mb-1.5 ml-0.5">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-950/40 border border-white/10 focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/20 rounded-xl transition-all text-xs text-white placeholder-slate-650 outline-none"
                placeholder="Dr. Rahul Sharma"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-[10px] font-black text-slate-355 uppercase tracking-wider mb-1.5 ml-0.5">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="tel"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-950/40 border border-white/10 focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/20 rounded-xl transition-all text-xs text-white placeholder-slate-650 outline-none"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          {/* Summary Panel */}
          <div className="bg-slate-950/30 border border-white/5 rounded-xl p-3 text-[10px] space-y-1.5">
            <span className="text-slate-400 font-bold block uppercase tracking-wider text-[9px] mb-1">
              Intake Summary:
            </span>
            <div className="flex justify-between">
              <span className="text-slate-500">NEET PG Rank:</span>
              <span className="text-white font-bold">AIR {formData.rank}</span>
            </div>
            {formData.preferred_branch && (
              <div className="flex justify-between">
                <span className="text-slate-500">Specialty:</span>
                <span className="text-white font-bold">{formData.preferred_branch}</span>
              </div>
            )}
            {formData.preferred_state.length > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">States:</span>
                <span className="text-white font-bold max-w-[150px] truncate text-right">{formData.preferred_state.join(', ')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Target Pathway:</span>
              <span className="text-white font-bold">{formData.quota_interest} Quota</span>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-1.5 p-2 bg-red-950/40 text-red-400 rounded-lg text-[10px] font-medium border border-red-900/40">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          <div className="flex items-center gap-2.5 mt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 flex items-center justify-center gap-1.5 border border-white/10 hover:border-white/20 active:scale-[0.98] text-white py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex-[2] flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#2ee374] hover:to-[#149d8e] active:scale-[0.98] text-white py-2.5 rounded-xl font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-75 disabled:active:scale-100 cursor-pointer"
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span className="text-xs uppercase tracking-wider">Submit / Connect</span>
                  <MessageSquare className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Trust Reminder */}
      <p className="text-[9px] text-center text-slate-500 mt-4 font-bold flex items-center justify-center gap-1.5">
        <Heart className="w-3 h-3 text-red-500/80" />
        <span>🔒 100% confidential doctor intake. No spam.</span>
      </p>
    </div>
  );
};
export default InlineLeadForm;
