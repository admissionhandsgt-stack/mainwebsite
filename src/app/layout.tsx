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
import { getNav, getSettings, setting } from '@/lib/content'
import { currentUser } from '@/lib/userAuth'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
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
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/logo.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
    ],
  },
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
  const [headerNav, footerExplore, footerQuick, settings] = isAdmin
    ? [[], [], [], {} as Record<string, string>]
    : await Promise.all([
        getNav('header'),
        getNav('footer_explore'),
        getNav('footer_quick'),
        getSettings(),
      ])

  // Who, if anyone, is signed in. The layout already reads headers() so it is
  // dynamic either way — this costs one more query, not the caching.
  const siteUser = isAdmin ? null : await currentUser()

  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable} ${figtree.variable}`} suppressHydrationWarning>
      <body className="antialiased font-body overflow-x-hidden bg-background text-foreground transition-colors duration-200">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-SCQ3V4NFLS"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
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
