import { describe, expect, it } from 'vitest';
import {
  deliveryEmail,
  isPlausibleEmail,
  isWorkEmail,
  normalizeEmail,
} from '../lib/session';

describe('normalizeEmail (storage key)', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Jane.Doe@Fund.COM ')).toBe('jane.doe@fund.com');
  });

  it('strips plus-suffixes on any domain', () => {
    expect(normalizeEmail('jane+trial@fund.com')).toBe('jane@fund.com');
    expect(normalizeEmail('jane+a+b@fund.com')).toBe('jane@fund.com');
  });

  it('strips dots in the local part for Gmail only', () => {
    expect(normalizeEmail('j.a.n.e@gmail.com')).toBe('jane@gmail.com');
    expect(normalizeEmail('j.ane+x@googlemail.com')).toBe('jane@googlemail.com');
    expect(normalizeEmail('jane.doe@fund.com')).toBe('jane.doe@fund.com');
  });

  it('collapses alias variants of one mailbox to one key', () => {
    const variants = ['jane@gmail.com', 'j.ane@gmail.com', 'jane+1@gmail.com', 'JANE@GMAIL.COM'];
    const keys = new Set(variants.map(normalizeEmail));
    expect(keys.size).toBe(1);
  });
});

describe('deliveryEmail', () => {
  it('cleans up but keeps the alias intact', () => {
    expect(deliveryEmail(' Jane+trial@Fund.com ')).toBe('jane+trial@fund.com');
  });
});

describe('isPlausibleEmail / isWorkEmail', () => {
  it('accepts normal addresses and rejects garbage', () => {
    expect(isPlausibleEmail('jane@fund.com')).toBe(true);
    expect(isPlausibleEmail('not-an-email')).toBe(false);
    expect(isPlausibleEmail('a@b')).toBe(false);
  });

  it('classifies freemail vs work domains', () => {
    expect(isWorkEmail('jane@gmail.com')).toBe(false);
    expect(isWorkEmail('jane@blackstone.com')).toBe(true);
  });
});
