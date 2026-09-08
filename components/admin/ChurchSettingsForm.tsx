'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';

import { buildMemberJoinUrl } from '@/lib/church/member-join';
import { CHURCH_TIMEZONE_OPTIONS } from '@/lib/church/timezones';
import {
  APP_LANGUAGES,
  type AppLanguage,
  languageOptionLabel,
  normalizeAppLanguage,
} from '@/lib/i18n/languages';

export type ChurchSettingsInitial = {
  name: string;
  churchCode: string;
  pastorName: string;
  timezone: string;
  requireDevotionalApproval: boolean;
  sermonLanguage: AppLanguage;
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
  const [sermonLanguage, setSermonLanguage] = useState<AppLanguage>(
    normalizeAppLanguage(initial.sermonLanguage),
  );
  const [requireDevotionalApproval, setRequireDevotionalApproval] = useState(
    initial.requireDevotionalApproval,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const codeChanged = churchCode.trim().toUpperCase() !== initial.churchCode.trim().toUpperCase();
  const joinUrlPreview = churchCode.trim()
    ? buildMemberJoinUrl(churchCode.trim())
    : buildMemberJoinUrl(initial.churchCode);

  async function copy(kind: 'code' | 'link', text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

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
          sermonLanguage,
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
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-5">
        <p className="text-[13px] font-semibold text-[var(--admin-fg-strong)]">Identity</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="church-settings-name" label="Church name">
            <input
              id="church-settings-name"
              type="text"
              required
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-input"
            />
          </Field>
          <Field id="church-settings-pastor" label="Lead pastor" hint="Shown to members. Optional.">
            <input
              id="church-settings-pastor"
              type="text"
              autoComplete="name"
              placeholder="Optional"
              value={pastorName}
              onChange={(e) => setPastorName(e.target.value)}
              className="admin-input"
            />
          </Field>
        </div>
      </div>

      <div className="space-y-5">
        <p className="text-[13px] font-semibold text-[var(--admin-fg-strong)]">How members join</p>
        <Field
          id="church-settings-code"
          label="Church code"
          hint="Members type this in the mobile app."
        >
          <div className="flex gap-2">
            <input
              id="church-settings-code"
              type="text"
              required
              minLength={4}
              maxLength={32}
              autoComplete="off"
              value={churchCode}
              onChange={(e) => setChurchCode(e.target.value.toUpperCase())}
              className="admin-input max-w-xs font-mono uppercase tracking-wide"
            />
            <button
              type="button"
              onClick={() => void copy('code', churchCode.trim().toUpperCase())}
              className="admin-btn-secondary shrink-0 px-3 text-[13px]"
            >
              {copied === 'code' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </Field>
        <Field id="church-settings-join" label="Join link">
          <div className="flex gap-2">
            <input
              id="church-settings-join"
              type="text"
              readOnly
              value={joinUrlPreview}
              className="admin-input min-w-0 flex-1 font-mono text-[13px]"
            />
            <button
              type="button"
              onClick={() => void copy('link', joinUrlPreview)}
              className="admin-btn-secondary shrink-0 px-3 text-[13px]"
            >
              {copied === 'link' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </Field>
        {codeChanged ? (
          <p className="text-[13px] text-amber-700 dark:text-amber-200">
            You changed the code — update printed QR codes and shared links after saving.
          </p>
        ) : null}
      </div>

      <div className="space-y-5">
        <p className="text-[13px] font-semibold text-[var(--admin-fg-strong)]">Defaults</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="church-settings-timezone"
            label="Timezone"
            hint="Used for reminder times for your church."
          >
            <select
              id="church-settings-timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="admin-input"
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
          </Field>
          <Field
            id="church-settings-language"
            label="Church language"
            hint="Default for sermons and devotionals."
          >
            <select
              id="church-settings-language"
              value={sermonLanguage}
              onChange={(e) => setSermonLanguage(normalizeAppLanguage(e.target.value))}
              className="admin-input"
            >
              {APP_LANGUAGES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {languageOptionLabel(opt.value)}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[13px] font-semibold text-[var(--admin-fg-strong)]">Publishing</p>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-admin bg-[var(--admin-surface-bg)] px-4 py-4">
          <input
            type="checkbox"
            checked={requireDevotionalApproval}
            onChange={(e) => setRequireDevotionalApproval(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-admin"
          />
          <span>
            <span className="block text-[14px] font-semibold text-[var(--admin-fg-strong)]">
              Require approval before publish
            </span>
            <span className="mt-1 block text-[13px] leading-relaxed text-[var(--admin-muted)]">
              Staff submit devotionals for review. Only owners and admin pastors can go live.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin pt-5">
        <div className="min-h-[1.25rem]">
          {error ? (
            <p className="text-[13px] text-red-500" role="alert">
              {error}
            </p>
          ) : success ? (
            <p className="text-[13px] text-emerald-600 dark:text-emerald-400" role="status">
              {success}
            </p>
          ) : (
            <p className="text-[13px] text-[var(--admin-muted)]">Changes apply to the whole church.</p>
          )}
        </div>
        <button type="submit" disabled={pending} className="admin-btn-primary disabled:opacity-60">
          {pending ? 'Saving…' : 'Save church settings'}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-[13px] font-semibold text-[var(--admin-fg-strong)]">
        {label}
      </label>
      {hint ? <p className="text-[13px] leading-relaxed text-[var(--admin-muted)]">{hint}</p> : null}
      {children}
    </div>
  );
}
