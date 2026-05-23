import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Clock, Award, Briefcase, GraduationCap, TrendingUp, IndianRupee, MessageCircle, Phone, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CONTACT_INFO } from '@/lib/constants';

// --- Types ---
interface SpecializationData {
  id: number;
  name: string;
  slug: string;
  category: string;
  short_description: string;
  overview: string;
  career_scope: string;
  average_fees: string;
  duration: string;
  image_url: string;
  banner_url: string;
  meta_title: string;
  meta_description: string;
  details: {
    key_responsibilities: string;
    skills_required: string;
    top_colleges: string;
    salary_range: string;
    demand_trend: string;
    future_scope: string;
  };
  faqs: Array<{
    question: string;
    answer: string;
  }>;
}

// --- Mock Data Fallback ---
function getMockSpecialization(slug: string): SpecializationData {
  const base = slug.replace(/^(md-|ms-|mch-|dm-)/i, '').toLowerCase();
  
  const name = base
    .split('-')
    .map(word => {
      if (word === 'obgyn') return 'Obstetrics & Gynae';
      if (word === 'ent') return 'E.N.T.';
      if (word === 'pmr') return 'Physical Med & Rehab';
      if (word === 'psm') return 'Community Medicine';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  const isSurgical = ['surgery', 'orthopedics', 'obgyn', 'ent', 'ophthalmology'].some(s => base.includes(s));
  const isNonClinical = ['pathology', 'microbiology', 'pharmacology', 'anatomy', 'physiology', 'biochemistry', 'forensic', 'psm'].some(nc => base.includes(nc));
  
  const category = isSurgical ? 'surgical' : (isNonClinical ? 'non_clinical' : 'clinical');

  return {
    id: 999,
    name,
    slug,
    category,
    short_description: `Expert-guided overview, residency insight, demand trends, and career prospects for post-graduate MD/MS ${name} in India.`,
    overview: `${name} is one of the most sought-after post-graduate medical specialties. It offers excellent clinical exposure, high professional satisfaction, and robust career avenues in top-tier healthcare institutes, private practice, and medical research.`,
    career_scope: `Post-graduates in ${name} have excellent opportunities in multi-specialty hospitals, corporate healthcare groups, and academic institutions. One can pursue super-specialization (DM/MCh) or fellowship programs to further excel in sub-specialties.`,
    average_fees: '1.5L - 8L / Year',
    duration: '3 years',
    image_url: 'https://images.unsplash.com/photo-1576091160550-2173dad99901?q=80&w=800',
    banner_url: 'https://images.unsplash.com/photo-1576091160550-2173dad99901?q=80&w=1600',
    meta_title: `MD/MS ${name} Admission Guide 2026 | AdmissionHands`,
    meta_description: `Complete career & admission guide for MD/MS ${name} in India. Explore seats, fees, cutoffs, and expert counselling tips.`,
    details: {
      key_responsibilities: 'Patient diagnosis and clinical workup;Treatment planning and medical rounds;Participating in academic seminars and clinical research;Managing emergencies and critical care units',
      skills_required: 'Analytical reasoning;Patient empathy;High emotional stamina',
      top_colleges: 'AIIMS New Delhi;MAMC Delhi;KGMU Lucknow;CMC Vellore',
      salary_range: '1.2L - 4.5L / Month',
      demand_trend: 'Extremely high demand across government and private medical sectors.',
      future_scope: 'Excellent scope with opportunities for DM/MCh super-specialization, fellowship programs, or establishing high-yield private practice.'
    },
    faqs: [
      {
        question: `What is the duration of MD/MS ${name}?`,
        answer: `The duration of the MD/MS ${name} course is 3 years of active residency.`
      },
      {
        question: `Is ${name} a clinical branch?`,
        answer: `${name} is categorized as a ${category} branch, offering outstanding professional scope.`
      }
    ]
  };
}

// --- Data Fetching ---
async function getSpecializationData(slug: string): Promise<SpecializationData | null> {
  try {
    const { data: spec, error } = await (supabase as any)
      .from('specializations')
      .select(`
        *,
        details:specialization_details(*),
        faqs:specialization_faqs(*)
      `)
      .eq('slug', slug)
      .single();

    if (error || !spec) {
      console.warn(`[Supabase Fallback] Could not fetch specialization data for ${slug}. Falling back to mock data.`);
      return getMockSpecialization(slug);
    }
    return spec as any;
  } catch (e) {
    console.error(`[Supabase Exception] Failed to fetch specialization data for ${slug}:`, e);
    return getMockSpecialization(slug);
  }
}

// --- SEO ---
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getSpecializationData(params.slug);
  if (!data) return { title: 'Specialization Not Found' };

  return {
    title: data.meta_title || `${data.name} - Career & Admission Guide`,
    description: data.meta_description || data.short_description,
  };
}

// --- Page Component ---
export default async function SpecializationPage({ params }: { params: { slug: string } }) {
  const data = await getSpecializationData(params.slug);

  if (!data) notFound();

  const whatsappUrl = `https://wa.me/${CONTACT_INFO.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in MD/MS ${data.name}. Please guide me on admissions.`)}`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 1. Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-[#0a0f1d]">
        <div className="absolute inset-0 z-0">
          <img 
            src={data.banner_url || data.image_url} 
            alt={data.name}
            className="w-full h-full object-cover opacity-30 blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1d] via-[#0a0f1d]/60 to-transparent" />
        </div>

        <div className="container-custom relative z-10">
          <div className="flex items-center gap-2 text-blue-400/80 text-xs font-bold uppercase tracking-widest mb-8">
            <Link href="/" className="hover:text-blue-400 transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/md-ms-india" className="hover:text-blue-400 transition-colors">MD/MS India</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">{data.name}</span>
          </div>

          <div className="max-w-4xl">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">{data.category} branch</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
                {data.name}
              </h1>
              
              <p className="text-lg md:text-xl text-blue-100/70 mb-10 leading-relaxed font-medium max-w-2xl">
                {data.short_description}
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-bold text-white">{data.duration}</span>
                </div>
                <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <Award className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-white">Post Graduate Degree</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-5">
                <a 
                  href={`tel:${CONTACT_INFO.phone.replace(/[+\s-]/g, '')}`}
                  className="h-16 px-10 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-lg shadow-2xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3"
                >
                  <Phone className="w-5 h-5" />
                  Get Counselling
                </a>
                <a 
                  href={whatsappUrl}
                  target="_blank"
                  className="h-16 px-10 rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10 font-black text-lg backdrop-blur-sm transition-all flex items-center justify-center gap-3"
                >
                  <MessageCircle className="w-5 h-5" />
                  Talk to Expert
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Overview & Details Grid */}
      <section className="py-24">
        <div className="container-custom">
          <div className="grid lg:grid-cols-12 gap-16">
            {/* Main Content */}
            <div className="lg:col-span-8 space-y-16">
              {/* Overview */}
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-blue-600" />
                  </div>
                  Branch Overview
                </h2>
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 text-lg leading-relaxed font-medium italic mb-4">"Is {data.name} the right choice for you?"</p>
                  <p className="text-slate-600 text-lg leading-relaxed">{data.overview}</p>
                </div>
              </div>

              {/* Responsibilities */}
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                <h3 className="text-2xl font-black text-slate-900 mb-8">Key Responsibilities</h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  {data.details?.key_responsibilities?.split(';').map((item: string, i: number) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span className="text-slate-700 font-medium">{item.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Career & Salary */}
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="bg-emerald-50/50 rounded-[2.5rem] p-10 border border-emerald-100/50">
                  <TrendingUp className="w-10 h-10 text-emerald-600 mb-6" />
                  <h3 className="text-xl font-black text-slate-900 mb-4">Demand Trend</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">{data.details?.demand_trend}</p>
                </div>
                <div className="bg-blue-50/50 rounded-[2.5rem] p-10 border border-blue-100/50">
                  <IndianRupee className="w-10 h-10 text-blue-600 mb-6" />
                  <h3 className="text-xl font-black text-slate-900 mb-4">Salary Range</h3>
                  <p className="text-slate-600 leading-relaxed font-medium">{data.details?.salary_range}</p>
                </div>
              </div>

              {/* Career Scope */}
              <div>
                <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-amber-600" />
                  </div>
                  Career Scope
                </h2>
                <p className="text-slate-600 text-lg leading-relaxed">{data.career_scope}</p>
              </div>

              {/* Top Colleges */}
              <div className="bg-slate-900 text-white rounded-[3rem] p-12 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20" />
                <h3 className="text-2xl font-black mb-8 relative z-10">Top Institutions for {data.name}</h3>
                <div className="flex flex-wrap gap-3 relative z-10">
                  {data.details?.top_colleges?.split(';').map((college: string, i: number) => (
                    <span key={i} className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/10 font-bold text-sm">
                      {college.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar / Sidebar CTA */}
            <div className="lg:col-span-4">
              <div className="sticky top-32 space-y-8">
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl">
                  <h4 className="text-xl font-black text-slate-900 mb-6">Course Quick Facts</h4>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                      <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Average Fees</span>
                      <span className="text-slate-900 font-black">{data.average_fees}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                      <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Duration</span>
                      <span className="text-slate-900 font-black">{data.duration}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Category</span>
                      <span className="text-blue-600 font-black uppercase tracking-tighter">{data.category}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2.5rem] p-8 text-white shadow-2xl">
                  <h4 className="text-2xl font-black mb-4">Want help with your seat?</h4>
                  <p className="text-blue-100/80 mb-8 font-medium leading-relaxed">Our experts have helped 10,000+ students secure their dream clinical branch.</p>
                  <a 
                    href={whatsappUrl}
                    target="_blank"
                    className="w-full h-14 rounded-xl bg-white text-blue-600 font-black flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Book Free Session
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FAQ Section */}
      <section className="py-24 bg-slate-100/50">
        <div className="container-custom max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Frequently Asked Questions</h2>
            <p className="text-slate-500 font-medium">Common queries about {data.name} admissions and career.</p>
          </div>
          
          <div className="space-y-4">
            {data.faqs?.map((faq, i) => (
              <div key={i} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <h4 className="text-lg font-black text-slate-900 mb-3">{faq.question}</h4>
                <p className="text-slate-600 leading-relaxed font-medium">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Sticky CTA for Mobile */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 z-50">
        <div className="flex gap-3 bg-white/80 backdrop-blur-xl p-3 rounded-[2rem] border border-white/20 shadow-2xl">
          <a 
            href={`tel:${CONTACT_INFO.phone.replace(/[+\s-]/g, '')}`}
            className="flex-1 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center gap-2 font-black text-sm"
          >
            <Phone className="w-4 h-4" />
            Call
          </a>
          <a 
            href={whatsappUrl}
            target="_blank"
            className="flex-1 h-14 rounded-2xl bg-[#25D366] text-white flex items-center justify-center gap-2 font-black text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
