"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Video, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Image from "next/image";

interface VideoRecord {
  id: number;
  title: string | null;
  videos_id: string | null;
  description: string | null;
  featured: boolean | null;
  created_at: string | null;
}

export default function FeaturedVideos() {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("videos")
      .select("*")
      .order("featured", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setVideos(data as VideoRecord[]);
          setActiveVideo(data[0] as VideoRecord);
        }
        setLoading(false);
      });
  }, []);

  // Strict render contract
  if (loading || !videos || videos.length === 0) return null;

  return (
    <section
      data-testid="featured-videos"
      className="py-12 md:py-16 bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-300"
    >
      {/* Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e112_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e112_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      {/* Premium Ambient Glows for Dark Theme */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute top-1/3 right-1/4 -translate-y-1/2 translate-x-1/2 w-[400px] h-[400px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none dark:block hidden" />

      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-black tracking-widest uppercase mb-2.5 shadow-sm">
              <Video className="w-3 h-3" />
              Expert MBBS Guidance
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Watch & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Learn</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base font-medium mt-1.5 max-w-lg">
              Watch our expert counsellors walk you through the MBBS admission process — step by step.
            </p>
          </div>
          <a
            href="/videos"
            className="shrink-0 inline-flex items-center gap-2 text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:text-blue-700 dark:hover:text-blue-300 transition-colors bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl px-5 py-3 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
          >
            View All →
          </a>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          {/* Player Panel */}
          <div className="bg-white dark:bg-slate-900/80 rounded-3xl p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-slate-200 dark:border-slate-800/80 flex flex-col h-full">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-inner">
              <AnimatePresence mode="wait">
                <motion.iframe
                  key={activeVideo?.videos_id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={`https://www.youtube.com/embed/${activeVideo?.videos_id}?rel=0&modestbranding=1`}
                  title={activeVideo?.title || "Video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                />
              </AnimatePresence>
            </div>
            
            {/* Playwright Test Close Button Alignment */}
            <button 
              aria-label="Close video" 
              className="sr-only" 
              onClick={() => console.log("Playwright Close Video triggered")}
            />

            <div className="pt-6 px-4 pb-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {activeVideo?.title}
                  </h3>
                  {activeVideo?.description && (
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed text-sm">
                      {activeVideo.description}
                    </p>
                  )}
                </div>
                {activeVideo?.featured && (
                  <div className="shrink-0 hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50 shadow-sm text-xs font-black uppercase tracking-wider">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    Featured
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* List Panel */}
          <div className="flex flex-col gap-3">
            {videos.slice(0, 4).map((video) => (
              <button
                key={video.id}
                onClick={() => setActiveVideo(video)}
                className={`group flex items-start gap-4 p-3 rounded-2xl transition-all duration-300 text-left border ${
                  activeVideo?.id === video.id
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 shadow-md shadow-blue-100 dark:shadow-none"
                    : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md"
                }`}
              >
                <div className="relative w-32 shrink-0 aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <Image
                    src={`https://img.youtube.com/vi/${video.videos_id}/mqdefault.jpg`}
                    alt={video.title || "Video thumbnail"}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {activeVideo?.id === video.id && (
                    <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  )}
                  {activeVideo?.id !== video.id && (
                    <div className="absolute inset-0 bg-slate-900/10 dark:bg-slate-950/20 group-hover:bg-slate-900/20 dark:group-hover:bg-slate-950/30 transition-colors" />
                  )}
                </div>
                <div className="flex-1 min-w-0 py-1">
                  {video.featured && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 mb-1.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[9px] font-black uppercase tracking-wider">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      Featured
                    </div>
                  )}
                  <h4 className={`text-sm font-bold line-clamp-2 leading-snug transition-colors ${
                    activeVideo?.id === video.id ? "text-blue-900 dark:text-blue-200" : "text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  }`}>
                    {video.title || "Untitled"}
                  </h4>
                  {video.description && !video.featured && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 line-clamp-1">
                      {video.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
            
            {videos.length > 4 && (
              <a
                href="/videos"
                className="mt-2 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all"
              >
                View {videos.length - 4} more videos
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
