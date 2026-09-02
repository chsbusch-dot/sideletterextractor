# Side-letter-extractor

Next.js 15 app that extracts LP side-letter obligations into a standardized
register via the Anthropic API (`/api/extract`, `tool_use`-forced structured
output). Live at **sideletters.ectotropy.com** (Vercel project
`sideletterextractor`, auto-deploys `main`). Being productized as a paid
self-serve tool under the Ectotropy studio brand.

## Quality gate (CI)

`.github/workflows/ci.yml` runs on every push and PR (node 20):
**eslint** (lint) · **tsc --noEmit** (typecheck) · **vitest** (tests) ·
**next build** (build).

Before pushing, run locally:

```bash
npm ci && npm run lint && npm run typecheck && npm test && npm run build
```

## Conventions

- **New code is held to the full ruleset.** Nothing is currently
  grandfathered — keep it that way.
- **Tests** live in `tests/*.test.ts` (vitest, node environment) and cover
  pure logic in `lib/` (schema coercion, CSV escaping, deadline expansion).
  No network or browser APIs in tests.
- **Privacy invariant — never store or log document content.** Uploaded
  documents exist only in memory inside `/api/extract` for the duration of
  the Anthropic call. Server-side state is limited to metadata (emails,
  usage counters, payment references). Do not write document text or
  extraction results to Redis, logs, or any store — the user's register
  lives exclusively in their browser's localStorage. This is a marketed
  guarantee, not an implementation detail.
- **Secrets live in Bitwarden Secrets Manager**, never in files or code.
  `scripts/env-pull.sh` hydrates `.env.local`; `scripts/env-push-vercel.sh`
  upserts Vercel env vars. `.env.example` documents the required names.
- **Model config:** extraction defaults to `claude-opus-4-8` with automatic
  fallback to `claude-sonnet-4-6` on 529 overloads (`app/api/extract/route.ts`).
- **Billing:** free per-email quota (`lib/leads.ts`, default 2) is consumed
  first, then paid credits (`lib/billing.ts`; prices in `lib/pricing.ts` —
  $19/document, $120/10). A document is consumed before extraction and
  refunded on any failed run. The Stripe webhook (`/api/stripe/webhook`) is
  signature-verified and idempotent on the Stripe event id; card data never
  touches this app. Emails are keyed by `normalizeEmail` (plus-suffix and
  Gmail-dot stripping) so alias variants share one allowance.

## Workflow

- Merge policy: the global rule applies (merge and deploy by default when the gate is green, in scope, no uncertainty, not in the always-ask set); never force-push. Linear closes the ticket on merge (Closes WOR-#).
- **Tracking is in Linear, team WOR.** File follow-ups there; put
  `Closes WOR-#` in the PR body so it auto-closes on merge.
- Never change repo visibility — only Chris does that.
- Merging `main` deploys to production via Vercel — public-facing copy must
  pass the Codex humanizer review before it lands.
