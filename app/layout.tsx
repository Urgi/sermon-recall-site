import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ThemeScript } from '@/components/admin/ThemeScript';
import { AppToastHost } from '@/components/AppToastHost';

import './globals.css';

export const metadata: Metadata = {
  title: 'Sermon Recall — Church admin',
  description:
    'Pastor web portal: sermon ingestion, devotional review, and congregation engagement for Sermon Recall.',
  icons: {
    icon: '/sermonrecalllogo/logo.png',
    apple: '/sermonrecalllogo/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeScript />
        <Suspense fallback={null}>
          <AppToastHost />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
