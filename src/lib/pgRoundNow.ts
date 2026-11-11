import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getPgProcessContent } from "@/lib/pgProcessContent";
import { getTelegramCue } from "@/lib/mccResults";

/**
 * The NEET PG round in progress and last year's upgrades — shared by /neet-pg-choice-filling and the Hinglish guide
 * /neet-pg-counselling-kaise-hoti-hai (2026-11-11). Server only.
 */

export const PG_COUNSELLING_YEAR = 2026;

/** How many of each round's allotments were upgrades, per year — from MCC's result PDFs. */
export const getUpgrades = unstable_cache(
  async () =>
    (await db.execute(sql`
      SELECT year, round, COUNT(*)::int AS allotted, COUNT(*) FILTER (WHERE status ILIKE 'Upgraded%')::int AS upgraded
        FROM mcc_allotments WHERE round IN ('Round 2', 'Round 3')
       GROUP BY year, round ORDER BY year DESC, round`)) as unknown as { year: number; round: string; allotted: number; upgraded: number }[],
  ["pg-upgrades-v1"],
  { revalidate: 3600, tags: ["mcc"] },
);

/**
 * The round whose choices are being filled now: the round the Telegram cue names — the first of the running
 * counselling's rounds 1–4 whose result is not out — with its own steps from the admin's pg_schedule. Null between
 * counsellings.
 */
export async function liveChoiceRound(): Promise<{ label: string; filling?: string; locking?: string } | null> {
  const [cue, { schedule }] = await Promise.all([getTelegramCue(), getPgProcessContent()]);
  if (!cue || cue.year !== PG_COUNSELLING_YEAR) return null;
  const label = cue.label.replace(/\b\w/g, (c) => c.toUpperCase()); // "Round 2", "Stray Round"
  const key = label.toLowerCase().startsWith("stray") ? "stray" : label.toLowerCase();
  const row = schedule.find((s) => s.round.trim().toLowerCase().startsWith(key));
  return { label, filling: row?.choiceFilling, locking: row?.choiceLocking };
}
