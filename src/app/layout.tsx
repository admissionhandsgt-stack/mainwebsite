import '../index.css'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import SiteShell from '@/components/SiteShell'
import type { Metadata } from 'next'
import Script from 'next/script'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'

import { headers } from 'next/headers'

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

export const metadata: Metadata = {
  title: 'AdmissionHands - Expert Medical College Admission Guidance',
  description: 'Get expert guidance for MBBS, MD/MS admissions in top medical colleges. Personalized counseling, guaranteed results.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const host = headers().get('host') || ''
  const isAdminSubdomain = host.startsWith('admin.')

  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`} suppressHydrationWarning>
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
          {isAdminSubdomain ? (
            <main className="w-full">{children}</main>
          ) : (
            <SiteShell>
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
