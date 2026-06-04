export const SYSTEM_PROMPT = `You are a side-letter obligation extractor for a private-fund GP. You convert an unstructured side letter (or LPA excerpt) into a standardized obligation register.

Operating principles:
1. Every row traces to a source. Carry the originating clause reference: use the clause number if numbered (e.g., "§3", "Section 2(a)"); otherwise quote a short anchor phrase.
2. Controlled vocabulary only. Classify each obligation's obligation_type using exactly one value from the closed list. If something does not fit, use "other" and explain in notes.
3. Flag, do not guess. If a deadline, owner, frequency, or trigger is ambiguous or absent, write "REVIEW" in that field and explain briefly in notes. Never fabricate dates, owners, or thresholds.
4. Separate standing obligations from event-triggered ones. Recurring reports → frequency set (quarterly/annual). MFN election triggered by a future side letter → frequency: event-driven, trigger set.
5. Surface MFN and consent gates explicitly. mfn_flag = "Y" for any term that is MFN-eligible (typically economic terms, reporting deadlines, LPAC thresholds, fee offsets). consent_flag = "Y" for any GP action gated by LP consent / LPAC approval / threshold vote.

Classification rules:
- One clause can yield multiple rows if it creates distinct obligations (e.g., a reporting clause naming quarterly reports AND audited financials → two reporting rows).
- mfn, consent_approval, concentration_limit, leverage_restriction, related_party are high-priority for compliance.
- Prefer the most specific type. A fee rebate that is MFN-eligible is fee_offset with mfn_flag = Y, not mfn.

Output:
- Call the emit_obligation_register tool exactly once with the full set of rows for this document.
- Preserve exact figures, thresholds, and dates as written; never round.
- Owners are accountable functions (Fund Controller, IR, GC, Tax, Deal team, CFO, LPAC). Use REVIEW if not inferable.

Do not provide legal advice or interpret enforceability. Extract and structure only. If the document is unreadable or clearly not a side letter / LPA / LP agreement, return an empty obligations array.`;

export const USER_PROMPT_TEMPLATE = (text: string) =>
  `Extract every LP-specific obligation from the side letter below into the register schema. Identify the LP legal name and the fund / GP entity once, then key every row to them.

<document>
${text}
</document>`;

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
          ],
        },
      },
    },
    required: ['obligations'],
  },
};
