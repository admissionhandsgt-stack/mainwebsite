"use client";

import React from 'react';
import Image from 'next/image';
import PhotoCredit, { type PhotoCreditInfo } from "@/components/ui/PhotoCredit";
import { 
  ShieldAlert, 
  Search, 
  Map, 
  Settings2, 
  FileCheck, 
  UserCheck, 
  Phone, 
  AlertTriangle,
  ChevronRight,
  GraduationCap,
  ClipboardCheck,
  Building2,
  Users
} from 'lucide-react';
import ProcessAccordion from '@/components/neet-ug-process/ProcessAccordion';
import { CONTACT_INFO } from '@/lib/constants';
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import type { CopyFields } from "@/lib/pageCopyDefaults";
import type { UgPhase } from "@/lib/ugProcessSteps";

/** Every word on the page, from Admin → Content ("Page: NEET UG process"). */
export type UgProcessCopy = CopyFields<"page.neet_ug_process">;
const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

interface NeetUgProcessClientProps {
  heroImageUrl?: string;
  examImageUrl?: string;
  collegeImageUrl?: string;
  /** One per photograph above: which college, who shot it, on what terms. */
  heroCredit?: PhotoCreditInfo;
  examCredit?: PhotoCreditInfo;
  collegeCredit?: PhotoCreditInfo;
  copy: UgProcessCopy;
  phases: UgPhase[];
}

