/**
 * One PG college's official seat-leaving terms, per seat type (`pg_seat_leaving`, migration 0069, loaded by
 * scripts/import_seat_leaving.ts from the PG tool session's official 2026-27 research). Keyed by the seat type in lower
 * case, as `pg_seat_terms.seat_type` spells it. lib/officialLeaving.ts decides how a row is shown.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export interface SeatLeavingRow {
  status: "official" | "official_none_stated" | "dnb_no_sum_set" | "not_confirmed";
  text: string;
}

export const getSeatLeaving = unstable_cache(
  async (slug: string): Promise<Record<string, SeatLeavingRow>> => {
    try {
      const rows = (await db.execute(sql`
        SELECT l.seat_type, l.status, l.public_text FROM pg_seat_leaving l JOIN institutes i ON i.id = l.institute_id
         WHERE i.slug = ${slug} AND i.level = 'pg'`)) as unknown as {
        seat_type: string;
        status: SeatLeavingRow["status"];
        public_text: string;
      }[];
      return Object.fromEntries(rows.map((r) => [r.seat_type.trim().toLowerCase(), { status: r.status, text: r.public_text ?? "" }]));
    } catch {
      return {};
    }
  },
  ["seat-leaving-v2"],
  { revalidate: 3600, tags: ["seat-leaving"] },
);
