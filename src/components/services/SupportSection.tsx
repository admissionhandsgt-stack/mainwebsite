
import React from 'react';
import { Shield, Search, DollarSign, FileText, BarChart2, Layers } from 'lucide-react';

const SupportSection = () => {
  const supportItems = [
    {
      icon: <Search className="h-5 w-5 text-medical-500" />,
      title: "College Profiling",
      description: "We assess both clinical and non-clinical aspects such as patient inflow, hospital infrastructure, academic quality, faculty, and internship exposure — helping you identify colleges that match your career goals."
    },
    {
      icon: <DollarSign className="h-5 w-5 text-teal-500" />,
      title: "Transparent Budget Planning",
      description: "We ensure realistic planning by clearly explaining hidden costs, government fees, and management quota expectations — allowing your family to prepare confidently."
    },
    {
      icon: <FileText className="h-5 w-5 text-medical-500" />,
      title: "Multi-State Counseling Expertise",
      description: "Our experts break down the counseling processes of various states, including AIQ, state quotas, private and deemed universities, management and NRI seats — removing confusion and uncertainty."
    },
    {
      icon: <BarChart2 className="h-5 w-5 text-teal-500" />,
      title: "Scientific Cutoff Analysis",
      description: "We use real data to analyze previous year cutoffs and apply predictive insights based on NEET trends to help you make the smartest choices during counseling."
    },
    {
      icon: <Layers className="h-5 w-5 text-medical-500" />,
      title: "Strategic Admission Planning",
      description: "Every student receives a customized step-by-step roadmap to avoid missed deadlines and impulsive decisions, ensuring a smooth journey from NEET result to final admission."
    }
  ];

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg ring-4 ring-blue-50">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <span>How <span className="gradient-text">Admission Hands</span> Supports You</span>
        </h2>
        
        <div className="space-y-6 mt-6">
          {supportItems.map((item, index) => (
            <div key={index} className="flex items-start gap-6 group p-4 rounded-2xl transition-all duration-300 hover:bg-slate-50">
              <div className="p-4 bg-white shadow-md rounded-2xl group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 border border-slate-100 shrink-0">
                {item.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1.5 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed text-base">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 text-white p-8 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-700" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-600/20 blur-3xl rounded-full -translate-x-10 translate-y-10 group-hover:scale-150 transition-transform duration-700" />
        <h3 className="text-2xl font-bold mb-4 relative z-10">Beyond Admission: <span className="bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">Building Futures</span></h3>
        <p className="text-blue-100/80 mb-4 text-lg leading-relaxed relative z-10">At Admission Hands, it's not just about securing any seat. It's about helping you secure the right seat at the right institution — one that aligns with your profile, your ambition, and your future in healthcare.</p>
        <p className="text-white font-semibold text-lg relative z-10 px-4 border-l-4 border-blue-500 py-1 bg-white/5">We're not here to just "get you admitted." We're here to help you make a life-changing decision with clarity, confidence, and care.</p>
      </div>
    </div>
  );
};

export default SupportSection;
