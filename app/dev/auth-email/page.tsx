'use client';

import Link from 'next/link';
import { useState } from 'react';

type Report = {
  environment?: string;
  redirectTo?: string | null;
  env?: Record<string, boolean | string | null>;
  supabase?: { isLocal?: boolean; inbucketUrl?: string | null; projectHost?: string | null };
  userLookup?: {
    exists: boolean;
    emailConfirmed: boolean;
    createdAt: string | null;
  };
  path?: { resendApiReady?: boolean; clientFallbackOnly?: boolean };
  hints?: string[];
  debugActionLink?: string;
  sent?: boolean;
  error?: string;
  message?: string;
  ok?: boolean;
  step?: string;
};

export default function AuthEmailDevPage() {
  const [email, setEmail] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [pending, setPending] = useState(false);

  async function runCheck() {
    setPending(true);
    setReport(null);
    try {
      const q = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : '';
      const res = await fetch(`/api/auth/email-diagnostics${q}`);
      setReport((await res.json()) as Report);
    } catch (e) {
      setReport({ error: e instanceof Error ? e.message : 'fetch failed' });
    } finally {
      setPending(false);
    }
  }

  async function runSend(dryRun: boolean) {
    if (!email.trim()) return;
    setPending(true);
    try {
      const res = await fetch('/api/auth/email-diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), dryRun }),
      });
      setReport((await res.json()) as Report);
    } catch (e) {
      setReport({ error: e instanceof Error ? e.message : 'fetch failed' });
    } finally {
      setPending(false);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="mx-auto max-w-lg p-8 text-[#94a3b8]">
        <p>Auth email diagnostics are only available in local development.</p>
        <Link href="/login" className="text-sky-400 hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8 text-[#e2e8f0]">
      <div>
        <Link href="/login" className="text-[13px] text-sky-400 hover:underline">
          ← Login
        </Link>
        <h1 className="mt-2 text-xl font-bold text-white">Auth email diagnostics</h1>
        <p className="mt-2 text-[14px] text-[#94a3b8]">
          Local: run <code className="text-sky-300">supabase start</code>, then open{' '}
          <a href="http://127.0.0.1:54324" className="text-sky-400 hover:underline">
            Inbucket (127.0.0.1:54324)
          </a>{' '}
          — Supabase does not deliver to real Gmail/Yahoo on localhost.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          placeholder="test@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-[240px] flex-1 rounded-lg border border-sky-500/30 bg-[#0a0f18] px-3 py-2 text-white"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => void runCheck()}
          className="rounded-lg bg-slate-700 px-4 py-2 text-[14px] font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          Check config
        </button>
        <button
          type="button"
          disabled={pending || !email.trim()}
          onClick={() => void runSend(true)}
          className="rounded-lg border border-sky-500/40 px-4 py-2 text-[14px] text-sky-200 hover:bg-sky-950/40 disabled:opacity-50"
        >
          Dry run (link only)
        </button>
        <button
          type="button"
          disabled={pending || !email.trim()}
          onClick={() => void runSend(false)}
          className="rounded-lg bg-sky-600 px-4 py-2 text-[14px] font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
        >
          Send via Resend
        </button>
      </div>

      {report ? (
        <pre className="max-h-[70vh] overflow-auto rounded-xl border border-sky-500/20 bg-[#0a0f18] p-4 text-[12px] leading-relaxed text-[#cbd5e1]">
          {JSON.stringify(report, null, 2)}
        </pre>
      ) : null}

      <section className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-[13px] leading-relaxed text-amber-100">
        <p className="font-semibold">Turn off confirm email (Supabase hosted)</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            <strong>Authentication → Sign In / Providers → Email</strong> (not Templates)
          </li>
          <li>Disable <strong>Confirm email</strong></li>
          <li>Save — pastors can register and sign in without inbox</li>
        </ol>
      </section>
    </div>
  );
}
