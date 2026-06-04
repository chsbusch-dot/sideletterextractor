'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { extractPdfText } from '@/lib/pdf';
import { store } from '@/lib/store';
import { Obligation, StoredObligation } from '@/lib/schema';
import { ObligationTable } from '@/components/ObligationTable';

type ExtractResponse = {
  obligations: Obligation[];
  model: string;
  filename: string | null;
};

const TABS = ['Upload PDF', 'Paste text'] as const;
type Tab = (typeof TABS)[number];

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('Upload PDF');
  const [filename, setFilename] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<StoredObligation[] | null>(null);
  const [saved, setSaved] = useState<{ added: number; updated: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const reset = () => {
    setError(null);
    setPreview(null);
    setSaved(null);
  };

  const onPickFile = useCallback(async (file: File) => {
    reset();
    setFilename(file.name);
    setLoading(true);
    setStage('Extracting text from PDF…');
    try {
      const extracted = await extractPdfText(file);
      setText(extracted);
      setStage('Asking Claude to extract obligations…');
      await runExtraction(extracted, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF extraction failed.');
    } finally {
      setLoading(false);
      setStage('');
    }
  }, []);

  const runExtraction = useCallback(async (docText: string, name: string) => {
    setLoading(true);
    setStage('Asking Claude to extract obligations…');
    setError(null);
    setPreview(null);
    setSaved(null);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: docText, filename: name }),
      });
      const json = (await res.json()) as ExtractResponse | { error: string };
      if (!res.ok || 'error' in json) {
        throw new Error('error' in json ? json.error : `HTTP ${res.status}`);
      }
      const now = new Date().toISOString();
      const stored: StoredObligation[] = json.obligations.map((o, idx) => ({
        ...o,
        id: `preview_${idx}`,
        source_filename: name,
        extracted_at: now,
      }));
      setPreview(stored);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed.');
    } finally {
      setLoading(false);
      setStage('');
    }
  }, []);

  const onSave = useCallback(() => {
    if (!preview) return;
    const now = new Date().toISOString();
    const result = store.upsertMany(
      preview.map(({ id: _id, source_filename: _s, extracted_at: _e, ...rest }) => rest),
      { source_filename: filename || 'pasted-text', extracted_at: now }
    );
    setSaved(result);
  }, [preview, filename]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">
          Upload a side letter, get a register.
        </h1>
        <p className="text-ink-muted mt-2 max-w-3xl">
          Drop a PDF or paste text. The extractor returns a standardized obligation register
          (controlled taxonomy, traceable to clause refs, REVIEW where ambiguous), then merges
          into your master register on{' '}
          <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">
            lp_name + clause_ref
          </code>
          .
        </p>
      </section>

      <section className="card p-6">
        <div className="flex gap-1 mb-4">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                reset();
              }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                tab === t
                  ? 'bg-ink text-paper'
                  : 'text-ink-muted hover:bg-slate-100 hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Upload PDF' && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onPickFile(f);
            }}
            className="rounded-md border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center"
          >
            <p className="text-ink-muted mb-3">Drag a PDF here, or</p>
            <button
              type="button"
              className="btn"
              disabled={loading}
              onClick={() => fileInput.current?.click()}
            >
              Choose PDF
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickFile(f);
              }}
            />
            {filename && (
              <p className="mt-3 text-xs text-ink-muted">
                <span className="font-mono">{filename}</span>
              </p>
            )}
          </div>
        )}

        {tab === 'Paste text' && (
          <div className="space-y-3">
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Source label (e.g., meridian-iv-side-letter.md)"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              placeholder="Paste the side letter text here…"
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
            />
            <button
              type="button"
              className="btn"
              disabled={loading || !text.trim()}
              onClick={() => runExtraction(text.trim(), filename || 'pasted-text')}
            >
              Extract obligations
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-4 text-sm text-ink-muted flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
            {stage || 'Working…'}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-md bg-danger-soft border border-danger/20 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
      </section>

      {preview && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Extracted {preview.length}{' '}
              {preview.length === 1 ? 'obligation' : 'obligations'}
            </h2>
            <div className="flex items-center gap-2">
              {saved ? (
                <span className="text-sm text-accent">
                  Saved · {saved.added} added, {saved.updated} updated.{' '}
                  <Link href="/register" className="underline">
                    Open master register
                  </Link>
                </span>
              ) : (
                <button type="button" className="btn" onClick={onSave}>
                  Save to master register
                </button>
              )}
            </div>
          </div>

          <ObligationTable rows={preview} />

          <PriorityFlags rows={preview} />
        </section>
      )}
    </div>
  );
}

function PriorityFlags({ rows }: { rows: StoredObligation[] }) {
  const mfn = rows.filter((r) => r.mfn_flag === 'Y').length;
  const consent = rows.filter((r) => r.consent_flag === 'Y').length;
  const review = rows.filter(
    (r) =>
      r.deadline === 'REVIEW' ||
      r.owner === 'REVIEW' ||
      r.frequency === 'REVIEW' ||
      /REVIEW/.test(r.notes || '')
  ).length;

  return (
    <div className="grid grid-cols-3 gap-4">
      <Stat label="MFN-eligible" value={mfn} tone="accent" />
      <Stat label="Consent-gated" value={consent} tone="warn" />
      <Stat label="Need review" value={review} tone="danger" />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'accent' | 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'accent'
      ? 'text-accent'
      : tone === 'warn'
      ? 'text-warn'
      : 'text-danger';
  return (
    <div className="card p-4">
      <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
      <div className="text-xs text-ink-muted uppercase tracking-wide">{label}</div>
    </div>
  );
}
