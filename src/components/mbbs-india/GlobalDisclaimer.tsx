import React from "react";
import { mbbsData } from "@/data/mbbs-india";
import type { MbbsContent } from '@/lib/pageContent';
import { ShieldAlert } from "lucide-react";

export const GlobalDisclaimer = ({ data = mbbsData }: { data?: MbbsContent } = {}) => {
  return (
    <section className="py-4 bg-slate-50 border-t border-slate-100">
      <div className="container-custom">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
            <span className="font-black uppercase tracking-tighter mr-1">Official Guidance:</span>
            {data.globalDisclaimer}
          </p>
        </div>
      </div>
    </section>
  );
};
