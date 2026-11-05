import {describe,it,expect} from 'vitest';
import * as Blockly from 'blockly/core';
import {registerBlocks,toolboxBlock} from './blocks';
import {visualProgramSchema} from './program';
import {generatePython} from './python';
registerBlocks();
describe('SPIKE-style condition connections',()=>{
  for(const type of ['controls_if','controls_whileUntil','spike_wait_until'])it(`colour condition connects inside ${type} and survives saving`,()=>{
    const workspace=new Blockly.Workspace();
    try{
      const start=workspace.newBlock('spike_start');
      const control=Blockly.serialization.blocks.append({...toolboxBlock(type),...(type==='controls_if'?{extraState:{hasElse:true}}:{})},workspace);
      const condition=Blockly.serialization.blocks.append(toolboxBlock('spike_color_is'),workspace);
      start.nextConnection!.connect(control.previousConnection!);
      const input=control.getInput(type==='controls_if'?'IF0':type==='controls_whileUntil'?'BOOL':'CONDITION')!;
      input.connection!.connect(condition.outputConnection!);
      if(type==='controls_if'){
        const yes=Blockly.serialization.blocks.append(toolboxBlock('spike_move'),workspace);
        const no=Blockly.serialization.blocks.append(toolboxBlock('spike_wait'),workspace);
        control.getInput('DO0')!.connection!.connect(yes.previousConnection!);
        control.getInput('ELSE')!.connection!.connect(no.previousConnection!);
      }
      const saved=visualProgramSchema.parse(Blockly.serialization.workspaces.save(workspace));
      workspace.clear();Blockly.serialization.workspaces.load(saved,workspace);
      const restored=workspace.getBlockById(control.id)!;
      expect(restored.getInputTargetBlock(input.name)?.type).toBe('spike_color_is');
      const python=generatePython(saved).map(line=>line.text).join('\n');
      expect(python).toContain('sensors.color("D")');
      if(type==='controls_if'){expect(python).toContain('else:');expect(python).toContain('robot.move_cm');}
    }finally{workspace.dispose();}
  });
});
