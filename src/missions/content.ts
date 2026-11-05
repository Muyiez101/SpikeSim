import { missionSchema, worldSchema, type MissionFile, type WorldFile } from './schemas';
import { mapFiles, bounds } from '../sim/maps';
import { mapSchema } from '../sim/schemas';
import type { MapFile } from '../sim/map-types';
import type { SimCommand } from '../sim/types';
import { challengeMaps, challengeMissions, challengeWorlds } from './challenges';

const boundsWalls = bounds;

const move = (distanceMm: number, speedPercent = 60): SimCommand => ({ type: 'move', distanceMm, speedPercent });
const turn = (degrees: number, speedPercent = 40): SimCommand => ({ type: 'turn', degrees, speedPercent });

/**
 * Extra maps used only by missions. Same format as sim/maps.ts, all original.
 */
export const missionMaps: Record<string, MapFile> = {
  'basics-field': mapSchema.parse({
    schemaVersion: 1,
    id: 'basics-field',
    size: { width: 1000, height: 600 },
    surface: { base: '#f6f4ef', layers: [] },
    walls: boundsWalls(1000, 600),
    objects: [],
    zones: [
      { id: 'landing-pad', shape: 'rect', x: 720, y: 300, w: 180, h: 180, tags: ['finish'], color: '#b9e769', label: 'Landing pad' },
      { id: 'side-corridor', shape: 'rect', x: 720, y: 180, w: 180, h: 140, tags: ['bonus'], color: '#7bc9f4', label: 'Bonus corridor' },
    ],
    friction: [],
    spawn: { x: 140, y: 300, heading: 0 },
  }),
  'conditions-field': mapSchema.parse({
    schemaVersion: 1,
    id: 'conditions-field',
    size: { width: 1000, height: 600 },
    surface: {
      base: '#f6f4ef',
      layers: [
        { type: 'patch', shape: 'rect', x: 500, y: 300, w: 140, h: 140, color: '#ef4444' },
        { type: 'patch', shape: 'rect', x: 500, y: 150, w: 140, h: 100, color: '#facc15' },
        { type: 'patch', shape: 'rect', x: 500, y: 470, w: 140, h: 100, color: '#22c55e' },
      ],
    },
    walls: boundsWalls(1000, 600),
    objects: [],
    zones: [
      { id: 'red-zone', shape: 'rect', x: 500, y: 300, w: 140, h: 140, tags: ['red', 'danger'], color: '#ef4444', label: 'Red square' },
      { id: 'yellow-zone', shape: 'rect', x: 500, y: 150, w: 140, h: 100, tags: ['yellow'], color: '#facc15', label: 'Yellow square' },
      { id: 'green-zone', shape: 'rect', x: 500, y: 470, w: 140, h: 100, tags: ['green', 'finish'], color: '#22c55e', label: 'Green square' },
    ],
    friction: [],
    spawn: { x: 140, y: 300, heading: 0 },
  }),
  'loops-field': mapSchema.parse({
    schemaVersion: 1,
    id: 'loops-field',
    size: { width: 1000, height: 600 },
    surface: { base: '#f6f4ef', layers: [] },
    walls: boundsWalls(1000, 600),
    objects: [
      { id: 'token-1', kind: 'box', x: 480, y: 300, size: 60, mass: 120, color: '#a88cff', tags: ['token'] },
      { id: 'token-2', kind: 'box', x: 480, y: 170, size: 60, mass: 120, color: '#a88cff', tags: ['token'] },
      { id: 'token-3', kind: 'box', x: 480, y: 430, size: 60, mass: 120, color: '#a88cff', tags: ['token'] },
    ],
    zones: [{ id: 'home', shape: 'rect', x: 850, y: 300, w: 240, h: 440, tags: ['home', 'finish'], color: '#b9e769', label: 'Home' }],
    friction: [],
    spawn: { x: 140, y: 300, heading: 0 },
  }),
};

const mission = (input: Parameters<typeof missionSchema.parse>[0]): MissionFile => missionSchema.parse(input);
const world = (input: Parameters<typeof worldSchema.parse>[0]): WorldFile => worldSchema.parse(input);

const allMaps: Record<string, MapFile> = { ...mapFiles, ...missionMaps, ...challengeMaps };

