import type { Metadata } from 'next';

import { FaqContent } from '@/components/public/FaqContent';
import { JsonLd } from '@/components/public/JsonLd';
import { PublicShell } from '@/components/public/PublicShell';
import { faqPageJsonLd } from '@/lib/public-site/ai-discoverability';
import { PUBLIC_SITE } from '@/lib/public-site/config';

export const metadata: Metadata = {
  title: 'FAQ',
  description: `Frequently asked questions about ${PUBLIC_SITE.productName} for churches and members.`,
  alternates: { canonical: '/faq' },
  openGraph: {
    title: `FAQ | ${PUBLIC_SITE.productName}`,
    description: `Frequently asked questions about ${PUBLIC_SITE.productName} for churches and members.`,
    url: '/faq',
  },
};

export default function FaqPage() {
  return (
    <PublicShell>
      <JsonLd data={faqPageJsonLd()} />
      <FaqContent />
    </PublicShell>
  );
}
