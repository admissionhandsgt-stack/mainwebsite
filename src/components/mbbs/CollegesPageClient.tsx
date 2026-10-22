"use client";

import Link from "@/components/ui/Link";
import React, { useState, useEffect, useMemo } from "react";
import {
  Search, Building2, Landmark, GraduationCap, MapPin, ChevronDown,
  Calendar, Users, ChevronRight, Phone, ArrowRight,
  BookOpen, ClipboardCheck, Sparkles, X, ShieldCheck, Award, TrendingUp, LayoutGrid, List
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCTA } from "@/hooks/useCTA";
import Image from "next/image";
import { CollegeCard } from "@/components/ui/CollegeCard";
import PhotoCredit from "@/components/ui/PhotoCredit";

/* --- Types --- */

/** "unknown" is a real answer here: the UG import never carried ownership,
 *  and guessing produced a PRIVATE badge on government colleges. */
type CollegeType = "govt" | "private" | "unknown";

import {
  useRankLens,
  RankLensBar,
  BAND_CHIP,
  BAND_ORDER as LENS_BAND_ORDER,
  type Band,
} from "@/components/colleges/RankLens";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

interface CollegeItem {
  slug?: string;
  name: string;
  city: string;
  state: string;
  type: CollegeType;
  intake?: number | null;
  establishedYear?: number | null;
  universityName: string;
  imageUrl?: string | null;
  /**
   * The credit, which has to reach the card.
   *
   * `slug` was declared here once and never copied in the memo below, so every
   * college name rendered as plain text and all 1,727 per-college pages were
   * unreachable from the listing that exists to reach them. A field declared
   * and not copied is the shape of that bug, so these are copied too.
   */
  imageAttribution?: string | null;
  imageLicense?: string | null;
  displayOrder?: number | null;
}

interface StateData {
  name: string;
  slug: string;
  govtColleges: number;
  privateColleges: number;
  colleges: Array<{
    slug?: string;
    name: string;
    city: string;
    type: CollegeType;
    intake?: number | null;
    establishedYear?: number | null;
    universityName?: string;
    imageUrl?: string | null;
    imageAttribution?: string | null;
    imageLicense?: string | null;
    displayOrder?: number | null;
  }>;
}

/* --- Constants --- */

const ITEMS_PER_PAGE = 12;

const UNIVERSITY_MAP: Record<string, string> = {
  rguhs: "Rajiv Gandhi University of Health Sciences",
  muhs: "Maharashtra University of Health Sciences",
  kuhs: "Kerala University of Health Sciences",
  ruhs: "Rajasthan University of Health Sciences",
  kgmu: "King George's Medical University",
  mahe: "Manipal Academy of Higher Education",
  du: "Delhi University",
  knruhs: "Kaloji Narayana Rao University of Health Sciences",
  ntruhs: "NTR University of Health Sciences",
  ysruhs: "Dr. YSR University of Health Sciences",
  abvmu: "Atal Bihari Vajpayee Medical University",
  bfuhs: "Baba Farid University of Health Sciences",
  wbuhs: "West Bengal University of Health Sciences",
  uhsr: "Pt. B.D. Sharma University of Health Sciences",
  buhs: "Bihar University of Health Sciences",
  ouhs: "The Orissa University Of Health Sciences",
  tnmgrmu: "The Tamilnadu Dr. MGR Medical University",
  ssuhs: "Srimanta Sankaradeva University of Health Sciences",
};

function getFullUniversityName(name: string): string {
  if (!name) return "Affiliated University";
  
  let clean = name.trim();
  const lower = clean.toLowerCase();
  
  // Direct match
  if (UNIVERSITY_MAP[lower]) return UNIVERSITY_MAP[lower];
  
  // Case-insensitive replacement for well-known short forms
  for (const [short, full] of Object.entries(UNIVERSITY_MAP)) {
    const regex = new RegExp(`\\b${short}\\b`, 'gi');
    if (regex.test(clean)) {
      clean = clean.replace(regex, full);
    }
  }
  
  // Clean up excessive spaces or commas
  return clean.replace(/\s+/g, ' ').trim();
}

