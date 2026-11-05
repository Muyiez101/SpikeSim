import { executeVisualProgram } from './visual-runtime';
import type { VisualProgram } from '../editor/program';
import type { MapFile, RobotDesign } from '../sim/schemas';

self.onmessage = (event: MessageEvent<{ program: VisualProgram; map: MapFile; robot: RobotDesign; seed: number }>) => {
  self.postMessage({ type: 'ready' });
  try {
    const { program, map, robot, seed } = event.data;
    self.postMessage(executeVisualProgram(program, map, robot, seed));
  } catch {
    self.postMessage({ error: { code: 'unsupported' } });
  }
};
