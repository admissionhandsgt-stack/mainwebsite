/**
 * "MD Radio Diagnosis" -> "md-radio-diagnosis".
 *
 * Its own file, with no imports, because both a server query layer and a
 * client component need it. Taking it from `branchQueries.ts` would pull the
 * `postgres` driver into the browser bundle — the `Can't resolve 'net'` build
 * failure this codebase has now hit three times.
 *
 * Stable by contract: these slugs are live URLs, so changing this function
 * breaks every link into the branch pages and every result Google holds.
 */
export function branchSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