const NeetUgProcessClient = ({
  heroImageUrl,
  examImageUrl,
  collegeImageUrl,
  heroCredit,
  examCredit,
  collegeCredit,
  copy,
  phases,
}: NeetUgProcessClientProps) => {
  const stepCount = phases.reduce((a, p) => a + p.steps.length, 0);
  const scrollToSteps = () => {
    document.getElementById('steps-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200">
      {/* 1. HERO — light since 2026-10-21: words left, the admin's photograph framed right */}
      <section className="relative isolate overflow-hidden border-b border-border bg-background py-10 md:py-14">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-soft/80 via-background to-background" />
          <div className="absolute -right-40 -top-48 h-[32rem] w-[32rem] rounded-full bg-secondary/10 blur-[110px]" />
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_55%_at_75%_10%,#000,transparent)]" />
        </div>
        <div className="container-custom relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-center lg:gap-14">
          <div className="min-w-0">
            <h1 className="font-heading max-w-[22ch] text-[clamp(2rem,4.4vw,3.35rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-foreground [text-wrap:balance]">
              {copy.hero_title} <span className="text-primary-strong">{copy.hero_accent}</span>
            </h1>
            <p className="mt-5 max-w-[60ch] text-[15.5px] leading-relaxed text-muted-foreground md:text-[17px]">
              {copy.hero_subtitle}
            </p>
            <div className="mt-7 flex flex-col gap-3 xs:flex-row">
              <a
                href={`tel:${CONTACT_INFO.phone}`}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary-strong px-6 text-[15px] font-bold text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5"
              >
                {copy.hero_cta_call}
              </a>
              <button
                type="button"
                onClick={scrollToSteps}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-card px-6 text-[15px] font-semibold text-foreground transition-colors hover:border-primary/40"
              >
                {copy.hero_cta_steps}
              </button>
            </div>
          </div>
          <div className="relative min-w-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-border bg-surface-3 shadow-lift">
              <Image
                src={heroImageUrl && heroImageUrl !== "none" ? heroImageUrl : "/assets/images/exam/neet-exam.avif"}
                alt="Students at a NEET examination centre"
                fill
                priority
                sizes="(min-width: 1024px) 30rem, 100vw"
                className="object-cover"
              />
              <PhotoCredit {...heroCredit} tone="chip" className="absolute right-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. OVERVIEW SECTION */}
      <section className="py-8 bg-white dark:bg-slate-950">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2">{copy.overview_title}</h2>
                <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                  {copy.overview_body}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { title: copy.body_1_title, desc: copy.body_1_desc, icon: ClipboardCheck },
                  { title: copy.body_2_title, desc: copy.body_2_desc, icon: Building2 },
                  { title: copy.body_3_title, desc: copy.body_3_desc, icon: Users }
                ].filter((item) => item.title).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-hover hover:shadow-sm">
                    <div className="bg-white dark:bg-slate-950 p-2.5 rounded-lg shadow-sm text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{item.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-4">
                <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-900 dark:text-amber-200 text-sm font-medium italic mb-0">
                  {copy.overview_warning}
                </p>
              </div>
            </div>
            <div className="relative aspect-[21/9] lg:aspect-auto h-full min-h-[250px] rounded-2xl overflow-hidden shadow-lg hidden md:block">
              {examImageUrl && examImageUrl !== "none" && (
                <Image
                  src={examImageUrl}
                  alt="NEET UG Examination Hall"
                  fill
                  className="object-cover"
                />
              )}
              <PhotoCredit {...examCredit} className="absolute bottom-2 right-3 z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE PROCESS SECTION */}
      <section id="steps-section" className="py-5 md:py-8 bg-slate-50 dark:bg-slate-950/40">
        <div className="container-custom">
          <div className="text-center mb-4 md:mb-6">
            <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mb-1 md:mb-2">{copy.steps_title}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">{copy.steps_intro.replace("{count}", String(stepCount))}</p>
          </div>
          
          <ProcessAccordion phases={phases} />

          {/* MID CTA */}
          <div className="mt-6 md:mt-10 p-4 md:p-8 rounded-2xl md:rounded-3xl bg-gradient-to-br from-primary to-cyan-700 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <GraduationCap size={100} />
            </div>
            <div className="relative z-10">
              <h3 className="text-base md:text-3xl font-black mb-1.5 md:mb-3">{copy.mid_title}</h3>
              <p className="text-cyan-100/90 mb-4 md:mb-8 max-w-xl mx-auto text-xs md:text-sm font-medium">{copy.mid_body}</p>
              <div className="flex flex-wrap justify-center gap-2 md:gap-4">
                <a 
                  href={`tel:${CONTACT_INFO.phone}`}
                  className="inline-flex items-center justify-center rounded-full bg-white text-primary hover:bg-slate-100 px-5 py-2.5 text-xs md:px-8 md:py-3.5 md:text-base font-extrabold transition-all"
                >
                  {copy.mid_call}
                </a>
                <a 
                  href={`https://api.whatsapp.com/send?phone=${CONTACT_INFO.whatsapp}`}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-full border-white/30 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 text-xs md:px-8 md:py-3.5 md:text-base font-extrabold transition-all"
                >
                  <WhatsAppIcon className="mr-1.5 h-4 w-4 md:mr-2 md:h-5 md:w-5" /> {copy.mid_whatsapp}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. COMMON MISTAKES SECTION */}
      <section className="py-5 md:py-8 bg-white dark:bg-slate-950">
        <div className="container-custom">
          <div className="text-center mb-4 md:mb-6">
            <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mb-1 md:mb-2">{copy.mistakes_title}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">{copy.mistakes_intro}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
            {lines(copy.mistakes_list).map((mistake, idx) => (
              <div key={idx} className="p-3 md:p-5 rounded-lg md:rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 group transition-all hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:-translate-y-1">
                <div className="mb-1.5 md:mb-3 text-rose-500 dark:text-rose-400 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-4 w-4 md:h-6 md:w-6" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-rose-100 leading-tight text-[13px] sm:text-sm">{mistake}</h3>
              </div>
            ))}
          </div>
          <div className="mt-5 md:mt-8 p-3 md:p-4 bg-slate-900 dark:bg-slate-900/60 border border-slate-800/80 rounded-xl text-center">
            <p className="text-slate-300 text-xs md:text-sm font-medium">
              <span className="text-rose-400 font-black uppercase tracking-widest mr-2 text-[13px] md:text-xs">{copy.mistakes_critical_label}</span> 
              {copy.mistakes_critical}
            </p>
          </div>
        </div>
      </section>

      {/* 5. HOW ADMISSION HANDS HELPS */}
      <section className="py-6 bg-slate-50 dark:bg-slate-950">
        <div className="container-custom">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-2">{copy.helps_title}</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-sm">{copy.helps_intro}</p>
                    </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {[
              { title: copy.help_1_title, icon: Search, desc: copy.help_1_desc },
              { title: copy.help_2_title, icon: Map, desc: copy.help_2_desc },
              { title: copy.help_3_title, icon: Settings2, desc: copy.help_3_desc },
              { title: copy.help_4_title, icon: FileCheck, desc: copy.help_4_desc },
              { title: copy.help_5_title, icon: UserCheck, desc: copy.help_5_desc },
              { title: copy.help_6_title, icon: ShieldAlert, desc: copy.help_6_desc }
            ].filter((f) => f.title).map((feature, idx) => (
              <div key={idx} className="p-2.5 md:p-6 rounded-xl md:rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 dark:hover:border-teal-500/40 group text-center md:text-left relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[3px] before:bg-gradient-to-r before:from-cyan-500 before:to-teal-400 before:opacity-0 group-hover:before:opacity-100 before:transition-opacity">
                <div className="absolute top-1 right-2 text-xl md:text-5xl font-black text-slate-100/70 dark:text-slate-800/30 group-hover:text-cyan-500/10 dark:group-hover:text-teal-400/10 select-none font-sans tracking-tighter transition-colors">
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center text-primary dark:text-cyan-400 mb-2 md:mb-5 transition-colors group-hover:bg-primary group-hover:text-white dark:group-hover:bg-cyan-500 dark:group-hover:text-white mx-auto md:mx-0">
                  <feature.icon className="h-4 w-4 md:h-6 md:w-6" />
                </div>
                <h3 className="text-[13px] sm:text-base md:text-lg font-bold text-slate-900 dark:text-white mb-1 md:mb-2 leading-tight">{feature.title}</h3>
                <p className="text-[12px] sm:text-xs text-slate-500 dark:text-slate-400 leading-normal md:leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="py-6 md:py-10 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 relative overflow-hidden hidden md:block">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="order-2 lg:order-1 text-center lg:text-left">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
                {copy.final_title} <span className="text-primary">{copy.final_accent}</span>
              </h2>
              <ul className="space-y-3 mb-8 inline-block text-left">
                {lines(copy.final_points).map((point, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-base text-slate-700 dark:text-slate-300 font-medium">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <ChevronRight size={14} />
                    </div>
                    {point}
                  </li>
                ))}
              </ul>
              <div className="hidden md:flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a 
                  href={`tel:${CONTACT_INFO.phone}`}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 hover:bg-slate-800 text-white px-10 h-14 text-base font-bold transition-all"
                >
                  <Phone className="mr-2 h-5 w-5" /> {copy.final_call}
                </a>
                <a 
                  href={`https://api.whatsapp.com/send?phone=${CONTACT_INFO.whatsapp}`}
                  target="_blank"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-10 h-14 text-base font-bold transition-all"
                >
                  <WhatsAppIcon className="mr-2 h-5 w-5" /> {copy.final_whatsapp}
                </a>
              </div>
            </div>
            <div className="order-1 lg:order-2 relative aspect-[4/3] rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-xl md:rotate-2">
              {collegeImageUrl && collegeImageUrl !== "none" && (
                <Image
                  src={collegeImageUrl}
                  // Named, not "Premium Medical College". It is a photograph of
                  // one real college and the alt text should say which.
                  alt={collegeCredit?.subject ?? "Medical college campus"}
                  fill
                  className="object-cover"
                />
              )}
              <PhotoCredit {...collegeCredit} className="absolute bottom-2 right-4 z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* 7. DISCLAIMER */}
      <section className="py-8 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900">
        <div className="container-custom text-center">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Disclaimer</h5>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic max-w-4xl mx-auto">
            {copy.disclaimer}
          </p>
        </div>
      </section>
    </main>
  );
};

export default NeetUgProcessClient;
