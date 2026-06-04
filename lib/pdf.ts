'use client';

type PdfjsModule = typeof import('pdfjs-dist');

let cached: PdfjsModule | null = null;

async function loadPdfjs(): Promise<PdfjsModule> {
  if (cached) return cached;
  const mod = (await import('pdfjs-dist')) as PdfjsModule;
  mod.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${mod.version}/build/pdf.worker.min.mjs`;
  cached = mod;
  return mod;
}

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ('str' in it ? it.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    out.push(pageText);
  }
  return out.join('\n\n');
}
