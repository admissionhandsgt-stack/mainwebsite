/**
 * /neet-pg-process's lists from the admin (2026-10-18), each falling back to what
 * shipped when its collection is empty. Server only.
 *
 *   pg_process_rounds    title = round, subtitle = its tag (R1, R2…), body = the one-line
 *                        summary, data.detail = one point per line, data.watch = the trap
 *   pg_process_mistakes  title, body
 *   pg_schedule          title = round, data.aiq, data.aiq_join_by, data.state, data.state_join_by
 *                        — MCC's dates; replace the rows each cycle, revise them when MCC does
 */

import { getBlocks } from "@/lib/content";
import { PG_MISTAKES, PG_ROUNDS, type PgRound } from "@/lib/pgProcessDefaults";
import { NEET_PG_SCHEDULE, type ScheduleRound } from "@/lib/neetPgSchedule";

const str = (v: unknown) => String(v ?? "").trim();
const lines = (v: unknown) =>
  String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

export async function getPgProcessContent(): Promise<{
  rounds: PgRound[];
  mistakes: { title: string; body: string }[];
  schedule: ScheduleRound[];
}> {
  const [r, m, s] = await Promise.all([getBlocks("pg_process_rounds"), getBlocks("pg_process_mistakes"), getBlocks("pg_schedule")]);
  return {
    rounds: r.length
      ? r
          .filter((b) => b.title)
          .map((b) => ({
            tag: str(b.subtitle) || "—",
            title: str(b.title),
            summary: str(b.body),
            detail: lines(b.data?.detail),
            watch: str(b.data?.watch) || undefined,
          }))
      : PG_ROUNDS,
    mistakes: m.length ? m.filter((b) => b.title).map((b) => ({ title: str(b.title), body: str(b.body) })) : PG_MISTAKES,
    schedule: s.length
      ? s
          .filter((b) => b.title)
          .map((b) => ({
            round: str(b.title),
            aiq: str(b.data?.aiq) || "—",
            aiqJoinBy: str(b.data?.aiq_join_by) || "—",
            state: str(b.data?.state) || "—",
            stateJoinBy: str(b.data?.state_join_by) || "—",
          }))
      : NEET_PG_SCHEDULE.rounds,
  };
}
