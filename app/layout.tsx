import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Side Letter Obligation Extractor',
  description:
    'Upload an LP side letter, extract a standardized obligation register, and maintain a master register across LPs.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        <footer className="mt-12 border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-ink-muted">
            <p>© 2026 Inoculis LLC · An Ectotropy lab release</p>
            <p>AI-assisted extraction — verify rows against the source document. Not legal advice.</p>
            <nav className="flex gap-4">
              <Link className="hover:text-ink" href="/terms">
                Terms
              </Link>
              <Link className="hover:text-ink" href="/privacy">
                Privacy
              </Link>
              <Link className="hover:text-ink" href="/imprint">
                Imprint
              </Link>
            </nav>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
