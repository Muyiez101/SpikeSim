import type { z } from 'zod';
import type { MapFile, RobotDesign, simCommandSchema } from './schemas';

export type SimCommand = z.infer<typeof simCommandSchema>;

export type SimEvent =
  | { type: 'collision'; data: { wall?: string; object?: string } }
  | { type: 'zoneEnter'; data: { zone: string; tags: string[] } }
  | { type: 'sensor'; data: { port: string; sensor: string; value: number | string } }
  | { type: 'motor'; data: { side: 'left' | 'right'; degrees: number } };
// Hub output events carry simulation time so replay uses the same timing.
export type HubEvent = { type: 'sound'; data: { t: number; frequency: number; durationMs: number } };

export type SimSnapshot = {
  t: number;
  robot: { x: number; y: number; heading: number; wheels: number[]; arms: number[] };
  objects: { id: string; x: number; y: number; heading: number }[];
  hub: { matrix: number[][]; statusColor: string; distanceLights?: Record<string, number[]> };
  sensors: Record<string, number | string>;
  events: (SimEvent | HubEvent)[];
};

export type SimResult = {
  end: SimSnapshot;
  snapshots: SimSnapshot[];
  events: (SimEvent | HubEvent)[];
  sensors: Record<string, number | string>;
};

export type SimulationInput = { map: MapFile; robot: RobotDesign; seed?: number };
