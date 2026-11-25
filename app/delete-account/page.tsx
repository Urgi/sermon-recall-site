import type { Metadata } from 'next';

import { DeleteAccountContent } from '@/components/public/DeleteAccountContent';
import { PublicShell } from '@/components/public/PublicShell';
import { PUBLIC_SITE } from '@/lib/public-site/config';

export const metadata: Metadata = {
  title: 'Delete your account',
  description: `How to delete your ${PUBLIC_SITE.productName} account and associated data.`,
  alternates: { canonical: '/delete-account' },
};

export default function DeleteAccountPage() {
  return (
    <PublicShell>
      <DeleteAccountContent />
    </PublicShell>
  );
}
