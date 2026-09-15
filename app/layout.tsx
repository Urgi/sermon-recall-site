import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ThemeScript } from '@/components/admin/ThemeScript';
import { AppToastHost } from '@/components/AppToastHost';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Sermon Recall',
    template: '%s | Sermon Recall',
  },
  description:
    "Sermon Recall helps churches turn Saturday/Sunday's message into a six-day devotional journey for members, with a pastor admin portal and mobile app.",
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
        <LanguageProvider>
          <Suspense fallback={null}>
            <AppToastHost />
          </Suspense>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
