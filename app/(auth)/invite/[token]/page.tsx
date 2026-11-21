import type { Metadata } from 'next';
import { InviteAcceptPanel } from '@/components/admin/InviteAcceptPanel';
import { SermonRecallLogo } from '@/components/branding/SermonRecallLogo';

export const metadata: Metadata = { title: 'Accept invitation' };

type Props = { params: { token: string } };

export default function InviteAcceptPage({ params }: Props) {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex justify-center">
        <SermonRecallLogo variant="hero" className="h-20 w-auto" priority />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-bold text-white">Accept invitation</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">
          Join your church&apos;s Sermon Recall admin team.
        </p>
      </div>
      <InviteAcceptPanel token={params.token} />
    </div>
  );
}
