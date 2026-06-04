'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRegister } from '@/lib/useRegister';
import { ObligationTable } from '@/components/ObligationTable';
import { store } from '@/lib/store';
import { isReviewRow } from '@/lib/schema';

export default function ReviewPage() {
  const rows = useRegister();

  const reviewRows = useMemo(() => rows.filter((r) => isReviewRow(r)), [rows]);
  const lowConfidence = useMemo(
    () => rows.filter((r) => typeof r.confidence === 'number' && r.confidence < 0.7),
    [rows]
  );
  const consentRows = useMemo(() => rows.filter((r) => r.consent_flag === 'Y'), [rows]);

  if (rows.length === 0) {
    return (
      <div className="card p-10 text-center">
        <h1 className="text-xl font-semibold">Nothing to review yet.</h1>
        <p className="text-ink-muted mt-2">
          Extract a side letter on the{' '}
          <Link href="/" className="underline">
            upload page
          </Link>{' '}
          to populate the review queue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Review queue</h1>
          <p className="text-ink-muted text-sm mt-1">
            Rows where the extractor flagged a missing or ambiguous field, OR self-reported
            confidence below 70%. Resolve in source and re-extract, or remove and re-add the
            row. Recall over precision: anything uncertain lands here, not in the silently
            confident set.
          </p>
        </header>

        {reviewRows.length === 0 ? (
          <div className="card p-6 text-ink-muted">
            Nothing flagged. Every row has a concrete deadline, owner, frequency, and ≥70%
            self-reported confidence.
          </div>
        ) : (
          <>
            <div className="text-xs text-ink-muted">
              {reviewRows.length} of {rows.length} rows need human resolution
              {lowConfidence.length > 0 &&
                ` · ${lowConfidence.length} flagged by confidence threshold`}
              .
            </div>
            <ObligationTable rows={reviewRows} onRemove={(id) => store.remove(id)} />
          </>
        )}
      </section>

      <section className="space-y-3">
        <header>
          <h2 className="text-xl font-semibold tracking-tight">Consent-gate watchlist</h2>
          <p className="text-ink-muted text-sm mt-1">
            GP actions that pause until LP consent or LPAC approval is evidenced. Treat as the
            block-list before deal approvals, related-party transactions, or anything that
            touches the concentration / leverage caps.
          </p>
        </header>

        {consentRows.length === 0 ? (
          <div className="card p-6 text-ink-muted">
            No consent-gated obligations in the register.
          </div>
        ) : (
          <>
            <div className="text-xs text-ink-muted">
              {consentRows.length} consent-gated obligation
              {consentRows.length === 1 ? '' : 's'} across{' '}
              {new Set(consentRows.map((r) => r.lp_name)).size} LP
              {new Set(consentRows.map((r) => r.lp_name)).size === 1 ? '' : 's'}.
            </div>
            <ObligationTable rows={consentRows} onRemove={(id) => store.remove(id)} />
          </>
        )}
      </section>
    </div>
  );
}
