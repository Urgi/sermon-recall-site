import Link from 'next/link';

import { staffHasPermission } from '@/lib/auth/profile';
import { requireAdminSession } from '@/lib/auth/server';
import { PastorBroadcastHistory } from '@/components/admin/PastorBroadcastHistory';

export default async function NotificationsHistoryPage() {
  const { profile, staffRole, isApprovedStaff } = await requireAdminSession();
  const canViewHistory =
    isApprovedStaff && staffHasPermission(staffRole, profile, 'can_send_notifications');

  if (!profile.church_id) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-admin-fg-strong">Notification history</h1>
        <p className="text-[15px] text-admin-muted">Create or join a church from the dashboard first.</p>
        <Link href="/dashboard" className="text-[#38bdf8] hover:underline">
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (!canViewHistory) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-admin-fg-strong">Notification history</h1>
        <p className="text-[15px] leading-relaxed text-admin-muted">
          Your church role does not include sending notifications. Ask a lead pastor to adjust your
          permissions on the Team page.
        </p>
        <Link href="/dashboard" className="text-[#38bdf8] hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-[13px] font-medium text-admin-dim hover:text-[#38bdf8]"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-admin-fg-strong">Notification history</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-admin-muted">
          Custom push messages you and other pastors have sent to your church.
        </p>
        <Link
          href="/dashboard#notify-church"
          className="mt-3 inline-block text-[14px] font-medium text-[#38bdf8] hover:underline"
        >
          Send a new notification
        </Link>
      </div>

      <section className="rounded-xl border border-admin bg-admin-card p-6">
        <PastorBroadcastHistory />
      </section>
    </div>
  );
}
