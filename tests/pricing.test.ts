import { describe, expect, it } from 'vitest';
import { formatUsd, isPackId, PACKS } from '../lib/pricing';

describe('PACKS', () => {
  it('matches the agreed pricing: $19 single, $120 ten-pack', () => {
    expect(PACKS.single.amountCents).toBe(1900);
    expect(PACKS.single.credits).toBe(1);
    expect(PACKS.ten.amountCents).toBe(12000);
    expect(PACKS.ten.credits).toBe(10);
  });

  it('gives the ten-pack a real per-document discount', () => {
    const perDoc = PACKS.ten.amountCents / PACKS.ten.credits;
    expect(perDoc).toBeLessThan(PACKS.single.amountCents);
  });
});

describe('formatUsd', () => {
  it('renders whole dollars without cents and fractional amounts with them', () => {
    expect(formatUsd(1900)).toBe('$19');
    expect(formatUsd(12000)).toBe('$120');
    expect(formatUsd(1250)).toBe('$12.50');
  });
});

describe('isPackId', () => {
  it('accepts known packs and rejects everything else', () => {
    expect(isPackId('single')).toBe(true);
    expect(isPackId('ten')).toBe(true);
    expect(isPackId('hundred')).toBe(false);
    expect(isPackId(undefined)).toBe(false);
  });
});
