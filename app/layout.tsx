import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Sermon Recall',
  description:
    'Bridge Sunday to the rest of the week with a sermon-to-devotional pipeline for pastors and church leaders.',
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
