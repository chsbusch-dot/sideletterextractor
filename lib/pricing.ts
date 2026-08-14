// Single source of truth for the paid tier. Amounts are Stripe minor units (USD cents).

export type PackId = 'single' | 'ten';

export type Pack = {
  id: PackId;
  credits: number;
  amountCents: number;
  label: string;
};

export const PACKS: Record<PackId, Pack> = {
  single: {
    id: 'single',
    credits: 1,
    amountCents: 1900,
    label: '1 document credit',
  },
  ten: {
    id: 'ten',
    credits: 10,
    amountCents: 12000,
    label: '10 document credits',
  },
};

export function isPackId(v: unknown): v is PackId {
  return v === 'single' || v === 'ten';
}

export function formatUsd(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}