export const missions: MissionFile[] = [
  // ===== World 1: Basics =====
  mission({
    schemaVersion: 1,
    id: 'basics-1',
    worldId: 'basics',
    title: 'First steps',
    brief: 'Drive the robot onto the green landing pad. Start with straight lines.',
    robotPreset: 'driving-base',
    goals: [{ type: 'reachZone', zone: 'landing-pad' }],
    timeLimits: { twoStars: 8, threeStars: 5 },
    hints: [
      { level: 1, text: 'How far is the pad from the start? Measure with your eyes first.' },
      { level: 2, text: 'The pad centre is 580 mm ahead of the robot. Try driving 580 mm.' },
      { level: 3, text: 'Move forward 580 mm at any speed. The zone check needs only the robot centre inside.' },
    ],
    reference: [move(580, 70)],
  }),
  mission({
    schemaVersion: 1,
    id: 'basics-2',
    worldId: 'basics',
    title: 'Turn and go',
    brief: 'Drive into the blue bonus corridor in the top corner. One turn is enough.',
    robotPreset: 'driving-base',
    goals: [{ type: 'reachZone', zone: 'side-corridor' }],
    timeLimits: { twoStars: 12, threeStars: 8 },
    hints: [
      { level: 1, text: 'The corridor is above and ahead. Drive forward first, then turn up.' },
      { level: 2, text: 'Drive 580 mm to the pad, then turn -90 degrees and drive 120 mm up.' },
      { level: 3, text: 'Move 580 mm, turn -90, move 120 mm.' },
    ],
    reference: [move(580, 70), turn(-90), move(120, 60)],
  }),
  mission({
    schemaVersion: 1,
    id: 'basics-3',
    worldId: 'basics',
    title: 'The long way round',
    brief: 'Reach the landing pad again, but without touching the side corridor on the way.',
    robotPreset: 'driving-base',
    goals: [
      { type: 'reachZone', zone: 'landing-pad' },
      { type: 'avoidZone', zone: 'side-corridor' },
    ],
    timeLimits: { twoStars: 14, threeStars: 10 },
    hints: [
      { level: 1, text: 'Straight forward works. The corridor is above the pad, away from the direct path.' },
      { level: 2, text: 'Drive straight along the middle of the field. Do not turn near the pad.' },
      { level: 3, text: 'Move 580 mm straight ahead at 60 percent.' },
    ],
    reference: [move(580, 60)],
  }),
  mission({
    schemaVersion: 1,
    id: 'basics-4',
    worldId: 'basics',
    title: 'Precision stop',
    brief: 'Stop inside the landing pad and stay there for two full seconds.',
    robotPreset: 'driving-base',
    goals: [
      { type: 'reachZone', zone: 'landing-pad' },
      { type: 'stayInZone', zone: 'landing-pad', durationMs: 2000 },
    ],
    timeLimits: { twoStars: 10, threeStars: 7 },
    hints: [
      { level: 1, text: 'Reach the pad, then wait. Waiting counts as staying.' },
      { level: 2, text: 'Drive 580 mm, then wait 2000 ms without moving.' },
      { level: 3, text: 'Move 580 mm at 70 percent, then wait 2200 ms to be safe.' },
    ],
    reference: [move(580, 70), { type: 'wait', durationMs: 2200 }],
  }),

  // ===== World 2: Conditions =====
  mission({
    schemaVersion: 1,
    id: 'conditions-1',
    worldId: 'conditions',
    title: 'Green means go',
    brief: 'Only the green square is safe. Reach it without entering the red square.',
    robotPreset: 'driving-base',
    goals: [
      { type: 'reachZone', zone: 'green-zone' },
      { type: 'avoidZone', zone: 'red-zone' },
    ],
    timeLimits: { twoStars: 12, threeStars: 9 },
    hints: [
      { level: 1, text: 'The green square is below the red one. Curve around the danger.' },
      { level: 2, text: 'Turn +90, drive 170 mm down, turn back, then drive 360 mm to green.' },
      { level: 3, text: 'Turn 90, move 170, turn -90, move 360, turn 90, move 40 to enter green.' },
    ],
    reference: [turn(90), move(170, 60), turn(-90), move(360, 60), turn(90), move(40, 50)],
  }),
  mission({
    schemaVersion: 1,
    id: 'conditions-2',
    worldId: 'conditions',
    title: 'Sensor detective',
    brief: 'The colour sensor tells you what is under the robot. Drive forward until it sees green, then stop.',
    robotPreset: 'driving-base',
    goals: [{ type: 'reachZone', zone: 'green-zone' }],
    timeLimits: { twoStars: 12, threeStars: 9 },
    hints: [
      { level: 1, text: 'You can drive straight through the middle squares. Watch what the sensor reports.' },
      { level: 2, text: 'The red square is in your path at the centre. Drive past it and stop on green below.' },
      { level: 3, text: 'Drive 360 mm straight, turn 90, drive 170 mm into the green square.' },
    ],
    reference: [move(360, 60), turn(90), move(170, 60)],
  }),
  mission({
    schemaVersion: 1,
    id: 'conditions-3',
    worldId: 'conditions',
    title: 'Yellow detour',
    brief: 'Visit the yellow square first, then finish on the green square. Skip the red square.',
    robotPreset: 'driving-base',
    goals: [
      { type: 'reachZone', zone: 'yellow-zone' },
      { type: 'reachZone', zone: 'green-zone' },
      { type: 'avoidZone', zone: 'red-zone' },
    ],
    timeLimits: { twoStars: 24, threeStars: 16 },
    hints: [
      { level: 1, text: 'Visit yellow, then go around the right side of red to reach green.' },
      { level: 2, text: 'Go up 15 cm, then right 58 cm through yellow. Travel down 32 cm and left 22 cm into green.' },
      { level: 3, text: 'Turn -90, move 15 cm, turn 90, move 58 cm, turn 90, move 32 cm, turn 90, move 22 cm.' },
    ],
    reference: [
      turn(-90), move(150, 60), turn(90), move(580, 60),
      turn(90), move(320, 60), turn(90), move(220, 60),
    ],
  }),

  // ===== World 3: Loops =====
  mission({
    schemaVersion: 1,
    id: 'loops-1',
    worldId: 'loops',
    title: 'Token collector',
    brief: 'Push any one token box into the home zone. One clean push is enough.',
    robotPreset: 'driving-base',
    goals: [{ type: 'pushObjectWithTagToZone', tag: 'token', zone: 'home' }],
    timeLimits: { twoStars: 10, threeStars: 7 },
    hints: [
      { level: 1, text: 'A token stands directly ahead. Push it into the green home zone on the right.' },
      { level: 2, text: 'Drive straight forward. The robot pushes the box as it goes.' },
      { level: 3, text: 'Move forward 680 mm at half speed. The box slides into home ahead of you.' },
    ],
    reference: [move(680, 50)],
  }),
  mission({
    schemaVersion: 1,
    id: 'loops-2',
    worldId: 'loops',
    title: 'Clean sweep',
    brief: 'Push all three tokens into the home zone, then park the robot inside it too.',
    robotPreset: 'driving-base',
    goals: [
      { type: 'pushObjectToZone', object: 'token-1', zone: 'home' },
      { type: 'pushObjectToZone', object: 'token-2', zone: 'home' },
      { type: 'pushObjectToZone', object: 'token-3', zone: 'home' },
      { type: 'reachZone', zone: 'home' },
    ],
    timeLimits: { twoStars: 40, threeStars: 30 },
    hints: [
      { level: 1, text: 'Three tokens stand ahead in a column. Home is the green zone on the right. Push each token into it.' },
      { level: 2, text: 'A straight push works: line up with a token and drive forward until it reaches home.' },
      { level: 3, text: 'Push the middle token 680 mm right, then reverse, go up 130, push, and down 130 for the last. Reverse after each.' },
    ],
    reference: [
      // Push token-1 (middle lane) right into home, back out.
      move(680, 50), { type: 'move', distanceMm: -544, speedPercent: 60 },
      // Up to token-2 lane, push right, back out.
      turn(-90), move(130, 60), turn(90), move(544, 60), { type: 'move', distanceMm: -544, speedPercent: 60 },
      // Down to token-3 lane, push right, and stay in home.
      turn(90), move(260, 60), turn(-90), move(544, 60),
    ],
  }),
];

