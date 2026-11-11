import { Fragment } from "react";
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import Link from "@/components/ui/Link";
import SectionHead from "@/components/ui/SectionHead";
import { collegeName } from "@/lib/collegeName";

/**
 * Every MD/MS college (632) or every MBBS college (831), state by state, as plain links in the server HTML
 * (2026-11-11). Search Console's audit: the directories linked only 12 (MBBS) and 24 (MD/MS) colleges in their HTML —
 * the rest are drawn in the browser or sit on later pages — so most college pages had one link, from their state page,
 * and 381 waited as "Discovered – currently not indexed". Each state is a <details> the reader opens, so a phone does
 * not scroll past 800 names; the links are in the page either way.
 */
type Row = { slug: string; name: string; state: string | null };

const load = (level: "pg" | "ug") =>
  unstable_cache(
    async (): Promise<Row[]> =>
      (await db.execute(
        level === "pg"
          ? sql`SELECT DISTINCT i.slug, i.name, s.name AS state
                  FROM institutes i JOIN seat_options so ON so.institute_id = i.id JOIN courses c ON c.id = so.course_id
                  LEFT JOIN states s ON s.id = i.state_id
                 WHERE i.level = 'pg' AND i.is_active AND i.slug IS NOT NULL
                   AND c.name !~* '^(DNB|DrNB|FNB|Diploma|PG Diploma)'`
          : sql`SELECT DISTINCT i.slug, i.name, s.name AS state
                  FROM institutes i JOIN seat_options so ON so.institute_id = i.id JOIN courses c ON c.id = so.course_id
                  LEFT JOIN states s ON s.id = i.state_id
                 WHERE i.level = 'ug' AND i.is_active AND i.slug IS NOT NULL AND c.name ILIKE 'MBBS'`,
      )) as unknown as Row[],
    ["all-colleges-index-v1", level],
    { revalidate: 86_400, tags: ["seat-data"] },
  )();

const label = (raw: string) => {
  const nm = collegeName(raw);
  return nm.place && !nm.short.toLowerCase().includes(nm.place.toLowerCase()) ? `${nm.short}, ${nm.place}` : nm.short;
};

export default async function AllCollegesIndex({ level, className = "" }: { level: "pg" | "ug"; className?: string }) {
  const rows = await load(level).catch((): Row[] => []);
  if (!rows.length) return null;
  const byState = new Map<string, { slug: string; label: string }[]>();
  for (const r of rows) {
    const st = r.state ?? "Other";
    const list = byState.get(st) ?? [];
    list.push({ slug: r.slug, label: label(r.name) });
    byState.set(st, list);
  }
  const states = [...byState.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  for (const [, list] of states) list.sort((a, b) => a.label.localeCompare(b.label));
  const base = level === "pg" ? "/md-ms-india/colleges" : "/mbbs-india/colleges";
  const what = level === "pg" ? "MD/MS" : "MBBS";

  return (
    <section className={`container-custom ${className}`} aria-labelledby={`all-${level}-colleges`}>
      <SectionHead
        icon="list"
        eyebrow="Every college"
        id={`all-${level}-colleges`}
        title={`All ${rows.length.toLocaleString("en-IN")} ${what} colleges, state by state`}
        intro={`Open a state for its ${what} colleges; each page has the fees, seats, cut off band${level === "pg" ? ", stipend and bond" : ""}.`}
      />
      <div className="mt-6 gap-x-6 rounded-2xl border border-border bg-card p-3 md:p-5 md:columns-2 xl:columns-3">
        {states.map(([state, list]) => (
          <details key={state} className="break-inside-avoid border-b border-border/60 py-2 last:border-0">
            <summary className="cursor-pointer list-none text-[14.5px] font-semibold text-foreground marker:hidden hover:text-primary">
              {state} <span className="font-normal text-muted-foreground">· {list.length}</span>
            </summary>
            <p className="mt-1.5 pb-1 text-[13.5px] leading-[1.9] text-muted-foreground">
              {list.map((c, i) => (
                <Fragment key={c.slug}>
                  <Link href={`${base}/${c.slug}`} className="text-primary-strong hover:underline">
                    {c.label}
                  </Link>
                  {i < list.length - 1 ? " · " : ""}
                </Fragment>
              ))}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
