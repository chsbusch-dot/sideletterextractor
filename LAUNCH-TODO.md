# Launch checklist — sideletters.ectotropy.com

Tracking: WOR-145 · PR #4. Merging the PR is what deploys; production
registration is broken until then (the live build predates the env vars).

## Blocking, in order

- [ ] **Stripe keys** — in the Stripe dashboard create a secret key, then
      `bws-add STRIPE_SECRET_KEY`. Add a webhook endpoint
      `https://sideletters.ectotropy.com/api/stripe/webhook` for the event
      `checkout.session.completed`, then `bws-add STRIPE_WEBHOOK_SECRET`.
      Re-run `scripts/provision-launch-env.sh` (idempotent) to wire both.
- [ ] **Editorial pass on public copy** (terms, privacy, imprint, access page,
      footer, results disclaimer) — in progress in a separate session; edits
      land on the PR branch.
- [ ] **Full-flow test on the preview build**
      (`sideletterextractor-a9n8b91vx-…vercel.app`): register → code arrives →
      extract twice → paywall appears → after Stripe test keys: buy a credit →
      balance updates. Also confirms which sender the access codes come from.
- [ ] **Email sender** — `ACCESS_EMAIL_FROM` is unset, so codes fall back to
      `LOGIN_DIGEST_FROM`. Verify `ectotropy.com` as a Resend sender domain and
      set `ACCESS_EMAIL_FROM=access@ectotropy.com` for deliverability.
- [ ] **Lawyer skim of /terms** before any real marketing push.
- [ ] **Merge PR #4** → auto-deploys → smoke-test the production domain
      (registration, one extraction, one real purchase; refund it from the
      Stripe dashboard if unwanted).
- [ ] Optional: activate **Stripe Tax** in the dashboard, then set
      `STRIPE_AUTOMATIC_TAX=1` in Vercel env.

## Post-launch / roadmap

- [ ] **Calendar export (ICS)** of reporting deadlines, generated client-side —
      deadline alerts land in the user's own calendar without the server ever
      storing register data, so the no-storage guarantee holds.
- [ ] **Recurring-use tier** (decide deliberately, not by accident): server-side
      register, team sharing, email deadline alerts. Requires a retention
      story, a DPA for customers, and real accounts — it changes the privacy
      posture, so it is a product decision, not a feature toggle.
- [ ] **Professional liability / E&O insurance** once there is real revenue.
- [ ] Upgrade Vercel CLI 54 → 59 (`npm i -g vercel@latest`); CLI 54's
      `env add … preview` cannot run non-interactively (see
      `scripts/provision-launch-env.sh`).
- [ ] Evaluate `claude-opus-5` as the extraction default (same price as
      `claude-opus-4-8`); verify forced `tool_choice` behavior before
      switching, keep the Sonnet overload fallback.
- [ ] Watch Stripe Tax registration thresholds if sales pick up.
