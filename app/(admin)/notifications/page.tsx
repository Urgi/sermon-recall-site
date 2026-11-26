import type { Metadata } from 'next';

import { localizedTitle } from '@/lib/i18n/server';
import { AdminChromeCopy } from '@/components/admin/AdminChromeCopy';
import Link from 'next/link';
import { Suspense } from 'react';

import { AdminPageFallback } from '@/components/admin/AdminPageFallback';
import { staffHasPermission } from '@/lib/auth/profile';
import { requireAdminSession } from '@/lib/auth/server';
import { PastorBroadcastForm } from '@/components/admin/PastorBroadcastForm';
import { BroadcastHistoryAccordion } from '@/components/admin/BroadcastHistoryAccordion';

export function generateMetadata(): Metadata {
  return { title: localizedTitle('nav.notifications') };
}

type Props = { searchParams: { encourage?: string; n?: string } };

export default function NotificationsPage(props: Props) {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <NotificationsPageBody {...props} />
    </Suspense>
  );
}

async function NotificationsPageBody({ searchParams }: Props) {
  const { profile, staffRole, isApprovedStaff } = await requireAdminSession();
  const canSend =
    isApprovedStaff && staffHasPermission(staffRole, profile, 'can_send_notifications');

  if (!profile.church_id) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="admin-heading">
          <AdminChromeCopy k="notify.title" />
        </h1>
        <p className="admin-body">
          <AdminChromeCopy k="notify.noChurch" />
        </p>
        <Link href="/dashboard" className="admin-link">
          <AdminChromeCopy k="common.goDashboard" />
        </Link>
      </div>
    );
  }

  const encourageN = Number(searchParams.n);
  const encourageInactiveCount =
    searchParams.encourage === '1' && Number.isFinite(encourageN) && encourageN > 0
      ? encourageN
      : undefined;

  if (!canSend) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="admin-heading">
          <AdminChromeCopy k="notify.title" />
        </h1>
        <p className="admin-body">
          <AdminChromeCopy k="notify.noPermission" />
        </p>
        <Link href="/dashboard" className="admin-link">
          <AdminChromeCopy k="common.backDashboard" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="admin-heading">
          <AdminChromeCopy k="notify.title" />
        </h1>
        <p className="admin-body mt-2">
          <AdminChromeCopy k="notify.intro" />
        </p>
      </div>

      <section id="notify-church" className="admin-card scroll-mt-24 p-6">
        <h2 className="admin-section-title">
          <AdminChromeCopy k="notify.composeTitle" />
        </h2>
        <div className="mt-4">
          <PastorBroadcastForm encourageInactiveCount={encourageInactiveCount} />
        </div>
      </section>

      <BroadcastHistoryAccordion />
    </div>
  );
}
