/**
 * The summary an approver ✅'d for a counselling notice (Zyn's `public_brief` and `public_points` — exactly what the
 * posted poster printed), under the notice's title on the state pages and /neet-counselling-updates (owner, 2026-11-16:
 * "email bot se manually copy karke karna padta hai usko chod do"). Never Zyn's working `brief` / `points`. A notice
 * sent before the field existed has none, and shows its title alone.
 */
export default function NoticeSummary({ brief, points }: { brief: string | null; points: string[] }) {
  if (!brief && !points.length) return null;
  return (
    <div className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
      {brief && <p className="text-foreground/85">{brief}</p>}
      {points.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
