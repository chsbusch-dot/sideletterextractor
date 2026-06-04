'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { base64ToUint8, loadPdfjs, normalizeForMatch } from '@/lib/pdf';

type Highlight = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type TextItemRect = {
  text: string;
  rect: Highlight;
};

type PdfPageInfo = {
  viewport: { width: number; height: number };
  items: TextItemRect[];
};

type Props = {
  pdfBase64: string;
  activePage: number | null;
  activeExcerpt: string;
};

const SCALE = 1.4;

export function PdfViewer({ pdfBase64, activePage, activeExcerpt }: Props) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pagesInfo, setPagesInfo] = useState<Map<number, PdfPageInfo>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocumentSafe> | null = null;

    function getDocumentSafe(data: Uint8Array) {
      return (async () => {
        const pdfjs = await loadPdfjs();
        return pdfjs.getDocument({ data });
      })();
    }

    setLoadingDoc(true);
    setError(null);
    setDoc(null);
    setNumPages(0);
    setPagesInfo(new Map());

    (async () => {
      try {
        const data = base64ToUint8(pdfBase64);
        loadingTask = getDocumentSafe(data);
        const task = await loadingTask;
        const d = await task.promise;
        if (cancelled) {
          d.destroy();
          return;
        }
        setDoc(d);
        setNumPages(d.numPages);
        setLoadingDoc(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF.');
          setLoadingDoc(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfBase64]);

  const onPageInfo = useCallback((pageNum: number, info: PdfPageInfo) => {
    setPagesInfo((prev) => {
      const next = new Map(prev);
      next.set(pageNum, info);
      return next;
    });
  }, []);

  const highlightsByPage = useMemo(() => {
    const map = new Map<number, Highlight[]>();
    if (!activeExcerpt || !activeExcerpt.trim()) return map;
    const needle = normalizeForMatch(activeExcerpt);
    if (needle.length < 6) return map;

    const matchPage = (info: PdfPageInfo): Highlight[] => {
      let concatenated = '';
      const offsets: { start: number; end: number; item: TextItemRect }[] = [];
      for (const item of info.items) {
        const start = concatenated.length;
        concatenated += `${item.text} `;
        offsets.push({ start, end: concatenated.length, item });
      }
      const norm = normalizeForMatch(concatenated);
      const idx = norm.indexOf(needle);
      if (idx < 0) return [];

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

    if (activePage && pagesInfo.has(activePage)) {
      const hits = matchPage(pagesInfo.get(activePage)!);
      if (hits.length > 0) map.set(activePage, hits);
    }
    if (map.size === 0) {
      for (const [p, info] of pagesInfo) {
        const hits = matchPage(info);
        if (hits.length > 0) {
          map.set(p, hits);
          break;
        }
      }
    }
    return map;
  }, [pagesInfo, activePage, activeExcerpt]);

  useEffect(() => {
    if (activePage === null) return;
    const el = pageRefs.current.get(activePage);
    if (el && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset = elRect.top - containerRect.top + containerRef.current.scrollTop - 24;
      containerRef.current.scrollTo({ top: offset, behavior: 'smooth' });
    }
  }, [activePage, pagesInfo.size]);

  if (error) {
    return <div className="card p-6 text-danger text-sm">PDF render error: {error}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="card overflow-y-auto bg-slate-100"
      style={{ maxHeight: 'calc(100vh - 180px)' }}
    >
      {loadingDoc && (
        <div className="p-6 text-sm text-ink-muted">Loading PDF…</div>
      )}
      <div className="flex flex-col items-center gap-4 p-4">
        {doc &&
          Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <PdfPage
              key={pageNum}
              doc={doc}
              pageNum={pageNum}
              scale={SCALE}
              onInfo={onPageInfo}
              highlights={highlightsByPage.get(pageNum) ?? []}
              registerRef={(el) => {
                if (el) pageRefs.current.set(pageNum, el);
                else pageRefs.current.delete(pageNum);
              }}
            />
          ))}
      </div>
    </div>
  );
}

type PdfPageProps = {
  doc: PDFDocumentProxy;
  pageNum: number;
  scale: number;
  onInfo: (pageNum: number, info: PdfPageInfo) => void;
  highlights: Highlight[];
  registerRef: (el: HTMLDivElement | null) => void;
};

function PdfPage({ doc, pageNum, scale, onInfo, highlights, registerRef }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        setSize({ width: viewport.width, height: viewport.height });

        const tc = await page.getTextContent();
        const items: TextItemRect[] = tc.items
          .map((it) => {
            if (!('str' in it) || !('transform' in it)) return null;
            const m = pdfjs.Util.transform(viewport.transform, it.transform);
            const fontHeight = Math.abs(m[3]) || 10;
            const width = (it.width ?? 0) * scale;
            const left = m[4];
            const top = m[5] - fontHeight;
            return {
              text: it.str,
              rect: { left, top, width, height: fontHeight },
            };
          })
          .filter((x): x is TextItemRect => x !== null);

        if (!cancelled) {
          onInfo(pageNum, {
            viewport: { width: viewport.width, height: viewport.height },
            items,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setPageError(err instanceof Error ? err.message : 'Page render failed.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, pageNum, scale, onInfo]);

  return (
    <div
      ref={registerRef}
      className="relative bg-white shadow-sm"
      style={size ? { width: size.width, height: size.height } : { minHeight: 60, width: '100%' }}
    >
      <canvas ref={canvasRef} className="block" />
      {highlights.map((h, idx) => (
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
      {pageError ? (
        <div className="absolute inset-2 text-xs text-danger bg-white/90 p-2 rounded">
          {pageError}
        </div>
      ) : null}
      <div className="absolute right-2 top-2 text-[10px] font-mono text-ink-muted bg-white/80 px-1.5 py-0.5 rounded">
        p. {pageNum}
      </div>
    </div>
  );
}
