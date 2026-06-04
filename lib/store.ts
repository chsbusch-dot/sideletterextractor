'use client';

import { Obligation, StoredObligation, obligationKey } from './schema';

const KEY = 'sle.master_register.v1';

function readAll(): StoredObligation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredObligation[];
  } catch {
    return [];
  }
}

function writeAll(rows: StoredObligation[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new CustomEvent('sle:register-changed'));
}

function newId(): string {
  return `o_${Math.random().toString(36).slice(2, 10)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export const store = {
  list(): StoredObligation[] {
    return readAll();
  },

  upsertMany(
    rows: Obligation[],
    meta: { source_filename: string; extracted_at: string }
  ): { added: number; updated: number } {
    const existing = readAll();
    const byKey = new Map<string, StoredObligation>();
    for (const row of existing) byKey.set(obligationKey(row), row);

    let added = 0;
    let updated = 0;
    for (const row of rows) {
      const key = obligationKey(row);
      const prev = byKey.get(key);
      if (prev) {
        byKey.set(key, {
          ...prev,
          ...row,
          source_filename: meta.source_filename,
          extracted_at: meta.extracted_at,
        });
        updated += 1;
      } else {
        byKey.set(key, {
          ...row,
          id: newId(),
          source_filename: meta.source_filename,
          extracted_at: meta.extracted_at,
        });
        added += 1;
      }
    }

    writeAll([...byKey.values()]);
    return { added, updated };
  },

  remove(id: string): void {
    writeAll(readAll().filter((r) => r.id !== id));
  },

  removeByLp(lpName: string): number {
    const before = readAll();
    const after = before.filter((r) => r.lp_name !== lpName);
    writeAll(after);
    return before.length - after.length;
  },

  update(id: string, patch: Partial<Obligation>): void {
    writeAll(readAll().map((r) => (r.id === id ? { ...r, ...patch } : r)));
  },

  clear(): void {
    writeAll([]);
  },

  importJSON(json: string): { ok: true; count: number } | { ok: false; error: string } {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) return { ok: false, error: 'Expected a JSON array.' };
      writeAll(data as StoredObligation[]);
      return { ok: true, count: data.length };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Bad JSON' };
    }
  },

  exportJSON(): string {
    return JSON.stringify(readAll(), null, 2);
  },
};

export function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  window.addEventListener('sle:register-changed', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('sle:register-changed', handler);
    window.removeEventListener('storage', handler);
  };
}
