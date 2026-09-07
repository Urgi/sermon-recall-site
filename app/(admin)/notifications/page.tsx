import Link from 'next/link';

import { staffHasPermission } from '@/lib/auth/profile';
import { requireAdminSession } from '@/lib/auth/server';
import { PastorBroadcastForm } from '@/components/admin/PastorBroadcastForm';
import { PastorBroadcastHistory } from '@/components/admin/PastorBroadcastHistory';

export default async function NotificationsPage() {
  const { profile, staffRole, isApprovedStaff } = await requireAdminSession();
  const canSend =
    isApprovedStaff && staffHasPermission(staffRole, profile, 'can_send_notifications');

  if (!profile.church_id) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="admin-heading">Notifications</h1>
        <p className="admin-body">Create or join a church from the dashboard first.</p>
        <Link href="/dashboard" className="admin-link">
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (!canSend) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="admin-heading">Notifications</h1>
        <p className="admin-body">
          Your church role does not include sending notifications. Ask a lead pastor to adjust your
          permissions on the Team page.
        </p>
        <Link href="/dashboard" className="admin-link">
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
        <h1 className="admin-heading mt-4">Notifications</h1>
        <p className="admin-body mt-2">
          Send a one-time push to your church. Members also receive automatic devotional reminders
          for published sermon cycles.
        </p>
      </div>

      <section id="notify-church" className="admin-card p-6">
        <h2 className="admin-section-title">Notify your church</h2>
        <div className="mt-4">
          <PastorBroadcastForm />
        </div>
      </section>

      <section className="admin-card p-6">
        <h2 className="admin-section-title">History</h2>
        <p className="admin-body mt-2">
          Custom push messages you and other pastors have sent to your church.
        </p>
        <div className="mt-4">
          <PastorBroadcastHistory />
        </div>
      </section>
    </div>
  );
}
