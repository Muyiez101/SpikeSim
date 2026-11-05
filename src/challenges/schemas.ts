import {z} from 'zod';
import {pointSchema} from './measurement';
export const fieldGoalSchema=z.object({
  scene:z.string().max(160),target:z.string().min(1).max(100),
  action:z.enum(['move','lift','rotate','deliver','reach','score','clearRing']),
  amount:z.number().finite().min(1).max(1000),destination:pointSchema.optional(),
}).refine(goal=>!['deliver','reach'].includes(goal.action)||Boolean(goal.destination));
export type FieldGoal=z.infer<typeof fieldGoalSchema>;
export const targetSchema=z.object({id:z.string().max(100),label:z.string().max(100),x:z.number().finite(),y:z.number().finite(),height:z.number().finite(),mass:z.number().finite(),joint:z.boolean(),magnetic:z.boolean(),size:z.tuple([z.number(),z.number(),z.number()])});
export const fieldStateSchema=z.object({targets:z.array(targetSchema).max(200),robot:pointSchema.extend({heading:z.number()}),attachments:z.array(z.object({port:z.string().max(1),type:z.string().max(50),position:z.number().finite()})).max(4).default([]),score:z.number().optional(),scoreLabel:z.string().max(80).optional()});
export type FieldState=z.infer<typeof fieldStateSchema>;
export type FieldTarget=z.infer<typeof targetSchema>;
export const goalProgressSchema=z.object({value:z.number().finite(),passed:z.boolean(),heldMs:z.number().finite(),running:z.boolean()});
export type GoalProgress=z.infer<typeof goalProgressSchema>;
