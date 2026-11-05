import { z } from 'zod';
import { visualProgramSchema } from '../editor/program';
import { soloFrameSchema, soloVerdictSchema } from './challenges';
export const runtime3dRequestSchema = z.object({
  attemptId: z.string().uuid(), leaseId: z.string().uuid(),
  type: z.enum(['claim', 'started', 'frame', 'finish', 'error']),
  frame: soloFrameSchema.optional(), verdict: soloVerdictSchema.optional(),
});
export type Runtime3dRequest = z.infer<typeof runtime3dRequestSchema>;
export const runtime3dResponseSchema = z.object({ accepted: z.boolean(), program: visualProgramSchema.optional() });
