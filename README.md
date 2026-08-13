# Side Letter Obligation Extractor

An LLM turns an unstructured LP side letter into a standardized obligation register. A set of product decisions makes that register trustworthy enough to act on. This repo is mostly about the second thing.

Roughly 3,350 lines of TypeScript, five working surfaces, built in a day with AI coding agents. **The speed is not the interesting part.** The interesting part is which decisions were worth spending the day on, because extraction from legal prose is close to solved and the handoff to a human who has to sign off on the output is not.

Live at [sideletterextractor.vercel.app](https://sideletterextractor.vercel.app), behind a shared password. The gate is deliberate: the app spends real API credits per document, and an open demo URL is an open invoice. Ask me for access and I will walk you through it.

Built by [Christian Busch](https://www.linkedin.com/in/cbusch).

---

## The problem

A private-fund GP signs a separate side letter with every large LP. A fund with 40 LPs carries several hundred bespoke obligations: reporting deadlines, fee offsets, MFN elections, consent gates, concentration limits, co-investment rights, excuse rights. They live as prose, in PDFs, in a folder.

Three things go wrong, and all three cost money:

- **Deadlines get missed**, because nobody has the obligations in one calendar.
- **MFN elections get mispriced**, because nobody can see across 40 documents that LP A negotiated 40-day reporting while LP B settled for 45.
- **Consent gates get tripped**, because the GP acts without noticing that one letter required a sign-off.

Today an associate does this with a spreadsheet, or nobody does it. It is a near-perfect extraction problem with one catch that changes the whole design: in compliance work, a confident wrong answer is worse than no answer.

## What it does

| Surface | What it gives you |
|---|---|
| **Upload** | Drop a side-letter PDF, optionally with the LPA alongside for cross-reference. Review the extracted register inline, save to the master in one click. |
| **Master register** | The living cross-LP table. Filter by LP, type, or flag; full-text search; export CSV or JSON. Rows upsert on `lp_name + clause_ref`, so reprocessing a document corrects it instead of duplicating it. |
| **Reporting calendar** | Reporting obligations expanded into concrete dates for a chosen year, including relative rules like "45 days after quarter-end" and "90 days after fiscal year-end". |
| **MFN compendium** | Every MFN-eligible term across every LP, grouped by type, with the LP-favorable value identified, so an election gets priced instead of guessed. |
| **Review queue and consent watchlist** | Low-confidence and incomplete rows routed for human resolution, plus every GP action gated on LP consent. |

## The decisions that mattered

**The schema is the contract, not the prompt.** The API route exposes a single tool, `emit_obligation_register`, and `tool_choice` forces the model to call it. There is no free-form text to parse and no "please return valid JSON" plea in the prompt. Output is validated against a Zod schema before it reaches the client; a schema failure returns a 502 rather than a quietly degraded row.

**Flag, don't guess.** The system prompt forbids inventing a deadline, owner, or threshold. Missing values are written as the sentinel `REVIEW` with a note saying why. That trades apparent completeness for the only property that matters here: you can tell the difference between "there is no obligation" and "the model could not tell."

**The model scores its own confidence, and low confidence has a consequence.** Every row carries a `confidence` from 0 to 1 and a one-sentence rationale. Below 0.7, the row is routed to a mandatory review queue. A confidence score with no workflow attached is decoration. This one changes where the row goes.

**Every row is verifiable in seconds.** Rows carry the clause reference, the 1-indexed source page, and a short verbatim excerpt. The prompt demands the excerpt be quoted exactly rather than paraphrased, specifically so it can be located in the PDF text layer and highlighted in the side-by-side viewer. A reviewer confirms or rejects without leaving the screen. Traceability was a schema requirement before it was a UI feature.

**Controlled vocabulary, leniently enforced.** Obligation types, frequencies, and entity layers are closed enums. The validator coerces instead of rejecting: an unrecognized type degrades to `other`, an unrecognized frequency to `REVIEW`. One bad field never discards a document's worth of good extraction.

**Carve-outs, conditions, and thresholds are structured, not prose.** Separate arrays, with thresholds carrying `{kind, value, unit}`. This is the decision that makes cross-LP comparison possible at all. "15% concentration limit excluding portfolio companies held at first closing" is useless as a sentence and useful as data.

**Fund structure is a first-class field.** Obligations bind different layers, so every row is tagged `main_fund`, `master_fund`, `onshore_feeder`, `offshore_feeder`, `parallel_vehicle`, `aiv`, `blocker`, `co_invest_vehicle`, `sma`, `multiple`, or `unspecified`, with a rationale. The prompt tells the model to prefer `main_fund` or `unspecified` over guessing at a feeder, because a wrong structural tag is worse than an absent one.

**"Better" is directional, and direction is domain knowledge, not inference.** The MFN compendium encodes which way is LP-favorable per obligation type: fewer days for reporting, a higher percentage for fee offsets, a lower cap for concentration limits. That table lives in code where a fund lawyer can review it and argue with it, rather than inside a prompt where nobody can see it.

**Failure is handled in product terms, not stack traces.** PDFs are parsed client-side, which sidesteps the serverless body limit and keeps large documents working. On an upstream overload the route retries, then falls back to a faster model automatically. If both fail the user reads "wait 30 seconds, your inputs are preserved," not a 500.

**No database, deliberately.** State lives in `localStorage` with JSON export and import. Real multi-user persistence means auth, an audit trail, and a retention posture for LP-confidential documents. That is a product, not a demo, and shipping a fake version of it would be the dishonest choice.

## What production would actually require

Listing this is the point. A demo that does not know what it is missing is a liability.

1. **An eval harness before another feature.** A labeled gold-set of side letters scored for recall on obligations and precision on flags. Right now correctness rests on spot checks, which does not survive contact with a real GP.
2. **Multi-user with an audit trail.** Who accepted which row, when, against which document version. In compliance the audit trail *is* the product.
3. **Amendment diffing.** Side letters get amended. The register needs to show what changed between versions, not silently upsert over history.
4. **Calibration on the confidence score.** Self-reported confidence is a useful routing signal and an unproven measurement. It needs to be checked against the gold set before anyone trusts the 0.7 threshold.
5. **Human-in-the-loop as the default path, not the exception.** The economics only work if review takes seconds per row, which puts the burden back on excerpt quality and highlight accuracy.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind · `@anthropic-ai/sdk`, server-side only · `pdfjs-dist` for client-side parsing and highlight positioning · `zod` for boundary validation · Upstash Redis and Resend for optional access logging · Vercel

## Run it

```bash
npm install
cp .env.example .env
# set ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

`scripts/make_test_pdf.py` generates a one-page synthetic side letter for testing. Every party, term, and figure in it is fictional. **No real side letter, LP name, or fund document appears anywhere in this repository or its history.**

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Extraction. |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-4-8`. Set `claude-sonnet-4-6` for cheaper, faster runs. |
| `SITE_PASSWORD` | no | Gates the site behind HTTP basic auth. Recommended on any public URL so visitors cannot drain your API credits. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RESEND_API_KEY`, `LOGIN_DIGEST_TO` | no | All four together enable a daily access-digest email. |
| `CRON_SECRET` | no | Lets the digest cron route refuse non-cron callers. |

Optional: `scripts/env-pull.sh` and `scripts/env-push-vercel.sh` sync secrets from Bitwarden Secrets Manager into `.env.local` and Vercel, keeping Bitwarden the single source of truth. Requires `bws` and `jq`.

To deploy, import the repo on Vercel and set `ANTHROPIC_API_KEY`. The Anthropic call runs in the Node.js runtime with `maxDuration` at 180s for slow documents.

## Scope and limits

- **Not legal advice.** The tool extracts and structures. It does not interpret enforceability, and the system prompt says so in those words.
- **Scanned PDFs need OCR first.** No text layer means no extraction. Run `ocrmypdf` upstream or paste the text.
- **Document text is sent to the Anthropic API.** Do not upload anything you would not send through that API.
- **Single user.** No accounts, no server-side storage, no audit log. See the design note above.

## Map

```
app/
  api/extract/route.ts        Anthropic call, forced tool use, schema validation, model fallback
  api/cron/login-digest/      Optional daily access-digest email
  page.tsx                    Upload, extract, review, save
  register/page.tsx           Master register: filters, search, CSV and JSON export
  calendar/page.tsx           Relative deadlines expanded to concrete dates
  mfn/page.tsx                MFN compendium with the LP-favorable term identified
  review/page.tsx             Review queue and consent watchlist
components/
  PdfViewer.tsx               Side-by-side PDF with source-excerpt highlighting
  ObligationTable.tsx         Register table
  ObligationCard.tsx          Row detail: carve-outs, conditions, thresholds, confidence
  Nav.tsx
lib/
  prompt.ts                   System prompt and emit_obligation_register tool schema
  schema.ts                   Zod schema, lenient coercion, upsert key, review-row test
  taxonomy.ts                 Closed vocabularies: obligation types, frequencies, entity layers
  compendium.ts               MFN comparison, including LP-favorable direction per type
  date.ts                     Relative-deadline parsing and calendar expansion
  pdf.ts                      Client-side text extraction and match normalization
  store.ts                    localStorage CRUD, upsert on lp_name + clause_ref
  csv.ts, useRegister.ts, login-log.ts
middleware.ts                 Optional shared-password gate and access logging
scripts/make_test_pdf.py      Synthetic test document generator
```

---

## If you are building something like this

The nine decisions above are the ones I would want to argue about with a product team, and I have been on the wrong side of a few of them before. If you are shipping applied-LLM products where being wrong has a cost, whether that is claims, clinical, credit, or compliance, that is the conversation I am interested in.

[LinkedIn](https://www.linkedin.com/in/cbusch) · [Other repos](https://github.com/chsbusch-dot)
