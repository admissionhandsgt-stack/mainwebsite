"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Search, Building2, Award, MapPin, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const govtColleges = [
  { name: "AIIMS New Delhi", location: "New Delhi", seats: 107, badge: "Top Ranked" },
  { name: "Maulana Azad Medical College", location: "New Delhi", seats: 250, badge: "Govt" },
  { name: "Grant Medical College", location: "Mumbai", seats: 250, badge: "Govt" },
];

const deemedColleges = [
  { name: "Kasturba Medical College", location: "Manipal, Karnataka", seats: 250, badge: "Deemed" },
  { name: "SRM Medical College", location: "Chennai, Tamil Nadu", seats: 250, badge: "Deemed" },
  { name: "DY Patil Medical College", location: "Pune, Maharashtra", seats: 250, badge: "Deemed" },
];

const CollegeCard = ({ college, index }: { college: typeof govtColleges[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.08 }}
    className="group flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all cursor-pointer"
  >
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-teal-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
      <Building2 size={24} className="text-blue-600" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-base font-black text-slate-900 truncate group-hover:text-blue-700 transition-colors leading-tight">{college.name}</h4>
      <div className="flex items-center gap-3 mt-1.5">
        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider"><MapPin size={12} className="text-blue-500" /> {college.location}</span>
        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider"><Users size={12} className="text-blue-500" /> {college.seats} seats</span>
      </div>
    </div>
    <span className="text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 shrink-0 border border-blue-100 hidden sm:block">{college.badge}</span>
  </motion.div>
);

const CollegeExplorer = () => {
  return (
    <section className="compact-padding bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      <div className="container-custom">
        <div className="text-center mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-responsive-h2 text-slate-900 mb-4"
          >
            Explore Top <span className="text-blue-600">Medical Colleges</span>
          </motion.h2>
          <p className="text-responsive-body text-slate-600 max-w-2xl mx-auto mb-8 font-medium">
            Browse through India&apos;s finest medical institutions. Find the right college based on your rank, budget, and career goals.
          </p>

          {/* Search Bar (UI only) */}
          <div className="max-w-xl mx-auto relative px-2 sm:px-0">
            <div className="absolute inset-y-0 left-6 flex items-center">
              <Search size={22} className="text-blue-500" />
            </div>
            <input
              type="text"
              placeholder="Search colleges, states, or categories..."
              className="w-full pl-12 md:pl-14 pr-6 py-4 md:py-5 rounded-2xl md:rounded-[2rem] bg-white border-2 border-slate-100 shadow-xl shadow-blue-900/5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 text-sm md:text-base font-medium"
              readOnly
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Government Colleges */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                <Award size={24} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Government Colleges</h3>
            </div>
            <div className="space-y-4">
              {govtColleges.map((college, i) => (
                <CollegeCard key={i} college={college} index={i} />
              ))}
            </div>
          </div>

          {/* Deemed Colleges */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                <Building2 size={24} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Deemed Colleges</h3>
            </div>
            <div className="space-y-4">
              {deemedColleges.map((college, i) => (
                <CollegeCard key={i} college={college} index={i} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link href="/mbbs-india">
            <Button size="lg" className="rounded-xl md:rounded-2xl px-8 md:px-12 py-5 md:py-7 text-sm md:text-lg font-black bg-slate-900 hover:bg-blue-600 shadow-2xl shadow-blue-200 transition-all active:scale-95">
              Explore All Colleges <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CollegeExplorer;
