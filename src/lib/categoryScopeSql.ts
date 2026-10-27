import { sql, type SQL } from "drizzle-orm";
import {
  eligibleCodes,
  isMinorityCategory,
  isNriCode,
  isServiceCategory,
  LOCAL_QUOTA_RE,
  MINORITY_QUOTA_RE,
  NATIONAL_COUNSELLING_RE,
  NRI_QUOTA_RE,
  OPEN_STATES_COUNSELLING,
  OPEN_TO_ALL_RE,
  PAID_QUOTA_RE,
  SERVICE_EXCEPT_RE,
  SERVICE_QUOTA_RE,
  stateKey,
  UNIVERSITY_QUOTA_RE,
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
    if (!isServiceCategory(category))
      parts.push(sql`(${label} !~* ${SERVICE_QUOTA_RE} OR ${label} ~* ${SERVICE_EXCEPT_RE})`);
    if (!isMinorityCategory(category)) parts.push(sql`${label} !~* ${MINORITY_QUOTA_RE}`);
    if (seatType !== "nri" && !isNriCode(category)) parts.push(sql`${label} !~* ${NRI_QUOTA_RE}`);
  }
  return parts.length ? sql.join(parts, sql` AND `) : sql`TRUE`;
}

/** stateKey, in SQL. */
const stateKeySql = (state: SQL) =>
  sql`replace(replace(replace(regexp_replace(regexp_replace(lower(COALESCE(${state}, '')), ${"\\mand\\M|&"}, '', 'g'), '[^a-z]', '', 'g'), 'islands', 'island'), 'havelli', 'haveli'), 'pondicherry', 'puducherry')`;

/**
 * The WHERE condition for "seats a candidate from these home states can take" — the domicile rule
 * in lib/categoryScope.ts. With no home state it is TRUE: nothing is hidden on a guess.
 */
export function homeStateScope(opts: {
  home: string[];
  counselling: SQL;
  quota: SQL;
  code: SQL;
  state: SQL;
}): SQL {
  const keys = Array.from(new Set(opts.home.map(stateKey).filter(Boolean)));
  if (!keys.length) return sql`TRUE`;
  const counselling = sql`COALESCE(${opts.counselling}, '')`;
  const label = sql`COALESCE(${opts.quota}, '')`;
  return sql`(
    (${counselling} ~* ${NATIONAL_COUNSELLING_RE} AND ${label} !~* ${UNIVERSITY_QUOTA_RE})
    OR ${label} ~* ${OPEN_TO_ALL_RE}
    OR COALESCE(${opts.code}, '') ~* 'all india'
    OR (${label} ~* ${PAID_QUOTA_RE} AND ${label} !~* ${LOCAL_QUOTA_RE})
    OR ${label} IN (
      SELECT DISTINCT q2.label FROM seat_options s2
        JOIN quotas q2 ON q2.id = s2.quota_id
        JOIN counsellings c2 ON c2.id = s2.counselling_id
       WHERE c2.name ILIKE ${OPEN_STATES_COUNSELLING}
    )
    OR ${stateKeySql(opts.state)} IN (${sql.join(keys.map((k) => sql`${k}`), sql`, `)})
  )`;
}
