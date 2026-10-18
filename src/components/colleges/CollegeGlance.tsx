import { BAND_FOOTNOTE, FEE_FOOTNOTE } from "@/lib/chance";
import { money, type CollegeSummary } from "@/lib/collegeSnippet";

/**
 * The summary box under a college's H1: the numbers its search snippet quotes,
 * and nothing the data does not hold — a tile with no figure is left out
 * rather than shown as a dash. Sits on the dark header of both templates.
 */
export default function CollegeGlance({ s }: { s: CollegeSummary }) {
  const n = (v: number) => v.toLocaleString("en-IN");
  const tiles: { label: string; value: string; sub?: string }[] = [];
  if (s.band)
    tiles.push({
      label: `General cutoff${s.band.year ? ` ${s.band.year}` : ""}*`,
      value: s.band.text,
      sub: s.kind === "ug" ? (/quota|\baiq\b/i.test(s.band.quota) ? s.band.quota : `${s.band.quota} quota`) : `${s.band.course} · ${s.band.quota}`,
    });
  if (s.fee) tiles.push({ label: "Tuition / year*", value: s.fee });
  if (s.seats)
    tiles.push({
      label: s.kind === "ug" ? `${s.course} seats` : s.kind === "dnb" ? "DNB seats" : "PG seats",
      value: n(s.seats),
      sub: s.branches ? `${s.branches} ${s.kind === "dnb" ? (s.branches === 1 ? "speciality" : "specialities") : "branches"}` : undefined,
    });
  if (s.stipend) tiles.push({ label: "Stipend / month", value: money(s.stipend), sub: "First year, as published" });
  if (s.type) tiles.push({ label: "Type", value: s.type, sub: s.established ? `Est. ${s.established}` : undefined });
  else if (s.established) tiles.push({ label: "Established", value: String(s.established) });

  if (!tiles.length) return null;
  return (
    <div className="mt-8">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/55">{t.label}</dt>
            <dd className="tnum font-heading mt-1 truncate text-[19px] font-extrabold leading-tight text-white md:text-[21px]">{t.value}</dd>
            {t.sub && <dd className="mt-0.5 truncate text-[12px] text-white/60">{t.sub}</dd>}
          </div>
        ))}
      </dl>
      {(s.band || s.fee) && (
        <p className="mt-3 max-w-[90ch] text-[11.5px] leading-relaxed text-white/50">
          {s.band ? BAND_FOOTNOTE : ""} {s.fee ? FEE_FOOTNOTE.replace(/^\*/, "") : ""}
        </p>
      )}
    </div>
  );
}
