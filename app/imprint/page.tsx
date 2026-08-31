export const metadata = {
  title: 'Imprint — Side Letter Obligation Extractor',
};

export default function ImprintPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Imprint</h1>

      <section className="space-y-1 text-sm leading-relaxed text-ink-muted">
        <h2 className="text-base font-medium text-ink">Operator</h2>
        <p>
          Inoculis LLC
          <br />
          2108 N ST, STE N
          <br />
          Sacramento, CA 95816
          <br />
          United States
        </p>
        <p>
          Email:{' '}
          <a className="underline" href="mailto:cb@mvp.sv">
            cb@mvp.sv
          </a>
        </p>
      </section>

      <section className="space-y-1 text-sm leading-relaxed text-ink-muted">
        <h2 className="text-base font-medium text-ink">Registration</h2>
        <p>California Entity No. 202565215576</p>
        <p>Authorized representative: Hermann Busch</p>
        <p>Responsible for content: Hermann Busch, address as above.</p>
      </section>

      <section className="space-y-1 text-sm leading-relaxed text-ink-muted">
        <h2 className="text-base font-medium text-ink">About this service</h2>
        <p>
          The Side Letter Obligation Extractor is an Ectotropy lab release. Ectotropy is a
          brand of Inoculis LLC. The service extracts and structures obligations from
          documents you upload. It is a software tool, not a law firm, and its output is not
          legal advice.
        </p>
      </section>
    </div>
  );
}
