import { StoredObligation } from './schema';

const COLS: (keyof StoredObligation)[] = [
  'lp_name',
  'fund',
  'entity_layer',
  'clause_ref',
  'source_page',
  'obligation_type',
  'obligation_summary',
  'trigger',
  'frequency',
  'deadline',
  'owner',
  'mfn_flag',
  'consent_flag',
  'confidence',
  'lpa_section_ref',
  'carveouts',
  'conditions',
  'thresholds',
  'notes',
  'source_excerpt',
  'entity_rationale',
  'confidence_rationale',
  'source_filename',
  'extracted_at',
];

function esc(v: unknown): string {
  let s: string;
  if (v == null) s = '';
  else if (Array.isArray(v))
    s = v
      .map((x) =>
        typeof x === 'object' && x !== null
          ? Object.values(x as Record<string, unknown>).filter(Boolean).join(' ')
          : String(x)
      )
      .join('; ');
  else s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(rows: StoredObligation[]): string {
  const header = COLS.join(',');
  const body = rows.map((r) => COLS.map((c) => esc(r[c])).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

export function downloadBlob(content: string, filename: string, mime = 'text/csv'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
