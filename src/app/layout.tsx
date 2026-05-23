import '../index.css'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import SiteShell from '@/components/SiteShell'
import type { Metadata } from 'next'
import Script from 'next/script'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'

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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`}>
      <body className="antialiased font-body overflow-x-hidden">
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
        <SiteShell>
          {children}
        </SiteShell>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  )
}
