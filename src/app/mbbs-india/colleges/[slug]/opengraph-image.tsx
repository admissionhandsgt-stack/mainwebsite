import { loadCollegePage } from "@/lib/collegeSnippet";
import { getNirf } from "@/lib/nirf";
import { OG_SIZE, ogCard, ogNum } from "@/lib/ogCard";

/**
 * This MBBS college's share image (lib/ogCard.tsx): seats, the fee bracket, type, founding year, and the public cut off
 * band — the same band the page prints, never the rank behind it; NIRF's rank as the badge where it has one.
 */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "College at a glance — AdmissionHands";
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await loadCollegePage(slug, "ug").catch((e) => {
    console.error("[og college]", e instanceof Error ? e.message.split("\n")[0] : e);
    return null;
  });
  if (!d) return ogCard({ eyebrow: "MBBS colleges", title: "Seats, fees and cut off", stats: [] });
  const s = d.summary;
  const nirf = getNirf(slug, "ug");
  return ogCard({
    eyebrow: [s.course, s.place, s.type].filter(Boolean).join(" · "),
    title: s.short,
    subtitle: s.band ? `Cut off ${s.band.text.replace(/\*$/, "")} (general, ${s.band.quota}${s.band.year ? ` ${s.band.year}` : ""})` : undefined,
    badge: nirf ? `NIRF ${nirf.year} #${nirf.rank}` : undefined,
    stats: [
      { value: s.seats ? ogNum(s.seats) : "", label: `${s.course} seats${s.seatsFromNmc ? " (NMC)" : ""}` },
      { value: s.fee ? s.fee.replace(/\*$/, "").replace(/\s*\/yr$/, "") : "", label: "Fee a year (approx.)" },
      { value: s.established ? String(s.established) : "", label: "Founded" },
      { value: s.beds ? ogNum(s.beds) : "", label: "Hospital beds" },
    ],
  });
}
