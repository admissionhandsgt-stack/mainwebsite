import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, Shield } from 'lucide-react';
import TermsOfService from '@/components/terms/TermsOfService';
import PrivacyPolicy from '@/components/terms/PrivacyPolicy';

const Terms = () => {
  const currentDate = "April 30, 2025";

  return (
    <div className="flex flex-col flex-grow bg-slate-50">
      <div className="flex-grow">
        <section className="relative pt-8 md:pt-16 pb-12 md:pb-20 overflow-hidden bg-gradient-to-b from-blue-50 to-white">
          <div className="container-custom relative">
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-slate-900 leading-tight tracking-tighter mb-4 md:mb-6">
                Legal <span className="gradient-text">Information</span>
              </h1>
              <p className="text-slate-600 text-base md:text-xl font-medium leading-relaxed">
                Our terms of service and privacy policies are designed to be transparent and protect your interests.
              </p>
            </div>
          </div>
        </section>

        <div className="container-custom -mt-6 md:-mt-10 mb-12 md:mb-24 relative z-10">
          <div className="glass-white p-4 sm:p-8 md:p-16 rounded-2xl md:rounded-[3.5rem] shadow-2xl border border-slate-100">
            <Tabs defaultValue="terms" className="w-full">
              <div className="flex justify-center mb-8 md:mb-16">
                <TabsList className="bg-slate-100 p-1.5 md:p-2 rounded-xl md:rounded-[2rem] h-auto flex w-full sm:w-auto">
                  <TabsTrigger value="terms" className="flex-1 sm:flex-none px-2 py-2.5 md:px-8 md:py-4 rounded-lg md:rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg font-black uppercase text-[9px] md:text-xs tracking-widest transition-all">
                    <FileCheck className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" /> Terms
                  </TabsTrigger>
                  <TabsTrigger value="privacy" className="flex-1 sm:flex-none px-2 py-2.5 md:px-8 md:py-4 rounded-lg md:rounded-[1.5rem] data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg font-black uppercase text-[9px] md:text-xs tracking-widest transition-all">
                    <Shield className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" /> Privacy
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="prose prose-slate max-w-none">
                <TabsContent value="terms" className="mt-0 focus-visible:outline-none">
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <TermsOfService currentDate={currentDate} />
                  </div>
                </TabsContent>

                <TabsContent value="privacy" className="mt-0 focus-visible:outline-none">
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <PrivacyPolicy currentDate={currentDate} />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
