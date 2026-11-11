import { BellRing, ExternalLink } from "lucide-react";
import { pageCopy } from "@/lib/pageCopy";
import { getStateNotices } from "@/lib/stateNotices";
import SectionHead from "@/components/ui/SectionHead";
import Link from "@/components/ui/Link";

/**
 * "<State> counselling 2026: latest notices" on the state's MBBS and MD/MS pages — the counselling authority's own
 * notices, newest first, each linked to the original (lib/stateNotices.ts). Renders nothing when the state has none in
 * the last 75 days. Words: Admin → Content → "Site: latest notices on state pages".
 */
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

export default async function StateNotices({ state, level }: { state: string; level: "pg" | "ug" }) {
  const notices = await getStateNotices(state, level);
  if (!notices.length) return null;
  const exam = level === "pg" ? "NEET PG" : "NEET UG";
  // The year the newest notice was published in: the counselling the list is about.
  const year = new Date(notices[0].on).getFullYear();
  const copy = await pageCopy("site.state_notices", { state, exam, year });
  return (
    <section className="container-custom pt-10 md:pt-14">
      <SectionHead icon="list" eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro} />
      <ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
        {notices.map((n) => (
          <li key={`${n.url}-${n.title}`} className="flex gap-3 px-4 py-3">
            <BellRing className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              {n.url ? (
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-placement={`state_notice_${level}`}
                  className="break-words text-[14.5px] font-semibold leading-snug text-foreground hover:text-primary hover:underline"
                >
                  {n.title}
                  <ExternalLink className="ml-1 inline h-3.5 w-3.5 align-[-2px] text-muted-foreground" aria-hidden="true" />
                </a>
              ) : (
                <span className="break-words text-[14.5px] font-semibold leading-snug text-foreground">{n.title}</span>
              )}
              <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                <time dateTime={n.on.slice(0, 10)}>{day(n.on)}</time>
              </p>
            </div>
          </li>
        ))}
      </ul>
      {copy.note && <p className="mt-2 text-[12.5px] text-muted-foreground">{copy.note}</p>}
      {/* Every authority's notices on one page (2026-11-11). */}
      <p className="mt-2 text-[13.5px]">
        <Link href="/neet-counselling-updates" className="font-semibold text-primary-strong hover:underline dark:text-primary">
          MCC and every state&apos;s latest {exam} notices →
        </Link>
      </p>
    </section>
  );
}
