import { Suspense } from 'react';
import { AccessForm } from '@/components/AccessForm';

export const metadata = {
  title: 'Side Letter Obligation Extractor',
  description:
    'Turn LP side letters into an auditable obligation register: deadlines, MFN-eligible terms, and consent gates, each traced to its clause.',
};

const SAMPLE = [
  {
    clause: '§3(a)',
    type: 'Reporting',
    summary: 'Unaudited quarterly financials and capital account statement',
    deadline: '45 days after quarter-end',
    mfn: 'Y',
    consent: 'N',
    conf: '0.94',
  },
  {
    clause: '§4(b)',
    type: 'Fee offset',
    summary: '100% of monitoring and transaction fees offset against management fee',
    deadline: 'Ongoing',
    mfn: 'Y',
    consent: 'N',
    conf: '0.91',
  },
  {
    clause: '§6',
    type: 'Consent / approval',
    summary: 'GP may not admit a competitor as an LP without prior written consent',
    deadline: 'Event-driven',
    mfn: 'N',
    consent: 'Y',
    conf: '0.88',
  },
  {
    clause: '§9(c)',
    type: 'Excuse / exclusion',
    summary: 'Excuse right for investments restricted by the LP investment policy',
    deadline: 'REVIEW',
    mfn: 'N',
    consent: 'N',
    conf: '0.62',
  },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-medium text-ink">{label}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}

export default function AccessPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <section className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-muted">
            An Ectotropy lab release
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Every LP obligation you agreed to, in one register.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">
            A fund with 40 LPs carries several hundred bespoke obligations. Reporting deadlines, fee
            offsets, MFN elections, consent gates, concentration limits. They live as prose, in
            PDFs, in a folder. Upload a side letter and get back a standardized register where every
            row carries its clause reference, its source page, and a verbatim excerpt you can check
            in seconds.
          </p>

          <div className="mt-8 space-y-5">
            <Row label="It flags instead of guessing.">
              A missing deadline or owner comes back as REVIEW with a reason. You can always tell
              the difference between no obligation and could not tell.
            </Row>
            <Row label="It scores its own confidence, and that changes the workflow.">
              Every row carries a confidence and a one-line rationale. Anything below 0.7 is routed
              to a review queue rather than quietly landing in your register.
            </Row>
            <Row label="It makes MFN comparable.">
              Carve-outs, conditions, and thresholds come back as structured data, so 40-day
              reporting at one LP and 45 at another line up side by side and the election gets
              priced instead of guessed.
            </Row>
          </div>

          <div className="mt-8 overflow-hidden rounded-lg border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-ink-muted">
              Sample output, from a synthetic side letter. Every party and figure is fictional.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white text-ink-muted">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2 font-medium">Clause</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Obligation</th>
                    <th className="px-3 py-2 font-medium">Deadline</th>
                    <th className="px-3 py-2 font-medium">MFN</th>
                    <th className="px-3 py-2 font-medium">Consent</th>
                    <th className="px-3 py-2 font-medium">Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE.map((r) => (
                    <tr key={r.clause} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-ink">{r.clause}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{r.type}</td>
                      <td className="px-3 py-2 text-ink-muted">{r.summary}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{r.deadline}</td>
                      <td className="px-3 py-2 text-ink-muted">{r.mfn}</td>
                      <td className="px-3 py-2 text-ink-muted">{r.consent}</td>
                      <td
                        className={`px-3 py-2 ${
                          Number(r.conf) < 0.7 ? 'font-medium text-amber-700' : 'text-ink-muted'
                        }`}
                      >
                        {r.conf}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-8">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-ink">Get access</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Free, three documents. It runs a frontier model over a full PDF, so the cap keeps a
              free tool free.
            </p>
            <div className="mt-5">
              <Suspense fallback={null}>
                <AccessForm />
              </Suspense>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-ink-muted">
            <p className="font-medium text-ink">Before you upload anything</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-4">
              <li>Document text is sent to the Anthropic API. Do not upload what you would not send through it.</li>
              <li>This extracts and structures. It is not legal advice and does not interpret enforceability.</li>
              <li>Scanned PDFs need an OCR layer first, or paste the text instead.</li>
              <li>Your register is stored in your browser, not on a server.</li>
            </ul>
          </div>

          <p className="mt-5 text-sm text-ink-muted">
            Built by{' '}
            <a className="underline" href="https://www.linkedin.com/in/cbusch">
              Christian Busch
            </a>
            . Source on{' '}
            <a className="underline" href="https://github.com/chsbusch-dot/sideletterextractor">
              GitHub
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
