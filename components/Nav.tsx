'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Upload' },
  { href: '/register', label: 'Master register' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/mfn', label: 'MFN reconciliation' },
  { href: '/review', label: 'Review queue' },
];

export function Nav() {
  const path = usePathname();
  const isLanding = path === '/access';
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-ink">
          Side Letter Obligation Extractor
        </Link>
        <nav className="flex items-center gap-1">
          {(isLanding ? [] : LINKS).map((l) => {
            const active = l.href === '/' ? path === '/' : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  active
                    ? 'bg-ink text-paper'
                    : 'text-ink-muted hover:bg-slate-100 hover:text-ink'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
