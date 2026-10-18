// Read the sitemap the way a crawler does: /sitemap.xml is an index of per-type
// sitemaps since 2026-10-17 (src/lib/sitemapData.ts), so follow it.
//
//   const { index, children, entries } = await readSitemap("https://www.admissionhands.com");

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));

export async function readSitemap(base, fetchText = async (u) => (await fetch(u)).text()) {
  const b = base.replace(/\/$/, "");
  const root = await fetchText(`${b}/sitemap.xml`);
  const isIndex = /<sitemapindex[\s>]/.test(root);
  const children = isIndex ? locs(root) : [];
  // Children are read from the base being checked, whatever host their <loc> names
  // (a local or tunnelled run would otherwise read production's files).
  const files = isIndex ? await Promise.all(children.map((u) => fetchText(b + new URL(u).pathname))) : [root];
  const entries = files.flatMap((xml) =>
    [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
      loc: m[1].match(/<loc>([^<]+)<\/loc>/)?.[1]?.replace(/&amp;/g, "&"),
      lastmod: m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? null,
    })),
  );
  return { index: root, isIndex, children, files, entries: entries.filter((e) => e.loc) };
}
