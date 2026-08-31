export const metadata = {
  title: 'Privacy Policy — Side Letter Obligation Extractor',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium text-ink">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Privacy Policy</h1>
        <p className="mt-1 text-sm text-ink-muted">Last updated: August 14, 2026</p>
      </div>

      <Section title="Controller">
        <p>
          Inoculis LLC, 2108 N ST, STE N, Sacramento, CA 95816, USA. Email:{' '}
          <a className="underline" href="mailto:cb@mvp.sv">
            cb@mvp.sv
          </a>
          .
        </p>
      </Section>

      <Section title="The short version">
        <p>
          Your documents are not stored on our servers. A document you upload is held in
          memory for the duration of one extraction, sent to our AI processor, and the
          result is returned to your browser. The obligation register you build lives in
          your browser&rsquo;s local storage, not in our database. What we do keep is
          account metadata: who you are, how many documents you have used, and what you
          have purchased.
        </p>
      </Section>

      <Section title="What we collect">
        <p>
          <strong className="text-ink">Account data</strong> — name, email address, company,
          and role, collected at registration, plus a verification code that expires after
          15 minutes.
        </p>
        <p>
          <strong className="text-ink">Usage and billing metadata</strong> — a per-email
          count of documents processed, purchased credit balances, and purchase records
          (amount, date, Stripe checkout reference). Card details go directly to Stripe and
          never reach us.
        </p>
        <p>
          <strong className="text-ink">Security and log data</strong> — IP address,
          approximate location derived from it, user agent, and requested pages, used for
          abuse prevention and rate limiting.
        </p>
        <p>
          <strong className="text-ink">Documents</strong> — processed transiently as
          described above; never written to disk, a database, or logs on our side.
        </p>
      </Section>

      <Section title="Processors we use">
        <p>
          Vercel (hosting, USA) · Anthropic (AI processing of document text, USA — Anthropic
          does not use API data to train its models) · Upstash (metadata store, USA/EU) ·
          Stripe (payments) · Resend (transactional email) · Cloudflare (DNS). Each
          processes data under its own data-processing terms with appropriate transfer
          safeguards.
        </p>
      </Section>

      <Section title="Cookies and analytics">
        <p>
          We set one strictly necessary session cookie after email verification. Traffic is
          measured with Vercel Web Analytics, which does not use cookies or track you across
          sites. There is no advertising tracking.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          Account and usage metadata are kept while your access remains active; purchase
          records as long as commercial law requires. Verification codes expire after 15
          minutes. Documents are not retained at all — our AI processor retains API inputs
          transiently under its commercial terms before deletion.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Depending on where you live (including under GDPR and CCPA), you can request
          access to, correction of, or deletion of your personal data, and object to or
          restrict processing. Email cb@mvp.sv and we will handle it — deleting an account
          removes the lead record, quota counters, and credit balance tied to your email.
          You can also complain to your local supervisory authority.
        </p>
      </Section>
    </div>
  );
}
