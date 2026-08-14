import { describe, expect, it } from 'vitest';
import { ObligationSchema, isReviewRow, obligationKey } from '../lib/schema';

const minimal = {
  lp_name: 'Acme Pension',
  fund: 'Fund IV',
  clause_ref: '3.1',
  obligation_type: 'reporting',
  obligation_summary: 'Quarterly report',
  frequency: 'quarterly',
  deadline: '45 days after quarter-end',
  owner: 'CFO',
  mfn_flag: 'Y',
  consent_flag: 'N',
};

describe('ObligationSchema lenient coercion', () => {
  it('accepts a minimal valid obligation', () => {
    const parsed = ObligationSchema.parse(minimal);
    expect(parsed.lp_name).toBe('Acme Pension');
    expect(parsed.entity_layer).toBe('unspecified');
    expect(parsed.carveouts).toEqual([]);
  });

  it('coerces unknown obligation_type to "other" and unknown frequency to "REVIEW"', () => {
    const parsed = ObligationSchema.parse({
      ...minimal,
      obligation_type: 'made-up-type',
      frequency: 'sometimes',
    });
    expect(parsed.obligation_type).toBe('other');
    expect(parsed.frequency).toBe('REVIEW');
  });

  it('normalizes flag casing and defaults invalid flags to N', () => {
    const parsed = ObligationSchema.parse({
      ...minimal,
      mfn_flag: ' y ',
      consent_flag: 'maybe',
    });
    expect(parsed.mfn_flag).toBe('Y');
    expect(parsed.consent_flag).toBe('N');
  });

  it('clamps confidence into [0,1] and nulls unparseable values', () => {
    expect(ObligationSchema.parse({ ...minimal, confidence: 1.7 }).confidence).toBe(1);
    expect(ObligationSchema.parse({ ...minimal, confidence: -2 }).confidence).toBe(0);
    expect(ObligationSchema.parse({ ...minimal, confidence: 'n/a' }).confidence).toBeNull();
  });

  it('parses numeric source_page from strings and rejects garbage as null', () => {
    expect(ObligationSchema.parse({ ...minimal, source_page: '12' }).source_page).toBe(12);
    expect(ObligationSchema.parse({ ...minimal, source_page: 'p.12' }).source_page).toBeNull();
  });
});

describe('obligationKey', () => {
  it('normalizes case and whitespace so upserts collide correctly', () => {
    const a = obligationKey({ lp_name: ' Acme Pension ', clause_ref: '3.1' });
    const b = obligationKey({ lp_name: 'acme pension', clause_ref: ' 3.1 ' });
    expect(a).toBe(b);
  });
});

describe('isReviewRow', () => {
  it('flags rows with REVIEW fields or low confidence', () => {
    const base = ObligationSchema.parse(minimal);
    expect(isReviewRow(base)).toBe(false);
    expect(isReviewRow({ ...base, deadline: 'REVIEW' })).toBe(true);
    expect(isReviewRow({ ...base, confidence: 0.5 })).toBe(true);
  });
});
