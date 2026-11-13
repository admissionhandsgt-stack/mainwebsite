import Link from "@/components/ui/Link";

export type LinkGroup = { key: string; label: string; items: { href: string; name: string; note?: string }[] };

/**
 * A long list of college links, grouped (2026-11-13 organise pass). The PG state page drew each of Maharashtra's ~200
 * colleges as its own bordered card with its type under the name — 18,500px on a phone. Now the type is the group's
 * heading, and the names run on as links separated by "·" on a phone (the BranchStateIndex pattern, 2026-11-09) and sit
 * in two or three columns from `sm` up. Every college and every link stays; only the boxes went.
 */
export default function CollegeLinkGroups({ groups, className = "" }: { groups: LinkGroup[]; className?: string }) {
  return (
    <div className={className}>
      {groups.map((g) => (
        <div key={g.key} className="mt-6 first:mt-0">
          <h3 className="text-[12.5px] font-bold uppercase tracking-wide text-muted-foreground">
            {g.label} <span className="tnum font-semibold">({g.items.length})</span>
          </h3>
          <ul className="mt-2 text-[14px] leading-7 text-foreground sm:columns-2 sm:gap-x-8 sm:leading-snug lg:columns-3">
            {g.items.map((c, i) => (
              <li key={c.href} className="inline sm:block sm:break-inside-avoid sm:border-b sm:border-border/60 sm:py-2">
                <Link href={c.href} className="font-medium text-foreground underline-offset-2 hover:text-primary-strong hover:underline">
                  {c.name}
                </Link>
                {c.note && <span className="text-[12px] text-muted-foreground"> ({c.note})</span>}
                {i < g.items.length - 1 && (
                  <span className="text-muted-foreground sm:hidden" aria-hidden="true">
                    {" · "}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
