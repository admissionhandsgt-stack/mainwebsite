import React from 'react';
import RecordActions from '../shared/RecordActions';
import { PlayCircle, Star } from 'lucide-react';
import { youtubeId } from "@/lib/youtube";
import { Badge, EmptyState } from '@/components/admin/ui';

interface Video {
  id: number;
  title: string;
  videos_id: string;
  description?: string;
  created_at: string;
  featured?: boolean;
}

interface VideoListProps {
  videos: Video[];
  onEdit: (video: Video) => void;
  onDelete: (id: number) => void;
  isDeleting?: boolean;
}

const added = (v: string) =>
  new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** One row per video: thumbnail (opens it on YouTube), title, note, actions. */
const VideoList = ({ videos, onEdit, onDelete, isDeleting }: VideoListProps) => {
  if (videos.length === 0) {
    return <EmptyState icon={PlayCircle} title="No videos found" hint="Add your first video to start the library." />;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {videos.map((video) => {
        const id = youtubeId(video.videos_id);
        return (
          <li key={video.id} className="flex gap-4 px-4 py-4 sm:px-5">
            <a
              href={`https://www.youtube.com/watch?v=${id}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Watch ${video.title} on YouTube`}
              className="group relative block aspect-video w-28 shrink-0 self-start overflow-hidden rounded-lg bg-slate-100 sm:w-40"
            >
              <img
                src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition-colors group-hover:bg-slate-900/30">
                <PlayCircle className="h-7 w-7 text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </a>

            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-start lg:gap-6">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">{video.title}</h3>
                  {video.featured && (
                    <Badge tone="info">
                      <Star className="h-3 w-3 fill-current" />
                      Featured
                    </Badge>
                  )}
                </div>
                {video.description && (
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-500">{video.description}</p>
                )}
                <p className="mt-1.5 text-xs text-slate-400">
                  Added {added(video.created_at)}
                  {id && (
                    <>
                      {' · '}
                      <span className="font-mono">{id}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="lg:shrink-0">
                <RecordActions
                  onEdit={() => onEdit(video)}
                  onDelete={() => onDelete(video.id)}
                  isDeleting={isDeleting}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default VideoList;
