export const SYSTEM_PROMPT = `You are a side-letter obligation extractor for a private-fund GP. You convert an unstructured side letter (or LPA excerpt) into a standardized, auditable obligation register.

Operating principles:
1. Every row traces to a source. Carry the originating clause reference (clause_ref), the page number of the source (source_page, 1-indexed), and a SHORT verbatim excerpt of the clause text (source_excerpt, max ~300 chars) so a human can verify the extraction in seconds. For source_excerpt, quote the document EXACTLY — do not paraphrase, summarize, or normalize whitespace beyond removing line breaks. This excerpt will be searched in the PDF text layer for highlighting.
2. Controlled vocabulary only. Classify each obligation's obligation_type using exactly one value from the closed list. If something does not fit, use "other" and explain in notes.
3. Flag, do not guess. If a deadline, owner, frequency, or trigger is ambiguous or absent, write "REVIEW" in that field and explain briefly in notes. Never fabricate dates, owners, or thresholds.
4. Separate standing obligations from event-triggered ones. Recurring reports → frequency set (quarterly/annual). MFN election triggered by a future side letter → frequency: event-driven, trigger set.
5. Surface MFN and consent gates explicitly. mfn_flag = "Y" for any term that is MFN-eligible (typically economic terms, reporting deadlines, LPAC thresholds, fee offsets). consent_flag = "Y" for any GP action gated by LP consent / LPAC approval / threshold vote.
6. Preserve carve-outs and conditions as structured data, not prose:
   - carveouts: exceptions that narrow the obligation (e.g., "excluding existing portfolio companies as of first closing", "other than bridge financing under 90 days").
   - conditions: prerequisites that must hold for the obligation to apply (e.g., "for so long as LP holds ≥ $50M unreturned commitment", "subject to applicable law").
   - thresholds: numeric/percentage thresholds with their unit (e.g., {kind: "concentration", value: "15", unit: "%"}, {kind: "commitment_floor", value: "50000000", unit: "USD"}, {kind: "lookback", value: "60", unit: "days"}).
   Each carveout / condition is one short sentence. If a clause has nested exceptions, capture each as its own entry in the appropriate array.
7. Score your own confidence. For every row, set:
   - confidence: a number between 0 and 1 reflecting how certain you are that this row is correct, well-typed, and complete. Use 1.0 only for cleanly numbered clauses with unambiguous language. Use < 0.7 whenever the clause is unusual, the obligation type is unclear, the deadline is approximate, or the document quality is poor.
   - confidence_rationale: one short sentence stating WHY (e.g., "Clause is clearly numbered with a single quantified obligation" or "Excuse right with three nested carve-outs; risk of dropping one").
   Rows with confidence < 0.7 will be routed to a mandatory human-review queue. Be honest — recall matters more than apparent certainty.
8. When an LPA is also provided in the input, set lpa_section_ref to the LPA clause that the side-letter provision modifies or relies on (e.g., "Section 4.2(b)"). Leave it empty if the side letter is standalone.

Classification rules:
- One clause can yield multiple rows if it creates distinct obligations (e.g., a reporting clause naming quarterly reports AND audited financials → two reporting rows).
- mfn, consent_approval, concentration_limit, leverage_restriction, related_party are high-priority for compliance.
- Prefer the most specific type. A fee rebate that is MFN-eligible is fee_offset with mfn_flag = Y, not mfn.

Output:
- Call the emit_obligation_register tool exactly once with the full set of rows for this document.
- Preserve exact figures, thresholds, and dates as written; never round.
- Owners are accountable functions (Fund Controller, IR, GC, Tax, Deal team, CFO, LPAC). Use REVIEW if not inferable.

Do not provide legal advice or interpret enforceability. Extract and structure only. If the document is unreadable or clearly not a side letter / LPA / LP agreement, return an empty obligations array.`;

export const USER_PROMPT_TEXT = (text: string, lpaText?: string) =>
  `Extract every LP-specific obligation from the side letter below into the register schema. Identify the LP legal name and the fund / GP entity once, then key every row to them.${
    lpaText
      ? `\n\nThe Limited Partnership Agreement (LPA) is also provided for cross-reference. Use it to interpret side-letter language that modifies LPA sections; set lpa_section_ref where appropriate. Do NOT extract LPA obligations as side-letter rows — extract only what the side letter creates, references, or modifies.`
      : ''
  }

<sideletter>
${text}
</sideletter>${lpaText ? `\n\n<lpa>\n${lpaText}\n</lpa>` : ''}`;

