"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import PhotoCredit, { type PhotoCreditInfo } from "@/components/ui/PhotoCredit";
import { motion } from 'framer-motion';
import { useCTA } from '@/hooks/useCTA';
import {
  Target, Search, BarChart3, Map, ShieldCheck, FileCheck,
  Landmark, GraduationCap, Banknote, ArrowUpRight, Phone,
  CheckCircle2, ChevronDown, ChevronUp, Sparkles, Users,
  TrendingUp, Clock, Award, BookOpen, HeartHandshake
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';
import CtaBand from '@/components/ui/CtaBand';
import type { ServicesPageData } from '@/lib/servicesContent';

interface HeroImageRotatorProps {
  images: string[];
}

// Every word and figure arrives from the server (lib/servicesContent.ts): the copy from Admin →
// Content ("Page: Services"), the services from the services_page collection, the counts live.
// Icons are named in the admin and resolved here; card colours stay positional.
const ICONS: Record<string, React.ElementType> = {
  target: Target,
  search: Search,
  chart: BarChart3,
  map: Map,
  landmark: Landmark,
  filecheck: FileCheck,
  shield: ShieldCheck,
  banknote: Banknote,
  upgrade: ArrowUpRight,
  graduation: GraduationCap,
};
const COLORS = [
  "from-cyan-600 to-teal-600",
  "from-teal-600 to-teal-600",
  "from-teal-600 to-emerald-600",
  "from-emerald-600 to-green-600",
  "from-amber-500 to-orange-600",
  "from-teal-600 to-teal-600",
  "from-cyan-700 to-teal-700",
  "from-green-600 to-teal-600",
  "from-rose-500 to-emerald-600",
  "from-cyan-600 to-cyan-600",
];
const STAT_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  students: { icon: Users, color: "text-cyan-600" },
  ranks: { icon: TrendingUp, color: "text-emerald-600" },
  years: { icon: Clock, color: "text-teal-600" },
  states: { icon: Award, color: "text-amber-600" },
};
const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

interface Card {
  icon: React.ElementType;
  title: string;
  tagline: string;
  color: string;
  description: string;
  features: string[];
  stat: { value: string; label: string };
}

