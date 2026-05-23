export interface VideoRecord {
  id: number;
  title: string;
  videos_id: string;
  description?: string;
  created_at: string;
  featured?: boolean;
}

const SUPABASE_URL = "https://autynwxwiplmuajizwfm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJhdXR5bnd4d2lwbG11YWppendmbSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQ0NTM5OTk2LCJleHAiOjIwNjAxMTU5OTZ9.l8UEWyXi98bn-lPQfGSgY1wFsz4WtW2PtHKR53gq6zE";

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
    description: "Expert advice on how to prepare for the MCAT examination.",
    created_at: new Date(0).toISOString(),
    featured: false,
  },
  {
    id: 3,
    title: "Medical School Interview Skills",
    videos_id: "jNQXAC9IVRw",
    description: "Ace your medical school interviews with these essential tips.",
    created_at: new Date(0).toISOString(),
    featured: false,
  },
];

const mapVideo = (item: Record<string, unknown>): VideoRecord => ({
  id: Number(item.id ?? 0),
  title: String(item.title ?? ""),
  videos_id: String(item.videos_id ?? ""),
  description: item.description ? String(item.description) : "",
  created_at: String(item.created_at ?? new Date(0).toISOString()),
  featured: Boolean(item.featured),
});

export async function getVideos(limit?: number): Promise<VideoRecord[]> {
  const query = new URLSearchParams({
    select: "*",
    order: "created_at.desc",
  });

  if (limit) {
    query.set("limit", String(limit));
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/videos?${query.toString()}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      next: { revalidate: 300, tags: ["videos"] },
    });

    if (!response.ok) {
      return DEFAULT_VIDEOS.slice(0, limit ?? DEFAULT_VIDEOS.length);
    }

    const data = (await response.json()) as Record<string, unknown>[];
    const videos = data.map(mapVideo).filter((item) => item.videos_id);
    return videos.length > 0 ? videos : DEFAULT_VIDEOS.slice(0, limit ?? DEFAULT_VIDEOS.length);
  } catch {
    return DEFAULT_VIDEOS.slice(0, limit ?? DEFAULT_VIDEOS.length);
  }
}
