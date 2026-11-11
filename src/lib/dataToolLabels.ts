import { pageCopy } from "@/lib/pageCopy";
import type { ToolLabels } from "@/components/ui/DataTools";

/** The data tools' words for a page (Admin → Content → "Site: data tools"), with that page's own search hint. Server only. */
export async function toolLabels(hint?: "fees_search" | "stipend_search" | "notices_search" | "bond_search"): Promise<ToolLabels> {
  const c = await pageCopy("site.data_tools");
  return {
    search: (hint && c[hint]) || c.search,
    all: c.all,
    sort: c.sort,
    pageOrder: c.pageOrder,
    reset: c.reset,
    showing: c.showing,
    none: c.none,
    share: c.share,
    copied: c.copied,
    days: c.days,
  };
}
