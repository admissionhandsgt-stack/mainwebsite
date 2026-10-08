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
import { checkPhone } from '@/lib/phone';
import { checkName } from '@/lib/formRules';
import { checkRank } from '@/lib/neetLimits';

// Top medical states in India for selection chips
const AVAILABLE_STATES = [
  'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Uttar Pradesh', 
  'Delhi', 'Andhra Pradesh', 'Gujarat', 'West Bengal', 
  'Rajasthan', 'Pondicherry'
];

// Specialization branch suggestions
// PG candidates pick a speciality; UG candidates do not have one yet, so the
// UG form asks about the course instead.
const UG_COURSE_SUGGESTIONS = [
  'MBBS', 'BDS', 'BAMS', 'BHMS', 'B.Sc. Nursing', 'BVSc',
];

const BRANCH_SUGGESTIONS = [
  'Radiology', 'Dermatology', 'General Medicine', 'Pediatrics',
  'Orthopedics', 'General Surgery', 'Ob-Gyn', 'Anaesthesia',
  'Ophthalmology', 'Pathology'
];

/*
  There used to be a "rank opportunity analyser" here: five hard-coded bands
  ("rank 3,000 or better -> MD Radiology, MD Dermatology"). It was invented, it
  was PG-only - the homepage shows this form to NEET UG students, who were
  told about MD specialities - and it contradicted the one promise the site
  makes, that nothing is estimated. In its place is a link to the predictor
  with the rank already filled in, which answers from published closing ranks.
*/

/** Everything on this form that differs between a UG and a PG enquiry. */
const COPY = {
  ug: {
    desk: 'Admission Desk Active',
    guided: '👥 2100+ Students Guided',
    title: 'Get Your Personalised MBBS Admission Plan',
    intro: 'Tell us your NEET UG rank and preferences, and a counsellor will call you back with a plan.',
    rankLabel: 'Your NEET UG Rank',
    rankShort: 'NEET UG Rank',
    rankHint: 'From your NEET UG scorecard. Not your marks.',
    rankMissing: 'Enter your NEET UG rank to continue.',
    namePlaceholder: 'Rahul Sharma',
    course: 'mbbs',
    intake: 'my MBBS enquiry form',
  },
  pg: {
    desk: 'PG Advisory Desk Active',
    guided: '👥 2100+ Doctors Guided',
    title: 'Get Your Personalised PG Admission Strategy',
    intro: 'Tell us your NEET PG rank and preferences, and a counsellor will call you back with a plan.',
    rankLabel: 'Your NEET PG Rank',
    rankShort: 'NEET PG Rank',
    rankHint: 'From your NEET PG scorecard. Not your marks.',
    rankMissing: 'Enter your NEET PG rank to continue.',
    namePlaceholder: 'Dr. Rahul Sharma',
    course: 'pg',
    intake: 'my PG intake form',
  },
} as const;

