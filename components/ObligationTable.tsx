'use client';

import { StoredObligation } from '@/lib/schema';
import { OBLIGATION_TYPE_LABELS } from '@/lib/taxonomy';

type Props = {
  rows: StoredObligation[];
  onRemove?: (id: string) => void;
  emptyMessage?: string;
  compact?: boolean;
};

export function ObligationTable({ rows, onRemove, emptyMessage, compact }: Props) {
  if (rows.length === 0) {
    return (
      <div className="card p-8 text-center text-ink-muted">
        {emptyMessage ?? 'No obligations yet.'}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="register">
          <thead>
            <tr>
              <th>LP</th>
              <th>Fund</th>
              <th>Clause</th>
              <th>Type</th>
              <th>Obligation</th>
              {!compact && <th>Trigger</th>}
              <th>Freq.</th>
              <th>Deadline</th>
              <th>Owner</th>
              <th>Flags</th>
              {!compact && <th>Notes</th>}
              {onRemove && <th aria-label="actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const review =
                r.deadline === 'REVIEW' ||
                r.owner === 'REVIEW' ||
                r.frequency === 'REVIEW' ||
                /REVIEW/.test(r.notes || '');
              return (
                <tr key={r.id}>
                  <td className="font-medium">{r.lp_name}</td>
                  <td className="text-ink-muted">{r.fund}</td>
                  <td className="font-mono text-xs">{r.clause_ref}</td>
                  <td>
                    <span className="badge badge-type">
                      {OBLIGATION_TYPE_LABELS[r.obligation_type]}
                    </span>
                  </td>
                  <td className="max-w-md">{r.obligation_summary}</td>
                  {!compact && (
                    <td className="text-ink-muted text-xs">{r.trigger || '—'}</td>
                  )}
                  <td className="text-xs">{r.frequency}</td>
                  <td className="text-xs">{r.deadline}</td>
                  <td className="text-xs">{r.owner}</td>
                  <td className="space-x-1 whitespace-nowrap">
                    {r.mfn_flag === 'Y' && <span className="badge badge-mfn">MFN</span>}
                    {r.consent_flag === 'Y' && (
                      <span className="badge badge-consent">Consent</span>
                    )}
                    {review && <span className="badge badge-review">Review</span>}
                  </td>
                  {!compact && (
                    <td className="text-ink-muted text-xs max-w-xs">{r.notes || ''}</td>
                  )}
                  {onRemove && (
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => onRemove(r.id)}
                        className="text-xs text-danger hover:underline"
                        aria-label="Remove row"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
