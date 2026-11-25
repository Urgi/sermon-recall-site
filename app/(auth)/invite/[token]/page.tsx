import type { Metadata } from 'next';

import { localizedTitle } from '@/lib/i18n/server';
import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import { InviteAcceptPanel } from '@/components/admin/InviteAcceptPanel';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';

export function generateMetadata(): Metadata {
  return { title: localizedTitle('invite.title') };
}

type Props = { params: { token: string } };

export default function InviteAcceptPage({ params }: Props) {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex justify-center">
        <SermonRecallLogo variant="hero" className="h-20 w-auto" priority />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-bold text-white">
          <AdminChromeCopy k="invite.title" />
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">
          <AdminChromeCopy k="invite.intro" />
        </p>
      </div>
      <InviteAcceptPanel token={params.token} />
    </div>
  );
}
