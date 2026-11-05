import { robotSchema, type RobotDesign } from './schemas';

const driveMotors = [
  { port: 'A' as const, side: 'left' as const, maxSpeed: 810, maxTorque: 0.18 },
  { port: 'B' as const, side: 'right' as const, maxSpeed: 810, maxTorque: 0.18 },
];

const base = {
  schemaVersion: 1 as const,
  width: 140,
  length: 160,
  mass: 800,
  wheelDiameter: 56,
  trackWidth: 112,
  wheelFriction: 0.9,
  motors: driveMotors,
};

export const robotPresets: Record<string, RobotDesign> = {
  'driving-base': robotSchema.parse({
    ...base,
    id: 'driving-base',
    name: 'Driving base',
    devices: [
      { type: 'color', port: 'D', x: 82, y: 0, heading: 0, footprint: 12 },
      { type: 'distance', port: 'E', x: 86, y: 0, heading: 0, range: 2000, fov: 10 },
      { type: 'force', port: 'F', x: 110, y: 0, heading: 0 },
      { type: 'gyro', port: 'C', x: 0, y: 0, heading: 0 },
    ],
  }),
  'line-follower': robotSchema.parse({
    ...base,
    id: 'line-follower',
    name: 'Double sensor line follower',
    devices: [
      { type: 'color', port: 'D', x: 80, y: -16, heading: 0, footprint: 12 },
      { type: 'color', port: 'E', x: 80, y: 16, heading: 0, footprint: 12 },
      { type: 'gyro', port: 'F', x: 0, y: 0, heading: 0 },
    ],
  }),
  'maze-runner': robotSchema.parse({
    ...base,
    id: 'maze-runner',
    name: 'Maze runner',
    devices: [
      { type: 'color', port: 'D', x: 80, y: 0, heading: 0, footprint: 12 },
      { type: 'distance', port: 'E', x: 82, y: 0, heading: 0, range: 2000, fov: 10 },
      { type: 'distance', port: 'F', x: 0, y: -68, heading: -90, range: 600, fov: 10 },
      { type: 'gyro', port: 'C', x: 0, y: 0, heading: 0 },
    ],
  }),
  'tow-bot': robotSchema.parse({
    ...base,
    id: 'tow-bot',
    name: 'Tow bot',
    devices: [
      { type: 'color', port: 'D', x: 80, y: -25, heading: 0, footprint: 12 },
      { type: 'color', port: 'E', x: 80, y: 25, heading: 0, footprint: 12 },
      { type: 'force', port: 'F', x: 92, y: 0, heading: 0 },
      { type: 'gyro', port: 'C', x: 0, y: 0, heading: 0 },
    ],
  }),
};

export const defaultRobot = robotPresets['driving-base'];
