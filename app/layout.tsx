import type { Metadata } from 'next';
import Providers from '@/components/Providers';
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
  title: 'Challenger Events - Real-time Fitness Competitions',
  description:
    'Create and manage fitness events with real-time leaderboards. Track competitor scores and build profiles over time.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${montserrat.variable} ${orbitron.variable} bg-white dark:bg-gray-900 min-h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
