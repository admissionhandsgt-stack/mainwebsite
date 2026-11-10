import { getPgStatePage } from "@/lib/pgStateQueries";
import { getNmcPgForState } from "@/lib/nmcData";
import { getStateSeatMatrix } from "@/lib/pgSeatData";
import { getStipends } from "@/lib/cutoffHubQueries";
import { counsellingYear } from "@/lib/counselStates";
import { OG_SIZE, ogCard, ogNum, ogMoney } from "@/lib/ogCard";

/** This state's PG share image (lib/ogCard.tsx): MD/MS colleges, NMC's seats, MCC's seats, the government stipend. */
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "NEET PG in the state at a glance — AdmissionHands";
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPgStatePage(slug).catch(() => null);
  if (!p) return ogCard({ eyebrow: "NEET PG by state", title: "MD/MS seats, fees and counselling", stats: [] });
  const [nmc, mcc, st] = await Promise.all([
    getNmcPgForState(p.name).catch(() => null),
    getStateSeatMatrix(p.name).catch(() => null),
    getStipends().catch(() => null),
  ]);
  const stipend = st?.states.find((s) => s.state === p.name);
  return ogCard({
    eyebrow: `NEET PG ${counsellingYear()} · ${p.name}`,
    title: `MD/MS in ${p.name}: seats, cut off & fees`,
    subtitle: "Branch-wise cut off by quota, the state's own round, fees, stipend and bond",
    stats: [
      { value: ogNum(p.mdmsCount), label: "MD/MS colleges" },
      { value: nmc ? ogNum(nmc.md + nmc.ms) : "", label: "MD/MS seats (NMC)" },
      { value: mcc ? ogNum(mcc.total) : "", label: `MCC seats ${mcc?.year ?? ""}` },
      { value: stipend?.govtMedian ? ogMoney(stipend.govtMedian) : "", label: "Govt stipend / month" },
    ],
  });
}
