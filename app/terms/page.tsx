export const metadata = {
  title: 'Terms of Service — Side Letter Obligation Extractor',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium text-ink">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Terms of Service</h1>
        <p className="mt-1 text-sm text-ink-muted">Last updated: August 14, 2026</p>
      </div>

      <Section title="1. Who we are, what this is">
        <p>
          The Side Letter Obligation Extractor (&ldquo;the service&rdquo;) is operated by
          Inoculis LLC, 2108 N ST, STE N, Sacramento, CA 95816, USA (&ldquo;we&rdquo;). The
          service uses a large language model to extract obligations from fund documents you
          upload and returns them as a structured register. By registering or using the
          service you accept these terms.
        </p>
        <p>
          The service is intended for business use by professionals working with fund
          documentation. It is not offered to consumers.
        </p>
      </Section>

      <Section title="2. Accounts and free allowance">
        <p>
          Access requires a verified email address. Each verified email includes a free
          allowance of two documents. We may treat obvious alias variants of the same
          mailbox as one account.
        </p>
      </Section>

      <Section title="3. Paid credits">
        <p>
          Beyond the free allowance, extraction runs on document credits: $19 for one
          document or $120 for ten. Payment is processed by Stripe; we never receive your
          card details. Credits are tied to your verified email and do not expire.
        </p>
        <p>
          A credit is only consumed by a successful extraction — if a run fails, the credit
          is returned automatically. Unused credits are refundable on request within 14 days
          of purchase; email us at cb@mvp.sv.
        </p>
      </Section>

      <Section title="4. Your documents, your responsibility">
        <p>
          You keep all rights to the documents you upload. We process them only to produce
          your extraction and do not store them — see the Privacy Policy for the full data
          flow.
        </p>
        <p>
          Side letters are usually confidential. By uploading a document you confirm that
          you are entitled to process it through a third-party service, including
          transmission to our AI processor. That responsibility is yours, not ours.
        </p>
      </Section>

      <Section title="5. AI output — verify before relying on it">
        <p>
          The register is produced by an AI model. It can be incomplete or wrong, and rows
          the model is unsure about are deliberately flagged for review rather than
          resolved. Always verify extracted rows against the source document before acting
          on them.
        </p>
        <p>
          The service extracts and structures text. It does not interpret enforceability,
          does not provide legal advice, and using it does not create an attorney–client
          relationship.
        </p>
      </Section>

      <Section title="6. Acceptable use">
        <p>
          Do not upload documents you have no right to process, probe or disrupt the
          service, resell access, or use automated scripts to circumvent allowances or rate
          limits. We may suspend accounts that do.
        </p>
      </Section>

      <Section title="7. Availability and changes">
        <p>
          The service is provided as-is, without uptime commitments. We may change or
          discontinue features. Extraction depends on a third-party AI provider; outages
          upstream can make the service temporarily unavailable.
        </p>
      </Section>

      <Section title="8. Liability">
        <p>
          To the maximum extent permitted by law, we are not liable for indirect or
          consequential damages, and our aggregate liability for all claims is capped at
          the amount you paid us in the twelve months before the claim arose. Nothing in
          these terms excludes liability that cannot be excluded by law.
        </p>
      </Section>

      <Section title="9. Governing law">
        <p>
          These terms are governed by the laws of the State of California, USA. If a
          provision is found unenforceable, the rest remains in effect. We may update these
          terms; material changes will be posted on this page with a new date.
        </p>
      </Section>
    </div>
  );
}
