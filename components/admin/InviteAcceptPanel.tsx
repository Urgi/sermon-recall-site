'use client';

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
      <div className="admin-card p-8 text-center">
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
    <div className="admin-card p-8 text-center">
      {status === 'loading' || status === 'accepting' ? (
        <p className="admin-body">Accepting invitation…</p>
      ) : null}
      {status === 'done' ? <p className="text-emerald-600 admin-body">{message}</p> : null}
      {status === 'error' ? <p className="text-red-500 admin-body" role="alert">{message}</p> : null}
    </div>
  );
}
