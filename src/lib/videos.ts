/**
 * Videos for the marketing pages.
 *
 * Reads PostgreSQL through `content.ts`. The shape below is kept as it was
 * (snake_case `videos_id`, `created_at`) so every consumer keeps working.
 */

import { getVideos as getVideosFromDb } from "@/lib/content";

export interface VideoRecord {
  id: number;
  title: string;
  videos_id: string;
  description?: string;
  created_at: string;
  featured?: boolean;
}

/**
 * Shown only when the database returns nothing at all — a fresh install or an
 * outage. Real content always wins over these.
 */
export const DEFAULT_VIDEOS: VideoRecord[] = [
  {
    id: 1,
    title: "Introduction to Medical School Admissions",
    videos_id: "NEDSLAH9hgw",
    description: "Learn about the medical school admissions process with our comprehensive guide.",
    created_at: new Date(0).toISOString(),
    featured: true,
  },
  {
    id: 2,
    title: "MBBS Application Process Explained",
    videos_id: "9bZkp7q19f0",
    description: "How the MBBS application process works, start to finish.",
    created_at: new Date(0).toISOString(),
    featured: false,
  },
];

export async function getVideos(limit?: number): Promise<VideoRecord[]> {
  const rows = await getVideosFromDb(limit);
  if (rows.length === 0) return limit ? DEFAULT_VIDEOS.slice(0, limit) : DEFAULT_VIDEOS;

  return rows.map((v) => ({
    id: v.id,
    title: v.title,
    videos_id: v.videoId,
    description: v.description ?? undefined,
    created_at: new Date().toISOString(),
    featured: v.featured,
  }));
}
