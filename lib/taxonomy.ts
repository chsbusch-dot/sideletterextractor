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

export const ENTITY_LAYERS = [
  'main_fund',
  'master_fund',
  'onshore_feeder',
  'offshore_feeder',
  'parallel_vehicle',
  'aiv',
  'blocker',
  'co_invest_vehicle',
  'sma',
  'multiple',
  'unspecified',
] as const;

export type EntityLayer = (typeof ENTITY_LAYERS)[number];

export const ENTITY_LAYER_LABELS: Record<EntityLayer, string> = {
  main_fund: 'Main Fund',
  master_fund: 'Master Fund',
  onshore_feeder: 'Onshore Feeder',
  offshore_feeder: 'Offshore Feeder',
  parallel_vehicle: 'Parallel Vehicle',
  aiv: 'AIV',
  blocker: 'Blocker',
  co_invest_vehicle: 'Co-Invest Vehicle',
  sma: 'SMA',
  multiple: 'Multiple Entities',
  unspecified: 'Unspecified',
};
