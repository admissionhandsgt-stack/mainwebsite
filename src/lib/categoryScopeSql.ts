import { sql, type SQL } from "drizzle-orm";
import {
  eligibleCodes,
  isMinorityCategory,
  isNriCode,
  isServiceCategory,
  MINORITY_QUOTA_RE,
  NRI_QUOTA_RE,
  SERVICE_QUOTA_RE,
  type ScopeLevel,
  type ScopeSeatType,
} from "@/lib/categoryScope";

/**
 * The WHERE condition for "seats a candidate of this category can take" — lib/categoryScope.ts.
 * `code` is the category code column, `quota` the quota label column (leave it out where the
 * query has no quota join). For the NRI seat type the category is not narrowed: inside an NRI
 * quota the candidate's own category does not decide the seat.
 */
export function categoryScope(opts: {
  level: ScopeLevel;
  category: string;
  seatType?: ScopeSeatType;
  code: SQL;
  quota?: SQL;
}): SQL {
  const { level, category, seatType = "all", code, quota } = opts;
  const parts: SQL[] = [];
  if (seatType !== "nri") {
    const codes = eligibleCodes(level, category);
    // categoryKey, in SQL: upper-cased, spaces and hyphens dropped.
    parts.push(
      sql`regexp_replace(UPPER(${code}), '[[:space:]-]+', '', 'g') IN (${sql.join(codes.map((c) => sql`${c}`), sql`, `)})`,
    );
  }
  if (quota) {
    const label = sql`COALESCE(${quota}, '')`;
    if (!isServiceCategory(category)) parts.push(sql`${label} !~* ${SERVICE_QUOTA_RE}`);
    if (!isMinorityCategory(category)) parts.push(sql`${label} !~* ${MINORITY_QUOTA_RE}`);
    if (seatType !== "nri" && !isNriCode(category)) parts.push(sql`${label} !~* ${NRI_QUOTA_RE}`);
  }
  return parts.length ? sql.join(parts, sql` AND `) : sql`TRUE`;
}
