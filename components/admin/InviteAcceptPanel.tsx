'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type Props = { token: string };

export function InviteAcceptPanel({ token }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'need_login' | 'accepting' | 'done' | 'error'>(
    'loading',
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const sb = createBrowserSupabaseClient();
    void sb.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setStatus('need_login');
        return;
      }
      setStatus('accepting');
      void fetch('/api/invites/accept', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
        .then(async (res) => {
          const data = (await res.json()) as { error?: string; pendingApproval?: boolean };
          if (!res.ok) {
            setStatus('error');
            setMessage(data.error ?? 'Could not accept invite.');
            return;
          }
          setStatus('done');
          setMessage(
            data.pendingApproval
              ? 'Invite accepted. A church admin must approve your access before you can manage content.'
              : 'Invite accepted.',
          );
          setTimeout(() => router.replace('/dashboard?staff=pending'), 2000);
        })
        .catch(() => {
          setStatus('error');
          setMessage('Network error.');
        });
    });
  }, [token, router]);

  if (status === 'need_login') {
    return (
      <div className="admin-card p-6 text-center sm:p-8">
        <p className="admin-body">Sign in with the email address that received this invite.</p>
        <a
          href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
          className="admin-btn-primary mt-6 inline-block"
        >
          Sign in
        </a>
      </div>
    );
  }

  return (
    <div className="admin-card p-6 text-center sm:p-8" aria-live="polite">
      {status === 'loading' || status === 'accepting' ? (
        <div className="flex flex-col items-center gap-3" role="status">
          <span
            className="h-6 w-6 rounded-full border-2 border-sky-400/30 border-t-sky-400 motion-safe:animate-spin"
            aria-hidden
          />
          <p className="admin-body">Accepting invitation…</p>
        </div>
      ) : null}
      {status === 'done' ? (
        <div role="status">
          <p className="admin-body text-emerald-700 dark:text-emerald-400">{message}</p>
          <p className="admin-hint mt-2">Taking you to your dashboard…</p>
          <Link href="/dashboard?staff=pending" className="admin-btn-secondary mt-5 inline-block">
            Go now
          </Link>
        </div>
      ) : null}
      {status === 'error' ? (
        <div>
          <p className="admin-body text-red-600 dark:text-red-400" role="alert">
            {message}
          </p>
          <p className="admin-hint mt-2">
            Ask the person who invited you to send a fresh link, or make sure you are signed in
            with the invited email.
          </p>
          <Link href="/dashboard" className="admin-btn-secondary mt-5 inline-block">
            Go to dashboard
          </Link>
        </div>
      ) : null}
    </div>
  );
}
