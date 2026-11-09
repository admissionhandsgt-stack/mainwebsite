import { AlertTriangle, ExternalLink } from "lucide-react";
import { pageCopy } from "@/lib/pageCopy";
import type { ScheduleRound } from "@/lib/neetPgSchedule";

/**
 * "MCC posted a notice on 9 Nov 2026 for Round 2: '…'. These dates may change — MCC's notice is the final word."
 * Shown above any table of MCC's dates while a round carries an unread notice (`revision`, set by lib/zynNotices.ts
 * when MCC reschedules, postpones or extends and the new dates could not be read in; cleared when they are). Owner,
 * 2026-11-09: MCC revises its dates, and the site must never go on showing the old ones as if nothing changed.
 * Words: Admin → Content → "Site: MCC dates may change".
 */
const day = (iso?: string) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};

export default async function ScheduleRevisionNote({ rows, className = "" }: { rows: ScheduleRound[]; className?: string }) {
  const flagged = rows.filter((r) => r.revision?.title);
  if (!flagged.length) return null;
  const copy = await pageCopy("site.schedule_revision", {});
  return (
    <div className={`space-y-2 ${className}`} role="note">
      {flagged.map((r) => {
        const on = day(r.revision!.on);
        return (
          <div
            key={r.round}
            className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20 text-[14px] leading-relaxed text-foreground"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <p>
              <strong>
                {copy.lead.replace("{round}", r.round).replace("{date}", on ?? "").replace(/\s+on\s*:/, ":").replace(/\s{2,}/g, " ")}
              </strong>{" "}
              “{r.revision!.title}”. {copy.note}
              {r.revision!.url && (
                <>
                  {" "}
                  <a
                    href={r.revision!.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-primary-strong underline decoration-dotted underline-offset-2 hover:text-primary dark:text-primary"
                  >
                    {copy.link} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
