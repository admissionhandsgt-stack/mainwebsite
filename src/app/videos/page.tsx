import { VideosClient } from "./VideosClient";
import { getVideos } from "@/lib/videos";

export default async function VideosPage() {
  const videos = await getVideos();

  return (
    <div className="flex flex-col flex-grow bg-slate-50">
      <div className="flex-grow">
        <section className="relative overflow-hidden pb-20 pt-16">
          <div className="absolute inset-0 -z-20 bg-slate-900" />
          <div className="absolute inset-0 mesh-gradient opacity-60 -z-10" />

          <div className="container-custom relative">
            <div className="max-w-3xl">
              <h1 className="mb-6 text-4xl font-black tracking-tighter text-white md:text-7xl">
                Featured <span className="gradient-text">Videos</span>
              </h1>
              <p className="text-xl font-medium leading-relaxed text-blue-100/70">
                Stay updated with the latest trends, counseling guides, and expert advice on medical admissions in India and abroad.
              </p>
            </div>
          </div>
        </section>

        <VideosClient videos={videos} />
      </div>
    </div>
  );
}
