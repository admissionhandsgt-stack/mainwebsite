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
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
  // Tailwind and next/font inject styles at runtime.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://images.unsplash.com https://img.youtube.com https://www.google-analytics.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
  // GA4 posts its events to google.com/g/collect as well as
  // google-analytics.com; leaving it out silently kills analytics.
  "connect-src 'self' https://www.google-analytics.com https://www.googletagmanager.com https://www.google.com https://region1.google-analytics.com",
  // Nothing here should ever be framed, embed a plugin, or post a form away.
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  // A year of HSTS with preload; the site is HTTPS-only behind Cloudflare.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
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
      { source: '/:path*', headers: SECURITY_HEADERS },
      {
        // The admin is never cached and never indexed.
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },

  images: {
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
