import { describe, expect, it } from 'vitest';
import { expandReportingDeadlines } from '../lib/date';
import type { StoredObligation } from '../lib/schema';

function row(overrides: Partial<StoredObligation>): StoredObligation {
  return {
    id: 'test-id',
    lp_name: 'Acme Pension',
    fund: 'Fund IV',
    clause_ref: '3.1',
    obligation_type: 'reporting',
    obligation_summary: 'Quarterly report',
    trigger: '',
    frequency: 'quarterly',
    deadline: '45 days after quarter-end',
    owner: 'CFO',
    mfn_flag: 'N',
    consent_flag: 'N',
    notes: '',
    source_page: 1,
    source_excerpt: '',
    confidence: 0.9,
    confidence_rationale: '',
    carveouts: [],
    conditions: [],
    thresholds: [],
    lpa_section_ref: '',
    entity_layer: 'unspecified',
    entity_rationale: '',
    source_filename: 'test.pdf',
    extracted_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('expandReportingDeadlines', () => {
  it('expands "N days after quarter-end" into four dated entries', () => {
    const entries = expandReportingDeadlines([row({})], 2026);
    expect(entries).toHaveLength(4);
    // Q1 ends Mar 31; +45 days = May 15
    expect(entries[0].date.getFullYear()).toBe(2026);
    expect(entries[0].date.getMonth()).toBe(4);
    expect(entries[0].date.getDate()).toBe(15);
    expect(entries.every((e) => e.inferred)).toBe(true);
  });

  it('expands "N days after fiscal year-end" into one entry in the next year', () => {
    const entries = expandReportingDeadlines(
      [row({ frequency: 'annual', deadline: '90 days after fiscal year-end' })],
      2026
    );
    expect(entries).toHaveLength(1);
    // Dec 31 2026 + 90 days = Mar 31 2027
    expect(entries[0].date.getFullYear()).toBe(2027);
    expect(entries[0].date.getMonth()).toBe(2);
    expect(entries[0].date.getDate()).toBe(31);
  });

  it('skips REVIEW deadlines and non-reporting obligations', () => {
    const entries = expandReportingDeadlines(
      [
        row({ deadline: 'REVIEW' }),
        row({ obligation_type: 'mfn', deadline: 'June 30' }),
      ],
      2026
    );
    expect(entries).toHaveLength(0);
  });

  it('parses explicit "Month Day" deadlines as non-inferred', () => {
    const entries = expandReportingDeadlines(
      [row({ frequency: 'annual', deadline: 'April 30 each year' })],
      2026
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].date.getMonth()).toBe(3);
    expect(entries[0].date.getDate()).toBe(30);
    expect(entries[0].inferred).toBe(false);
  });

  it('only includes ISO dates that fall in the requested year', () => {
    const entries = expandReportingDeadlines(
      [
        row({ frequency: 'one-time', deadline: '2026-08-15' }),
        row({ frequency: 'one-time', deadline: '2027-08-15' }),
      ],
      2026
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].date.getMonth()).toBe(7);
  });

  it('returns entries sorted by date', () => {
    const entries = expandReportingDeadlines(
      [
        row({ frequency: 'one-time', deadline: '2026-11-01' }),
        row({ frequency: 'one-time', deadline: '2026-02-01' }),
      ],
      2026
    );
    expect(entries.map((e) => e.date.getMonth())).toEqual([1, 10]);
  });
});
