import Link from 'next/link';

import { AppearanceSettings } from '@/components/admin/AppearanceSettings';
import { ChurchSettingsForm } from '@/components/admin/ChurchSettingsForm';
import { DeleteAccountPanel } from '@/components/admin/DeleteAccountPanel';
import { staffHasPermission } from '@/lib/auth/profile';
import { getChurchSettingsForProfile, requireAdminSession } from '@/lib/auth/server';
import { DEFAULT_CHURCH_TIMEZONE } from '@/lib/church/timezones';

export default async function AdminSettingsPage() {
  const { profile, staffRole } = await requireAdminSession();
  const canManageChurch =
    Boolean(profile.church_id) &&
    staffHasPermission(staffRole, profile, 'can_manage_church_settings');
  const church = canManageChurch ? await getChurchSettingsForProfile(profile.church_id) : null;

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
          Church workspace and personal preferences for the admin portal.
        </p>
      </div>

      {canManageChurch && church ? (
        <section className="rounded-xl border border-admin bg-admin-card p-6">
          <h2 className="text-lg font-semibold text-admin-fg">Church settings</h2>
          <p className="mt-1 text-[14px] text-admin-muted">
            Name, join code, timezone, and devotional approval rules for your whole church.
          </p>
          <div className="mt-5">
            <ChurchSettingsForm
              initial={{
                name: church.name,
                churchCode: church.church_code,
                pastorName: church.pastor_name ?? '',
                timezone: church.timezone || DEFAULT_CHURCH_TIMEZONE,
                requireDevotionalApproval: church.require_devotional_approval !== false,
              }}
            />
          </div>
        </section>
      ) : profile.church_id ? (
        <section className="rounded-xl border border-admin bg-admin-card p-6">
          <h2 className="text-lg font-semibold text-admin-fg">Church settings</h2>
          <p className="mt-2 text-[14px] text-admin-muted">
            Your role cannot change church-wide settings. Ask an owner or admin pastor if something
            needs updating.
          </p>
        </section>
      ) : null}

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