/* --- Animations --- */

const smoothEase = [0.25, 0.46, 0.45, 0.94];

const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay, ease: smoothEase },
  },
});

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.04 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: smoothEase },
  },
};

/**
 * A backdrop and, where it is somebody else's photograph, its credit.
 *
 * Four campuses rotate here and three of the four are CC BY-SA, which requires
 * the photographer to be named wherever the picture appears. The credit has to
 * follow the picture rather than sit under the first one, so it is carried with
 * each shot and swapped with it. Same shape as the deemed page's rotator.
 */
export interface HeroShot {
  src: string;
  subject?: string | null;
  credit?: string | null;
  license?: string | null;
}

interface HeroImageRotatorProps {
  images: HeroShot[];
}

function HeroImageRotator({ images }: HeroImageRotatorProps) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % images.length), 5000);
    return () => clearInterval(t);
  }, [images]);

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-border bg-surface-3 shadow-lift">
      {images.map((shot, i) => (
        <div
          key={i}
          className="pointer-events-none absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms]"
          style={{
            backgroundImage: `url(${shot.src})`,
            opacity: i === current ? 1 : 0,
          }}
          aria-hidden="true"
        />
      ))}
      <PhotoCredit
        subject={images[current]?.subject}
        attribution={images[current]?.credit}
        license={images[current]?.license}
        tone="chip"
        className="absolute right-2.5 top-2.5"
      />
    </div>
  );
}

/** Live fee figures from the server (lib/liveFigures.ts) — the page used to type its own. */
export interface DirectoryFigures {
  govtFee: string;
  privateFee: string;
  privateFeeMedian: string;
}

