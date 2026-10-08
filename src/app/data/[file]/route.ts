import { getDataset, SITE, toCsv } from "@/lib/openData";

/**
 * /data/<id>.csv — an open dataset as CSV (lib/openData.ts). Summary tables
 * only, the same the public pages show. The Link header names the page to
 * cite; the file itself is noindex, so it never competes with that page.
 */
export const revalidate = 3600;

export async function GET(_request: Request, { params }: { params: { file: string } }) {
  const id = params.file.replace(/\.csv$/i, "");
  if (!params.file.toLowerCase().endsWith(".csv")) return new Response("Not found", { status: 404 });
  const d = await getDataset(id);
  if (!d) return new Response("Not found", { status: 404 });
  return new Response(toCsv(d), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="admissionhands-${d.id}.csv"`,
      "cache-control": "public, max-age=3600, s-maxage=3600",
      "x-robots-tag": "noindex",
      link: `<${SITE}${d.page}>; rel="canonical"`,
    },
  });
}
