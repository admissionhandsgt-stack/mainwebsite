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
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/", "/account", "/account/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
