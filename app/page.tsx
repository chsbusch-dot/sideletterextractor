'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { readFileAsBase64 } from '@/lib/pdf';
import { store } from '@/lib/store';
import { Obligation, StoredObligation, isReviewRow } from '@/lib/schema';
import { PdfViewer } from '@/components/PdfViewer';
import { ObligationCard } from '@/components/ObligationCard';
import { BalancePill, PurchasePanel, type Balance } from '@/components/BillingPanel';

type ExtractResponse = {
  obligations: Obligation[];
  model: string;
  filename: string | null;
  balance?: Balance | null;
};

const TABS = ['Upload PDF', 'Paste text'] as const;
type Tab = (typeof TABS)[number];

const MAX_PDF_BYTES = 16 * 1024 * 1024;

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('Upload PDF');
  const [filename, setFilename] = useState('');
  const [text, setText] = useState('');
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [lpaBase64, setLpaBase64] = useState<string | null>(null);
  const [lpaFilename, setLpaFilename] = useState('');

  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<StoredObligation[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ added: number; updated: number } | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState(false);
  const [purchaseNotice, setPurchaseNotice] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const lpaInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) return;
        const json = (await res.json()) as { balance?: Balance };
        if (json.balance) setBalance(json.balance);
      } catch {
        // The pill is cosmetic; never block the page on it.
      }
    };

    const params = new URLSearchParams(window.location.search);
    const purchase = params.get('purchase');
    if (purchase) {
      params.delete('purchase');
      const rest = params.toString();
      window.history.replaceState(null, '', rest ? `/?${rest}` : '/');
    }
    if (purchase === 'success') {
      setPurchaseNotice('Payment received. Your credits are being applied…');
      // The Stripe webhook usually lands within seconds of the redirect;
      // refetch a few times so the pill catches up without a reload.
      fetchBalance();
      const t1 = setTimeout(fetchBalance, 2500);
      const t2 = setTimeout(() => {
        fetchBalance();
        setPurchaseNotice('Payment received. Credits added — good to go.');
      }, 6000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    if (purchase === 'cancelled') {
      setPurchaseNotice('Checkout cancelled — nothing was charged.');
    }
    fetchBalance();
  }, []);

  const reset = () => {
    setError(null);
    setPreview(null);
    setActiveId(null);
    setSaved(null);
    setQuotaExhausted(false);
  };

  const onPickFile = useCallback(
    async (file: File) => {
      reset();
      if (file.size > MAX_PDF_BYTES) {
        setError(
          `PDF is ${Math.round(file.size / 1024 / 1024)} MB; cap is ${MAX_PDF_BYTES / 1024 / 1024} MB. Split it or paste relevant excerpts.`
        );
        return;
      }
      setFilename(file.name);
      setLoading(true);
      setStage('Reading PDF…');
      try {
        const b64 = await readFileAsBase64(file);
        setPdfBase64(b64);
        setStage('Asking Claude to extract obligations…');
        await runExtraction({ pdf: b64, filename: file.name });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to read file.');
      } finally {
        setLoading(false);
        setStage('');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onPickLpa = useCallback(async (file: File) => {
    if (file.size > MAX_PDF_BYTES) {
      setError(`LPA is too large (${Math.round(file.size / 1024 / 1024)} MB).`);
      return;
    }
    const b64 = await readFileAsBase64(file);
    setLpaBase64(b64);
    setLpaFilename(file.name);
  }, []);

  const runExtraction = useCallback(
    async (
      payload:
        | { pdf: string; filename: string }
        | { text: string; filename: string }
    ) => {
      setLoading(true);
      setStage('Asking Claude to extract obligations…');
      setError(null);
      setPreview(null);
      setSaved(null);
      try {
        const body: Record<string, unknown> = { ...payload };
        if (lpaBase64) body.lpa_pdf = lpaBase64;
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as
          | ExtractResponse
          | { error: string; details?: unknown; quota_exhausted?: boolean };
        if (!res.ok || 'error' in json) {
          if ('quota_exhausted' in json && json.quota_exhausted) setQuotaExhausted(true);
          const msg = 'error' in json ? json.error : `HTTP ${res.status}`;
          throw new Error(msg);
        }
        if (json.balance) setBalance(json.balance);
        const now = new Date().toISOString();
        const stored: StoredObligation[] = json.obligations.map((o, idx) => ({
          ...o,
          id: `preview_${idx}`,
          source_filename: payload.filename,
          extracted_at: now,
        }));
        setPreview(stored);
        if (stored.length > 0) setActiveId(stored[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Extraction failed.');
      } finally {
        setLoading(false);
        setStage('');
      }
    },
    [lpaBase64]
  );

  const onSave = useCallback(() => {
    if (!preview) return;
    const now = new Date().toISOString();
    const result = store.upsertMany(
      preview.map(({ id: _id, source_filename: _s, extracted_at: _e, ...rest }) => rest),
      { source_filename: filename || 'pasted-text', extracted_at: now }
    );
    setSaved(result);
  }, [preview, filename]);

  const active = preview?.find((p) => p.id === activeId) ?? null;

  return (
    <div className="space-y-6">
      {!preview && (
        <>
          {purchaseNotice && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-ink">
              {purchaseNotice}
            </div>
          )}
          <section>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Upload a side letter, get a register.
              </h1>
              <BalancePill balance={balance} />
            </div>
            <p className="text-ink-muted mt-2 max-w-3xl">
              Drop a PDF and the extractor returns a standardized obligation register —
              controlled taxonomy, source-page citations, self-reported confidence per row,
              and structured carve-outs / conditions / thresholds. Click any row to jump to
              the exact clause in the PDF.
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
                <p className="text-ink-muted mb-3">Drag a side-letter PDF here, or</p>
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
                  onClick={() => {
                    setPdfBase64(null);
                    runExtraction({ text: text.trim(), filename: filename || 'pasted-text' });
                  }}
                >
                  Extract obligations
                </button>
              </div>
            )}

            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-ink-muted hover:text-ink select-none">
                Optional: attach LPA for cross-reference{' '}
                {lpaBase64 && (
                  <span className="text-accent">· loaded {lpaFilename}</span>
                )}
              </summary>
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
                <p className="text-xs text-ink-muted">
                  If you attach the partnership agreement, the extractor will use it to
                  interpret side-letter language that modifies LPA sections, and will populate{' '}
                  <code className="font-mono text-xs bg-white px-1 rounded">
                    lpa_section_ref
                  </code>{' '}
                  on each row where applicable.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => lpaInput.current?.click()}
                  >
                    {lpaBase64 ? 'Replace LPA PDF' : 'Choose LPA PDF'}
                  </button>
                  {lpaBase64 && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => {
                        setLpaBase64(null);
                        setLpaFilename('');
                      }}
                    >
                      Remove
                    </button>
                  )}
                  <input
                    ref={lpaInput}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onPickLpa(f);
                    }}
                  />
                </div>
              </div>
            </details>

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
            {quotaExhausted && <PurchasePanel onError={setError} />}
          </section>
        </>
      )}

      {preview && (
        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">
                Extracted {preview.length}{' '}
                {preview.length === 1 ? 'obligation' : 'obligations'} from{' '}
                <span className="font-mono text-sm">{filename}</span>
              </h1>
              <PriorityFlagsInline rows={preview} />
              <p className="mt-1 text-xs text-ink-muted">
                AI-assisted extraction — verify each row against the source document before
                relying on it. Not legal advice.
              </p>
            </div>
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
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  reset();
                  setPdfBase64(null);
                }}
              >
                New extraction
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div
              className="space-y-2 overflow-y-auto pr-1"
              style={{ maxHeight: 'calc(100vh - 180px)' }}
            >
              {preview.map((r) => (
                <ObligationCard
                  key={r.id}
                  row={r}
                  active={r.id === activeId}
                  onClick={() => setActiveId(r.id)}
                />
              ))}
            </div>
            <div className="lg:sticky lg:top-4 self-start">
              {pdfBase64 ? (
                <>
                  <div className="text-xs text-ink-muted mb-1 px-1">
                    Source verification
                    {active?.source_page ? ` · p. ${active.source_page}` : ''}
                    {active?.clause_ref ? ` · ${active.clause_ref}` : ''}
                  </div>
                  <PdfViewer
                    pdfBase64={pdfBase64}
                    activePage={active?.source_page ?? null}
                    activeExcerpt={active?.source_excerpt ?? ''}
                  />
                </>
              ) : (
                <div className="card p-6 text-sm text-ink-muted">
                  No PDF available for the text-paste flow. Click rows to inspect details.
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function PriorityFlagsInline({ rows }: { rows: StoredObligation[] }) {
  const mfn = rows.filter((r) => r.mfn_flag === 'Y').length;
  const consent = rows.filter((r) => r.consent_flag === 'Y').length;
  const review = rows.filter((r) => isReviewRow(r)).length;
  return (
    <div className="text-xs text-ink-muted mt-1 flex gap-3">
      <span>
        <span className="font-medium text-ink-soft">{mfn}</span> MFN-eligible
      </span>
      <span>
        <span className="font-medium text-ink-soft">{consent}</span> consent-gated
      </span>
      <span>
        <span className="font-medium text-ink-soft">{review}</span> need review
      </span>
    </div>
  );
}
