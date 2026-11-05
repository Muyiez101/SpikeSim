import { z } from 'zod';

const finiteNumber = z.number().finite();
const pointSchema = z.tuple([finiteNumber, finiteNumber]);

const layerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('line'), points: z.array(pointSchema).min(2), width: finiteNumber.positive(), color: z.string().min(1) }),
  z.object({ type: z.literal('patch'), shape: z.enum(['rect', 'circle']), x: finiteNumber, y: finiteNumber, w: finiteNumber.positive().optional(), h: finiteNumber.positive().optional(), r: finiteNumber.positive().optional(), color: z.string().min(1) }),
]);

export const mapSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1).max(80),
  size: z.object({ width: finiteNumber.positive().max(3000), height: finiteNumber.positive().max(3000) }),
  surface: z.object({ base: z.string().min(1), layers: z.array(layerSchema).max(200) }),
  walls: z.array(z.object({ points: z.array(pointSchema).min(2), thickness: finiteNumber.positive(), height: finiteNumber.nonnegative() })).max(200),
  objects: z.array(z.object({ id: z.string().min(1), kind: z.enum(['box', 'ball', 'cylinder']), x: finiteNumber, y: finiteNumber, size: finiteNumber.positive(), mass: finiteNumber.positive(), color: z.string().min(1), tags: z.array(z.string()).max(20).optional() })).max(200),
  zones: z.array(z.discriminatedUnion('shape', [
    z.object({ id: z.string().min(1), shape: z.literal('rect'), x: finiteNumber, y: finiteNumber, w: finiteNumber.positive(), h: finiteNumber.positive(), tags: z.array(z.string()).max(20), color: z.string().optional(), label: z.string().optional() }),
    z.object({ id: z.string().min(1), shape: z.literal('circle'), x: finiteNumber, y: finiteNumber, r: finiteNumber.positive(), tags: z.array(z.string()).max(20), color: z.string().optional(), label: z.string().optional() }),
  ])).max(200),
  friction: z.array(z.object({ zone: z.string().min(1), coefficient: finiteNumber.min(0).max(2) })).max(100),
  spawn: z.object({ x: finiteNumber, y: finiteNumber, heading: finiteNumber }),
});

const deviceSchema = z.object({
  type: z.enum(['color', 'distance', 'force', 'gyro']),
  port: z.enum(['A', 'B', 'C', 'D', 'E', 'F']),
  x: finiteNumber,
  y: finiteNumber,
  heading: finiteNumber,
  range: finiteNumber.positive().optional(),
  fov: finiteNumber.positive().optional(),
  footprint: finiteNumber.positive().optional(),
});

export const robotSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  width: finiteNumber.positive(),
  length: finiteNumber.positive(),
  mass: finiteNumber.positive(),
  wheelDiameter: finiteNumber.positive(),
  trackWidth: finiteNumber.positive(),
  wheelFriction: finiteNumber.min(0).max(2),
  motors: z.array(z.object({ port: z.enum(['A', 'B', 'C', 'D', 'E', 'F']), side: z.enum(['left', 'right', 'arm', 'other']), maxSpeed: finiteNumber.positive(), maxTorque: finiteNumber.positive() })).max(6),
  devices: z.array(deviceSchema).max(6),
});

export const simCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('move'), distanceMm: finiteNumber, speedPercent: finiteNumber.min(-100).max(100) }),
  z.object({ type: z.literal('turn'), degrees: finiteNumber, speedPercent: finiteNumber.min(-100).max(100) }),
  z.object({ type: z.literal('tank'), leftPercent: finiteNumber.min(-100).max(100), rightPercent: finiteNumber.min(-100).max(100), durationMs: finiteNumber.nonnegative() }),
  z.object({ type: z.literal('wait'), durationMs: finiteNumber.nonnegative() }),
  z.object({ type: z.literal('motor'), port: z.enum(['A', 'B', 'C', 'D', 'E', 'F']), speedPercent: finiteNumber.min(-100).max(100), durationMs: finiteNumber.min(0).max(60000) }),
  z.object({ type: z.literal('matrix'), image: z.enum(['smile', 'heart', 'arrow', 'check']) }),
  z.object({ type: z.literal('pixel'), x: finiteNumber.int().min(0).max(4), y: finiteNumber.int().min(0).max(4), brightness: finiteNumber.min(0).max(100) }),
  z.object({ type: z.literal('clearMatrix') }),
  z.object({ type: z.literal('light'), color: z.enum(['red', 'yellow', 'green', 'blue', 'purple', 'white', 'off']) }),
  z.object({ type: z.literal('beep'), frequency: finiteNumber.min(50).max(2000), durationMs: finiteNumber.min(0).max(60000) }),
  z.object({ type: z.literal('stop') }),
]);

export type MapFile = z.infer<typeof mapSchema>;
export type RobotDesign = z.infer<typeof robotSchema>;
export type Device = z.infer<typeof deviceSchema>;
