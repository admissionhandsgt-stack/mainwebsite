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

  return (
    <section className="py-16 container-custom">
      {selectedVideo ? (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Now Playing</h2>
          <div className="bg-white rounded-lg shadow-md p-4">
            <YouTubeIframePlayer
              videoId={selectedVideo.videos_id}
              title={selectedVideo.title}
              onPrevious={handlePrevVideo}
              onNext={handleNextVideo}
              hasPrevious={currentVideoIndex > 0}
              hasNext={currentVideoIndex < videos.length - 1}
            />
            <div className="mt-4">
              <h3 className="text-xl font-semibold">{selectedVideo.title}</h3>
              {selectedVideo.description && (
                <p className="mt-2 text-gray-600">{selectedVideo.description}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setSelectedVideoId(null)}
            className="mt-4 text-medical-600 hover:text-medical-800 underline"
          >
            Close player and view all videos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {paginatedVideos.map((video) => (
            <button
              key={video.id}
              type="button"
              className="group flex h-full flex-col rounded-[2.5rem] border border-slate-100 bg-white p-6 text-left shadow-xl transition-all duration-500 hover:shadow-2xl"
              onClick={() => setSelectedVideoId(video.id)}
            >
              <div className="relative mb-6 aspect-video overflow-hidden rounded-[1.5rem]">
                <Image
                  src={`https://img.youtube.com/vi/${video.videos_id}/mqdefault.jpg`}
                  alt={video.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition-all duration-500 group-hover:opacity-100">
                  <div className="flex h-16 w-16 scale-50 items-center justify-center rounded-full border border-white/30 bg-white/20 backdrop-blur-md transition-transform duration-500 group-hover:scale-100">
                    <svg className="h-8 w-8 fill-current text-white" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-900 transition-colors group-hover:text-blue-600">
                  {video.title}
                </h3>
                {video.description && (
                  <p className="line-clamp-3 text-sm font-medium italic leading-relaxed text-slate-600">
                    "{video.description}"
                  </p>
                )}
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
                <span className="text-xs font-black uppercase tracking-widest text-blue-500">
                  Medical Guide
                </span>
                <div className="text-slate-400 transition-transform group-hover:translate-x-1">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && !selectedVideo && (
        <Pagination className="mt-8">
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
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div>
            Showing{" "}
            {selectedVideo
              ? `video ${currentVideoIndex + 1}`
              : `${Math.min(startIndex + 1, videos.length)}-${Math.min(startIndex + VIDEOS_PER_PAGE, videos.length)}`}{" "}
            of {videos.length} videos
          </div>
        </div>
      )}
    </section>
  );
}
