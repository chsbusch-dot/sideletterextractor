'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ObligationTable } from '@/components/ObligationTable';
import { useRegister } from '@/lib/useRegister';
import { store } from '@/lib/store';
import { OBLIGATION_TYPES, OBLIGATION_TYPE_LABELS, ObligationType } from '@/lib/taxonomy';
import { downloadBlob, toCSV } from '@/lib/csv';

type FlagFilter = 'all' | 'mfn' | 'consent' | 'review';

export default function RegisterPage() {
  const rows = useRegister();
  const [lp, setLp] = useState<string>('');
  const [type, setType] = useState<ObligationType | ''>('');
  const [flag, setFlag] = useState<FlagFilter>('all');
  const [q, setQ] = useState('');

  const lps = useMemo(() => {
    return [...new Set(rows.map((r) => r.lp_name))].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (lp && r.lp_name !== lp) return false;
      if (type && r.obligation_type !== type) return false;
      if (flag === 'mfn' && r.mfn_flag !== 'Y') return false;
      if (flag === 'consent' && r.consent_flag !== 'Y') return false;
      if (
        flag === 'review' &&
        !(
          r.deadline === 'REVIEW' ||
          r.owner === 'REVIEW' ||
          r.frequency === 'REVIEW' ||
          /REVIEW/.test(r.notes || '')
        )
      )
        return false;
      if (needle) {
        const hay = [
          r.lp_name,
          r.fund,
          r.clause_ref,
          r.obligation_summary,
          r.trigger,
          r.notes,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, lp, type, flag, q]);

  if (rows.length === 0) {
    return (
      <div className="card p-10 text-center">
        <h1 className="text-xl font-semibold">Your master register is empty.</h1>
        <p className="text-ink-muted mt-2">
          Extract a side letter on the{' '}
          <Link href="/" className="underline">
            upload page
          </Link>{' '}
          to start populating it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Master register</h1>
          <p className="text-ink-muted text-sm mt-1">
            {rows.length} obligations across {lps.length} LP{lps.length === 1 ? '' : 's'}.
            Rows upsert on{' '}
            <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
              lp_name + clause_ref
            </code>
            .
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => downloadBlob(toCSV(filtered), 'master-register.csv')}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => downloadBlob(store.exportJSON(), 'master-register.json', 'application/json')}
          >
            Export JSON
          </button>
          <ClearButton />
        </div>
      </header>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <select
          value={lp}
          onChange={(e) => setLp(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        >
          <option value="">All LPs ({lps.length})</option>
          {lps.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ObligationType | '')}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        >
          <option value="">All types</option>
          {OBLIGATION_TYPES.map((t) => (
            <option key={t} value={t}>
              {OBLIGATION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={flag}
          onChange={(e) => setFlag(e.target.value as FlagFilter)}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        >
          <option value="all">All flags</option>
          <option value="mfn">MFN-eligible only</option>
          <option value="consent">Consent-gated only</option>
          <option value="review">Needs review only</option>
        </select>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search summaries, triggers, notes…"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="text-xs text-ink-muted">
        Showing {filtered.length} of {rows.length} rows.
      </div>

      <ObligationTable rows={filtered} onRemove={(id) => store.remove(id)} />
    </div>
  );
}

function ClearButton() {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setConfirm(true)}>
        Clear all
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-danger">Wipe master register?</span>
      <button
        type="button"
        className="btn-danger"
        onClick={() => {
          store.clear();
          setConfirm(false);
        }}
      >
        Confirm
      </button>
      <button type="button" className="btn-ghost" onClick={() => setConfirm(false)}>
        Cancel
      </button>
    </span>
  );
}
