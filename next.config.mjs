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
  // Announcing the framework and its version only helps someone choosing an
  // exploit to try.
  poweredByHeader: false,

  /**
   * The row-level cutoff explorers are gone.
   *
   * They asked a visitor to scan 230,000 rows for something the predictor
   * answers from their own rank in one step, and the per-college pages cover
   * the same numbers with context around them. These are permanent rather
   * than temporary because the pages are not coming back — a 302 would leave
   * the dead URLs in the index indefinitely.
   */
  async redirects() {
    return [
      { source: "/mbbs-india/cutoffs", destination: "/mbbs-india/predictor", permanent: true },
      { source: "/md-ms-india/cutoffs", destination: "/md-ms-india/predictor", permanent: true },
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
