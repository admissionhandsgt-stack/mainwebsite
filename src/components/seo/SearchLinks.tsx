import Link from "@/components/ui/Link";
import { Search } from "lucide-react";
import { pageCopy } from "@/lib/pageCopy";
import { currentPath } from "@/lib/pageDates";
import { getSearchLinks } from "@/lib/searchLinks";

/**
 * "Related searches" above the footer: links this page does not have yet to the pages that answer what people search
 * when Google shows them this one (lib/searchLinks.ts, rebuilt weekly from Search Console). Nothing renders on a page
 * with no suggestions. `data-search-links` lets the weekly rebuild ignore this block when it reads which links a page
 * already has. Heading: Admin → Content → "Site: related searches"; a blank heading hides the block.
 */
export default async function SearchLinks() {
  const path = await currentPath();
  const [links, copy] = await Promise.all([getSearchLinks(path), pageCopy("site.search_links", {}).catch(() => ({ heading: "" }))]);
  if (!links.length || !copy.heading) return null;
  return (
    <section data-search-links className="container-custom py-6" aria-labelledby="search-links-heading">
      <h2 id="search-links-heading" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Search className="h-4 w-4 text-primary-strong" aria-hidden="true" />
        {copy.heading}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link
              href={l.to}
              className="inline-flex min-h-[40px] items-center rounded-full border border-border bg-surface-1 px-3.5 py-1.5 text-[13px] text-foreground transition-colors hover:border-primary hover:text-primary-strong"
            >
              {l.anchor}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
