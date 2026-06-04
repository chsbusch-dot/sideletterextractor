import { StoredObligation } from './schema';

export type CalendarEntry = {
  date: Date;
  iso: string;
  lp_name: string;
  fund: string;
  clause_ref: string;
  obligation_summary: string;
  frequency: string;
  owner: string;
  source_deadline: string;
  inferred: boolean;
};

const QUARTER_ENDS_RE = /(\d{1,3})\s*(?:calendar\s*)?days?\s*after\s*quarter[- ]?end/i;
const FISCAL_YEAR_END_RE = /(\d{1,3})\s*(?:calendar\s*)?days?\s*after\s*(?:fiscal\s*)?year[- ]?end/i;
const MONTH_DAY_RE = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i;

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const QUARTER_ENDS = (year: number) => [
  new Date(year, 2, 31),
  new Date(year, 5, 30),
  new Date(year, 8, 30),
  new Date(year, 11, 31),
];

function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function baseEntry(o: StoredObligation, d: Date, inferred: boolean): CalendarEntry {
  return {
    date: d,
    iso: iso(d),
    lp_name: o.lp_name,
    fund: o.fund,
    clause_ref: o.clause_ref,
    obligation_summary: o.obligation_summary,
    frequency: o.frequency,
    owner: o.owner,
    source_deadline: o.deadline,
    inferred,
  };
}

export function expandReportingDeadlines(
  rows: StoredObligation[],
  year: number
): CalendarEntry[] {
  const entries: CalendarEntry[] = [];

  for (const o of rows) {
    if (o.obligation_type !== 'reporting') continue;
    const dl = (o.deadline || '').trim();
    if (!dl || dl === 'REVIEW') continue;

    const qMatch = dl.match(QUARTER_ENDS_RE);
    if (qMatch && o.frequency === 'quarterly') {
      const days = parseInt(qMatch[1], 10);
      for (const qEnd of QUARTER_ENDS(year)) {
        entries.push(baseEntry(o, addDays(qEnd, days), true));
      }
      continue;
    }

    const yMatch = dl.match(FISCAL_YEAR_END_RE);
    if (yMatch && o.frequency === 'annual') {
      const days = parseInt(yMatch[1], 10);
      entries.push(baseEntry(o, addDays(new Date(year, 11, 31), days), true));
      continue;
    }

    const mdMatch = dl.match(MONTH_DAY_RE);
    if (mdMatch) {
      const m = MONTHS[mdMatch[1].toLowerCase()];
      const d = parseInt(mdMatch[2], 10);
      if (Number.isFinite(m) && Number.isFinite(d)) {
        entries.push(baseEntry(o, new Date(year, m, d), false));
        continue;
      }
    }

    const isoLike = dl.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoLike) {
      const [, y, mo, d] = isoLike;
      const parsedYear = parseInt(y, 10);
      if (parsedYear === year) {
        entries.push(
          baseEntry(o, new Date(parsedYear, parseInt(mo, 10) - 1, parseInt(d, 10)), false)
        );
      }
    }
  }

  entries.sort((a, b) => a.date.getTime() - b.date.getTime());
  return entries;
}
