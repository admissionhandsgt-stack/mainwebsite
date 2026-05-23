
import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const NRIEligibility = () => {
  return (
    <section id="eligibility" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-50/50 -z-10" />
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            NRI Quota <span className="gradient-text">Eligibility</span> Criteria
          </h2>
          <p className="text-slate-600 text-lg leading-relaxed font-medium">
            Understanding who qualifies for NRI quota seats is crucial for a successful application process.
          </p>
        </div>

        <Tabs defaultValue="nri" className="max-w-5xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1.5 glass-white rounded-2xl border border-white/40 shadow-sm">
            <TabsTrigger value="nri" className="rounded-xl py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold">NRI</TabsTrigger>
            <TabsTrigger value="nri-sponsored" className="rounded-xl py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold">NRI Sponsored</TabsTrigger>
            <TabsTrigger value="oci-pio" className="rounded-xl py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold">OCI/PIO</TabsTrigger>
            <TabsTrigger value="foreign" className="rounded-xl py-3 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all font-bold">Foreign Nationals</TabsTrigger>
          </TabsList>
          
          <TabsContent value="nri" className="mt-8 p-8 md:p-12 glass-white rounded-[2.5rem] shadow-xl border border-white/60 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-grow">
                <h3 className="text-2xl font-black mb-4 text-slate-900 tracking-tight">Non-Resident Indians (NRI)</h3>
                <p className="mb-6 text-slate-700 text-lg leading-relaxed font-medium">
                  An Indian citizen who is ordinarily residing outside India and holds an Indian Passport.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  {[
                    "Must hold an Indian passport",
                    "Should be ordinarily residing outside India",
                    "NEET qualification (for most colleges)",
                    "Must have completed 10+2 with PCB"
                  ].map((text, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-4 bg-white/40 rounded-2xl border border-white/40 group hover:border-blue-500/30 transition-colors">
                      <CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0" />
                      <p className="font-bold text-slate-800">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-72 bg-blue-600 text-white p-8 rounded-[2rem] shadow-xl shadow-blue-900/20">
                <h4 className="font-black text-xl mb-4">Documentation</h4>
                <p className="text-blue-50 leading-relaxed font-medium">NRI status certificate, passport copies, visa stamps, bank statements showing foreign transactions.</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="nri-sponsored" className="mt-8 p-8 md:p-12 glass-white rounded-[2.5rem] shadow-xl border border-white/60 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-grow">
                <h3 className="text-2xl font-black mb-4 text-slate-900 tracking-tight">NRI Sponsored Candidates</h3>
                <p className="mb-6 text-slate-700 text-lg leading-relaxed font-medium">
                  Indian nationals who are sponsored by an NRI relative (blood relations only).
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  {[
                    "Student must be an Indian national",
                    "Must have a clear blood relation",
                    "NEET qualification required",
                  ].map((text, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-4 bg-white/40 rounded-2xl border border-white/40 group hover:border-blue-500/30 transition-colors">
                      <CheckCircle className="h-6 w-6 text-teal-600 flex-shrink-0" />
                      <p className="font-bold text-slate-800">{text}</p>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 p-4 bg-red-50/50 rounded-2xl border border-red-100 group">
                    <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                    <p className="font-bold text-slate-800">Distant relatives or friends typicaly not acceptable</p>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-72 bg-teal-600 text-white p-8 rounded-[2rem] shadow-xl shadow-teal-900/20">
                <h4 className="font-black text-xl mb-4">Documentation</h4>
                <p className="text-teal-50 leading-relaxed font-medium">Sponsor's NRI proof, affidavit of relation, sponsorship letter, NEET scorecard.</p>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="oci-pio" className="mt-8 p-8 md:p-12 glass-white rounded-[2.5rem] shadow-xl border border-white/60 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-2xl font-black mb-4 text-slate-900 tracking-tight">OCI/PIO Card Holders</h3>
            <p className="mb-4 text-slate-700 text-lg">
              Overseas Citizen of India (OCI) or Person of Indian Origin (PIO) card holders.
            </p>
            <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-blue-900 font-medium">
                Required documents: OCI/PIO card, foreign passport, 10+2 mark sheets, NEET score card (if applicable)
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="foreign" className="mt-8 p-8 md:p-12 glass-white rounded-[2.5rem] shadow-xl border border-white/60 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-2xl font-black mb-4 text-slate-900 tracking-tight">Foreign Nationals</h3>
            <p className="mb-4 text-slate-700 text-lg">
              Non-Indian citizens who wish to study medicine in India.
            </p>
            <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-blue-900 font-medium">
                Required documents: Foreign passport, visa, 10+2 equivalent mark sheets, NEET score card (if applicable)
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-16 glass-white p-8 md:p-12 rounded-[2.5rem] max-w-5xl mx-auto shadow-xl border border-white/60">
          <h3 className="text-2xl font-black mb-8 text-slate-900 tracking-tight">General Academic Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ul className="space-y-4">
              {[
                "Min 50% marks in PCB in 10+2",
                "Qualified NEET-UG score",
                "Age between 17-25 years",
                "English language proficiency"
              ].map((item, idx) => (
                <li key={idx} className="flex items-center gap-4 group">
                  <div className="w-2 h-2 rounded-full bg-blue-600 ring-4 ring-blue-50" />
                  <span className="text-lg text-slate-700 font-bold">{item}</span>
                </li>
              ))}
            </ul>
            <div className="p-6 bg-slate-900 rounded-3xl text-white shadow-2xl">
              <p className="text-blue-100/70 font-medium leading-relaxed italic">
                Eligibility varies by state and institution. Contact our NRI desk for a personalized profile assessment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NRIEligibility;
