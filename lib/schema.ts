import { z } from 'zod';
import { FREQUENCIES, OBLIGATION_TYPES } from './taxonomy';

const lenientType = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .refine((v): v is (typeof OBLIGATION_TYPES)[number] =>
        (OBLIGATION_TYPES as readonly string[]).includes(v)
      )
      .catch('other' as (typeof OBLIGATION_TYPES)[number])
  );

const lenientFrequency = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .refine((v): v is (typeof FREQUENCIES)[number] =>
        (FREQUENCIES as readonly string[]).includes(v)
      )
      .catch('REVIEW' as (typeof FREQUENCIES)[number])
  );

const yn = z
  .string()
  .transform((v) => v.trim().toUpperCase())
  .pipe(z.enum(['Y', 'N']).catch('N'));

const optionalString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v ?? '').toString());

const stringArray = z
  .union([z.array(z.string()), z.null(), z.undefined()])
  .transform((v) => (v ?? []).map((s) => s.trim()).filter(Boolean));

const ThresholdSchema = z
  .object({
    kind: z.string().default(''),
    value: z.union([z.string(), z.number()]).transform((v) => String(v)),
    unit: optionalString.default(''),
  })
  .passthrough();

const thresholdArray = z
  .union([z.array(ThresholdSchema), z.null(), z.undefined()])
  .transform((v) => v ?? []);

export const ObligationSchema = z
  .object({
    lp_name: z.string().min(1),
    fund: z.string().min(1),
    clause_ref: z.string().min(1),
    obligation_type: lenientType,
    obligation_summary: z.string().min(1),
    trigger: optionalString.default(''),
    frequency: lenientFrequency,
    deadline: z.string().min(1),
    owner: z.string().min(1),
    mfn_flag: yn,
    consent_flag: yn,
    notes: optionalString.default(''),
    source_page: z
      .union([z.number(), z.string(), z.null(), z.undefined()])
      .transform((v) => {
        if (v === null || v === undefined || v === '') return null;
        const n = typeof v === 'number' ? v : parseInt(v, 10);
        return Number.isFinite(n) ? n : null;
      }),
    source_excerpt: optionalString.default(''),
    confidence: z
      .union([z.number(), z.string(), z.null(), z.undefined()])
      .transform((v) => {
        if (v === null || v === undefined || v === '') return null;
        const n = typeof v === 'number' ? v : parseFloat(v);
        if (!Number.isFinite(n)) return null;
        return Math.max(0, Math.min(1, n));
      }),
    confidence_rationale: optionalString.default(''),
    carveouts: stringArray.default([]),
    conditions: stringArray.default([]),
    thresholds: thresholdArray.default([]),
    lpa_section_ref: optionalString.default(''),
  })
  .passthrough();

export type Obligation = z.infer<typeof ObligationSchema>;
export type ObligationThreshold = z.infer<typeof ThresholdSchema>;

export const ExtractionResultSchema = z.object({
  obligations: z.array(ObligationSchema).default([]),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export type StoredObligation = Obligation & {
  id: string;
  source_filename: string;
  extracted_at: string;
};

export const obligationKey = (o: Pick<Obligation, 'lp_name' | 'clause_ref'>) =>
  `${o.lp_name.trim().toLowerCase()}::${o.clause_ref.trim().toLowerCase()}`;

export const isReviewRow = (r: Obligation): boolean =>
  r.deadline === 'REVIEW' ||
  r.owner === 'REVIEW' ||
  r.frequency === 'REVIEW' ||
  /REVIEW/.test(r.notes || '') ||
  (typeof r.confidence === 'number' && r.confidence < 0.7);
