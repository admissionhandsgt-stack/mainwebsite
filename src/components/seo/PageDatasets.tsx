import { datasetLd, getDatasetsForPage } from "@/lib/openData";
import { getPageDates } from "@/lib/pageDates";
import { jsonLd } from "@/lib/jsonLd";

/**
 * The page's own tables as schema.org Datasets (2026-11-11): the same description /data gives them, on the page they
 * come from, dated by the page's own data date — so Google Dataset Search, and the AI answers that read it, find the
 * table where it is. Licence only on the official-results tables (lib/openData.ts CC_BY). Renders nothing for a page
 * with no dataset.
 */
export default async function PageDatasets({ path }: { path: string }) {
  const [sets, dates] = await Promise.all([
    getDatasetsForPage(path).catch(() => []),
    getPageDates().catch(() => ({}) as Record<string, string>),
  ]);
  if (!sets.length) return null;
  const date = (dates as Record<string, string>)[path] ?? null;
  return (
    <>
      {sets.map((d) => (
        <script key={d.id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(datasetLd(d, date)) }} />
      ))}
    </>
  );
}
