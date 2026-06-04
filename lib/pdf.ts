'use client';

type PdfjsModule = typeof import('pdfjs-dist');

let cached: PdfjsModule | null = null;

export async function loadPdfjs(): Promise<PdfjsModule> {
  if (cached) return cached;
  const mod = (await import('pdfjs-dist')) as PdfjsModule;
  mod.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${mod.version}/build/pdf.worker.min.mjs`;
  cached = mod;
  return mod;
}

export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

export function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function normalizeForMatch(s: string): string {
  return s.replace(/[\s ]+/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim().toLowerCase();
}
