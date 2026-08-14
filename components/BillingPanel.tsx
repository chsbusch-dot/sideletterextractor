'use client';

import { useState } from 'react';
import { formatUsd, PACKS, type PackId } from '@/lib/pricing';

// Mirrors the shape returned by /api/me and /api/extract. Kept local so the
// client bundle never imports server-side Redis code.
export type Balance = {
  free_used: number;
  free_limit: number;
  free_remaining: number;
  credits: number;
};

export function BalancePill({ balance }: { balance: Balance | null }) {
  if (!balance) return null;
  const parts: string[] = [];
  if (balance.free_remaining > 0) {
    parts.push(
      `${balance.free_remaining} free ${balance.free_remaining === 1 ? 'document' : 'documents'} left`
    );
  }
  if (balance.credits > 0) {
    parts.push(`${balance.credits} ${balance.credits === 1 ? 'credit' : 'credits'}`);
  }
  if (parts.length === 0) parts.push('No documents left');
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-ink-muted">
      {parts.join(' · ')}
    </span>
  );
}

export function PurchasePanel({ onError }: { onError: (message: string) => void }) {
  const [busy, setBusy] = useState<PackId | null>(null);

  const buy = async (pack: PackId) => {
    setBusy(pack);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pack }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error || 'Could not start checkout.');
      }
      window.location.href = json.url;
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not start checkout.');
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="font-medium text-ink">Buy document credits</p>
      <p className="mt-1 text-sm text-ink-muted">
        Credits are tied to your email and do not expire. Payment runs through Stripe; card
        details never touch this site.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn"
          disabled={busy !== null}
          onClick={() => buy('single')}
        >
          {busy === 'single'
            ? 'Opening checkout…'
            : `1 document — ${formatUsd(PACKS.single.amountCents)}`}
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy !== null}
          onClick={() => buy('ten')}
        >
          {busy === 'ten'
            ? 'Opening checkout…'
            : `10 documents — ${formatUsd(PACKS.ten.amountCents)}`}
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        The 10-pack works out to {formatUsd(PACKS.ten.amountCents / PACKS.ten.credits)} per
        document.
      </p>
    </div>
  );
}