export const worlds: WorldFile[] = [
  world({
    schemaVersion: 1,
    id: 'basics',
    title: 'World 1: Basics',
    description: 'Straight lines, turns, and clean stops. Learn how far the robot really travels.',
    missionIds: ['basics-1', 'basics-2', 'basics-3', 'basics-4'],
  }),
  world({
    schemaVersion: 1,
    id: 'conditions',
    title: 'World 2: Conditions',
    description: 'Colours and sensors decide what happens next. Read the field before you move.',
    missionIds: ['conditions-1', 'conditions-2', 'conditions-3'],
  }),
  world({
    schemaVersion: 1,
    id: 'loops',
    title: 'World 3: Loops',
    description: 'Repeat moves to collect and deliver. Let the loop do the boring work.',
    missionIds: ['loops-1', 'loops-2'],
  }),
];

export const missionsById: Record<string, MissionFile> = Object.fromEntries(
  [...missions, ...challengeMissions].map((item) => [item.id, item]),
);

missions.push(...challengeMissions);
for (const world of worlds) world.missionIds.push(...challengeMissions.filter(mission => mission.worldId === world.id).map(mission => mission.id));
worlds.push(...challengeWorlds);

export const missionWorldMap = (mission: MissionFile): MapFile =>
  allMaps[mission.mapId ?? (mission.worldId === 'basics' || mission.worldId === 'conditions' || mission.worldId === 'loops'
    ? missionWorldMapId(mission)
    : mission.worldId)] ?? mapFiles['open-floor'];

function missionWorldMapId(mission: MissionFile): string {
  switch (mission.worldId) {
    case 'basics':
      return 'basics-field';
    case 'conditions':
      return 'conditions-field';
    case 'loops':
      return 'loops-field';
    default:
      return 'open-floor';
  }
}
