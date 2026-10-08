import { OG_IMAGE } from "@/lib/ogImage"
import '../index.css'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import SiteShell from '@/components/SiteShell'
import type { Metadata } from 'next'
import Script from 'next/script'
import { Plus_Jakarta_Sans, Inter, Figtree } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'

import { headers } from 'next/headers'
import { isAdminSubdomain } from '@/utils/envHelper'
import { getNav, getSettings, getLiveAlerts, setting } from '@/lib/content'
import { currentUser } from '@/lib/userAuth'

/*
  Fonts: all three are `swap`, so no text ever waits for one — it paints in the
  size-matched fallback next/font generates and changes face when the file
  lands. What a preload buys is only *when* the file lands, and it buys it by
  competing with the CSS for the first round trips: next/font preloads through
  a `Link` header, so all three (98 KB) started at the same instant as the
  stylesheets, before the page could paint.

  So exactly one is preloaded: Figtree, 21 KB, the face of the hero headline
  on both the homepage and the predictor — the most visible swap there is.
  Inter (body, 49 KB) and Plus Jakarta (h1–h6 without font-heading, 28 KB)
  are fetched when the CSS asks for them.
*/
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  preload: false,
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
})

// Display face — carries every heading and every large number.
const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  // Relative canonical and Open Graph URLs resolve against this. Without it
  // Next.js emits them relative, which crawlers and link unfurlers ignore.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.admissionhands.com',
  ),
  title: 'AdmissionHands - Expert Medical College Admission Guidance',
  description: 'Get expert guidance for MBBS, MD/MS admissions in top medical colleges. Personalised counselling built on published closing ranks.',
  applicationName: 'AdmissionHands',
  // Square icons cut from the shield (scripts/make_icons.cjs). These used to
  // point at the 1088x367 wordmark labelled as 32x32 and 180x180; Google needs
  // a square favicon, a multiple of 48px, to show one beside a search result.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  // The fallback for any page that sets no Open Graph of its own.
  openGraph: {
    siteName: 'AdmissionHands',
    type: 'website',
    locale: 'en_IN',
    images: [OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', images: [OG_IMAGE] },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const host = headers().get('host') || ''
  const isAdmin = isAdminSubdomain(host)

  // The shell is a client component, so its menus are fetched here and passed
  // down as plain data. An admin host skips the fetch entirely.
  //
  // The notice bar's alerts come with them. They used to be fetched by the
  // browser after hydration, which cost a second round trip to Montreal and
  // moved the whole page: the bar appeared, the content dropped 40px, and if
  // nothing was active it went back up — Lighthouse's CLS on the homepage was
  // 0.105, over Google's 0.1, from exactly that. Read here, the bar and the
  // space for it are both in the first HTML.
  const [headerNav, footerExplore, footerQuick, settings, liveAlerts] = isAdmin
    ? [[], [], [], {} as Record<string, string>, []]
    : await Promise.all([
        getNav('header'),
        getNav('footer_explore'),
        getNav('footer_quick'),
        getSettings(),
        getLiveAlerts(),
      ])

  // Who, if anyone, is signed in. The layout already reads headers() so it is
  // dynamic either way — this costs one more query, not the caching.
  const siteUser = isAdmin ? null : await currentUser()

  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable} ${figtree.variable}`} suppressHydrationWarning>
      <head>
        {/* Analytics loads after the page (lazyOnload); resolving its hosts early
            costs nothing and saves the lookup when it does. Not a preconnect: that
            would open sockets competing with the critical path. */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body className="antialiased font-body overflow-x-hidden bg-background text-foreground transition-colors duration-200">
        {/*
          Analytics after the page has loaded, not before. `afterInteractive`
          made Next emit a preload for gtag.js — 176 KB at high priority,
          fetched in the same instant as the CSS and ahead of everything the
          visitor can see. `lazyOnload` waits for the load event. The page view
          is still recorded; what can be lost is a visitor who leaves before
          the page has finished loading.
        */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-SCQ3V4NFLS"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-SCQ3V4NFLS');
          `}
        </Script>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {isAdmin ? (
            <main className="w-full">{children}</main>
          ) : (
            <SiteShell
              accountName={siteUser?.name?.split(' ')[0] ?? (siteUser ? 'Account' : null)}
              headerNav={headerNav}
              footerExplore={footerExplore}
              footerQuick={footerQuick}
              footerTagline={setting(settings, 'footer.tagline')}
              headerCtaLabel={setting(settings, 'header.cta_label')}
              showThemeToggle={setting(settings, 'header.show_theme_toggle', 'true') !== 'false'}
              social={{
                facebook: setting(settings, 'social.facebook'),
                instagram: setting(settings, 'social.instagram'),
                youtube: setting(settings, 'social.youtube'),
              }}
              alertsEnabled={setting(settings, 'site.alert_bar_enabled', 'true') !== 'false'}
              alerts={liveAlerts.map((a) => ({ id: a.id, title: a.title, link: a.link }))}
            >
              {children}
            </SiteShell>
          )}
        </ThemeProvider>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  )
}
