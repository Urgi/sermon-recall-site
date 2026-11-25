import type { Metadata } from 'next';

import { PublicShell } from '@/components/public/PublicShell';
import { SupportContent } from '@/components/public/SupportContent';
import { PUBLIC_SITE } from '@/lib/public-site/config';

export const metadata: Metadata = {
  title: 'Support & contact',
  description: `Get help with ${PUBLIC_SITE.productName} for churches and members.`,
  alternates: { canonical: '/support' },
};

export default function SupportPage() {
  return (
    <PublicShell>
      <SupportContent />
    </PublicShell>
  );
}
