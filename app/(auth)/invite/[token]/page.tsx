import { InviteAcceptPanel } from '@/components/admin/InviteAcceptPanel';

type Props = { params: { token: string } };

export default function InviteAcceptPage({ params }: Props) {
  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Accept invitation</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#94a3b8]">
          Join your church&apos;s Sermon Recall admin team.
        </p>
      </div>
      <InviteAcceptPanel token={params.token} />
    </div>
  );
}
