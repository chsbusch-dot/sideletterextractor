import { z } from 'zod';
import { FREQUENCIES, OBLIGATION_TYPES } from './taxonomy';

export const ObligationSchema = z.object({
  lp_name: z.string().min(1),
  fund: z.string().min(1),
  clause_ref: z.string().min(1),
  obligation_type: z.enum(OBLIGATION_TYPES),
  obligation_summary: z.string().min(1),
  trigger: z.string().default(''),
  frequency: z.enum(FREQUENCIES),
  deadline: z.string().min(1),
  owner: z.string().min(1),
  mfn_flag: z.enum(['Y', 'N']),
  consent_flag: z.enum(['Y', 'N']),
  notes: z.string().default(''),
});

export type Obligation = z.infer<typeof ObligationSchema>;

export const ExtractionResultSchema = z.object({
  obligations: z.array(ObligationSchema).min(1),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

export type StoredObligation = Obligation & {
  id: string;
  source_filename: string;
  extracted_at: string;
};

export const obligationKey = (o: Pick<Obligation, 'lp_name' | 'clause_ref'>) =>
  `${o.lp_name.trim().toLowerCase()}::${o.clause_ref.trim().toLowerCase()}`;
