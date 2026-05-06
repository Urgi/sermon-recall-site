import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Sermon Recall — Church admin',
  description:
    'Pastor web portal: sermon ingestion, devotional review, and congregation engagement for Sermon Recall.',
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
