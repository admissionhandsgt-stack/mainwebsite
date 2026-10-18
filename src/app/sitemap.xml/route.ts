import { indexXml, sitemapGroups, XML_HEADERS } from "@/lib/sitemapData";

/**
 * /sitemap.xml — the index of the per-type sitemaps (lib/sitemapData.ts).
 * Same address Search Console and robots.txt already point at.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(indexXml(await sitemapGroups()), { headers: XML_HEADERS });
}
