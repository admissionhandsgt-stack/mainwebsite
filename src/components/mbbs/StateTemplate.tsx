"use client";

import React, { useState, useEffect } from 'react';
import SEO from '@/components/SEO';
import { MapPin, GraduationCap, Building, FileText, Users, Calendar, Phone, Mail, ExternalLink, ShieldCheck, ChevronDown, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCTA } from '@/hooks/useCTA';
import { CollegeCard } from '@/components/ui/CollegeCard';

interface StateTemplateProps {
  stateName: string;
}

const stateColorMap: Record<string, string> = {
  "Karnataka": "from-teal-50 to-emerald-50",
  "Maharashtra": "from-cyan-50 to-teal-50",
  "Uttar Pradesh": "from-amber-50 to-orange-50",
  "Rajasthan": "from-red-50 to-rose-50"
};

/** The state row as this component consumes it, after the API is mapped back. */
interface StateRow {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  colleges_count: number | null;
  content: string | null;
}

const StateTemplate: React.FC<StateTemplateProps> = ({ stateName }) => {
  const [stateData, setStateData] = useState<StateRow | null>(null);
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
        const [statesJson, collegesJson] = await Promise.all([
          fetch('/api/content/states').then((r) => (r.ok ? r.json() : { data: [] })),
          fetch('/api/content/colleges-ug').then((r) => (r.ok ? r.json() : { data: [] })),
        ]);

        const match = (statesJson.data ?? []).find(
          (st: { name: string }) => st.name === stateName,
        );
        const collegesRes = {
          data: (collegesJson.data ?? [])
            .filter((c: { state: string | null }) => c.state === stateName)
            .map((c: Record<string, unknown>) => ({
              ...c,
              college_name: c.collegeName,
              college_type: c.collegeType,
              university_name: c.universityName,
              established_year: c.establishedYear,
              image_url: c.imageUrl,
              image_attribution: c.imageAttribution,
              image_license: c.imageLicense,
              nri_seats: c.nriSeats,
              has_nri_seats: c.hasNriSeats,
              is_women_only: c.isWomenOnly,
            })),
        };
        const stateRes = {
          data: match ? { ...match, image_url: match.imageUrl, colleges_count: match.collegesCount } : null,
          error: match ? null : new Error('not found'),
        };

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
            type: c.college_type === 'Government' ? 'Government' : 'Private',
            location: c.city || '',
            state: c.state,
            established: c.established_year?.toString() || 'N/A',
            description: c.university_name || '',
            imageUrl: c.image_url,
            imageAttribution: c.image_attribution,
            imageLicense: c.image_license,
            intake: c.intake
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
            <a key={s.id} href={`#${s.id}`} className="whitespace-nowrap px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-cyan-600 hover:text-white transition-colors">
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
                className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[13px] md:text-xs font-black tracking-widest uppercase mb-6"
              >
                <MapPin className="w-3 h-3 md:w-4 md:h-4" /> State Wise MBBS
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-3xl sm:text-5xl md:text-7xl font-black text-white leading-tight tracking-tighter mb-4"
              >
                Study MBBS in <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">{stateName}</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-cyan-100/70 text-sm md:text-xl font-medium leading-relaxed mb-8"
              >
                Your complete roadmap to securing a medical seat in the prestigious institutions of {stateName}. We provide expert counseling and end-to-end admission support.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-4"
              >
                <button onClick={CTA.call} className="inline-flex justify-center items-center gap-2 bg-cyan-600 text-white px-4 py-2.5 sm:px-6 sm:py-3.5 md:px-10 md:py-5 rounded-full font-black text-xs sm:text-sm md:text-lg hover:bg-cyan-500 transition-all shadow-xl shadow-cyan-600/30 w-full sm:w-auto">
                  <Phone className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> Get Expert Guidance
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
                State <span className="text-cyan-600">Key Facts</span>
              </h2>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {[
                  { label: "Total Colleges", value: facts.totalColleges, icon: Building },
                  { label: "State Type", value: facts.stateType, icon: ShieldCheck },
                  { label: "Govt Seats", value: facts.govtSeats, icon: Users },
                  { label: "Private Seats", value: facts.privateSeats, icon: Users }
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-100 p-4 md:p-6 rounded-2xl flex flex-col items-center text-center">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-cyan-100 text-cyan-600 rounded-xl flex items-center justify-center mb-3">
                      <item.icon className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <p className="text-[13px] md:text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{item.label}</p>
                    <p className="text-lg md:text-2xl font-black text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>

              {facts.counsellingAuthority && (
                <div className="mt-4 md:mt-6 bg-cyan-50 border border-cyan-100 p-4 md:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 md:w-8 md:h-8 text-cyan-600 shrink-0" />
                    <div>
                      <p className="text-[13px] md:text-xs font-black uppercase tracking-widest text-cyan-500 mb-1">Counselling Authority</p>
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
                      <div className="w-10 h-10 bg-cyan-100 text-cyan-600 rounded-xl flex items-center justify-center shrink-0">
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
                                <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-black shrink-0 text-sm">
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
                  Top Medical Colleges in <span className="text-cyan-600">{stateName}</span>
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {colleges.map((college, index) => (
                  <CollegeCard
                    key={index}
                    collegeName={college.name}
                    city={college.location}
                    state={college.state}
                    collegeType={college.type}
                    description={null}
                    imageUrl={college.imageUrl}
                    imageAttribution={college.imageAttribution}
                    imageLicense={college.imageLicense}
                    yearEstablished={college.established !== 'N/A' ? parseInt(college.established) : null}
                    universityBody={college.description}
                    seats={college.intake}
                  />
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
