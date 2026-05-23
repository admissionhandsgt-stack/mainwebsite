"use client";

import React, { useState, useMemo } from "react";
import { MapPin, Search, Building2, ChevronDown, GraduationCap, Users, Landmark } from "lucide-react";
import { useCTA } from "@/hooks/useCTA";

type CollegeType = "govt" | "private";
interface College { name: string; city: string; type: CollegeType; }
interface StateData { name: string; slug: string; govtColleges: number; privateColleges: number; colleges: College[]; }

export default function CollegesPageClient({ states }: { states: StateData[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CollegeType>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const CTA = useCTA();

  const totals = useMemo(() => {
    let g = 0, p = 0;
    states.forEach((s) => { g += s.govtColleges; p += s.privateColleges; });
    return { govt: g, priv: p, total: g + p, states: states.length };
  }, [states]);

  const filtered = useMemo(() => {
    return states
      .map((s) => ({
        ...s,
        colleges: s.colleges.filter((c) => {
          const ms = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase());
          const mt = typeFilter === "all" || c.type === typeFilter;
          return ms && mt;
        }),
      }))
      .filter((s) => s.colleges.length > 0);
  }, [states, search, typeFilter]);

  const toggle = (slug: string) => setExpanded(expanded === slug ? null : slug);

  return (
    <div className="pb-16">
      {/* Stats */}
      <section className="bg-white border-b border-slate-100">
        <div className="container-custom px-4 py-8 md:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {[
              { label: "Total Colleges", value: totals.total.toLocaleString(), icon: Building2, color: "bg-blue-100 text-blue-600" },
              { label: "Government", value: totals.govt.toLocaleString(), icon: Landmark, color: "bg-emerald-100 text-emerald-600" },
              { label: "Private", value: totals.priv.toLocaleString(), icon: GraduationCap, color: "bg-purple-100 text-purple-600" },
              { label: "States & UTs", value: totals.states.toString(), icon: Users, color: "bg-amber-100 text-amber-600" },
            ].map((s, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 md:p-6 flex flex-col items-center text-center">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>
                  <s.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                <p className="text-xl md:text-3xl font-black text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search + Filter */}
      <section className="bg-white sticky top-[72px] z-30 border-b border-slate-100 shadow-sm">
        <div className="container-custom px-4 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search college or city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "govt", "private"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    typeFilter === t
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {t === "all" ? "All" : t === "govt" ? "Govt" : "Private"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* State Accordion */}
      <section className="bg-slate-50">
        <div className="container-custom px-4 py-8 md:py-12">
          <h2 className="text-xl md:text-3xl font-black text-slate-900 mb-6 tracking-tight">
            State-wise <span className="text-blue-600">Medical Colleges</span>
          </h2>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400 font-bold">No colleges found matching your criteria.</div>
          )}
          <div className="space-y-2">
            {filtered.map((state) => {
              const isOpen = expanded === state.slug;
              const govtCount = state.colleges.filter((c) => c.type === "govt").length;
              const privCount = state.colleges.filter((c) => c.type === "private").length;
              return (
                <div key={state.slug} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggle(state.slug)}
                    className="w-full flex items-center justify-between p-4 md:p-5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm md:text-base font-black text-slate-900 truncate">{state.name}</h3>
                        <div className="flex gap-3 mt-0.5">
                          <span className="text-[10px] md:text-xs font-bold text-emerald-600">{govtCount} Govt</span>
                          <span className="text-[10px] md:text-xs font-bold text-purple-600">{privCount} Private</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:block text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {state.colleges.length} colleges
                      </span>
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 p-3 md:p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                        {state.colleges.map((college, ci) => (
                          <div
                            key={ci}
                            className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all"
                          >
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${college.type === "govt" ? "bg-emerald-500" : "bg-purple-500"}`} />
                            <div className="min-w-0">
                              <p className="text-xs md:text-sm font-bold text-slate-800 leading-snug">{college.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold text-slate-400">{college.city}</span>
                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  college.type === "govt" ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"
                                }`}>
                                  {college.type === "govt" ? "Govt" : "Private"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-12 md:py-20">
        <div className="container-custom px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-black text-white mb-4 tracking-tight">
            Need Help Choosing the <span className="text-blue-400">Right College?</span>
          </h2>
          <p className="text-blue-100/60 text-sm md:text-lg font-medium mb-8 max-w-2xl mx-auto">
            Our expert counselors can guide you through NEET admissions, college selection, and the complete counselling process.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={CTA.call}
              className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm md:text-base hover:bg-blue-50 transition-all shadow-xl"
            >
              Get Expert Guidance
            </button>
            <button
              onClick={() => CTA.whatsapp("Hi, I need help choosing an MBBS college")}
              className="inline-flex items-center justify-center gap-2 border-2 border-white text-white px-8 py-4 rounded-2xl font-black text-sm md:text-base hover:bg-white/10 transition-all"
            >
              WhatsApp Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
