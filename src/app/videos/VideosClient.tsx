"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import YouTubeIframePlayer from "@/components/YouTubeIframePlayer";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { VideoRecord } from "@/lib/videos";
import { Play, PlayCircle, Star, ArrowRight, HelpCircle, Laptop } from "lucide-react";

const VIDEOS_PER_PAGE = 6;

export function VideosClient({ videos }: { videos: VideoRecord[] }) {
  const [page, setPage] = useState(1);
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);

  const selectedVideo = useMemo(
    () => videos.find((video) => video.id === selectedVideoId) ?? null,
    [selectedVideoId, videos]
  );

  const totalPages = Math.ceil(videos.length / VIDEOS_PER_PAGE);
  const startIndex = (page - 1) * VIDEOS_PER_PAGE;
  const paginatedVideos = videos.slice(startIndex, startIndex + VIDEOS_PER_PAGE);

  const currentVideoIndex = selectedVideo
    ? videos.findIndex((video) => video.id === selectedVideo.id)
    : -1;

  const handlePrevVideo = () => {
    if (currentVideoIndex > 0) {
      setSelectedVideoId(videos[currentVideoIndex - 1].id);
    }
  };

  const handleNextVideo = () => {
    if (currentVideoIndex >= 0 && currentVideoIndex < videos.length - 1) {
      setSelectedVideoId(videos[currentVideoIndex + 1].id);
    }
  };

  if (!videos || videos.length === 0) return null;

  return (
    <section className="py-10 md:py-12 container-custom">
      {selectedVideo ? (
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Now Playing</h2>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-4 md:p-6 transition-all duration-300">
            <YouTubeIframePlayer
              videoId={selectedVideo.videos_id}
              title={selectedVideo.title}
              onPrevious={handlePrevVideo}
              onNext={handleNextVideo}
              hasPrevious={currentVideoIndex > 0}
              hasNext={currentVideoIndex < videos.length - 1}
            />
            <div className="mt-6">
              <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-snug">{selectedVideo.title}</h3>
              {selectedVideo.description && (
                <p className="mt-3 text-sm leading-relaxed font-semibold text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100/80 dark:border-slate-900">
                  "{selectedVideo.description}"
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setSelectedVideoId(null)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-55 dark:hover:bg-slate-900/60 font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-sm"
            >
              Back to all videos
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {paginatedVideos.map((video) => (
            <div
              key={video.id}
              className="group relative flex h-full flex-col rounded-[2rem] border border-slate-100/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(59,130,246,0.1)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-300 transform hover:-translate-y-1"
            >
              <div 
                className="relative mb-5 aspect-video overflow-hidden rounded-[1.25rem] cursor-pointer"
                onClick={() => setSelectedVideoId(video.id)}
              >
                <Image
                  src={`https://img.youtube.com/vi/${video.videos_id}/mqdefault.jpg`}
                  alt={video.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30 opacity-100 transition-all duration-300">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 dark:bg-slate-900/95 text-blue-600 dark:text-blue-400 shadow-md transform group-hover:scale-110 transition-transform duration-300">
                    <Play size={18} className="fill-current ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="flex-grow flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    {video.featured && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-955/20 text-amber-700 dark:text-amber-450 border border-amber-200 dark:border-amber-900/30 text-[9px] font-black uppercase tracking-wider">
                        <Star size={10} className="fill-current" />
                        Featured
                      </span>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      Counselling Guide
                    </span>
                  </div>
                  <h3 
                    onClick={() => setSelectedVideoId(video.id)}
                    className="mb-2 text-sm md:text-base font-black text-slate-800 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer leading-snug line-clamp-2"
                  >
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="line-clamp-2 text-xs md:text-sm font-semibold italic text-slate-400 dark:text-slate-500 leading-relaxed mb-4">
                      "{video.description}"
                    </p>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-50 dark:border-slate-800/60 pt-4">
                  <button
                    onClick={() => setSelectedVideoId(video.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 group/btn"
                  >
                    Watch Now
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && !selectedVideo && (
        <Pagination className="mt-10">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => page > 1 && setPage(page - 1)}
                className={page === 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink
                  isActive={page === i + 1}
                  onClick={() => setPage(i + 1)}
                  className="cursor-pointer"
                >
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => page < totalPages && setPage(page + 1)}
                className={page === totalPages ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {videos.length > 0 && (
        <div className="mt-6 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">
          <div>
            Showing{" "}
            {selectedVideo
              ? `video ${currentVideoIndex + 1}`
              : `${Math.min(startIndex + 1, videos.length)}-${Math.min(startIndex + VIDEOS_PER_PAGE, videos.length)}`}{" "}
            of {videos.length} guides
          </div>
        </div>
      )}
    </section>
  );
}
