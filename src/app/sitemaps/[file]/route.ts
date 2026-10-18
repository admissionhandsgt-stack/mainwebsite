import { SITEMAP_GROUPS, sitemapGroups, urlsetXml, XML_HEADERS, type SitemapGroup } from "@/lib/sitemapData";

/** /sitemaps/<type>.xml — one page type's URLs (lib/sitemapData.ts). */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { file: string } }) {
  const group = params.file.replace(/\.xml$/, "") as SitemapGroup;
  if (!params.file.endsWith(".xml") || !SITEMAP_GROUPS.includes(group)) return new Response("Not found", { status: 404 });
  return new Response(urlsetXml((await sitemapGroups())[group]), { headers: XML_HEADERS });
}
