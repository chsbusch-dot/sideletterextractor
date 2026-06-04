'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { base64ToUint8, loadPdfjs, normalizeForMatch } from '@/lib/pdf';

type Highlight = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PdfPageInfo = {
  pageNum: number;
  viewport: { width: number; height: number };
  items: {
    text: string;
    rect: { left: number; top: number; width: number; height: number };
  }[];
};

type Props = {
  pdfBase64: string;
  activePage: number | null;
  activeExcerpt: string;
};

const SCALE = 1.4;

export function PdfViewer({ pdfBase64, activePage, activeExcerpt }: Props) {
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPages([]);

    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const data = base64ToUint8(pdfBase64);
        const doc = await pdfjs.getDocument({ data }).promise;
        const collected: PdfPageInfo[] = [];

        for (let p = 1; p <= doc.numPages; p += 1) {
          if (cancelled) return;
          const page = await doc.getPage(p);
          const viewport = page.getViewport({ scale: SCALE });
          const canvas = canvasRefs.current.get(p);
          if (canvas) {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              await page.render({ canvasContext: ctx, viewport }).promise;
            }
          }
          const tc = await page.getTextContent();
          const items = tc.items
            .map((it) => {
              if (!('str' in it) || !('transform' in it)) return null;
              const m = pdfjs.Util.transform(viewport.transform, it.transform);
              const fontHeight = Math.abs(m[3]) || 10;
              const width = (it.width ?? 0) * viewport.scale;
              const left = m[4];
              const top = m[5] - fontHeight;
              return {
                text: it.str,
                rect: { left, top, width, height: fontHeight },
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);

          collected.push({
            pageNum: p,
            viewport: { width: viewport.width, height: viewport.height },
            items,
          });
          if (!cancelled) {
            setPages((prev) => [...prev, collected[collected.length - 1]]);
          }
        }
        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render PDF.');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBase64]);

  const highlightsByPage = useMemo(() => {
    const map = new Map<number, Highlight[]>();
    if (!activeExcerpt || !activeExcerpt.trim()) return map;
    const needle = normalizeForMatch(activeExcerpt);
    if (needle.length < 6) return map;

    const matchPage = (p: PdfPageInfo): Highlight[] => {
      let concatenated = '';
      const offsets: { start: number; end: number; item: PdfPageInfo['items'][number] }[] = [];
      for (const item of p.items) {
        const start = concatenated.length;
        concatenated += `${item.text} `;
        offsets.push({ start, end: concatenated.length, item });
      }
      const norm = normalizeForMatch(concatenated);
      const idx = norm.indexOf(needle);
      if (idx < 0) return [];

      // Map normalized index back to raw concatenated index (approximate — both lowercased + whitespace-collapsed).
      // We walk the raw string and skip whitespace to find the corresponding position.
      let rawStart = 0;
      let normSeen = 0;
      let prevSpace = true;
      while (rawStart < concatenated.length && normSeen < idx) {
        const ch = concatenated[rawStart];
        const isSpace = /\s/.test(ch);
        if (isSpace) {
          if (!prevSpace) normSeen += 1;
          prevSpace = true;
        } else {
          normSeen += 1;
          prevSpace = false;
        }
        rawStart += 1;
      }
      let rawEnd = rawStart;
      let needleLeft = needle.length;
      prevSpace = false;
      while (rawEnd < concatenated.length && needleLeft > 0) {
        const ch = concatenated[rawEnd];
        const isSpace = /\s/.test(ch);
        if (isSpace) {
          if (!prevSpace) needleLeft -= 1;
          prevSpace = true;
        } else {
          needleLeft -= 1;
          prevSpace = false;
        }
        rawEnd += 1;
      }

      return offsets
        .filter((o) => o.end > rawStart && o.start < rawEnd)
        .map((o) => o.item.rect);
    };

    for (const p of pages) {
      if (activePage && p.pageNum !== activePage) continue;
      const hits = matchPage(p);
      if (hits.length > 0) map.set(p.pageNum, hits);
    }
    if (map.size === 0 && !activePage) {
      // last-resort: scan all pages even without page hint
      for (const p of pages) {
        const hits = matchPage(p);
        if (hits.length > 0) {
          map.set(p.pageNum, hits);
          break;
        }
      }
    }
    return map;
  }, [pages, activePage, activeExcerpt]);

  useEffect(() => {
    if (activePage === null) return;
    const el = pageRefs.current.get(activePage);
    if (el && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = elRect.top - containerRect.top + containerRef.current.scrollTop - 24;
      containerRef.current.scrollTo({ top: offset, behavior: 'smooth' });
    }
  }, [activePage, pages.length]);

  if (error) {
    return (
      <div className="card p-6 text-danger text-sm">PDF render error: {error}</div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="card overflow-y-auto bg-slate-100"
      style={{ maxHeight: 'calc(100vh - 180px)' }}
    >
      {loading && pages.length === 0 && (
        <div className="p-6 text-sm text-ink-muted">Loading PDF…</div>
      )}
      <div className="flex flex-col items-center gap-4 p-4">
        {Array.from({ length: Math.max(pages.length, 0) }, (_, i) => i + 1).map(
          (pageNum) => {
            const page = pages.find((pp) => pp.pageNum === pageNum);
            const hits = highlightsByPage.get(pageNum) ?? [];
            return (
              <div
                key={pageNum}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNum, el);
                }}
                className="relative bg-white shadow-sm"
                style={
                  page
                    ? { width: page.viewport.width, height: page.viewport.height }
                    : undefined
                }
              >
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(pageNum, el);
                  }}
                  className="block"
                />
                {hits.map((h, idx) => (
                  <div
                    key={idx}
                    aria-hidden
                    className="absolute pointer-events-none"
                    style={{
                      left: h.left,
                      top: h.top,
                      width: h.width,
                      height: h.height,
                      backgroundColor: 'rgba(250, 204, 21, 0.42)',
                      mixBlendMode: 'multiply',
                      border: '1px solid rgba(202, 138, 4, 0.7)',
                      borderRadius: 2,
                    }}
                  />
                ))}
                <div className="absolute right-2 top-2 text-[10px] font-mono text-ink-muted bg-white/80 px-1.5 py-0.5 rounded">
                  p. {pageNum}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
