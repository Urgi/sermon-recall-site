import type { Metadata } from 'next';
import { Suspense } from 'react';

import { ThemeScript } from '@/components/admin/ThemeScript';
import { AppToastHost } from '@/components/AppToastHost';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { PUBLIC_SITE, publicSiteUrl } from '@/lib/public-site/config';

import './globals.css';

const siteUrl = publicSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Sermon Recall',
    template: '%s | Sermon Recall',
  },
  description: PUBLIC_SITE.shortDescription,
  applicationName: PUBLIC_SITE.productName,
  keywords: [
    'Sermon Recall',
    'church app',
    'sermon follow-up',
    'daily devotionals',
    'church discipleship',
    'pastor admin portal',
    'congregation engagement',
  ],
  authors: [{ name: PUBLIC_SITE.legalName, url: siteUrl }],
  creator: PUBLIC_SITE.legalName,
  publisher: PUBLIC_SITE.legalName,
  alternates: {
    types: {
      'text/plain': [
        { url: '/llms.txt', title: 'llms.txt' },
        { url: '/llms-full.txt', title: 'llms-full.txt' },
      ],
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: PUBLIC_SITE.productName,
    title: PUBLIC_SITE.productName,
    description: PUBLIC_SITE.shortDescription,
    images: [
      {
        url: '/sermonrecalllogo/logo.png',
        alt: `${PUBLIC_SITE.productName} logo`,
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: PUBLIC_SITE.productName,
    description: PUBLIC_SITE.shortDescription,
    images: ['/sermonrecalllogo/logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
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
      <head>
        <link rel="llms-txt" type="text/plain" href="/llms.txt" />
        <link rel="llms-full-txt" type="text/plain" href="/llms-full.txt" />
      </head>
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
