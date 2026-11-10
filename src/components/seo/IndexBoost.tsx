import Link from "@/components/ui/Link";
import { Compass } from "lucide-react";
import { pageCopy } from "@/lib/pageCopy";
import { currentPath } from "@/lib/pageDates";
import { getIndexBoost } from "@/lib/indexBoost";

/**
 * "More on <topic>" above the footer of a page Google has indexed: its neighbours Google has not indexed yet
 * (lib/indexBoost.ts), rotating weekly. Nothing renders on a page that is not indexed or has no such neighbours.
 * Heading: Admin → Content → "Site: more pages nearby" ({topic}); a blank heading hides the block.
 */
export default async function IndexBoost() {
  const path = await currentPath();
  const boost = await getIndexBoost(path).catch(() => null);
  if (!boost) return null;
  const copy = await pageCopy("site.index_boost", { topic: boost.topic }).catch(() => ({ heading: "" }));
  if (!copy.heading) return null;
  return (
    <section data-search-links className="container-custom py-6" aria-labelledby="index-boost-heading">
      <h2 id="index-boost-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Compass className="h-4 w-4 text-primary-strong" aria-hidden="true" />
        {copy.heading}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {boost.links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex min-h-[40px] items-center rounded-full border border-border bg-surface-1 px-3.5 py-1.5 text-[13px] text-foreground transition-colors hover:border-primary hover:text-primary-strong"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
