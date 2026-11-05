import { z } from 'zod';
import { simCommandSchema } from '../sim/schemas';
import { visualProgramSchema } from '../editor/program';

/**
 * Mission goals are checked against the event log and final state of a
 * simulation run. Each goal is data, not code, so missions stay portable.
 */
const goalSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('reachZone'), zone: z.string().min(1) }),
  z.object({ type: z.literal('reachZoneWithTag'), tag: z.string().min(1) }),
  z.object({ type: z.literal('pushObjectToZone'), object: z.string().min(1), zone: z.string().min(1) }),
  z.object({ type: z.literal('pushObjectWithTagToZone'), tag: z.string().min(1), zone: z.string().min(1) }),
  z.object({ type: z.literal('stayInZone'), zone: z.string().min(1), durationMs: z.number().nonnegative() }),
  z.object({ type: z.literal('avoidZone'), zone: z.string().min(1) }),
  z.object({ type: z.literal('avoidCollisions') }),
  z.object({ type: z.literal('maxTime'), seconds: z.number().positive() }),
  z.object({ type: z.literal('minTime'), seconds: z.number().nonnegative() }),
  z.object({ type: z.literal('stopInZone'), zone: z.string().min(1) }),
  z.object({ type: z.literal('visitInOrder'), zones: z.array(z.string().min(1)).min(2).max(12) }),
  z.object({ type: z.literal('headingWithin'), degrees: z.number(), tolerance: z.number().positive() }),
  z.object({ type: z.literal('usesBlock'), block: z.string().min(1) }),
  z.object({ type: z.literal('matrixLit') }),
  z.object({ type: z.literal('soundPlayed') }),
  z.object({ type: z.literal('sensorAtEnd'), port: z.string(), value: z.union([z.string(), z.number()]) }),
  z.object({ type: z.literal('sensorBetween'), port: z.string(), min: z.number(), max: z.number() }),
  z.object({ type: z.literal('sensorSeen'), port: z.string(), value: z.union([z.string(), z.number()]) }),
  z.object({ type: z.literal('variableEquals'), name: z.string(), value: z.number() }),
]);

const hintSchema = z.object({
  level: z.literal(1).or(z.literal(2)).or(z.literal(3)),
  text: z.string().min(1),
});

export const missionSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1).max(80),
  worldId: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  brief: z.string().min(1).max(1000),
  robotPreset: z.string().min(1),
  mapId: z.string().optional(),
  visualReference: visualProgramSchema.optional(),
  goals: z.array(goalSchema).min(1).max(10),
  /** Star thresholds: 1 star for completing goals, faster runs earn more. */
  timeLimits: z.object({
    twoStars: z.number().positive(),
    threeStars: z.number().positive(),
  }),
  hints: z.array(hintSchema).min(1).max(3),
  /** Sim commands for the reference solution, run in tests. */
  reference: z.array(simCommandSchema).max(60),
});

export const worldSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  missionIds: z.array(z.string().min(1)).min(1).max(30),
});

export type MissionGoal = z.infer<typeof goalSchema>;
export type MissionFile = z.infer<typeof missionSchema>;
export type WorldFile = z.infer<typeof worldSchema>;
export type Hint = z.infer<typeof hintSchema>;
