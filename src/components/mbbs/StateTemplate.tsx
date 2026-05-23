"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import SEO from '@/components/SEO';
import { MapPin, GraduationCap, Building, FileText, Users, Calendar, Phone, Mail, ExternalLink, ShieldCheck, ChevronDown, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCTA } from '@/hooks/useCTA';

interface StateTemplateProps {
  stateName: string;
}

const stateColorMap: Record<string, string> = {
  "Karnataka": "from-purple-50 to-pink-50",
  "Maharashtra": "from-blue-50 to-indigo-50",
  "Uttar Pradesh": "from-amber-50 to-orange-50",
  "Rajasthan": "from-red-50 to-rose-50"
};

const StateTemplate: React.FC<StateTemplateProps> = ({ stateName }) => {
  const [stateData, setStateData] = useState<Tables<'mbbs_states'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Accordion states
  const [processOpen, setProcessOpen] = useState(false);
  const [eligibilityOpen, setEligibilityOpen] = useState(false);
  const CTA = useCTA();
  
  const [colleges, setColleges] = useState<any[]>([]);
  const [counselingProcess, setCounselingProcess] = useState<string[]>([]);
  const [facts, setFacts] = useState<any | null>(null);
  
  useEffect(() => {
    const fetchStateData = async () => {
      try {
        const [stateRes, collegesRes] = await Promise.all([
          supabase.from('mbbs_states').select('*').eq('name', stateName).single(),
          supabase.from('ug_colleges').select('*').eq('state', stateName).eq('is_active', true)
        ]);

        if (stateRes.error) {
           console.log("No DB match for state, displaying empty/collapsed layout.");
        } else {
           setStateData(stateRes.data);
           if (stateRes.data && stateRes.data.content) {
             try {
               const parsedContent = typeof stateRes.data.content === 'string' ? JSON.parse(stateRes.data.content) : stateRes.data.content;
               if (parsedContent) {
                 if (parsedContent.facts) setFacts(parsedContent.facts);
                 if (parsedContent.counselingProcess) setCounselingProcess(parsedContent.counselingProcess);
               }
             } catch (parseError) {
               console.error("Error parsing dynamic state content JSON:", parseError);
             }
           }
        }

        if (collegesRes.data && collegesRes.data.length > 0) {
          setColleges(collegesRes.data.map(c => ({
            name: c.college_name,
            type: c.college_type,
            location: c.city,
            established: c.established_year?.toString() || 'N/A',
            description: c.short_description || ''
          })));
        } else {
          setColleges([]); // Strict empty fallback if no data in db
        }
      } catch (err) {
        console.error("Exception in fetchStateData:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStateData();
  }, [stateName]);

  const navSections = [
    { id: 'overview', label: 'Key Facts' },
    { id: 'colleges', label: 'Top Colleges' },
    { id: 'process', label: 'Admission Process' },
    { id: 'contact', label: 'Contact' }
  ].filter(s => {
    if (s.id === 'overview' && !facts) return false;
    if (s.id === 'colleges' && colleges.length === 0) return false;
    if (s.id === 'process' && (!counselingProcess || counselingProcess.length === 0) && (!facts?.eligibility || facts.eligibility.length === 0)) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <SEO 
        title={`MBBS Admission in ${stateName} 2026 | Colleges & Counselling`}
        description={`Complete guide to MBBS admissions in ${stateName}. Find colleges, seat distribution, eligibility, and counseling details.`}
        canonical={`https://www.admissionhands.com/mbbs-india/${stateName.toLowerCase().replace(/\s+/g, '-')}`}
      />
      
      {/* Sticky Section Navigation */}
      <div className="sticky top-[72px] z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm hidden md:block">
        <div className="container-custom flex overflow-x-auto no-scrollbar gap-2 py-3">
          {navSections.map(s => (
            <a key={s.id} href={`#${s.id}`} className="whitespace-nowrap px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors">
              {s.label}
            </a>
          ))}
        </div>
      </div>
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-slate-900">
          <div className="absolute inset-0 mesh-gradient opacity-40 -z-10" />
          
          <div className="container-custom relative px-4">
            <div className="max-w-3xl">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] md:text-xs font-black tracking-widest uppercase mb-6"
              >
                <MapPin className="w-3 h-3 md:w-4 md:h-4" /> State Wise MBBS
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl sm:text-5xl md:text-7xl font-black text-white leading-tight tracking-tighter mb-4"
              >
                Study MBBS in <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{stateName}</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-blue-100/70 text-sm md:text-xl font-medium leading-relaxed mb-8"
              >
                Your complete roadmap to securing a medical seat in the prestigious institutions of {stateName}. We provide expert counseling and end-to-end admission support.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-4"
              >
                <button onClick={CTA.call} className="inline-flex justify-center items-center gap-2 bg-blue-600 text-white px-6 py-3.5 md:px-10 md:py-5 rounded-full font-black text-sm md:text-lg hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/30 w-full sm:w-auto">
                  <Phone className="w-4 h-4 md:w-5 md:h-5" /> Get Expert Guidance
                </button>
              </motion.div>
            </div>
          </div>
        </section>
        
        {/* Key Facts Section */}
        {facts && (
          <section id="overview" className="py-8 md:py-16 bg-white border-b border-slate-100">
            <div className="container-custom px-4">
              <h2 className="text-2xl md:text-4xl font-black text-slate-900 mb-6 md:mb-10 tracking-tight">
                State <span className="text-blue-600">Key Facts</span>
              </h2>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {[
                  { label: "Total Colleges", value: facts.totalColleges, icon: Building },
                  { label: "State Type", value: facts.stateType, icon: ShieldCheck },
                  { label: "Govt Seats", value: facts.govtSeats, icon: Users },
                  { label: "Private Seats", value: facts.privateSeats, icon: Users }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 p-4 md:p-6 rounded-2xl flex flex-col items-center text-center">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-3">
                      <item.icon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                    <p className="text-lg md:text-2xl font-black text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>

              {facts.counsellingAuthority && (
                <div className="mt-4 md:mt-6 bg-blue-50 border border-blue-100 p-4 md:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-blue-500 mb-1">Counselling Authority</p>
                      <p className="text-sm md:text-lg font-black text-slate-900">{facts.counsellingAuthority}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Expandable Sections (Eligibility & Process) */}
        {((facts?.eligibility && facts.eligibility.length > 0) || (counselingProcess && counselingProcess.length > 0)) && (
          <section id="process" className="py-8 md:py-16 bg-slate-50">
            <div className="container-custom px-4 max-w-4xl mx-auto space-y-4">
              
              {/* Eligibility Accordion */}
              {facts?.eligibility && facts.eligibility.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                  <button 
                    onClick={() => setEligibilityOpen(!eligibilityOpen)}
                    className="w-full flex items-center justify-between p-5 md:p-6 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg md:text-xl font-black text-slate-900">Eligibility Highlights</h3>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", eligibilityOpen && "rotate-180")} />
                  </button>
                  
                  <AnimatePresence>
                    {eligibilityOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 md:p-6 pt-0 border-t border-slate-100">
                          <ul className="space-y-3 mt-4">
                            {facts.eligibility.map((item: string, idx: number) => (
                              <li key={idx} className="flex gap-3 text-sm md:text-base text-slate-600 font-medium">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Process Accordion */}
              {counselingProcess && counselingProcess.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
                  <button 
                    onClick={() => setProcessOpen(!processOpen)}
                    className="w-full flex items-center justify-between p-5 md:p-6 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg md:text-xl font-black text-slate-900">Counselling Process</h3>
                    </div>
                    <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", processOpen && "rotate-180")} />
                  </button>
                  
                  <AnimatePresence>
                    {processOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 md:p-6 pt-0 border-t border-slate-100">
                          <div className="mt-4 space-y-4">
                            {counselingProcess.map((step, index) => (
                              <div key={index} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black shrink-0 text-sm">
                                  {index + 1}
                                </div>
                                <span className="text-slate-700 font-bold text-sm md:text-base">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

            </div>
          </section>
        )}
        
        {/* Medical Colleges Section */}
        {colleges && colleges.length > 0 && (
          <section id="colleges" className="py-8 md:py-16 bg-white relative">
            <div className="container-custom px-4">
              <div className="text-center mb-8 md:mb-12">
                <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
                  Top Medical Colleges in <span className="text-blue-600">{stateName}</span>
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {colleges.map((college, index) => (
                  <div key={index} className="p-5 md:p-6 bg-slate-50 rounded-2xl md:rounded-[2rem] border border-slate-200 hover:shadow-lg transition-shadow flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4 gap-2">
                      <div>
                        <h3 className="text-lg md:text-xl font-black text-slate-900 leading-tight mb-2 uppercase tracking-tight">{college.name}</h3>
                        <div className="flex items-center text-slate-500 text-[11px] md:text-xs font-bold uppercase tracking-widest">
                          <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1 text-blue-500" />
                          {college.location}
                        </div>
                      </div>
                      <span className={cn(
                        "text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shrink-0",
                        college.type === "Government" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                      )}>
                        {college.type}
                      </span>
                    </div>
                    
                    <p className="text-slate-600 text-sm font-medium leading-relaxed mb-4 flex-grow">"{college.description}"</p>
                    
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Calendar className="w-3 h-3 mr-1.5" />
                        Est: {college.established}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default StateTemplate;
