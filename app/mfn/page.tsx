'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRegister } from '@/lib/useRegister';
import { OBLIGATION_TYPE_LABELS } from '@/lib/taxonomy';
import { buildElectionOpportunities, buildMfnComparisons } from '@/lib/compendium';

export default function MfnPage() {
  const rows = useRegister();
  const comparisons = useMemo(() => buildMfnComparisons(rows), [rows]);
  const elections = useMemo(() => buildElectionOpportunities(comparisons), [comparisons]);
  const mfnRows = useMemo(() => rows.filter((r) => r.mfn_flag === 'Y'), [rows]);
  const lps = useMemo(() => [...new Set(rows.map((r) => r.lp_name))].sort(), [rows]);

  const [activeLp, setActiveLp] = useState<string | null>(null);

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
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">MFN compendium</h1>
        <p className="text-ink-muted text-sm mt-1">
          Cross-LP diff of every term flagged as MFN-eligible. Where a comparable numeric
          value exists, the most LP-favorable extreme is marked &mdash; those are the terms an
          MFN-electing LP could pull in from comparable peers.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat label="LPs in register" value={lps.length} />
        <Stat label="MFN-eligible rows" value={mfnRows.length} />
        <Stat label="Comparable groups" value={comparisons.length} tone="accent" />
        <Stat
          label="LPs w/ election upside"
          value={elections.length}
          tone={elections.length > 0 ? 'warn' : undefined}
        />
      </section>

      {elections.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Draft election opportunities</h2>
          <p className="text-ink-muted text-sm">
            Per-LP summary of MFN-elections that, if exercised, would adopt a more favorable
            term from a comparable LP. Filter by LP to draft the election notice.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveLp(null)}
              className={`px-3 py-1.5 rounded-md text-xs ${
                activeLp === null ? 'bg-ink text-paper' : 'bg-slate-100 text-ink-soft'
              }`}
            >
              All LPs
            </button>
            {elections.map((e) => (
              <button
                key={e.lp_name}
                type="button"
                onClick={() => setActiveLp(e.lp_name)}
                className={`px-3 py-1.5 rounded-md text-xs ${
                  activeLp === e.lp_name
                    ? 'bg-ink text-paper'
                    : 'bg-slate-100 text-ink-soft hover:bg-slate-200'
                }`}
              >
                {e.lp_name}{' '}
                <span className="opacity-70">({e.improvements.length})</span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {elections
              .filter((e) => !activeLp || e.lp_name === activeLp)
              .map((e) => (
                <div key={e.lp_name} className="card p-5">
                  <h3 className="font-semibold mb-1">{e.lp_name}</h3>
                  <p className="text-xs text-ink-muted mb-3">
                    Could elect {e.improvements.length} more favorable term
                    {e.improvements.length === 1 ? '' : 's'}.
                  </p>
                  <ul className="space-y-2">
                    {e.improvements.map((imp, idx) => (
                      <li
                        key={idx}
                        className="text-sm border-l-2 border-accent pl-3 py-1"
                      >
                        <div>
                          <span className="badge badge-type mr-2">
                            {OBLIGATION_TYPE_LABELS[imp.type]}
                          </span>
                          <span className="font-mono text-xs text-ink-muted">
                            {imp.currentRow.clause_ref}
                          </span>
                        </div>
                        <div className="mt-1">
                          {imp.currentRow.obligation_summary}
                        </div>
                        <div className="mt-1 text-xs">
                          <span className="text-ink-muted">Current term:</span>{' '}
                          <span className="font-mono">{imp.currentValue}</span> &nbsp;·&nbsp;{' '}
                          <span className="text-ink-muted">Could elect:</span>{' '}
                          <span className="font-mono text-accent">{imp.bestValue}</span>{' '}
                          <span className="text-ink-muted">
                            (from {imp.bestHeldBy}, {imp.bestRow.clause_ref})
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Side-by-side by obligation type</h2>
        <p className="text-ink-muted text-sm">
          Full comparison view. Where the term has a comparable numeric value, the LP-favorable
          extreme is marked.
        </p>
        {comparisons.length === 0 ? (
          <div className="card p-6 text-ink-muted">
            No MFN-eligible rows yet.
          </div>
        ) : (
          <div className="space-y-6">
            {comparisons.map((c) => (
              <section key={c.type} className="card overflow-hidden">
                <header className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-semibold">
                      <span className="badge badge-type mr-2">
                        {OBLIGATION_TYPE_LABELS[c.type]}
                      </span>
                      <span className="text-ink-muted text-sm font-normal">
                        {c.rows.length} row{c.rows.length === 1 ? '' : 's'} ·{' '}
                        {new Set(c.rows.map((r) => r.row.lp_name)).size}{' '}
                        {new Set(c.rows.map((r) => r.row.lp_name)).size === 1 ? 'LP' : 'LPs'}
                      </span>
                    </h3>
                    {c.unitLabel && (
                      <span className="text-xs text-ink-muted">{c.unitLabel}</span>
                    )}
                  </div>
                </header>
                <div className="overflow-x-auto">
                  <table className="register">
                    <thead>
                      <tr>
                        <th>LP</th>
                        <th>Clause</th>
                        <th>Obligation</th>
                        <th>Parsed value</th>
                        <th>Carve-outs</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {c.rows.map(({ row, parsed, isBest }) => (
                        <tr
                          key={row.id}
                          className={isBest ? 'bg-accent-soft/40' : ''}
                        >
                          <td className="font-medium">{row.lp_name}</td>
                          <td className="font-mono text-xs">
                            {row.clause_ref}
                            {row.source_page ? (
                              <div className="text-ink-muted">p. {row.source_page}</div>
                            ) : null}
                          </td>
                          <td className="max-w-md">{row.obligation_summary}</td>
                          <td>
                            {parsed ? (
                              <span className="font-mono text-xs">{parsed.raw}</span>
                            ) : (
                              <span className="text-xs text-ink-muted">
                                non-numeric
                              </span>
                            )}
                          </td>
                          <td className="text-xs text-ink-muted max-w-xs">
                            {(row.carveouts?.length ?? 0) > 0
                              ? row.carveouts.join('; ')
                              : ''}
                          </td>
                          <td>
                            {isBest && (
                              <span className="badge badge-mfn">Best term</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'accent' | 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'accent'
      ? 'text-accent'
      : tone === 'warn'
      ? 'text-warn'
      : tone === 'danger'
      ? 'text-danger'
      : 'text-ink';
  return (
    <div className="card p-4">
      <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
      <div className="text-xs text-ink-muted uppercase tracking-wide">{label}</div>
    </div>
  );
}
