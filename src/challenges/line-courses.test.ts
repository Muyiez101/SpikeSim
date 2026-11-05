import { describe, it, expect } from 'vitest';
import * as Blockly from 'blockly/core';
import { registerBlocks } from '../editor/blocks';
import { generateGearsPython } from '../editor/gears-python';
import { visualProgramSchema } from '../editor/program';
import { lineCourseReferences, lineCourseProgram } from './line-courses';

describe('line course examples', () => {
  for (const reference of lineCourseReferences) it(`${reference.id} retains its connected sensor loop and stop after Blockly editing`, () => {
    registerBlocks(); const workspace = new Blockly.Workspace();
    try {
      const source = lineCourseProgram(reference.distanceCm);
      Blockly.serialization.workspaces.load(source, workspace);
      expect(workspace.getTopBlocks(false).map(block => block.type)).toEqual(['spike_start']);
      const saved = visualProgramSchema.parse(Blockly.serialization.workspaces.save(workspace));
      const python = generateGearsPython(saved);
      expect(python).toContain('sensors.reflection("D") - sensors.reflection("F")');
      expect(python).toContain('robot.motor_position("A") + robot.motor_position("B")');
      expect(python).toBe(generateGearsPython(source));
    } finally { workspace.dispose(); }
  });
});