function ServiceCard({ service, show, hide }: { service: Card; show: string; hide: string }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = service.icon;

  return (
    <div
      className="group bg-white rounded-xl border border-slate-100 hover:border-cyan-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
    >
      <div className="p-4 md:p-5">
        {/* Header */}
        <div className="flex items-start gap-4 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center text-white shadow-md shrink-0 group-hover:scale-105 transition-transform duration-300`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug group-hover:text-cyan-700 transition-colors">
              {service.title}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {service.tagline}
            </p>
          </div>
          {/* Stat badge */}
          <div className="hidden sm:flex flex-col items-center px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-100 shrink-0">
            <span className="text-xs md:text-sm font-black text-slate-900">{service.stat.value}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{service.stat.label}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs md:text-sm text-slate-700 font-medium leading-relaxed mb-3">
          {service.description}
        </p>

        {/* Expandable features */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[10px] font-black text-cyan-600 uppercase tracking-widest hover:text-cyan-800 transition-colors mb-2"
        >
          {expanded ? hide : show} Details
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-1.5 mb-3"
          >
            {service.features.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-600 font-medium leading-snug">{f}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Mobile stat */}
        <div className="flex sm:hidden items-center gap-2 mb-2">
          <div className="px-2.5 py-1 bg-slate-50 rounded-md border border-slate-100">
            <span className="text-xs font-black text-slate-900">{service.stat.value}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{service.stat.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ServicesClientProps {
  heroImages?: string[];
  /** The credit for whichever photograph `heroImages[0]` turned out to be. */
  heroCredit?: PhotoCreditInfo;
  data: ServicesPageData;
}

export default function ServicesClient({ heroImages, heroCredit, data }: ServicesClientProps) {
  const { copy } = data;
  const cards: Card[] = data.services.map((sv, i) => ({
    icon: ICONS[sv.icon] ?? Target,
    title: sv.title,
    tagline: sv.tagline,
    color: COLORS[i % COLORS.length],
    description: sv.description,
    features: sv.features,
    stat: { value: sv.statValue, label: sv.statLabel },
  }));
  const CTA = useCTA();
  const bgImage = (heroImages && heroImages[0]) || "/assets/images/hero/services_hero.avif";

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">

      {/* Hero Section - Reduced padding by 50% and made compact */}
      <section className="relative min-h-[56vh] md:min-h-[62vh] flex items-center overflow-hidden py-14 md:py-20 bg-slate-950 text-white">

        {/* Background Image behind the text */}
        <div className="absolute inset-0 z-0">
          {bgImage && bgImage !== "none" && (
            <Image
              src={bgImage}
              alt={heroCredit?.subject ?? "Medical college campus"}
              fill
              priority
              sizes="100vw"
              className="object-cover"
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMjQwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDcwZTFlIi8+PC9zdmc+"
            />
          )}
          <div className="absolute inset-0 bg-slate-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/50" />
          {/*
            Lifted clear of the trust-stats bar below, which is pulled up over
            the hero by `-mt-6` and was covering all but the last few words of
            the credit. A credit that is half-hidden behind a card is not a
            credit — it is the licence condition, and it has to be readable.
          */}
          <PhotoCredit {...heroCredit} className="absolute bottom-10 right-2" />
        </div>

        <div className="absolute top-0 right-0 w-1/2 h-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-teal-500/5 blur-[100px] pointer-events-none" />

        <div className="container-custom relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left side Content */}
            <motion.div
              initial={mounted ? { opacity: 0, y: 15 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-9 xl:col-span-8 text-center lg:text-left space-y-4 md:space-y-5"
            >
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-cyan-300 text-xs font-black tracking-widest uppercase mb-1 backdrop-blur-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> {copy.hero_badge}
              </div>

              <h1
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight drop-shadow-md"
              >
                {copy.hero_title}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-300 drop-shadow-sm">
                  {copy.hero_accent}
                </span>
              </h1>

              <p
                className="text-cyan-100/90 text-xs md:text-sm font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 drop-shadow-sm"
              >
                {copy.hero_subtitle}
              </p>

              {/* Highlights */}
              <ul
                className="space-y-2 hidden sm:inline-block text-left text-cyan-100/80 text-xs font-semibold max-w-md"
              >
                {lines(copy.hero_points).map((point, idx) => (
                  <li key={idx} className="flex items-center gap-2.5">
                    <div className="h-4.5 w-4.5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <ShieldCheck size={12} />
                    </div>
                    {point}
                  </li>
                ))}
              </ul>

              <div
                className="flex flex-col sm:flex-row gap-2.5 justify-center lg:justify-start"
              >
                <button onClick={() => CTA.call()}
                  className="inline-flex items-center justify-center gap-2 bg-white dark:!bg-cyan-600 text-slate-900 dark:!text-white px-5 py-3 rounded-xl font-black text-xs hover:bg-cyan-50 dark:!hover:bg-cyan-500 transition-all shadow-lg active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5" /> {copy.hero_call}
                </button>
                <button onClick={() => CTA.whatsapp(copy.hero_whatsapp_message)}
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/60 backdrop-blur-sm text-white px-5 py-3 rounded-xl font-black text-xs hover:bg-white/10 transition-all active:scale-95"
                >
                  <WhatsAppIcon size={14} /> {copy.hero_whatsapp}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trust Stats Bar - Compact margin */}
      <section className="relative z-20 -mt-6">
        <div className="container-custom">
          <div className="bg-white rounded-xl border border-slate-100 shadow-lg p-3.5 md:p-5">
            <motion.div
              initial={mounted ? { opacity: 0, y: 10 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5"
            >
              {data.stats.map((s) => {
                const { icon: StatIcon, color } = STAT_ICONS[s.key] ?? STAT_ICONS.students;
                return (
                <div
                  key={s.key}
                  className="flex items-center gap-2.5 justify-center md:justify-start"
                >
                  <div className={`w-9 h-9 md:w-11 md:h-11 rounded-lg bg-slate-50 flex items-center justify-center ${color}`}>
                    <StatIcon className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div>
                    <p className="text-base md:text-xl font-black text-slate-900 leading-none">{s.value}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</p>
                  </div>
                </div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Students Choose Us - Reduced spacing and margins by 50%, high contrast text */}
      <section className="py-6 md:py-8">
        <div className="container-custom">
          <div className="text-center mb-4 md:mb-5">
            <motion.div
              initial={mounted ? { opacity: 0 } : false}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block px-3 py-1 mb-2 text-[9px] font-black tracking-widest text-cyan-600 uppercase bg-cyan-600/10 rounded-full"
            >
              {copy.why_badge}
            </motion.div>
            <motion.h2
              initial={mounted ? { opacity: 0, y: 10 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xl md:text-3xl font-black text-slate-900 tracking-tight mb-2"
            >
              {copy.why_title} <span className="text-cyan-600">{copy.why_accent}</span> {copy.why_title_end}
            </motion.h2>
            <p className="text-xs md:text-sm text-slate-600 font-semibold max-w-2xl mx-auto">
              {copy.why_intro}
            </p>
          </div>

          <motion.div
            initial={mounted ? { opacity: 0, y: 15 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4"
          >
            {[
              { icon: BookOpen, title: copy.why_1_title, desc: copy.why_1_desc, color: "from-cyan-600 to-cyan-700" },
              { icon: HeartHandshake, title: copy.why_2_title, desc: copy.why_2_desc, color: "from-emerald-600 to-teal-600" },
              { icon: ShieldCheck, title: copy.why_3_title, desc: copy.why_3_desc, color: "from-teal-600 to-teal-600" },
            ].filter((item) => item.title).map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-4 md:p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-3 shadow-md group-hover:scale-105 transition-transform`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm md:text-base font-black text-slate-900 mb-1 tracking-tight">{item.title}</h3>
                <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Services Grid - Spacing and margins reduced, high contrast text */}
      <section className="py-6 md:py-8 bg-white">
        <div className="container-custom">
          <div className="text-center mb-4 md:mb-5">
            <motion.div
              initial={mounted ? { opacity: 0 } : false}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block px-3 py-1 mb-2 text-[9px] font-black tracking-widest text-teal-600 uppercase bg-teal-600/10 rounded-full"
            >
              {copy.services_badge}
            </motion.div>
            <motion.h2
              initial={mounted ? { opacity: 0, y: 10 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xl md:text-3xl font-black text-slate-900 tracking-tight mb-2"
            >
              {copy.services_title} <span className="text-cyan-600">{copy.services_accent}</span> {copy.services_title_end}
            </motion.h2>
            <p className="text-xs md:text-sm text-slate-600 font-semibold max-w-2xl mx-auto">
              {copy.services_intro}
            </p>
          </div>

          <motion.div
            initial={mounted ? { opacity: 0, y: 15 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4"
          >
            {cards.map((service, index) => (
              <ServiceCard key={index} service={service} show={copy.details_show} hide={copy.details_hide} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Process Timeline - Spacing reduced, high contrast text */}
      <section className="py-6 md:py-8 bg-slate-50">
        <div className="container-custom">
          <div className="text-center mb-4 md:mb-5">
            <motion.h2
              initial={mounted ? { opacity: 0, y: 10 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-xl md:text-3xl font-black text-slate-900 tracking-tight mb-2"
            >
              {copy.how_title} <span className="text-cyan-600">{copy.how_accent}</span>
            </motion.h2>
            <p className="text-xs md:text-sm text-slate-600 font-semibold max-w-xl mx-auto">
              {copy.how_intro}
            </p>
          </div>

          <motion.div
            initial={mounted ? { opacity: 0, y: 15 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {[
              { step: "01", title: copy.step_1_title, desc: copy.step_1_desc },
              { step: "02", title: copy.step_2_title, desc: copy.step_2_desc },
              { step: "03", title: copy.step_3_title, desc: copy.step_3_desc },
              { step: "04", title: copy.step_4_title, desc: copy.step_4_desc },
            ].filter((item) => item.title).map((item, idx) => (
              <div
                key={idx}
                className="relative bg-white p-4 md:p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="text-3xl md:text-4xl font-black text-slate-100 absolute top-2.5 right-3.5 select-none">{item.step}</div>
                <div className="relative z-10">
                  <h3 className="text-sm font-black text-slate-900 mb-1 tracking-tight">{item.title}</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <CtaBand
        title={copy.cta_title}
        body={copy.cta_body}
        image="/assets/images/hero/services_hero_counselor.avif"
        primaryLabel={copy.cta_button}
      />

    </main>
  );
}
