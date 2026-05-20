import Link from 'next/link';

import { AppearanceSettings } from '@/components/admin/AppearanceSettings';
import { DeleteAccountPanel } from '@/components/admin/DeleteAccountPanel';
import { requireAdminSession } from '@/lib/auth/server';

export default async function AdminSettingsPage() {
  await requireAdminSession();

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-[13px] font-medium text-admin-dim hover:text-sky-500"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-admin-fg">Settings</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-admin-muted">
          Appearance and preferences for the church admin portal on this browser.
        </p>
      </div>

      <section className="rounded-xl border border-admin bg-admin-card p-6">
        <h2 className="text-lg font-semibold text-admin-fg">Appearance</h2>
        <p className="mt-1 text-[14px] text-admin-muted">
          Choose a brighter mode for daytime work, or stay on dark.
        </p>
        <div className="mt-5">
          <AppearanceSettings />
        </div>
      </section>

      <DeleteAccountPanel />
    </div>
  );
}
