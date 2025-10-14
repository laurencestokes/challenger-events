import type { Metadata } from 'next';
import { Providers } from '@/components/Providers';
import { Montserrat, Orbitron } from 'next/font/google';

import 'styles/globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-orbitron',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Challenger Events - Real-time Fitness Competitions',
    template: '%s | Challenger Events',
  },
  description:
    'Create and manage fitness events with real-time leaderboards. Track competitor scores and build profiles over time. Join the ultimate fitness competition platform.',
  keywords: [
    'fitness events',
    'competitions',
    'leaderboard',
    'fitness tracking',
    'workout challenges',
    'athlete performance',
    'erg rowing',
    'real-time scoring',
  ],
  authors: [{ name: 'The Challenger Co.' }],
  creator: 'The Challenger Co.',
  publisher: 'The Challenger Co.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Challenger Events - Real-time Fitness Competitions',
    description:
      'Create and manage fitness events with real-time leaderboards. Track competitor scores and build profiles over time. Join the ultimate fitness competition platform.',
    siteName: 'Challenger Events',
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-in-background.png`,
        width: 1920,
        height: 1080,
        alt: 'Challenger Events - Fitness Competition Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Challenger Events - Real-time Fitness Competitions',
    description:
      'Create and manage fitness events with real-time leaderboards. Track competitor scores and build profiles over time.',
    images: [
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-in-background.png`,
    ],
    creator: '@challengerco',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/favicon/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome-512x512',
        url: '/favicon/android-chrome-512x512.png',
      },
    ],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} ${orbitron.variable} bg-white dark:bg-gray-900 min-h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
