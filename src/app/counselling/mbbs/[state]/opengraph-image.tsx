import { getStatePage } from "@/lib/stateQueries";
import { counsellingYear } from "@/lib/counselStates";
import { OG_SIZE, ogCard, ogNum } from "@/lib/ogCard";

/** The MBBS counselling page's share image (lib/ogCard.tsx). */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "MBBS counselling in the state — AdmissionHands";
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const p = await getStatePage(state).catch(() => null);
  if (!p?.nmc) return ogCard({ eyebrow: "MBBS counselling", title: "Expert MBBS counselling, state by state", stats: [] });
  return ogCard({
    eyebrow: `MBBS counselling ${counsellingYear()}`,
    title: `MBBS counselling in ${p.state.name}`,
    subtitle: "State quota and MCC rounds, planned with an expert",
    badge: "Talk to a counsellor",
    stats: [
      { value: ogNum(p.nmc.seats), label: "MBBS seats (NMC)" },
      { value: ogNum(p.nmc.colleges), label: "Colleges" },
      { value: ogNum(p.nmc.govtSeats), label: "Government seats" },
    ],
  });
}
