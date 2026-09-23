/**
 * Helper for components that take their copy from the CMS.
 *
 * An unset setting arrives as an empty string, which would blank the heading
 * if it were spread over the defaults. `pick` drops empty and missing values
 * so `{ ...DEFAULTS, ...pick(copy) }` keeps the shipped text for anything the
 * admin has not filled in.
 *
 * Safe on both sides of the server/client boundary — it touches no imports.
 */
export function pick<T extends object>(copy?: T): Partial<T> {
  if (!copy) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(copy)) {
    if (typeof value === "string" && value.trim() !== "") out[key] = value;
  }
  return out as Partial<T>;
}
