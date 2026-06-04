'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRegister } from '@/lib/useRegister';
import { OBLIGATION_TYPE_LABELS, ObligationType } from '@/lib/taxonomy';
import { StoredObligation } from '@/lib/schema';

const MFN_RELEVANT_TYPES: ObligationType[] = [
  'fee_offset',
  'reporting',
  'lpac',
  'co_investment',
  'mfn',
];

export default function MfnPage() {
  const rows = useRegister();
  const mfnRows = useMemo(() => rows.filter((r) => r.mfn_flag === 'Y'), [rows]);

  const lps = useMemo(() => [...new Set(rows.map((r) => r.lp_name))].sort(), [rows]);

  const byType = useMemo(() => {
    const map = new Map<ObligationType, StoredObligation[]>();
    for (const r of mfnRows) {
      if (!map.has(r.obligation_type)) map.set(r.obligation_type, []);
      map.get(r.obligation_type)!.push(r);
    }
    return [...map.entries()].sort(
      (a, b) =>
        MFN_RELEVANT_TYPES.indexOf(a[0]) - MFN_RELEVANT_TYPES.indexOf(b[0]) ||
        a[0].localeCompare(b[0])
    );
  }, [mfnRows]);

  if (rows.length === 0) {
    return (
      <div className="card p-10 text-center">
        <h1 className="text-xl font-semibold">Nothing to reconcile yet.</h1>
        <p className="text-ink-muted mt-2">
          Extract two or more side letters on the{' '}
          <Link href="/" className="underline">
            upload page
          </Link>{' '}
          to compare MFN-eligible terms across LPs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">MFN reconciliation</h1>
        <p className="text-ink-muted text-sm mt-1">
          {mfnRows.length} MFN-eligible obligation{mfnRows.length === 1 ? '' : 's'} across{' '}
          {new Set(mfnRows.map((r) => r.lp_name)).size} LP
          {new Set(mfnRows.map((r) => r.lp_name)).size === 1 ? '' : 's'}. Grouped by type so
          you can sort the better terms an MFN election would pull in.
        </p>
      </header>

      {mfnRows.length === 0 ? (
        <div className="card p-8 text-ink-muted">
          No rows have <code className="font-mono">mfn_flag = Y</code> yet.
        </div>
      ) : (
        <div className="space-y-6">
          {byType.map(([type, items]) => (
            <section key={type} className="card overflow-hidden">
              <header className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="font-semibold">
                  <span className="badge badge-type mr-2">
                    {OBLIGATION_TYPE_LABELS[type]}
                  </span>
                  <span className="text-ink-muted text-sm font-normal">
                    {items.length} row{items.length === 1 ? '' : 's'} ·{' '}
                    {new Set(items.map((i) => i.lp_name)).size}{' '}
                    {new Set(items.map((i) => i.lp_name)).size === 1 ? 'LP' : 'LPs'}
                  </span>
                </h2>
              </header>
              <div className="overflow-x-auto">
                <table className="register">
                  <thead>
                    <tr>
                      <th>LP</th>
                      <th>Clause</th>
                      <th>Obligation</th>
                      <th>Deadline / value</th>
                      <th>Owner</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium">{r.lp_name}</td>
                        <td className="font-mono text-xs">{r.clause_ref}</td>
                        <td className="max-w-md">{r.obligation_summary}</td>
                        <td className="text-xs">{r.deadline}</td>
                        <td className="text-xs">{r.owner}</td>
                        <td className="text-xs text-ink-muted max-w-xs">{r.notes || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <section className="card p-4">
        <h2 className="font-semibold mb-2 text-sm">LPs in register</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm">
          {lps.map((name) => {
            const ct = mfnRows.filter((r) => r.lp_name === name).length;
            return (
              <li key={name} className="flex items-center justify-between">
                <span>{name}</span>
                <span className="text-xs text-ink-muted">{ct} MFN-eligible</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
