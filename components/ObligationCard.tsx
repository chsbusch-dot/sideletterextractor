'use client';

import { Obligation, StoredObligation, isReviewRow } from '@/lib/schema';
import { OBLIGATION_TYPE_LABELS } from '@/lib/taxonomy';

type Props = {
  row: Obligation | StoredObligation;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
};

function ConfidencePill({ confidence }: { confidence: number | null }) {
  if (typeof confidence !== 'number') return null;
  const pct = Math.round(confidence * 100);
  const tone =
    confidence >= 0.85
      ? 'bg-accent-soft text-accent'
      : confidence >= 0.7
      ? 'bg-slate-200 text-ink-soft'
      : 'bg-danger-soft text-danger';
  return (
    <span className={`badge ${tone}`} title="Self-reported model confidence">
      {pct}% conf.
    </span>
  );
}

export function ObligationCard({ row, active, onClick, onRemove }: Props) {
  const review = isReviewRow(row);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full text-left card p-4 transition ${
        active ? 'ring-2 ring-accent' : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="badge badge-type">
              {OBLIGATION_TYPE_LABELS[row.obligation_type]}
            </span>
            <span className="font-mono text-xs text-ink-muted">{row.clause_ref}</span>
            {row.source_page ? (
              <span className="text-xs text-ink-muted">p. {row.source_page}</span>
            ) : null}
            {row.mfn_flag === 'Y' && <span className="badge badge-mfn">MFN</span>}
            {row.consent_flag === 'Y' && <span className="badge badge-consent">Consent</span>}
            {review && <span className="badge badge-review">Review</span>}
            <ConfidencePill confidence={row.confidence ?? null} />
          </div>
          <div className="font-medium text-sm leading-snug">{row.obligation_summary}</div>
          {row.lpa_section_ref && (
            <div className="text-xs text-ink-muted mt-1">
              LPA cross-ref:{' '}
              <span className="font-mono">{row.lpa_section_ref}</span>
            </div>
          )}
        </div>
        {onRemove && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onRemove();
              }
            }}
            className="text-xs text-danger hover:underline shrink-0"
          >
            Remove
          </span>
        )}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-xs text-ink-muted">
        <div>
          <span className="font-medium text-ink-soft">Freq.</span> {row.frequency}
        </div>
        <div>
          <span className="font-medium text-ink-soft">Deadline.</span> {row.deadline}
        </div>
        <div>
          <span className="font-medium text-ink-soft">Owner.</span> {row.owner}
        </div>
      </div>

      {row.trigger && (
        <div className="mt-1 text-xs text-ink-muted">
          <span className="font-medium text-ink-soft">Trigger.</span> {row.trigger}
        </div>
      )}

      {(row.carveouts?.length ?? 0) > 0 && (
        <div className="mt-2 text-xs">
          <div className="font-medium text-ink-soft mb-1">Carve-outs</div>
          <ul className="list-disc pl-4 text-ink-muted space-y-0.5">
            {row.carveouts.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {(row.conditions?.length ?? 0) > 0 && (
        <div className="mt-2 text-xs">
          <div className="font-medium text-ink-soft mb-1">Conditions</div>
          <ul className="list-disc pl-4 text-ink-muted space-y-0.5">
            {row.conditions.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {(row.thresholds?.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {row.thresholds.map((t, i) => (
            <span
              key={i}
              className="badge bg-slate-100 text-ink-soft font-mono"
              title={t.kind}
            >
              {t.kind}: {t.value}
              {t.unit ? ` ${t.unit}` : ''}
            </span>
          ))}
        </div>
      )}

      {row.confidence_rationale && (
        <div className="mt-2 text-[11px] text-ink-muted italic">
          {row.confidence_rationale}
        </div>
      )}

      {row.notes && (
        <div className="mt-2 text-xs text-ink-muted">
          <span className="font-medium text-ink-soft">Notes.</span> {row.notes}
        </div>
      )}
    </button>
  );
}
