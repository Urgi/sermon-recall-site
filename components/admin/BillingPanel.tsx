'use client';

import { useState } from 'react';

async function go(path: string): Promise<string> {
  const res = await fetch(path, { method: 'POST' });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error || 'Something went wrong.');
  return json.url;
}

export function BillingPanel({
  hasCustomer,
  hasActiveSubscription,
  priceLabel,
  available,
}: {
  hasCustomer: boolean;
  hasActiveSubscription: boolean;
  priceLabel: string;
  available: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, path: string) {
    setBusy(key);
    setError(null);
    try {
      window.location.href = await go(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {!hasActiveSubscription && (
        <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 className="admin-section-title">Standard</h2>
            <p className="admin-body mt-1">{priceLabel}</p>
          </div>
          <button
            type="button"
            className="admin-btn-primary"
            disabled={!available || busy !== null}
            onClick={() => run('checkout', '/api/billing/checkout')}
          >
            {busy === 'checkout' ? 'Redirecting…' : available ? 'Subscribe' : 'Not available yet'}
          </button>
        </div>
      )}
      {hasCustomer && (
        <div className="admin-card flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="admin-body">Update your card, download invoices, or cancel.</p>
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={busy !== null}
            onClick={() => run('portal', '/api/billing/portal')}
          >
            {busy === 'portal' ? 'Opening…' : 'Manage billing'}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
