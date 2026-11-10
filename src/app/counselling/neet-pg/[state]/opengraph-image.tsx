import { getPgStatePage } from "@/lib/pgStateQueries";
import { getNmcPgForState } from "@/lib/nmcData";
import { getStateSeatMatrix } from "@/lib/pgSeatData";
import { counsellingYear } from "@/lib/counselStates";
import { OG_SIZE, ogCard, ogNum } from "@/lib/ogCard";

/** The NEET PG counselling page's share image (lib/ogCard.tsx). */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "NEET PG counselling in the state — AdmissionHands";
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const p = await getPgStatePage(state).catch(() => null);
  if (!p) return ogCard({ eyebrow: "NEET PG counselling", title: "Expert NEET PG counselling, state by state", stats: [] });
  const [nmc, mcc] = await Promise.all([getNmcPgForState(p.name).catch(() => null), getStateSeatMatrix(p.name).catch(() => null)]);
  return ogCard({
    eyebrow: `NEET PG counselling ${counsellingYear()}`,
    title: `NEET PG counselling in ${p.name}`,
    subtitle: "State quota and MCC rounds, planned with an expert",
    badge: "Talk to a counsellor",
    stats: [
      { value: ogNum(p.mdmsCount), label: "MD/MS colleges" },
      { value: nmc ? ogNum(nmc.md + nmc.ms) : "", label: "MD/MS seats (NMC)" },
      { value: mcc ? ogNum(mcc.total) : "", label: `MCC seats ${mcc?.year ?? ""}` },
    ],
  });
}
