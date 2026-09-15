import Link from 'next/link';
import { Suspense } from 'react';

import { AdminPageFallback } from '@/components/admin/AdminPageFallback';
import { AppearanceSettings } from '@/components/admin/AppearanceSettings';
import { ChurchSettingsForm } from '@/components/admin/ChurchSettingsForm';
import { DeleteAccountPanel } from '@/components/admin/DeleteAccountPanel';
import { PreferredLanguageSettings } from '@/components/admin/PreferredLanguageSettings';
import { SettingsLocalizedText } from '@/components/admin/SettingsLocalizedText';
import { staffHasPermission } from '@/lib/auth/profile';
import { getChurchSettingsForProfile, requireAdminSession } from '@/lib/auth/server';
import { DEFAULT_CHURCH_TIMEZONE } from '@/lib/church/timezones';
import { normalizeAppLanguage } from '@/lib/i18n/languages';

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<AdminPageFallback />}>
      <AdminSettingsBody />
    </Suspense>
  );
}

async function AdminSettingsBody() {
  const { profile, staffRole } = await requireAdminSession();
  const canManageChurch =
    Boolean(profile.church_id) &&
    staffHasPermission(staffRole, profile, 'can_manage_church_settings');
  const church = canManageChurch ? await getChurchSettingsForProfile(profile.church_id) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/dashboard" className="text-[13px] font-medium text-[var(--admin-link)] hover:underline">
          ← Dashboard
        </Link>
        <h1 className="admin-heading mt-4">
          <SettingsLocalizedText as="span" k="settings.title" />
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--admin-muted)]">
          <SettingsLocalizedText k="settings.intro" />
        </p>
      </div>

      {canManageChurch && church ? (
        <section className="space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-dim)]">
            <SettingsLocalizedText k="settings.church" />
          </p>
          <div className="admin-card p-6 sm:p-7">
            <div className="border-b border-admin pb-5">
              <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">
                <SettingsLocalizedText as="span" k="settings.churchTitle" />
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--admin-muted)]">
                <SettingsLocalizedText k="settings.churchHint" />
              </p>
            </div>
            <div className="pt-6">
              <ChurchSettingsForm
                initial={{
                  name: church.name,
                  churchCode: church.church_code,
                  pastorName: church.pastor_name ?? '',
                  timezone: church.timezone || DEFAULT_CHURCH_TIMEZONE,
                  requireDevotionalApproval: church.require_devotional_approval !== false,
                  sermonLanguage: normalizeAppLanguage(church.sermon_language),
                }}
              />
            </div>
          </div>
        </section>
      ) : profile.church_id ? (
        <section className="space-y-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-dim)]">
            <SettingsLocalizedText k="settings.church" />
          </p>
          <div className="admin-card p-6 sm:p-7">
            <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">
              <SettingsLocalizedText as="span" k="settings.churchTitle" />
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--admin-muted)]">
              <SettingsLocalizedText k="settings.churchLocked" />
            </p>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-dim)]">
          <SettingsLocalizedText k="settings.yourAccount" />
        </p>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div className="admin-card p-6 sm:p-7">
            <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">
              <SettingsLocalizedText as="span" k="settings.language" />
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--admin-muted)]">
              <SettingsLocalizedText k="settings.languageHint" />
            </p>
            <div className="mt-5">
              <PreferredLanguageSettings />
            </div>
          </div>
          <div className="admin-card p-6 sm:p-7">
            <h2 className="text-lg font-semibold text-[var(--admin-fg-strong)]">
              <SettingsLocalizedText as="span" k="settings.appearance" />
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--admin-muted)]">
              <SettingsLocalizedText k="settings.appearanceHint" />
            </p>
            <div className="mt-5">
              <AppearanceSettings />
            </div>
          </div>
        </div>
      </section>

      <DeleteAccountPanel />
    </div>
  );
}
