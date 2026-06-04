export const OBLIGATION_TYPES = [
  'mfn',
  'reporting',
  'fee_offset',
  'co_investment',
  'excuse_exclusion',
  'lpac',
  'consent_approval',
  'concentration_limit',
  'leverage_restriction',
  'related_party',
  'notice',
  'transfer_liquidity',
  'confidentiality',
  'regulatory',
  'other',
] as const;

export type ObligationType = (typeof OBLIGATION_TYPES)[number];

export const OBLIGATION_TYPE_LABELS: Record<ObligationType, string> = {
  mfn: 'MFN',
  reporting: 'Reporting',
  fee_offset: 'Fee offset',
  co_investment: 'Co-investment',
  excuse_exclusion: 'Excuse / exclusion',
  lpac: 'LPAC',
  consent_approval: 'Consent / approval',
  concentration_limit: 'Concentration limit',
  leverage_restriction: 'Leverage restriction',
  related_party: 'Related party',
  notice: 'Notice',
  transfer_liquidity: 'Transfer / liquidity',
  confidentiality: 'Confidentiality',
  regulatory: 'Regulatory',
  other: 'Other',
};

export const FREQUENCIES = [
  'one-time',
  'quarterly',
  'annual',
  'event-driven',
  'standing',
  'REVIEW',
] as const;

export type Frequency = (typeof FREQUENCIES)[number];

export const HIGH_PRIORITY_TYPES: ObligationType[] = [
  'mfn',
  'consent_approval',
  'concentration_limit',
  'leverage_restriction',
  'related_party',
];
