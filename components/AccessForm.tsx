'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Step = 'details' | 'code';

export function AccessForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/access/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, company, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/access/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const field =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500';
  const button =
    'w-full rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-50';

  if (step === 'code') {
    return (
      <form onSubmit={verify} className="space-y-3">
        <p className="text-sm text-ink-muted">
          A 6-digit code is on its way to <span className="font-medium text-ink">{email}</span>. It
          expires in 15 minutes.
        </p>
        <input
          className={`${field} tracking-[0.4em] text-center text-lg`}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className={button} disabled={busy || code.length !== 6}>
          {busy ? 'Checking...' : 'Open the tool'}
        </button>
        <button
          type="button"
          className="w-full text-xs text-ink-muted underline"
          onClick={() => {
            setStep('details');
            setCode('');
            setError(null);
          }}
        >
          Use a different address
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={requestCode} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={field}
          placeholder="Name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className={field}
          placeholder="Company"
          autoComplete="organization"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />
      </div>
      <input
        className={field}
        type="email"
        placeholder="Work email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className={field}
        placeholder="Role (optional)"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className={button} disabled={busy}>
        {busy ? 'Sending code...' : 'Email me an access code'}
      </button>
      <p className="text-xs text-ink-muted">
        Two documents free, then $19 per document. No newsletter, no reselling your address. The
        code proves the mailbox is real so the API bill stays attached to a person.
      </p>
    </form>
  );
}
