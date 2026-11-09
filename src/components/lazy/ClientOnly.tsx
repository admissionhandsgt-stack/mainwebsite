"use client";

/**
 * Components the server pages load in the browser only (`ssr: false`). Next 15 allows `ssr: false` only inside a
 * client component, so the server pages (the homepage, /md-ms-india) import them from here (2026-11-09 upgrade).
 */
import dynamic from "next/dynamic";

export const FeaturedVideos = dynamic(() => import("@/components/home/FeaturedVideos"), { ssr: false, loading: () => null });

export const PGCollegesList = dynamic(() => import("@/components/md-ms/PGCollegesList").then((m) => m.PGCollegesList), {
  loading: () => <div className="animate-pulse h-[500px] bg-slate-100 dark:bg-slate-900 rounded-xl container-custom my-12" />,
  ssr: false,
});

export const PGStickyMobileBar = dynamic(() => import("@/components/md-ms/PGStickyMobileBar").then((m) => m.PGStickyMobileBar), { ssr: false });
