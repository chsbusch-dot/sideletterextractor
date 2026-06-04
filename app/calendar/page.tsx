'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRegister } from '@/lib/useRegister';
import { expandReportingDeadlines } from '@/lib/date';

export default function CalendarPage() {
  const rows = useRegister();
  const [year, setYear] = useState(new Date().getUTCFullYear());

  const reportingRows = useMemo(
    () => rows.filter((r) => r.obligation_type === 'reporting'),
    [rows]
  );
  const entries = useMemo(() => expandReportingDeadlines(rows, year), [rows, year]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (rows.length === 0) {
    return (
      <div className="card p-10 text-center">
        <h1 className="text-xl font-semibold">No reporting obligations yet.</h1>
        <p className="text-ink-muted mt-2">
          Extract a side letter on the{' '}
          <Link href="/" className="underline">
            upload page
          </Link>{' '}
          to populate the reporting calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reporting calendar</h1>
          <p className="text-ink-muted text-sm mt-1">
            Reporting obligations across {new Set(reportingRows.map((r) => r.lp_name)).size}{' '}
            LP{new Set(reportingRows.map((r) => r.lp_name)).size === 1 ? '' : 's'}, expanded
            into concrete dates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-ink-muted">Year</label>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
          >
            {[year - 1, year, year + 1, year + 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="card p-8 text-ink-muted">
          No reporting obligations with parseable deadlines for {year}.{' '}
          {reportingRows.length > 0 && (
            <>
              {reportingRows.length} reporting row
              {reportingRows.length === 1 ? '' : 's'} in the register; deadlines may need
              review (look on the{' '}
              <Link href="/review" className="underline">
                review queue
              </Link>
              ).
            </>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="register">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>LP</th>
                  <th>Fund</th>
                  <th>Clause</th>
                  <th>Obligation</th>
                  <th>Frequency</th>
                  <th>Owner</th>
                  <th>Source deadline</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => {
                  const overdue = e.date < today;
                  return (
                    <tr key={`${e.iso}_${idx}`}>
                      <td className="font-mono text-xs whitespace-nowrap">
                        {e.iso}
                        {overdue && (
                          <span className="ml-2 badge badge-review">overdue</span>
                        )}
                      </td>
                      <td className="font-medium">{e.lp_name}</td>
                      <td className="text-ink-muted text-xs">{e.fund}</td>
                      <td className="font-mono text-xs">{e.clause_ref}</td>
                      <td className="max-w-md">{e.obligation_summary}</td>
                      <td className="text-xs">{e.frequency}</td>
                      <td className="text-xs">{e.owner}</td>
                      <td className="text-xs text-ink-muted">
                        {e.source_deadline}
                        {e.inferred && (
                          <span className="ml-2 text-ink-muted">(inferred)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-ink-muted">
        Dates are derived from the source deadline (e.g., &quot;45 days after quarter-end&quot;
        → four concrete dates). Quarter ends use calendar quarters; fiscal-year ends assume
        Dec 31. Override the deadline text in the register if your fund uses a different
        fiscal year.
      </p>
    </div>
  );
}
