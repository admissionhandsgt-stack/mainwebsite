import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.admissionhands.com").replace(
  /\/$/,
  "",
);

/**
 * robots.txt, generated so it stays in step with the sitemap route.
 *
 * The file this replaces listed four user agents and allowed everything, with
 * no sitemap reference and nothing keeping crawlers out of the admin or the
 * API. Disallowing those is not a security control — the admin enforces its
 * own session — it just keeps them out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // /api/content/ is the public, edge-cached CMS read that client
        // components draw images and copy from. Google renders with
        // JavaScript, and a blocked fetch is content it never sees; the longer
        // (more specific) rule wins over the /api/ disallow.
        allow: ["/", "/api/content/"],
        disallow: ["/admin", "/admin/", "/api/", "/account", "/account/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
