import type { Metadata } from 'next';
import { Providers } from '../components/Providers';

import 'styles/globals.css';

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
      <body className="bg-white dark:bg-black min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
