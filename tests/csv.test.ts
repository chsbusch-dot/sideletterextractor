import { describe, expect, it } from 'vitest';
import { toCSV } from '../lib/csv';
import type { StoredObligation } from '../lib/schema';

const row: StoredObligation = {
  id: 'id-1',
  lp_name: 'Acme, Inc. "Pension"',
  fund: 'Fund IV',
  clause_ref: '3.1',
  obligation_type: 'reporting',
  obligation_summary: 'Line one\nLine two',
  trigger: '',
  frequency: 'quarterly',
  deadline: '45 days after quarter-end',
  owner: 'CFO',
  mfn_flag: 'N',
  consent_flag: 'N',
  notes: '',
  source_page: 2,
  source_excerpt: '',
  confidence: 0.9,
  confidence_rationale: '',
  carveouts: ['co-invest', 'secondaries'],
  conditions: [],
  thresholds: [{ kind: 'commitment', value: '25000000', unit: 'USD' }],
  lpa_section_ref: '',
  entity_layer: 'main_fund',
  entity_rationale: '',
  source_filename: 'letter.pdf',
  extracted_at: '2026-01-01T00:00:00.000Z',
};

describe('toCSV', () => {
  it('quotes fields containing commas, quotes, and newlines per RFC 4180', () => {
    const csv = toCSV([row]);
    expect(csv).toContain('"Acme, Inc. ""Pension"""');
    expect(csv).toContain('"Line one\nLine two"');
  });

  it('joins array fields with semicolons and flattens threshold objects', () => {
    const csv = toCSV([row]);
    expect(csv).toContain('co-invest; secondaries');
    expect(csv).toContain('commitment 25000000 USD');
  });

  it('emits a header row with lp_name first', () => {
    const csv = toCSV([row]);
    expect(csv.split('\n')[0].startsWith('lp_name,fund,')).toBe(true);
  });
});
