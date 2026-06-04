# Side Letter Obligation Extractor — Web app

A Next.js + Vercel front-end for the [`side-letter-obligation-extractor`](https://github.com/chsbusch-dot/sideletterextractor) Claude Skill. Upload an LP side letter, get a standardized obligation register, and maintain a living master register across LPs.

Built as a single-user portfolio demo. State lives in the browser; the only backend is a thin API route that calls Anthropic with `tool_use` to force structured output.

---

## What it does

| Surface | What you can do |
|---|---|
| `/` — Upload | Drag a PDF (parsed client-side via `pdfjs-dist`) or paste text. Hit extract → see the register inline → save into the master with one click. |
| `/register` — Master register | The living cross-LP table. Filter by LP, obligation type, MFN/consent/review flag, or free-text search. Export CSV or JSON. Rows upsert on `lp_name + clause_ref`. |
| `/calendar` — Reporting calendar | Reporting obligations expanded into concrete dates for a chosen year. Handles "N days after quarter-end" and "N days after fiscal year-end" relative deadlines. |
| `/mfn` — MFN reconciliation | Side-by-side view of every row with `mfn_flag = Y`, grouped by obligation type, so you can spot the better term across LPs (e.g., 40-day vs 45-day reporting, 85% vs 100% fee offset). |
| `/review` — Review queue + Consent watchlist | Two compliance views. Rows flagged `REVIEW` that need human resolution, and every `consent_flag = Y` row — the things you must pause GP action for. |

## How extraction works

The API route `/api/extract` calls `claude-opus-4-7` (configurable) with:

- A system prompt that ports the rules from `SKILL.md` (controlled taxonomy, traceability, REVIEW-don't-guess).
- A single tool, `emit_obligation_register`, whose JSON schema mirrors the register columns. `tool_choice` forces the model to call it, so you get validated structured output back rather than free-form markdown.

Output is validated against a Zod schema (`lib/schema.ts`) and the controlled taxonomy (`lib/taxonomy.ts`) before it ever reaches the client. Anything that doesn't match the schema is a 502.

## Stack

- Next.js 15 (App Router, RSC)
- React 19
- Tailwind 3
- `@anthropic-ai/sdk` (server-side only)
- `pdfjs-dist` (client-side PDF text extraction; bypasses Vercel's 4.5MB serverless body limit)
- `zod` (schema validation at the API boundary)
- localStorage (single-user persistence)

## Run locally

```bash
npm install
cp .env.example .env
# set ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

Open http://localhost:3000. Try `examples/input/sample-side-letter.md` from the skill repo as a paste.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it on Vercel.
3. In **Project Settings → Environment Variables** set:
   - `ANTHROPIC_API_KEY` — required.
   - `ANTHROPIC_MODEL` — optional, defaults to `claude-opus-4-7`. Use `claude-sonnet-4-6` for cheaper/faster runs.
   - `SITE_PASSWORD` — optional. If set, the whole site is gated behind HTTP basic auth (user `extract`, password = this value). Strongly recommended on a public URL so visitors can't drain your API credits.
4. Deploy. The Anthropic SDK call runs in the Node.js runtime; `maxDuration` is set to 120s for slower documents.

## File map

```
app/
  api/extract/route.ts     ← server-side Anthropic call, tool_use for structured output
  page.tsx                  ← upload / paste / extract / preview
  register/page.tsx         ← master register (filters, CSV/JSON export)
  calendar/page.tsx         ← reporting-deadline expansion
  mfn/page.tsx              ← MFN-eligible terms grouped by type
  review/page.tsx           ← review queue + consent-gate watchlist
components/
  Nav.tsx
  ObligationTable.tsx
lib/
  taxonomy.ts               ← controlled vocabulary (mirrors references/obligation-taxonomy.md)
  schema.ts                 ← Zod schema + upsert-key helper
  prompt.ts                 ← system prompt + emit_obligation_register tool definition
  store.ts                  ← localStorage CRUD, upsert on lp_name + clause_ref
  useRegister.ts            ← React hook that subscribes to register changes
  pdf.ts                    ← pdfjs-dist text extraction (client)
  date.ts                   ← relative-deadline → concrete-date expansion for the calendar
  csv.ts                    ← CSV export
middleware.ts               ← optional shared-password gate
```

## Notes

- **No backend database.** Everything is in `localStorage`. Export to JSON if you want to ferry state across devices, then re-import. Multi-user persistence is intentionally out of scope.
- **PDF text quality varies.** Scanned PDFs without an OCR layer extract as empty text; the API will return an error. Run OCR upstream (e.g., `ocrmypdf`) or paste the text in.
- **Privacy.** The full document text is sent to Anthropic. Don't paste anything you wouldn't send through the Anthropic API.
- **Not legal advice.** Pulls from `SKILL.md` verbatim: "Extract and structure only."
