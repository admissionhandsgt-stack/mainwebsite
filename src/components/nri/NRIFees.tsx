import React from 'react';
import { Info } from 'lucide-react';

const NRIFees = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-50/50 -z-10" />
      <div className="container-custom">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
            NRI Quota <span className="gradient-text">Fee</span> Structure
          </h2>
          <p className="text-slate-600 text-lg font-medium leading-relaxed">
            Understanding the investment required for securing an MBBS seat through NRI quota.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-20">
          {[
            { 
              title: "Government Colleges", 
              type: "NRI Quota Seats", 
              tuition: "₹15-25 Lakhs", 
              hostel: "₹1-2 Lakhs", 
              dev: "₹50K-1 Lakh", 
              total: "₹85-1.35 Cr.", 
              color: "bg-blue-600",
              note: "Regulated by respective state authorities."
            },
            { 
              title: "Private Colleges", 
              type: "NRI Quota Seats", 
              tuition: "₹20-30 Lakhs", 
              hostel: "₹1.5-3 Lakhs", 
              dev: "₹1-2 Lakhs", 
              total: "₹1.1-1.7 Cr.", 
              color: "bg-teal-600",
              note: "Fees vary based on location and reputation."
            },
            { 
              title: "Deemed Universities", 
              type: "NRI/Management", 
              tuition: "₹25-40 Lakhs", 
              hostel: "₹2-3.5 Lakhs", 
              dev: "₹2-5 Lakhs", 
              total: "₹1.5-2.3 Cr.", 
              color: "bg-indigo-600",
              note: "May have additional one-time admission fees."
            }
          ].map((card, idx) => (
            <div key={idx} className="glass-white rounded-[2.5rem] overflow-hidden border border-white/60 shadow-xl hover:shadow-2xl transition-all group hover:-translate-y-2">
              <div className={`${card.color} p-8 text-white`}>
                <h3 className="text-2xl font-black tracking-tight">{card.title}</h3>
                <p className="text-white/70 font-bold uppercase tracking-widest text-xs mt-1">{card.type}</p>
              </div>
              
              <div className="p-8 space-y-6">
                {[
                  { label: "Annual Tuition Fee", value: card.tuition, bold: true },
                  { label: "Hostel & Mess", value: `${card.hostel} / yr`, bold: false },
                  { label: "Development Fee", value: card.dev, bold: false }
                ].map((row, rIdx) => (
                  <div key={rIdx} className="flex justify-between items-center pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <span className="text-slate-500 font-medium">{row.label}</span>
                    <span className={`text-slate-900 ${row.bold ? 'text-xl font-black' : 'font-bold'}`}>{row.value}</span>
                  </div>
                ))}
                
                <div className="pt-4 mt-2">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-slate-900 font-bold">Total (Approx.)</span>
                    <span className={`text-2xl font-black ${card.color.replace('bg-', 'text-')}`}>{card.total}</span>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl flex gap-3 border border-slate-100">
                    <Info className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {card.note}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-white p-10 md:p-16 rounded-[3rem] max-w-5xl mx-auto border border-white/60 shadow-xl">
          <h3 className="text-3xl font-black mb-12 text-slate-900 tracking-tight text-center">Important Fee Considerations</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {[
              { 
                title: "Currency Fluctuations", 
                desc: "Many Institutions charge NRI quota fees in USD or other currencies. Exchange rate fluctuations can significantly impact the final amount." 
              },
              { 
                title: "Payment Schedule", 
                desc: "Most institutions require a significant portion of the fees, or even the entire annual fee, upfront at the time of admission." 
              },
              { 
                title: "Additional Costs", 
                desc: "Beyond tuition and hostel, budget for books, equipment, uniform, and exam fees, which can add up to ₹1-2 Lakhs per year." 
              },
              { 
                title: "Fee Increments", 
                desc: "Most institutions increase their fees by 5-10% annually. Factor this into your long-term financial planning." 
              }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-5 group">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-600 group-hover:text-white transition-colors">
                    <path d="M12 9V13M12 17H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 mb-2">{item.title}</h4>
                  <p className="text-slate-600 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NRIFees;
