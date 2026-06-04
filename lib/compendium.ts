import { StoredObligation } from './schema';
import { ObligationType } from './taxonomy';

export type ParsedValue = {
  value: number;
  raw: string;
  unit: 'days' | 'business_days' | '%' | 'USD' | 'count' | 'other';
};

export type MfnComparison = {
  type: ObligationType;
  rows: {
    row: StoredObligation;
    parsed: ParsedValue | null;
    isBest: boolean;
  }[];
  direction: 'min' | 'max' | null;
  unitLabel: string | null;
};

type Direction = 'min' | 'max' | null;

const DIRECTION_BY_TYPE: Record<ObligationType, Direction> = {
  mfn: 'max',
  reporting: 'min',
  fee_offset: 'max',
  co_investment: 'max',
  excuse_exclusion: 'max',
  lpac: 'min',
  consent_approval: null,
  concentration_limit: 'min',
  leverage_restriction: 'min',
  related_party: null,
  notice: 'max',
  transfer_liquidity: null,
  confidentiality: null,
  regulatory: null,
  other: null,
};

const UNIT_LABEL: Partial<Record<ObligationType, string>> = {
  reporting: 'days after period end (lower is LP-favorable)',
  fee_offset: '% of fees offset (higher is LP-favorable)',
  co_investment: '% allocation (higher is LP-favorable)',
  excuse_exclusion: 'days to respond (higher is LP-favorable)',
  lpac: 'USD commitment threshold (lower is LP-favorable)',
  concentration_limit: '% cap (lower is more restrictive — LP-favorable)',
  leverage_restriction: '% cap (lower is more restrictive — LP-favorable)',
  notice: 'days notice window (higher is LP-favorable)',
  mfn: 'days election window (higher is LP-favorable)',
};

function parseUSD(s: string): number | null {
  const m = s.match(/\$\s*([\d,]+(?:\.\d+)?)/);
  if (!m) {
    const word = s.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:million|m\b)/i);
    if (word) return parseFloat(word[1].replace(/,/g, '')) * 1_000_000;
    const billion = s.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:billion|b\b)/i);
    if (billion) return parseFloat(billion[1].replace(/,/g, '')) * 1_000_000_000;
    return null;
  }
  return parseFloat(m[1].replace(/,/g, ''));
}

function parsePercent(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/i);
  return m ? parseFloat(m[1]) : null;
}

function parseDays(s: string): { value: number; business: boolean } | null {
  const m = s.match(/(\d+)\s*(?:\(\d+\)\s*)?(business\s*days|calendar\s*days|days)/i);
  if (!m) return null;
  return {
    value: parseInt(m[1], 10),
    business: /business/i.test(m[2]),
  };
}

function searchFields(row: StoredObligation): string {
  return [
    row.obligation_summary,
    row.trigger,
    row.deadline,
    row.notes,
    ...(row.thresholds ?? []).map((t) => `${t.value} ${t.unit} ${t.kind}`),
  ]
    .filter(Boolean)
    .join(' | ');
}

function parseValueFromThresholds(
  row: StoredObligation,
  preferredKinds: string[]
): ParsedValue | null {
  for (const t of row.thresholds ?? []) {
    const kindLower = (t.kind || '').toLowerCase();
    if (!preferredKinds.some((p) => kindLower.includes(p))) continue;
    const num = parseFloat((t.value || '').replace(/,/g, ''));
    if (!Number.isFinite(num)) continue;
    const unit = (t.unit || '').toLowerCase();
    if (unit.includes('%')) return { value: num, raw: `${num}%`, unit: '%' };
    if (unit.includes('usd') || unit.includes('$'))
      return { value: num, raw: `$${num.toLocaleString()}`, unit: 'USD' };
    if (unit.includes('business')) return { value: num, raw: `${num} business days`, unit: 'business_days' };
    if (unit.includes('day')) return { value: num, raw: `${num} days`, unit: 'days' };
    return { value: num, raw: `${num} ${t.unit}`.trim(), unit: 'other' };
  }
  return null;
}

