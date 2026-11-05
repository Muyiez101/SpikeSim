import { mapSchema, type MapFile } from './schemas';

export const bounds = (width: number, height: number) => [
  { points: [[0, 0], [width, 0]] as [number, number][], thickness: 20, height: 80 },
  { points: [[width, 0], [width, height]] as [number, number][], thickness: 20, height: 80 },
  { points: [[width, height], [0, height]] as [number, number][], thickness: 20, height: 80 },
  { points: [[0, height], [0, 0]] as [number, number][], thickness: 20, height: 80 },
];

export const mapFiles: Record<string, MapFile> = {
  'open-floor': mapSchema.parse({ schemaVersion: 1, id: 'open-floor', size: { width: 1000, height: 600 }, surface: { base: '#ffffff', layers: [] }, walls: bounds(1000, 600), objects: [], zones: [{ id: 'finish', shape: 'rect', x: 780, y: 220, w: 160, h: 160, tags: ['finish'], color: '#b9e769', label: 'Finish' }], friction: [], spawn: { x: 140, y: 300, heading: 0 } }),
  'line-track': mapSchema.parse({ schemaVersion: 1, id: 'line-track', size: { width: 1000, height: 600 }, surface: { base: '#ffffff', layers: [{ type: 'line', points: [[100, 300], [300, 300], [420, 180], [650, 180], [850, 350]], width: 38, color: '#111827' }] }, walls: bounds(1000, 600), objects: [], zones: [{ id: 'line-finish', shape: 'rect', x: 800, y: 300, w: 140, h: 100, tags: ['finish'], color: '#b9e769', label: 'Finish' }], friction: [], spawn: { x: 140, y: 300, heading: 0 } }),
  'maze': mapSchema.parse({ schemaVersion: 1, id: 'maze', size: { width: 1000, height: 600 }, surface: { base: '#ffffff', layers: [] }, walls: [...bounds(1000, 600), { points: [[260, 0], [260, 410]] as [number, number][], thickness: 18, height: 80 }, { points: [[260, 410], [700, 410]] as [number, number][], thickness: 18, height: 80 }, { points: [[700, 190], [700, 410]] as [number, number][], thickness: 18, height: 80 }, { points: [[480, 190], [700, 190]] as [number, number][], thickness: 18, height: 80 }], objects: [], zones: [{ id: 'maze-exit', shape: 'rect', x: 820, y: 60, w: 120, h: 120, tags: ['finish'], color: '#b9e769', label: 'Exit' }], friction: [], spawn: { x: 120, y: 520, heading: 0 } }),
  arena: mapSchema.parse({ schemaVersion: 1, id: 'arena', size: { width: 900, height: 900 }, surface: { base: '#f4f0e8', layers: [] }, walls: bounds(900, 900), objects: [{ id: 'box-1', kind: 'box', x: 450, y: 300, size: 70, mass: 250, color: '#ff8e80', tags: ['target'] }, { id: 'box-2', kind: 'box', x: 450, y: 600, size: 70, mass: 250, color: '#7bc9f4', tags: ['target'] }], zones: [{ id: 'arena', shape: 'circle', x: 450, y: 450, r: 300, tags: ['ring'], color: '#ffffff', label: 'Arena' }], friction: [], spawn: { x: 450, y: 450, heading: 0 } }),
};

export const defaultMap = mapFiles['open-floor'];
