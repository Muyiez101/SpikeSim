import { defaultMap, mapFiles } from './maps';
import { defaultRobot, robotPresets } from './presets';
import type { MapFile, RobotDesign } from './schemas';
import type { SimCommand, SimResult } from './types';
import { DeterministicSimulator } from './engine';

export function runHeadless(commands: SimCommand[], options: { map?: MapFile; robot?: RobotDesign; seed?: number } = {}): SimResult {
  const simulator = new DeterministicSimulator({ map: options.map ?? defaultMap, robot: options.robot ?? defaultRobot, seed: options.seed });
  return simulator.run(commands);
}

export function getMap(id: string) { return mapFiles[id] ?? defaultMap; }
export function getRobot(id: string) { return robotPresets[id] ?? defaultRobot; }