export default function CollegesPageClient({
  states,
  heroImages,
  figures,
}: {
  states: StateData[];
  heroImages?: HeroShot[];
  figures?: DirectoryFigures;
}) {
  const govtFee = figures?.govtFee ?? "a few thousand rupees to about ₹1 lakh";
  const privateFee = figures?.privateFee ?? "several lakh";
  const CTA = useCTA();
  
  // No CMS rows, no backdrop. The fallback list shipped here was five
  // AI-generated campuses, three of them signed with a real institution's name
  // — including AIIMS New Delhi — rotating behind a page that lists 1,727
  // other colleges.
  const finalHeroImages: HeroShot[] = heroImages ?? [];

  /* --- State --- */
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedType, setSelectedType] = useState<"all" | CollegeType>("all");
  const [layoutView, setLayoutView] = useState<"list" | "grid">("list");
  const [activeTab, setActiveTab] = useState<"education" | "process" | "comparison">("education");
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  /* The rank lens. Without a rank this is an ordinary directory; with one,
     every card carries a band and the list can be cut to what is reachable. */
  const lens = useRankLens("ug");
  const [bandFilter, setBandFilter] = useState<Band | null>(null);

  /* Reset page on filter change */
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedState, selectedType]);

  /* --- Flatten colleges from states --- */
  const allColleges = useMemo(() => {
    const list: CollegeItem[] = [];
    states.forEach((s) => {
      s.colleges.forEach((c) => {
        list.push({
          slug: c.slug,
          name: c.name,
          city: c.city,
          state: s.name,
          type: c.type,
          intake: c.intake,
          establishedYear: c.establishedYear,
          universityName: c.universityName || "",
          imageUrl: c.imageUrl,
          imageAttribution: c.imageAttribution,
          imageLicense: c.imageLicense,
          displayOrder: c.displayOrder,
        });
      });
    });
    return list;
  }, [states]);

  /* --- Live stats --- */
  const liveStats = useMemo(() => {
    let g = 0,
      p = 0;
    const distinctStates = new Set<string>();
    allColleges.forEach((c) => {
      distinctStates.add(c.state);
      if (c.type === "govt") g++;
      else p++;
    });
    return { govt: g, private: p, total: g + p, states: distinctStates.size };
  }, [allColleges]);

  /* --- Unique states for dropdown --- */
  const uniqueStatesList = useMemo(() => {
    const list = new Set<string>();
    allColleges.forEach((c) => list.add(c.state));
    return Array.from(list).sort();
  }, [allColleges]);

  /* --- Filter logic --- */
  const filteredColleges = useMemo(() => {
    const out = allColleges.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q);
      const matchState = selectedState === "all" || c.state === selectedState;
      const matchType = selectedType === "all" || c.type === selectedType;
      const matchBand = !bandFilter || lens.bandOf(c.slug) === bandFilter;
      return matchSearch && matchState && matchType && matchBand;
    });

    // With a rank in hand, "safe first" is the only order that makes sense —
    // alphabetical buries the colleges the visitor can actually get into.
    if (lens.rank) {
      const weight = (c: CollegeItem) => {
        const b = lens.bandOf(c.slug);
        return b ? LENS_BAND_ORDER.indexOf(b) : LENS_BAND_ORDER.length;
      };
      out.sort((a, b) => weight(a) - weight(b) || a.name.localeCompare(b.name));
    }
    return out;
  }, [allColleges, search, selectedState, selectedType, bandFilter, lens]);

  /* --- Pagination --- */
  const totalPages = Math.ceil(filteredColleges.length / ITEMS_PER_PAGE);
  const paginatedColleges = useMemo(
    () => filteredColleges.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredColleges, currentPage]
  );

  const hasActiveFilters = search || selectedState !== "all" || selectedType !== "all";

  const clearAll = () => {
    setSearch("");
    setSelectedState("all");
    setSelectedType("all");
  };

  const goToPage = (p: number) => {
    setCurrentPage(p);
    document.getElementById("explorer")?.scrollIntoView({ behavior: "smooth" });
  };

  /* --- Top states for explore section --- */
  const topStates = useMemo(() => {
    return [...states]
      .sort((a, b) => (b.govtColleges + b.privateColleges) - (a.govtColleges + a.privateColleges))
      .slice(0, 8);
  }, [states]);

  /* --- Pagination numbers with ellipsis --- */
  const paginationNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(currentPage - i) <= 1) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "ellipsis") {
        pages.push("ellipsis");
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  /* --- RENDER --- */

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-zinc-100 min-h-screen font-body selection:bg-cyan-600/30 selection:text-white transition-colors duration-200">

      {/* Hero — light since 2026-10-21: words and counts left, the campus photographs framed right */}
      <section className="relative isolate overflow-hidden border-b border-border bg-background py-10 md:py-14">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/80 via-background to-background" />
          <div className="absolute -right-40 -top-48 h-[32rem] w-[32rem] rounded-full bg-secondary/10 blur-[110px]" />
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_55%_at_75%_10%,#000,transparent)]" />
        </div>

        <div className={`container-custom relative grid gap-10 ${finalHeroImages.length ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-center lg:gap-14" : ""}`}>
          <div className="min-w-0">
            <p className="mb-4 flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-primary-strong">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft ring-1 ring-primary/15">
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </span>
              MBBS colleges · government and private
            </p>

            <h1 className="font-heading max-w-[22ch] text-[clamp(2rem,4.4vw,3.35rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground [text-wrap:balance]">
              MBBS colleges <span className="text-primary-strong">in India</span>
            </h1>

            <p className="mt-5 max-w-[60ch] text-[15.5px] leading-relaxed text-muted-foreground md:text-[17px]">
              Every MBBS college in the counselling data, state by state, with its fees, seats and cutoff band. Filter by state and type, or open a college for the full picture.
            </p>

            <dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "MBBS colleges", value: liveStats.total.toLocaleString("en-IN") },
                { label: "Government", value: liveStats.govt.toLocaleString("en-IN") },
                { label: "Private", value: liveStats.private.toLocaleString("en-IN") },
                { label: "States & UTs", value: liveStats.states.toLocaleString("en-IN") },
              ].map((st) => (
                <div key={st.label} className="flex min-w-0 flex-col rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
                  <dt className="order-2 mt-1 text-[13px] font-semibold leading-snug text-muted-foreground">{st.label}</dt>
                  <dd className="tnum font-heading order-1 text-[1.4rem] font-extrabold leading-tight text-foreground md:text-[1.6rem]">{st.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#explorer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary-strong px-6 text-[15px] font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
              >
                Explore colleges <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={CTA.call}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-[15px] font-semibold text-foreground transition-colors hover:border-primary/40"
              >
                Get expert counselling
              </button>
            </div>
          </div>

          {finalHeroImages.length > 0 && (
            <div className="relative min-w-0">
              <HeroImageRotator images={finalHeroImages} />
            </div>
          )}
        </div>
      </section>

      {/* College List Explorer Header & Filter Menu (Unified Box) */}
      <section id="explorer" className="pt-8 pb-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="container-custom">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-6">
            
            {/* Header info inside the card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  MBBS Colleges in India List
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Comprehensive list of government and private medical institutions updated for the 2026 academic year.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-900/30 text-[11.5px] font-bold text-cyan-600 dark:text-cyan-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  2026 Seat Matrix Active
                </span>
              </div>
            </div>

            {/* 3 columns of insights inside the card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100/80 dark:border-slate-800/40">
                <span className="text-[11.5px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">Counselling Merit</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  All admissions are strictly via MCC & State NEET Counselling. No direct management/capitation seats permitted.
                </p>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100/80 dark:border-slate-800/40">
                <span className="text-[11.5px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">Fee Structure</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Government colleges mostly charge {govtFee} a year. A private college publishes several fees, one per quota — most {privateFee} a year.
                </p>
              </div>
              <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100/80 dark:border-slate-800/40">
                <span className="text-[11.5px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider block mb-1">Clinical Exposure</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  Focus on high patient inflow (minimum 1000+ daily OPD count) when selecting private & deemed colleges.
                </p>
              </div>
            </div>

            <RankLensBar
              lens={lens}
              level="ug"
              categories={["UR", "OBC", "SC", "ST", "EWS"]}
              bandFilter={bandFilter}
              onBandFilter={setBandFilter}
            />

            {/* Separator / Divider */}
            <div className="border-t border-slate-100 dark:border-slate-800/60 pt-6" />

            {/* Search and Filters Controls inside the same card */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by college, city, or state..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search colleges by name"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
                  />
                </div>

                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  aria-label="Filter by state"
                className="px-3 py-2.5 bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-xs text-slate-700 dark:text-zinc-300 outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors cursor-pointer md:w-44"
                >
                  <option value="all">All States</option>
                  {uniqueStatesList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as "all" | CollegeType)}
                  aria-label="Sort colleges"
                className="px-3 py-2.5 bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-xs text-slate-700 dark:text-zinc-300 outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors cursor-pointer md:w-40"
                >
                  <option value="all">All Types</option>
                  <option value="govt">Government</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex flex-row items-center justify-between gap-4 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Showing{" "}
                    <span className="text-slate-900 dark:text-zinc-200 font-semibold">{filteredColleges.length}</span> of{" "}
                    <span className="text-slate-900 dark:text-zinc-200 font-semibold">{allColleges.length}</span> colleges
                  </span>

                  {hasActiveFilters && (
                    <>
                      <span className="text-slate-300 dark:text-slate-700 mx-0.5">·</span>
                      {search && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[11.5px] text-slate-700 dark:text-zinc-300 shadow-sm">
                          &quot;{search}&quot;
                          <X
                            className="w-2.5 h-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white cursor-pointer"
                            onClick={() => setSearch("")}
                          />
                        </span>
                      )}
                      {selectedState !== "all" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[11.5px] text-slate-700 dark:text-zinc-300 shadow-sm">
                          {selectedState}
                          <X
                            className="w-2.5 h-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white cursor-pointer"
                            onClick={() => setSelectedState("all")}
                          />
                        </span>
                      )}
                      {selectedType !== "all" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[11.5px] text-slate-700 dark:text-zinc-300 shadow-sm">
                          {selectedType === "govt" ? "Government" : "Private"}
                          <X
                            className="w-2.5 h-2.5 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-white cursor-pointer"
                            onClick={() => setSelectedType("all")}
                          />
                        </span>
                      )}
                      <button
                        onClick={clearAll}
                        className="text-[11.5px] text-slate-500 hover:text-slate-800 dark:text-slate-500 dark:hover:text-white transition-colors ml-1"
                      >
                        Clear all
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-md shrink-0">
                  <button
                    onClick={() => setLayoutView("list")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11.5px] font-medium transition-all ${
                      layoutView === "list"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-500 dark:hover:text-zinc-300"
                    }`}
                    title="List View"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">List</span>
                  </button>
                  <button
                    onClick={() => setLayoutView("grid")}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11.5px] font-medium transition-all ${
                      layoutView === "grid"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-500 dark:hover:text-zinc-300"
                    }`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* College Explorer Section */}
      <section className="py-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="container-custom">
          {filteredColleges.length > 0 ? (
            <>
              {layoutView === "list" ? (
                /* Compact List Layout (Grid 6 - 3 - 3 columns, perfectly aligned) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <AnimatePresence mode="popLayout">
                    {paginatedColleges.map((college) => (
                      <motion.div
                        key={college.name}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: smoothEase }}
                        className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-xl p-2.5 shadow-sm hover:shadow-md dark:hover:shadow-zinc-950/20 transition-all duration-200"
                      >
                        <div className="hidden md:grid grid-cols-12 items-center gap-3">
                          {/* LEFT (col-span-8): College Name and Location only */}
                          <div className="col-span-8 min-w-0 pr-2 space-y-1">
                            <h3 className="text-[13px] md:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors leading-snug break-words">
                              {college.slug ? (
                                <Link href={`/mbbs-india/colleges/${college.slug}`} className="hover:underline">
                                  {college.name}
                                </Link>
                              ) : (
                                college.name
                              )}
                            </h3>
                            <div className="flex items-center gap-1 text-[12px] md:text-[11.5px] text-slate-500 dark:text-slate-400">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              {[college.city, college.state].filter(Boolean).join(", ")}
                            </div>
                          </div>

                          {/* RIGHT (col-span-4): Type badge & Enquire button */}
                          <div className="col-span-4 flex items-center justify-end gap-2.5">
                            {lens.bandOf(college.slug) && (
                              <span
                                className={`shrink-0 rounded border px-1.5 py-0.5 text-[11.5px] font-bold uppercase tracking-wider ${BAND_CHIP[lens.bandOf(college.slug)!].className}`}
                              >
                                {BAND_CHIP[lens.bandOf(college.slug)!].label}
                              </span>
                            )}
                            {college.type !== "unknown" && (
                              <span
                                className={`shrink-0 text-[11.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                  college.type === "govt"
                                    ? "bg-emerald-50 dark:bg-emerald-400 text-emerald-600 dark:text-black border-emerald-200 dark:border-emerald-400"
                                    : "bg-teal-50 dark:bg-teal-400 text-teal-600 dark:text-black border-teal-200 dark:border-teal-400"
                                }`}
                              >
                                {college.type === "govt" ? "Govt" : "Private"}
                              </span>
                            )}
                            <button
                              onClick={() =>
                                CTA.whatsapp(
                                  `Hi, I would like to get information regarding admissions at ${college.name}`
                                )
                              }
                              className="px-3 py-2.5 md:py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 border border-cyan-100/60 dark:border-cyan-900/40 transition-colors text-[12px] md:text-[11px] font-bold flex items-center justify-center gap-1 shrink-0"
                            >
                              Enquire
                            </button>
                          </div>
                        </div>

                        {/* Mobile Layout */}
                        <div className="md:hidden flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug break-words">
                              {college.slug ? (
                                <Link href={`/mbbs-india/colleges/${college.slug}`} className="hover:underline">
                                  {college.name}
                                </Link>
                              ) : (
                                college.name
                              )}
                            </h3>
                            <p className="text-[12px] md:text-[11.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="leading-snug">{[college.city, college.state].filter(Boolean).join(", ")}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {lens.bandOf(college.slug) && (
                              <span
                                className={`shrink-0 rounded border px-1.5 py-0.5 text-[11.5px] font-bold uppercase tracking-wider ${BAND_CHIP[lens.bandOf(college.slug)!].className}`}
                              >
                                {BAND_CHIP[lens.bandOf(college.slug)!].label}
                              </span>
                            )}
                            {college.type !== "unknown" && (
                              <span
                                className={`shrink-0 text-[11.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                  college.type === "govt"
                                    ? "bg-emerald-50 dark:bg-emerald-400 text-emerald-600 dark:text-black border-emerald-200 dark:border-emerald-400"
                                    : "bg-teal-50 dark:bg-teal-400 text-teal-600 dark:text-black border-teal-200 dark:border-teal-400"
                                }`}
                              >
                                {college.type === "govt" ? "Govt" : "Pvt"}
                              </span>
                            )}
                            <button
                              onClick={() =>
                                CTA.whatsapp(
                                  `Hi, I would like to get information regarding admissions at ${college.name}`
                                )
                              }
                              className="px-3 py-2.5 md:py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 border border-cyan-100/60 dark:border-cyan-900/40 transition-colors text-[12px] md:text-[11.5px] font-bold shrink-0"
                            >
                              Enquire
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                /* Compact Grid View - Standardized Uniform Cards */
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                  <AnimatePresence mode="popLayout">
                    {paginatedColleges.map((college) => (
                      <motion.div
                        key={college.name}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: smoothEase }}
                      >
                        <CollegeCard
                          collegeName={college.name}
                          city={college.city}
                          state={college.state}
                          collegeType={college.type === "govt" ? "Government" : "Private"}
                          description={null}
                          imageUrl={college.imageUrl}
                          imageAttribution={college.imageAttribution}
                          imageLicense={college.imageLicense}
                          yearEstablished={college.establishedYear}
                          universityBody={getFullUniversityName(college.universityName)}
                          seats={college.intake}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-900/80 transition-colors duration-200">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Showing{" "}
                    <span className="text-slate-700 dark:text-zinc-200 font-semibold">
                      {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredColleges.length)}
                    </span>
                    –
                    <span className="text-slate-700 dark:text-zinc-200 font-semibold">
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredColleges.length)}
                    </span>{" "}
                    of{" "}
                    <span className="text-slate-700 dark:text-zinc-200 font-semibold">{filteredColleges.length}</span>{" "}
                    colleges
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => goToPage(currentPage - 1)}
                      className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      Prev
                    </button>

                    {paginationNumbers.map((p, idx) =>
                      p === "ellipsis" ? (
                        <span key={`e-${idx}`} className="px-1 text-slate-400 dark:text-slate-600 text-xs">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goToPage(p)}
                          className={`w-7.5 h-7.5 flex items-center justify-center rounded text-[11px] font-bold transition-colors ${
                            currentPage === p
                              ? "bg-cyan-600 text-white shadow-sm"
                              : "text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => goToPage(currentPage + 1)}
                      className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty state */
            <div className="text-center py-16 max-w-md mx-auto">
              <Building2 className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">No colleges found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Try adjusting your search or filters to find matching results.
              </p>
              <button
                onClick={clearAll}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Insights Section */}
      <section className="py-8 bg-slate-100/40 dark:bg-slate-900/20 border-y border-slate-200/60 dark:border-slate-900/60 transition-colors duration-200">
        <div className="container-custom">
          <motion.div
            variants={fadeUp()}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <span className="text-[11.5px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-1.5 block">
              Complete Guide 2026
            </span>
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              MBBS Admission Insights
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-xl mx-auto mt-1.5">
              Everything you need to know about the Indian medical education system, counselling
              process, and seat selection strategy.
            </p>
          </motion.div>

          <div className="flex border-b border-slate-200 dark:border-slate-800/80 mb-5 overflow-x-auto no-scrollbar">
            {[
              { id: "education" as const, label: "MBBS Quota System", icon: BookOpen },
              { id: "process" as const, label: "NEET Counselling Steps", icon: ClipboardCheck },
              { id: "comparison" as const, label: "Govt vs Private", icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-cyan-600 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-zinc-300"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <AnimatePresence mode="wait">
              {activeTab === "education" && (
                <motion.div
                  key="education"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: smoothEase }}
                  className="space-y-4"
                >
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Understand the Quota Distribution
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    MBBS seats in India are distributed via competitive quotas during NEET UG
                    Counselling. Plan your choice filling according to these distributions:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                    {[
                      {
                        title: "AIQ Quota (15%)",
                        color: "text-cyan-600 dark:text-cyan-400",
                        desc: "15% of seats in all Government Medical Colleges are pooled into the All India Quota, open to students from any state. Managed by MCC.",
                      },
                      {
                        title: "State Quota (85%)",
                        color: "text-emerald-600 dark:text-emerald-400",
                        desc: "85% of government seats are reserved for domicile residents of the respective state, handled by local state counselling committees.",
                      },
                      {
                        title: "Management Quota",
                        color: "text-teal-600 dark:text-teal-400",
                        desc: "Available in private medical institutions. Open state counselling allows students nationwide to apply, though fee structures are higher.",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800"
                      >
                        <h4 className={`font-bold ${item.color} mb-1.5 text-xs`}>
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "process" && (
                <motion.div
                  key="process"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: smoothEase }}
                  className="space-y-4"
                >
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    The Complete Counselling Roadmap
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    The admission process is strictly online. Securing a seat requires methodical
                    registration and selection:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    {[
                      {
                        step: 1,
                        title: "NEET UG Registration & Exam",
                        desc: "Clear the NEET examination and satisfy the cutoff eligibility score.",
                      },
                      {
                        step: 2,
                        title: "Authority Registration",
                        desc: "Register on MCC (for AIQ) and State portals (like KEA, CET, etc.) for local counselling.",
                      },
                      {
                        step: 3,
                        title: "Choice Filling & Locking",
                        desc: "Arrange and lock colleges in order of preference. This is the most critical step.",
                      },
                      {
                        step: 4,
                        title: "Seat Allotment & Reporting",
                        desc: "Receive seat allocations based on merit and locked choices, then complete physical documentation.",
                      },
                    ].map((s) => (
                      <div
                        key={s.step}
                        className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg"
                      >
                        <div className="w-6 h-6 rounded-md bg-cyan-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {s.step}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs">{s.title}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === "comparison" && (
                <motion.div
                  key="comparison"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: smoothEase }}
                  className="space-y-4"
                >
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Government vs Private Medical Colleges
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Landmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                          Government Institutions
                        </h4>
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 list-disc pl-3">
                        <li>Subsidised fees — most {govtFee} a year</li>
                        <li>Extremely high clinical patient inflow</li>
                        <li>Requires top percentile NEET UG ranking</li>
                        <li>NMC recognized legacy teaching hospitals</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 mb-2">
                        <GraduationCap className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                          Private Institutions & Trusts
                        </h4>
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 list-disc pl-3">
                        <li>Premium infrastructure and research labs</li>
                        <li>Most published fees {privateFee} a year, by quota</li>
                        <li>Accessible at moderate NEET percentile</li>
                        <li>No rural service bond in several states</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
        <div className="container-custom">
          <motion.div
            variants={fadeUp()}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <span className="text-[11.5px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-1.5 block">
              Expert Counselling Partner
            </span>
            <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              Why Admission Hands?
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs max-w-md mx-auto mt-1.5">
              We guide students and parents with absolute transparency and strategic choice-filling
              to secure the best possible medical college.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {[
              {
                title: "Personalized Counselling",
                desc: "Dedicated counselor mapped to plan strategy according to your NEET rank, preferred location, and budget constraints.",
                icon: ShieldCheck,
              },
              {
                title: "Smart College Predictor",
                desc: "Your rank placed against the rounds that have actually been published — government, private and deemed, with your chance at each one in plain words.",
                icon: TrendingUp,
              },
              {
                title: "Strategic Choice-Locking",
                desc: "Expert choice locking lists configured state-wise and AIQ-wise to bypass mistakes during allotment rounds.",
                icon: Award,
              },
            ].map((feat) => (
              <motion.div
                key={feat.title}
                variants={staggerItem}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/30 flex items-center justify-center mb-3">
                  <feat.icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-1">{feat.title}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>



      {/* FAQ Section */}
      <section className="py-12 bg-slate-50 dark:bg-slate-950 transition-colors duration-200 border-t border-b border-slate-100 dark:border-slate-900">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8 lg:gap-12 items-start">
            <motion.div
              variants={fadeUp()}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="lg:sticky lg:top-[calc(var(--site-top,112px)_+_1rem)]"
            >
              <span className="text-[11.5px] font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-2 block">
                Common Questions
              </span>
              <h2 className="font-heading text-2xl md:text-3.5xl font-black text-slate-900 dark:text-white leading-tight">
                Frequently Asked<br className="hidden lg:block" /> Questions
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 leading-relaxed hidden lg:block max-w-xs">
                Find answers to common questions about NEET counselling, AIQ vs State Quota, and the MBBS admission lifecycle.
              </p>
            </motion.div>

            <div className="space-y-2.5">
              {[
                {
                  q: "What is the difference between AIQ and State Quota?",
                  a: "AIQ covers 15% of seats in all Government Medical Colleges across India and is open to all students irrespective of state. Domicile state quota covers the remaining 85% of government seats, reserved strictly for residents of that state.",
                },
                {
                  q: "Can students from other states apply for Private colleges in Karnataka?",
                  a: "Yes. Several states — Karnataka and Uttar Pradesh among them — let candidates from any state compete for seats in their private colleges through the state's own counselling. The rules are re-issued every year, so check the current information bulletin before you register.",
                },
                {
                  q: "What is the fee structure for Private Medical Colleges?",
                  a: `A private medical college publishes several fees, one per quota, and most of them fall between ${privateFee} a year${figures?.privateFeeMedian ? ` (median ${figures.privateFeeMedian})` : ""}. State-quota seats sit at the low end and management and NRI seats at the high end — the exact figure for each quota is in the college's own fee notice.`,
                },
                {
                  q: "How important is strategic choice filling?",
                  a: "Choice filling is the algorithm's decision block. Locking higher preference colleges that realistically match your rank alongside backup options ensures you don't end up with no seat or a college with unfavorable bond terms.",
                },
              ].map((faq, idx) => {
                const isOpen = expandedFAQ === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                  >
                    <button
                      onClick={() => setExpandedFAQ(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between py-4 px-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 pr-4">{faq.q}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-250 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: smoothEase }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 bg-white dark:bg-slate-950 transition-colors duration-200">
        <div className="container-custom">
          <motion.div
            variants={fadeUp()}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="bg-slate-900 dark:bg-slate-900/50 text-white rounded-[2rem] p-6 md:p-10 relative overflow-hidden shadow-xl border border-slate-800 dark:border-slate-800/60"
          >
            {/* Gradient Highlights */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-600/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-teal-600/10 rounded-full blur-[60px] pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 md:gap-8 relative z-10 text-left">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/5 text-cyan-200 text-[11.5px] font-bold mb-3.5 shadow-sm">
                  <Sparkles className="w-3 h-3 text-cyan-300" /> Expert Counselling 2026
                </span>
                <h2 className="font-heading text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
                  Secure Your Seat in India's{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-400">
                    Finest Medical Colleges
                  </span>
                </h2>
                <p className="text-cyan-100/70 text-xs mt-2.5 leading-relaxed">
                  Don't leave your MBBS career to chance. Get verified choice lists, budget
                  calibrations, state quota filters, and complete support from top counsellors.
                </p>
              </div>

              <div className="flex flex-row sm:flex-col lg:flex-row gap-3 shrink-0 w-full sm:w-auto">
                <button
                  onClick={CTA.call}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-900/20 active:scale-95 transition-all"
                >
                  <Phone className="w-4 h-4" /> Book Free Call
                </button>
                <button
                  onClick={() =>
                    CTA.whatsapp(
                      "Hi, I want to explore MBBS Government and Private options based on my NEET score."
                    )
                  }
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#25D366] hover:bg-[#20ba56] text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/20 active:scale-95 transition-all"
                >
                  <WhatsAppIcon className="w-4 h-4" /> WhatsApp
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
