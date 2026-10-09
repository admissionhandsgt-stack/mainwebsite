import withBundleAnalyzer from '@next/bundle-analyzer';

/**
 * Security headers.
 *
 * The site was serving none of these, and was announcing its stack through
 * `X-Powered-By`. The CSP is deliberately not `script-src 'self'` only:
 * Next.js inlines hydration scripts and Google Analytics is loaded from a
 * third party, so 'unsafe-inline' is required until those are nonce-based.
 * It still closes off framing, plugins, form hijacking and base-tag injection.
 */
const CSP = [
  "default-src 'self'",
  // Next's inline hydration bootstrap and GA both need this today.
  // static.cloudflareinsights.com: Cloudflare injects its Web Analytics beacon
  // into every page it proxies. Blocked, it was 48 console errors per audit and
  // no data; allowed, it is the only real-user LCP/INP from Indian visitors
  // we have. Turn it off in the Cloudflare dashboard, not here.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com",
  // Tailwind and next/font inject styles at runtime.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // GA4 sends some hits as an image to googletagmanager.com/a, not only to
  // google-analytics.com. Leaving that host out of img-src blocked those
  // beacons — the page worked, the console said so, and nobody was reading the
  // console. Found by the Playwright gate suite on Android Chrome.
  "img-src 'self' data: blob: https://images.unsplash.com https://img.youtube.com https://www.google-analytics.com https://www.googletagmanager.com",
  // www.google.com for the office map on /know-us, which was blocked — the
  // page showed an empty frame where the map belongs.
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com",
  // GA4 posts its events to google.com/g/collect as well as
  // google-analytics.com; leaving it out silently kills analytics.
  "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://www.google.com https://region1.google-analytics.com https://cloudflareinsights.com",
  // Nothing here should ever be framed, embed a plugin, or post a form away.
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ');

/**
 * /embed/* is the one place other sites may frame (src/app/embed — the open
 * data widgets). It gets its own policy: any ancestor may frame it, and since
 * the widget is plain HTML, no script may run in it at all.
 */
const EMBED_HEADERS = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors *; base-uri 'none'; form-action 'none'",
  },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  // A year of HSTS with preload; the site is HTTPS-only behind Cloudflare.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // "0", not "1; mode=block": the old XSS auditor this switches is itself a
  // known leak vector and is gone from every current browser; CSP is the real
  // protection. Set explicitly because audits flag its absence.
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Built to run as a plain Node server on the VPS, beside Postgres.
   *
   * Cloudflare Workers were the original target and the build still succeeds
   * for them, but they cannot reach this database: Postgres is bound to
   * localhost on the VPS and should stay that way, and an edge worker has no
   * route to it. (Workers also cannot hold a connection pool across requests —
   * the preview served one page and then hung on every request after it.)
   *
   * `standalone` emits a self-contained server with only the dependencies it
   * actually uses, so the deploy is a directory copy rather than an npm
   * install on the box.
   */
  output: 'standalone',

  // src/instrumentation.ts — starts lib/serverWatch.ts, the memory and slow-request log.
  experimental: { instrumentationHook: true },

  // Announcing the framework and its version only helps someone choosing an
  // exploit to try.
  poweredByHeader: false,

  /**
   * Five URLs collapsed into one tool.
   *
   * MBBS, BDS and MD/MS each had their own predictor, and "what happened after
   * round 1" had two more pages — five routes for one question asked about one
   * rank, splitting the search traffic for the phrase people actually type.
   * The course is now a filter and the round movement is a tab, at
   * /neet-college-predictor.
   *
   * The row-level cutoff explorers are gone for a different reason: they asked
   * a visitor to scan 230,000 rows for something the predictor answers from
   * their own rank in one step.
   *
   * All permanent, because none of these pages is coming back — a 302 would
   * leave the dead URLs in the index indefinitely, and the link equity these
   * have earned is the whole reason to redirect rather than delete. The
   * `?course=` lands the visitor on the stream they asked for.
   */
  // Counsellors' digital cards are static files (public/card/*.html). The edge
  // serves them as /card/<name>; this is the same address on the origin.
  async rewrites() {
    return [{ source: '/card/:name([a-z0-9-]+)', destination: '/card/:name.html' }];
  },

  async redirects() {
    const tool = "/neet-college-predictor";
    return [
      { source: "/mbbs-india/predictor", destination: `${tool}?course=mbbs`, permanent: true },
      { source: "/md-ms-india/predictor", destination: `${tool}?course=pg`, permanent: true },
      { source: "/mbbs-india/rounds", destination: `${tool}?course=mbbs`, permanent: true },
      { source: "/md-ms-india/rounds", destination: `${tool}?course=pg`, permanent: true },
      { source: "/mbbs-india/cutoffs", destination: `${tool}?course=mbbs`, permanent: true },
      { source: "/md-ms-india/cutoffs", destination: `${tool}?course=pg`, permanent: true },
      // Fees vs stipend was a whole page for one number, and that number is
      // already on every college's own page — where someone is standing when
      // they actually ask what a seat costs.
      { source: "/md-ms-india/fees", destination: "/md-ms-india/colleges", permanent: true },
    ];
  },

  async headers() {
    return [
      // Every path but /embed/*, which may be framed (EMBED_HEADERS).
      { source: '/:path((?!embed/).*)', headers: SECURITY_HEADERS },
      { source: '/embed/:path*', headers: EMBED_HEADERS },
      {
        // The admin is never cached and never indexed.
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
      {
        // Every API is no-store — except /api/content/*, the read-only public
        // CMS (contact numbers, videos, college lists), whose route sets its
        // own `public, s-maxage=60, stale-while-revalidate=300`. With both, the
        // response carried two contradictory Cache-Control headers and nothing
        // could cache it, so every page view asked Mumbai for the phone number.
        source: '/api/:path((?!content/).*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/api/content/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      // Files Next serves out of public/. Its default is `public, max-age=0`,
      // so Cloudflare went back to the server for the header logo on every
      // page view. These names are not content-hashed and can be replaced in
      // place, so a day rather than immutable, with a week of
      // stale-while-revalidate. uploads/ is not listed: Caddy serves it with
      // its own rule (immutable for upload-generated names, see CLAUDE.md).
      {
        source: '/assets/images/:dir(logos|hero|colleges|exam|misc)/:file*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      {
        source: '/:file(favicon\\.ico|logo\\.png|icon-\\d+\\.png|apple-touch-icon\\.png)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },

  images: {
    // WebP only, and that is a decision about the CDN, not about compression.
    //
    // Next picks the format from the Accept header and serves both from the
    // same URL. Cloudflare's edge (free plan) caches one copy per URL and does
    // not key on Accept, so with AVIF enabled the first Chrome visitor's AVIF
    // would be cached in Mumbai and handed to an iPhone on iOS 15, which cannot
    // draw it — a broken image with nothing in any log. Every browser this
    // audience carries draws WebP. AVIF was about 20% smaller; an image served
    // from an Indian edge instead of Montreal is worth far more than that.
    formats: ['image/webp'],
    // How long a browser may keep an optimised image. Next's default is 60
    // seconds, so a visitor moving between two pages that share a college
    // photograph downloaded it twice — across the world each time. A day is
    // the trade: in-place overwrites (the hero script writes fixed filenames)
    // reach everyone within a day, and inside that day the image is free.
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default bundleAnalyzer(nextConfig);
