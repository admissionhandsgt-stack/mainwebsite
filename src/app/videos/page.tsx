import type { Metadata } from 'next';
import { VideosClient } from "./VideosClient";
import { getVideos } from "@/lib/videos";
import { resolveMetadata } from '@/lib/content';
import StructuredData, { webPage, breadcrumb } from "@/components/seo/StructuredData";

/**
 * Metadata the admin can override per route (Admin -> Search & sharing).
 * Blank admin values fall through to the defaults below.
 */
export async function generateMetadata(): Promise<Metadata> {
  return resolveMetadata('/videos', {
    title: "NEET Counselling Videos — Process, Cutoffs and Choice Filling | AdmissionHands",
    description:
      "Short explainers on NEET UG and PG counselling: how the rounds work, how to read a closing rank, and how to order a choice list.",
  });
}


export const revalidate = 0;

export default async function VideosPage() {
  const videos = await getVideos();

  return (
    <div className="flex flex-col flex-grow bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <StructuredData
        data={[
          webPage({
            name: "NEET Counselling Videos",
            description:
              "Short explainers on how NEET UG and PG counselling actually works.",
            path: "/videos",
          }),
          breadcrumb([{ name: "Home", path: "/" }, { name: "Videos", path: "/videos" }]),
        ]}
      />
      <div className="flex-grow">
        {/* Modern Compact Header Section with clean light theme styling */}
        <section className="relative overflow-hidden py-12 md:py-16 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          {/* Subtle soft gradient background instead of heavy dark bg */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-cyan-50/50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-cyan-200/20 dark:bg-cyan-900/10 blur-[100px] pointer-events-none -z-10" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-teal-100/25 dark:bg-teal-900/5 blur-[80px] pointer-events-none -z-10" />

          <div className="container-custom relative">
            <div className="max-w-3xl text-center md:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/30 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                Admission Video Guides & Counseling
              </span>
              <h1 className="mb-4 text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-cyan-500 dark:from-cyan-400 dark:to-cyan-500">Video Resources</span>
              </h1>
              <p className="text-sm md:text-base font-semibold leading-relaxed text-slate-500 dark:text-slate-400 max-w-2xl">
                Stay updated with the latest trends, counselling guides, and expert advice on medical admissions in India and abroad.
              </p>
            </div>
          </div>
        </section>

        <VideosClient videos={videos} />
      </div>
    </div>
  );
}
