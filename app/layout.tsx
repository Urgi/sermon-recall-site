import type { Metadata } from 'next';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
