import { z } from 'zod';

export const sumoRulesSchema = z.object({
  radiusCm: z.union([z.literal(80), z.literal(100), z.literal(120)]).default(100),
  timeLimitSeconds: z.number().int().min(10).max(120).default(60),
});
export type SumoRules = z.infer<typeof sumoRulesSchema>;
