import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ThemeScript } from '@/components/admin/ThemeScript';
import { AppToastHost } from '@/components/AppToastHost';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Sermon Recall',
    template: '%s | Sermon Recall',
  },
  description:
    'Sermon Recall helps churches turn Sunday sermons into a six-day devotional journey for members, with a pastor admin portal and mobile app.',
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
