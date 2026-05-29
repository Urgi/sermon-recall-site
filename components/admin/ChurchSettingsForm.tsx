'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { buildMemberJoinUrl } from '@/lib/church/member-join';
import { CHURCH_TIMEZONE_OPTIONS } from '@/lib/church/timezones';

export type ChurchSettingsInitial = {
  name: string;
  churchCode: string;
  pastorName: string;
  timezone: string;
  requireDevotionalApproval: boolean;
};

type Props = {
  initial: ChurchSettingsInitial;
};

export function ChurchSettingsForm({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [churchCode, setChurchCode] = useState(initial.churchCode);
  const [pastorName, setPastorName] = useState(initial.pastorName);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [requireDevotionalApproval, setRequireDevotionalApproval] = useState(
    initial.requireDevotionalApproval,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const codeChanged = churchCode.trim().toUpperCase() !== initial.churchCode.trim().toUpperCase();
  const joinUrlPreview = churchCode.trim()
    ? buildMemberJoinUrl(churchCode.trim())
    : buildMemberJoinUrl(initial.churchCode);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (codeChanged) {
      const ok = window.confirm(
        'Changing the church code updates your member join link and QR code. Old printed materials will stop working. Continue?',
      );
      if (!ok) return;
    }

    setPending(true);
    try {
      const res = await fetch('/api/church/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          churchCode: churchCode.trim(),
          pastorName: pastorName.trim(),
          timezone,
          requireDevotionalApproval,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not save settings.');
        return;
      }
      setSuccess('Church settings saved.');
      router.refresh();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="church-settings-name" className="admin-label">
          Church name
        </label>
        <input
          id="church-settings-name"
          type="text"
          required
          autoComplete="organization"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="admin-input mt-1"
        />
      </div>

      <div>
        <label htmlFor="church-settings-code" className="admin-label">
          Church code
        </label>
        <p className="admin-hint mt-0.5">
          Members enter this in the app to join. Join link:{' '}
          <span className="break-all font-mono text-[12px]">{joinUrlPreview}</span>
        </p>
        <input
          id="church-settings-code"
          type="text"
          required
          minLength={4}
          maxLength={32}
          autoComplete="off"
          value={churchCode}
          onChange={(e) => setChurchCode(e.target.value.toUpperCase())}
          className="admin-input mt-1 max-w-xs font-mono uppercase"
        />
        {codeChanged ? (
          <p className="mt-2 text-[13px] text-amber-700 dark:text-amber-200">
            You changed the code — update any printed QR codes or shared links after saving.
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="church-settings-pastor" className="admin-label">
          Lead pastor display name
        </label>
        <input
          id="church-settings-pastor"
          type="text"
          autoComplete="name"
          placeholder="Optional"
          value={pastorName}
          onChange={(e) => setPastorName(e.target.value)}
          className="admin-input mt-1"
        />
      </div>

      <div>
        <label htmlFor="church-settings-timezone" className="admin-label">
          Timezone
        </label>
        <p className="admin-hint mt-0.5">
          Used for devotional reminder scheduling for your church.
        </p>
        <select
          id="church-settings-timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="admin-input mt-1"
        >
          {CHURCH_TIMEZONE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
          {!CHURCH_TIMEZONE_OPTIONS.some((o) => o.value === timezone) ? (
            <option value={timezone}>{timezone}</option>
          ) : null}
        </select>
      </div>

      <div className="rounded-lg border border-admin bg-admin-surface p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={requireDevotionalApproval}
            onChange={(e) => setRequireDevotionalApproval(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-admin"
          />
          <span>
            <span className="block text-[14px] font-medium text-admin-fg-strong">
              Require devotional approval before publish
            </span>
            <span className="admin-hint mt-1 block">
              When on, staff submit devotionals for review; only owners and admin pastors can
              publish. When off, anyone who can publish may go live directly from preview.
            </span>
          </span>
        </label>
      </div>

      {error ? (
        <p className="text-[13px] text-red-500" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-[13px] text-emerald-600 dark:text-emerald-400" role="status">
          {success}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="admin-btn-primary disabled:opacity-60">
        {pending ? 'Saving…' : 'Save church settings'}
      </button>
    </form>
  );
}