export const USER_PROMPT_PDF_INTRO = (lpaProvided: boolean) =>
  `Extract every LP-specific obligation from the attached side-letter PDF into the register schema. Identify the LP legal name and the fund / GP entity once, then key every row to them.${
    lpaProvided
      ? `\n\nThe Limited Partnership Agreement (LPA) is also attached for cross-reference. Use it to interpret side-letter language that modifies LPA sections; set lpa_section_ref where appropriate. Do NOT extract LPA obligations as side-letter rows — extract only what the side letter creates, references, or modifies.`
      : ''
  }

For every row, populate source_page (the 1-indexed PDF page on which the clause appears) and source_excerpt (a short verbatim quote of the clause, suitable for highlighting in the PDF).`;

export const EXTRACTION_TOOL = {
  name: 'emit_obligation_register',
  description:
    'Emit the full standardized obligation register for the provided side letter. Call exactly once.',
  input_schema: {
    type: 'object' as const,
    properties: {
      obligations: {
        type: 'array',
        description: 'One row per distinct obligation, right, restriction, or notice requirement.',
        items: {
          type: 'object',
          properties: {
            lp_name: {
              type: 'string',
              description: 'LP legal name. Same value on every row from this document.',
            },
            fund: {
              type: 'string',
              description: 'Fund or GP entity the obligation runs against.',
            },
            clause_ref: {
              type: 'string',
              description:
                'Clause number (e.g., "§3", "Section 2(a)") or short anchor phrase if the document is not numbered.',
            },
            obligation_type: {
              type: 'string',
              enum: [
                'mfn',
                'reporting',
                'fee_offset',
                'co_investment',
                'excuse_exclusion',
                'lpac',
                'consent_approval',
                'concentration_limit',
                'leverage_restriction',
                'related_party',
                'notice',
                'transfer_liquidity',
                'confidentiality',
                'regulatory',
                'other',
              ],
            },
            obligation_summary: {
              type: 'string',
              description: 'Plain-language statement of what is owed and by whom.',
            },
            trigger: {
              type: 'string',
              description:
                'Event that activates the obligation. Empty string for standing obligations.',
            },
            frequency: {
              type: 'string',
              enum: ['one-time', 'quarterly', 'annual', 'event-driven', 'standing', 'REVIEW'],
            },
            deadline: {
              type: 'string',
              description:
                'Absolute date, relative rule (e.g., "45 days after quarter-end"), "Continuous", "Ongoing", or "REVIEW".',
            },
            owner: {
              type: 'string',
              description:
                'Accountable function (Fund Controller, IR, GC, Tax, Deal team, CFO, LPAC) or "REVIEW".',
            },
            mfn_flag: { type: 'string', enum: ['Y', 'N'] },
            consent_flag: { type: 'string', enum: ['Y', 'N'] },
            notes: {
              type: 'string',
              description:
                'Ambiguities, thresholds, carve-outs, or "other"-type explanations. Empty string if none.',
            },
            source_page: {
              type: ['integer', 'null'],
              description: '1-indexed PDF page where the clause appears. Null if text-only input.',
            },
            source_excerpt: {
              type: 'string',
              description:
                'Short verbatim quote of the clause text (max ~300 chars), used to highlight in the PDF viewer.',
            },
            confidence: {
              type: 'number',
              description: 'Self-reported confidence in this row, 0–1.',
            },
            confidence_rationale: {
              type: 'string',
              description: 'One short sentence explaining the confidence score.',
            },
            carveouts: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Exceptions that NARROW this obligation. One short sentence each. Empty array if none.',
            },
            conditions: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Prerequisites that must HOLD for the obligation to apply. One short sentence each. Empty array if none.',
            },
            thresholds: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  kind: { type: 'string' },
                  value: { type: 'string' },
                  unit: { type: 'string' },
                },
                required: ['kind', 'value', 'unit'],
              },
              description:
                'Numeric thresholds tied to this obligation (e.g., concentration %, commitment floor, lookback days).',
            },
            lpa_section_ref: {
              type: 'string',
              description:
                'LPA section that this side-letter provision modifies or relies on. Empty if standalone.',
            },
          },
          required: [
            'lp_name',
            'fund',
            'clause_ref',
            'obligation_type',
            'obligation_summary',
            'trigger',
            'frequency',
            'deadline',
            'owner',
            'mfn_flag',
            'consent_flag',
            'notes',
            'source_page',
            'source_excerpt',
            'confidence',
            'confidence_rationale',
            'carveouts',
            'conditions',
            'thresholds',
            'lpa_section_ref',
          ],
        },
      },
    },
    required: ['obligations'],
  },
};
