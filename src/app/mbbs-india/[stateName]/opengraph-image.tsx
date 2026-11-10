import { getStatePage } from "@/lib/stateQueries";
import { counsellingYear } from "@/lib/counselStates";
import { OG_SIZE, ogCard, ogNum } from "@/lib/ogCard";

/** This state's MBBS share image (lib/ogCard.tsx): NMC's seats and colleges, government and private. */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "MBBS in the state at a glance — AdmissionHands";
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ stateName: string }> }) {
  const { stateName } = await params;
  let slug = stateName;
  try {
    slug = decodeURIComponent(stateName);
  } catch {
    /* already decoded */
  }
  const p = await getStatePage(slug.toLowerCase()).catch(() => null);
  if (!p?.nmc) return ogCard({ eyebrow: "MBBS by state", title: "MBBS seats, colleges and counselling", stats: [] });
  const n = p.nmc;
  return ogCard({
    eyebrow: `MBBS ${counsellingYear()} · ${p.state.name}`,
    title: `MBBS seats in ${p.state.name}: colleges & cut off`,
    subtitle: "Every college with NMC's seats, the counselling and the cut off band",
    stats: [
      { value: ogNum(n.seats), label: "MBBS seats (NMC)" },
      { value: ogNum(n.colleges), label: "Colleges" },
      { value: ogNum(n.govtSeats), label: `Govt seats, ${n.govtColleges} colleges` },
      { value: ogNum(n.seats - n.govtSeats), label: "Private & deemed seats" },
    ],
  });
}