export const InlineLeadForm = ({
  source = 'PG Page',
  level = 'pg',
}: {
  source?: string;
  /** Which counselling this enquiry is about. Without it every lead lands in
   *  the admin as PG, because that is what the API defaults to. */
  level?: 'ug' | 'pg';
}) => {
  const { contactInfo } = useContactInfo();
  const copy = COPY[level];
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

          const baseText = [
            `Hi, I submitted ${copy.intake}.`,
            `Name: ${formData.name}`,
            `${copy.rankShort}: ${formData.rank}`,
            `${level === 'ug' ? 'Course' : 'Branch'}: ${formData.preferred_branch || 'Not Specified'}`,
            `State Prefs: ${formData.preferred_state.join(', ') || 'Not Specified'}`,
            `Quota: ${formData.quota_interest}`,
            ...(level === 'pg' ? [`Internship: ${formData.internship_status}`] : []),
          ].join('\n');

          const waUrl = `https://wa.me/${recipientNumber}?text=${encodeURIComponent(baseText)}`;
          window.location.href = waUrl;
        } catch (err) {
          console.error('[WhatsApp Auto-Redirect] Failed:', err);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [status, contactInfo, formData, copy, level]);

  // A real answer for the rank they typed: the predictor, pre-filled.
  const rankCheck = formData.rank ? checkRank(formData.rank, level) : null;

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
      setErrorMsg(copy.rankMissing);
      return;
    }
    const r = checkRank(formData.rank, level);
    if (!r.ok) {
      setErrorMsg(r.error);
      return;
    }
    setErrorMsg('');
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;

    // The same rules the server applies (lib/formRules, lib/phone), said here
    // while the visitor can still fix them. International numbers are fine
    // with their +country code - NRI families enquire from abroad.
    const n = checkName(formData.name);
    if (!n.ok) {
      setErrorMsg(n.error);
      return;
    }
    const ph = checkPhone(formData.phone, { allowInternational: true });
    if (!ph.ok) {
      setErrorMsg(ph.error);
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
      internship_status: level === 'pg' ? formData.internship_status : undefined,
      source,
      level,
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
      trackEvent('lead_submit', { source, level, rank: formData.rank });
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
          <p className="text-xs text-slate-300 font-bold max-w-xs mx-auto">
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
              {copy.desk}
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-[10px] font-bold">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Response ~15 mins</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
          <span>{copy.guided}</span>
          <span>🎯 AIQ • STATE • DEEMED • NRI</span>
        </div>
      </div>

      <div className="mb-5">
        <h3 className="text-base font-black text-white tracking-tight mb-1">
          {copy.title}
        </h3>
        <p className="text-[11px] text-slate-400 font-bold leading-normal">
          {copy.intro}
        </p>
      </div>

      {/* 2. Step Form Layout */}
      {step === 1 ? (
        <form onSubmit={handleNextStep} className="space-y-4">
          {/* Rank Field */}
          <div>
            <label className="block text-[10px] font-black text-slate-300 uppercase tracking-wider mb-1.5 ml-0.5">
              {copy.rankLabel}
            </label>
            <div className="relative">
              <Award className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                required
                className="w-full pl-9 pr-3 py-3 md:py-2 bg-slate-950/40 border border-white/10 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 rounded-xl transition-all text-base md:text-xs text-white placeholder-slate-600 outline-none"
                inputMode="numeric"
                aria-label={copy.rankLabel}
                placeholder="e.g. 4500"
                value={formData.rank}
                onChange={e => setFormData({ ...formData, rank: e.target.value.replace(/\D/g, '') })}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-1 ml-0.5">
              {rankCheck && !rankCheck.ok ? rankCheck.error : copy.rankHint}
            </p>
          </div>

          {/* What the rank actually reached - from published closing ranks. */}
          {rankCheck?.ok && (
            <a
              href={`/neet-college-predictor?course=${copy.course}&rank=${rankCheck.value}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3.5 py-3 text-[11px] font-bold text-cyan-300 transition-colors hover:bg-cyan-500/10"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                See every seat rank {rankCheck.value.toLocaleString('en-IN')} reached last year
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          )}

          {/* Preferred branch (PG) or course (UG) */}
          <div>
            <label htmlFor="lead-branch" className="block text-[10px] font-black text-slate-355 uppercase tracking-wider mb-1.5 ml-0.5">
              {level === 'ug' ? 'Preferred Course' : 'Preferred Specialty Branch'}
            </label>
            <select
              id="lead-branch"
              className="w-full px-3 py-3 md:py-2 bg-slate-950/40 border border-white/10 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 rounded-xl transition-all text-base md:text-xs text-white outline-none cursor-pointer"
              value={formData.preferred_branch}
              onChange={e => setFormData({ ...formData, preferred_branch: e.target.value })}
            >
              <option className="bg-slate-950" value="">
                {level === 'ug' ? '-- Select Preferred Course --' : '-- Select Preferred Specialty --'}
              </option>
              {(level === 'ug' ? UG_COURSE_SUGGESTIONS : BRANCH_SUGGESTIONS).map((branch, i) => (
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
                    className={`text-xs md:text-[9.5px] px-3 md:px-2 py-2.5 md:py-1 min-h-11 md:min-h-0 rounded-lg border font-bold transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-cyan-600/25 border-cyan-500 text-cyan-300' 
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
          <div className={`grid gap-3.5 ${level === 'pg' ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
                      className={`flex-1 text-xs md:text-[9.5px] py-2.5 md:py-1 min-h-11 md:min-h-0 rounded-lg font-black transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/20' 
                          : 'text-slate-400 hover:text-white border border-transparent'
                      }`}
                    >
                      {quota}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Internship Completion - PG only; a NEET UG candidate has none */}
            {level === 'pg' && (
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
                      className={`flex-1 text-xs md:text-[9.5px] py-2.5 md:py-1 min-h-11 md:min-h-0 rounded-lg font-black transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/20' 
                          : 'text-slate-400 hover:text-white border border-transparent'
                      }`}
                    >
                      {statusOption === 'Completed' ? 'Done' : 'Ongoing'}
                    </button>
                  );
                })}
              </div>
            </div>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-1.5 p-2 bg-red-950/40 text-red-400 rounded-lg text-[10px] font-medium border border-red-900/40">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 active:scale-[0.98] text-white py-3.5 md:py-2.5 rounded-xl font-bold shadow-md shadow-cyan-500/10 transition-all mt-1 cursor-pointer"
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
                className="w-full pl-9 pr-3 py-3 md:py-2 bg-slate-950/40 border border-white/10 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 rounded-xl transition-all text-base md:text-xs text-white placeholder-slate-600 outline-none"
                aria-label="Your name"
                placeholder={copy.namePlaceholder}
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
                className="w-full pl-9 pr-3 py-3 md:py-2 bg-slate-950/40 border border-white/10 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/20 rounded-xl transition-all text-base md:text-xs text-white placeholder-slate-600 outline-none"
                aria-label="Your mobile number"
                inputMode="tel"
                autoComplete="tel"
                placeholder="98765 12345"
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
              <span className="text-slate-500">{copy.rankShort}:</span>
              <span className="text-white font-bold">AIR {formData.rank}</span>
            </div>
            {formData.preferred_branch && (
              <div className="flex justify-between">
                <span className="text-slate-500">{level === 'ug' ? 'Course' : 'Specialty'}:</span>
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
              className="flex-1 flex items-center justify-center gap-1.5 border border-white/10 hover:border-white/20 active:scale-[0.98] text-white py-3.5 md:py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex-[2] flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#2ee374] hover:to-[#149d8e] active:scale-[0.98] text-white py-3.5 md:py-2.5 rounded-xl font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-75 disabled:active:scale-100 cursor-pointer"
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
