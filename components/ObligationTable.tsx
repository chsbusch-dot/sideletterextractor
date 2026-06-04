'use client';

import { StoredObligation, isReviewRow } from '@/lib/schema';
import {
  ENTITY_LAYER_LABELS,
  EntityLayer,
  OBLIGATION_TYPE_LABELS,
} from '@/lib/taxonomy';

type Props = {
  rows: StoredObligation[];
  onRemove?: (id: string) => void;
  emptyMessage?: string;
  compact?: boolean;
};

function ConfidenceCell({ value }: { value: number | null }) {
  if (typeof value !== 'number') return <span className="text-ink-muted text-xs">—</span>;
  const pct = Math.round(value * 100);
  const tone =
    value >= 0.85 ? 'text-accent' : value >= 0.7 ? 'text-ink-soft' : 'text-danger';
  return <span className={`text-xs font-mono ${tone}`}>{pct}%</span>;
}

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
              <th>Entity</th>
              <th>Clause</th>
              <th>Type</th>
              <th>Obligation</th>
              {!compact && <th>Trigger</th>}
              <th>Freq.</th>
              <th>Deadline</th>
              <th>Owner</th>
              <th>Flags</th>
              <th>Conf.</th>
              {!compact && <th>Carve-outs / Notes</th>}
              {onRemove && <th aria-label="actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const review = isReviewRow(r);
              return (
                <tr key={r.id}>
                  <td className="font-medium">{r.lp_name}</td>
                  <td className="text-ink-muted">{r.fund}</td>
                  <td className="text-xs">
                    <span
                      className="badge bg-slate-100 text-ink-soft border border-slate-300"
                      title={r.entity_rationale || undefined}
                    >
                      {ENTITY_LAYER_LABELS[(r.entity_layer as EntityLayer) ?? 'unspecified']}
                    </span>
                  </td>
                  <td className="font-mono text-xs">
                    {r.clause_ref}
                    {r.source_page ? (
                      <div className="text-ink-muted">p. {r.source_page}</div>
                    ) : null}
                  </td>
                  <td>
                    <span className="badge badge-type">
                      {OBLIGATION_TYPE_LABELS[r.obligation_type]}
                    </span>
                  </td>
                  <td className="max-w-md">{r.obligation_summary}</td>
                  {!compact && <td className="text-ink-muted text-xs">{r.trigger || '—'}</td>}
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
                  <td className="whitespace-nowrap">
                    <ConfidenceCell value={r.confidence ?? null} />
                  </td>
                  {!compact && (
                    <td className="text-ink-muted text-xs max-w-xs">
                      {(r.carveouts?.length ?? 0) > 0 && (
                        <div>
                          <span className="font-medium text-ink-soft">Carve-outs:</span>{' '}
                          {r.carveouts.join('; ')}
                        </div>
                      )}
                      {(r.conditions?.length ?? 0) > 0 && (
                        <div>
                          <span className="font-medium text-ink-soft">Conditions:</span>{' '}
                          {r.conditions.join('; ')}
                        </div>
                      )}
                      {r.notes && <div>{r.notes}</div>}
                    </td>
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