export function parseValue(row: StoredObligation): ParsedValue | null {
  const haystack = searchFields(row);

  switch (row.obligation_type) {
    case 'reporting': {
      const t = parseValueFromThresholds(row, ['day', 'window', 'lookback']);
      if (t) return t;
      const d = parseDays(row.deadline) ?? parseDays(haystack);
      if (d)
        return {
          value: d.value,
          raw: `${d.value} ${d.business ? 'business days' : 'days'}`,
          unit: d.business ? 'business_days' : 'days',
        };
      return null;
    }
    case 'fee_offset':
    case 'co_investment':
    case 'concentration_limit':
    case 'leverage_restriction': {
      const t = parseValueFromThresholds(row, ['percent', '%', 'pct', 'cap', 'concentration', 'leverage', 'offset', 'allocation']);
      if (t) return t;
      const p = parsePercent(haystack);
      return p === null ? null : { value: p, raw: `${p}%`, unit: '%' };
    }
    case 'lpac': {
      const t = parseValueFromThresholds(row, ['commitment', 'usd', 'floor', 'threshold']);
      if (t) return t;
      const u = parseUSD(haystack);
      return u === null
        ? null
        : { value: u, raw: `$${u.toLocaleString()}`, unit: 'USD' };
    }
    case 'excuse_exclusion':
    case 'notice':
    case 'mfn': {
      const t = parseValueFromThresholds(row, ['day', 'window', 'period', 'notice']);
      if (t) return t;
      const d = parseDays(haystack);
      if (d)
        return {
          value: d.value,
          raw: `${d.value} ${d.business ? 'business days' : 'days'}`,
          unit: d.business ? 'business_days' : 'days',
        };
      return null;
    }
    default:
      return null;
  }
}

export function buildMfnComparisons(rows: StoredObligation[]): MfnComparison[] {
  const eligible = rows.filter((r) => r.mfn_flag === 'Y');
  const byType = new Map<ObligationType, StoredObligation[]>();
  for (const r of eligible) {
    if (!byType.has(r.obligation_type)) byType.set(r.obligation_type, []);
    byType.get(r.obligation_type)!.push(r);
  }

  const comparisons: MfnComparison[] = [];
  for (const [type, items] of byType) {
    const direction = DIRECTION_BY_TYPE[type];
    const parsedItems = items.map((row) => ({
      row,
      parsed: parseValue(row),
      isBest: false,
    }));
    if (direction) {
      const numeric = parsedItems.filter((p) => p.parsed !== null);
      if (numeric.length >= 2) {
        const extreme =
          direction === 'min'
            ? Math.min(...numeric.map((p) => p.parsed!.value))
            : Math.max(...numeric.map((p) => p.parsed!.value));
        for (const p of parsedItems) {
          if (p.parsed && p.parsed.value === extreme) p.isBest = true;
        }
      }
    }
    comparisons.push({
      type,
      rows: parsedItems,
      direction,
      unitLabel: UNIT_LABEL[type] ?? null,
    });
  }
  comparisons.sort((a, b) => b.rows.length - a.rows.length);
  return comparisons;
}

export type ElectionOpportunity = {
  lp_name: string;
  improvements: {
    type: ObligationType;
    currentValue: string;
    bestValue: string;
    bestHeldBy: string;
    currentRow: StoredObligation;
    bestRow: StoredObligation;
  }[];
};

export function buildElectionOpportunities(
  comparisons: MfnComparison[]
): ElectionOpportunity[] {
  const byLp = new Map<string, ElectionOpportunity['improvements']>();

  for (const c of comparisons) {
    if (!c.direction) continue;
    const numeric = c.rows.filter((p) => p.parsed !== null);
    if (numeric.length < 2) continue;
    const bestEntry = numeric.find((p) => p.isBest);
    if (!bestEntry) continue;

    for (const p of numeric) {
      if (p.row.lp_name === bestEntry.row.lp_name) continue;
      if (p.parsed!.value === bestEntry.parsed!.value) continue;
      if (!byLp.has(p.row.lp_name)) byLp.set(p.row.lp_name, []);
      byLp.get(p.row.lp_name)!.push({
        type: c.type,
        currentValue: p.parsed!.raw,
        bestValue: bestEntry.parsed!.raw,
        bestHeldBy: bestEntry.row.lp_name,
        currentRow: p.row,
        bestRow: bestEntry.row,
      });
    }
  }

  return [...byLp.entries()]
    .map(([lp_name, improvements]) => ({ lp_name, improvements }))
    .sort((a, b) => b.improvements.length - a.improvements.length);
}
