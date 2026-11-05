import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly/core';
import { registerBlocks, toolboxBlock } from './blocks';
import { fromCommands, supportedBlocks, visualProgramSchema, type BlockState } from './program';
import { generatePython } from './python';
import { exportProgramFile, parseProgramFile } from '../progress/program-file';
import { missions, missionWorldMap } from '../missions/content';
import { executeVisualProgram } from '../runtime/visual-runtime';
import { robotPresets } from '../sim/presets';
import { checkMission } from '../missions/engine';
import { en } from '../shared/strings/en';
import {isEvent} from './live-blocks';

describe('saved block programs', () => {
  it('accepts the full 300-block capacity and rejects an extra block', () => {
    const visual = fromCommands(Array.from({ length: 300 }, () => ({ type: 'wait' as const, durationMs: 1 })));
    expect(visualProgramSchema.safeParse(visual).success).toBe(true);
    const file = exportProgramFile('Long program', { missionId: null, steps: [], visualProgram: visual, outcome: null });
    expect(parseProgramFile(file.content, []).ok).toBe(true);
    visual.blocks.blocks.push({ type: 'spike_stop' });
    expect(visualProgramSchema.safeParse(visual).success).toBe(false);
  });
  it('rejects unsupported blocks, duplicate IDs and unsafe field keys', () => {
    expect(visualProgramSchema.safeParse({ blocks: { languageVersion: 0, blocks: [{ type: 'javascript' }] } }).success).toBe(false);
    const visual = fromCommands([]);
    visual.blocks.blocks.push({ type: 'spike_wait', id: 'program-start' });
    expect(visualProgramSchema.safeParse(visual).success).toBe(false);
    expect(visualProgramSchema.safeParse(JSON.parse('{"blocks":{"languageVersion":0,"blocks":[{"type":"spike_start","fields":{"__proto__":{}}}]}}')).success).toBe(false);
  });
  it('exports and restores nested visual programs', () => {
    const visual = fromCommands([{ type: 'move', distanceMm: 300, speedPercent: 60 }, { type: 'beep', frequency: 440, durationMs: 250 }]);
    const file = exportProgramFile('Robot dance', { missionId: null, steps: [], visualProgram: visual, outcome: null });
    const parsed = parseProgramFile(file.content, []);
    expect(parsed.ok && parsed.program.visualProgram).toEqual(visual);
  });
});

describe('block definitions and Python preview', () => {
  registerBlocks();
  it('provides teaching help for every supported block', () => {
    for (const type of supportedBlocks) expect(en.blocks.help).toHaveProperty(type);
  });
  it('loads every visual mission solution into Blockly and still earns three stars after saving', () => {
    for (const mission of missions.filter(mission => mission.visualReference)) {
      const workspace = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(mission.visualReference!, workspace);
        const visual = visualProgramSchema.parse(Blockly.serialization.workspaces.save(workspace));
        const map = missionWorldMap(mission);
        const execution = executeVisualProgram(visual, map, robotPresets[mission.robotPreset]);
        expect(execution.error, mission.id).toBeUndefined();
        expect(checkMission(mission, execution.result, map, execution).stars, mission.id).toBe(3);
      } finally { workspace.dispose(); }
    }
  },30000);
  for (const type of supportedBlocks) it(`${type} serializes and generates its Python`, () => {
    const workspace = new Blockly.Workspace();
    try {
      const created = Blockly.serialization.blocks.append(toolboxBlock(type), workspace);
      const saved = Blockly.serialization.blocks.save(created, { addCoordinates: true }) as BlockState;
      const visual = fromCommands([]);
      if (isEvent(type)) visual.blocks.blocks[0] = saved;
      else if (type === 'procedures_defnoreturn') visual.blocks.blocks.push(saved);
      else if (created.outputConnection) visual.blocks.blocks[0].next = { block: { type: 'spike_print', inputs: { VALUE: { block: saved } } } };
      else visual.blocks.blocks[0].next = { block: saved };
      expect(visualProgramSchema.safeParse(visual).success).toBe(true);
      const source = generatePython(visual).map(line => line.text).join('\n');
      expect(source).not.toContain('undefined');
      expect(source).toMatchSnapshot();
    } finally { workspace.dispose(); }
  });
  it('escapes text and renames Python keywords and duplicate names', () => {
    const visual = fromCommands([]);
    visual.variables = [{ id: 'one', name: 'for' }, { id: 'two', name: 'for' }];
    const code = generatePython(visual).map(line => line.text).join('\n');
    expect(code).toContain('for_2 = 0'); expect(code).toContain('for_3 = 0');
    expect(code).toContain('global for_2, for_3');
  });
});
