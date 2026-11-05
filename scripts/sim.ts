import { readFile } from 'node:fs/promises';
import { getMap, getRobot, runHeadless } from '../src/sim';
import { simCommandSchema } from '../src/sim/schemas';
import type { SimCommand } from '../src/sim/types';

function option(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const args = process.argv.slice(2);
const mapId = option(args, '--map') ?? 'open-floor';
const robotId = option(args, '--robot') ?? 'driving-base';
const commandFile = option(args, '--commands');
let commands: SimCommand[] = [{ type: 'move', distanceMm: 300, speedPercent: 60 }];

if (commandFile) {
  const parsed: unknown = JSON.parse(await readFile(commandFile, 'utf8'));
  commands = simCommandSchema.array().parse(parsed);
}

const result = runHeadless(commands, { map: getMap(mapId), robot: getRobot(robotId), seed: 1 });
console.log(JSON.stringify({ map: mapId, robot: robotId, end: result.end, events: result.events, sensors: result.sensors }, null, 2));
