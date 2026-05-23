import React from "react";
import { mbbsData } from "@/data/mbbs-india";
import { ShieldAlert } from "lucide-react";

export const GlobalDisclaimer = () => {
  return (
    <section className="py-4 bg-slate-50 border-t border-slate-100">
      <div className="container-custom">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[9px] text-slate-400 font-medium leading-relaxed opacity-60">
            <span className="font-black uppercase tracking-tighter mr-1">Official Guidance:</span>
            {mbbsData.globalDisclaimer}
          </p>
        </div>
      </div>
    </section>
  );
};
