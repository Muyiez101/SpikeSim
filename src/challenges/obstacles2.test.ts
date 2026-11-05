import {describe,it,expect} from 'vitest';
import * as Blockly from 'blockly/core';
import {registerBlocks} from '../editor/blocks';
import {generateGearsPython} from '../editor/gears-python';
import {visualProgramSchema} from '../editor/program';
import {obstacleProgram,obstacleDesign} from './obstacles2';

describe('Obstacle 2 example',()=>{
  it('retains every scan decision and its connected statements after loading into Blockly',()=>{
    registerBlocks();const workspace=new Blockly.Workspace();
    try{
      Blockly.serialization.workspaces.load(obstacleProgram,workspace);
      const saved=visualProgramSchema.parse(Blockly.serialization.workspaces.save(workspace));
      const python=generateGearsPython(saved);
      expect(workspace.getTopBlocks(false).map(block=>block.type).sort()).toEqual(['procedures_defnoreturn','spike_start']);
      expect(python.match(/if \(\(sensors.distance_cm\("E"\) > 0\) and/g)).toHaveLength(3);
      expect(python.match(/detour_side = 1/g)).toHaveLength(3);
      expect(python.match(/runloop.sleep\(0.15\)/g)).toHaveLength(3);
      expect(python).toContain('sensors.color("D")');expect(python).toContain('sensors.color("F")');
    }finally{workspace.dispose();}
  });
  it('exposes both colour sensors and the forward range sensor without assigning an external gyro port',()=>{
    expect(obstacleDesign.devices.filter(device=>device.type==='color').map(device=>device.port)).toEqual(['D','F']);
    expect(obstacleDesign.devices.find(device=>device.type==='distance')?.port).toBe('E');
  });
});
