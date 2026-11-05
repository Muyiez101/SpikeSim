import {describe,expect,it} from 'vitest';
import {fromCommands} from './program';
import {generateGearsPython} from './gears-python';
describe('student blocks to 3D interpreter',()=>{
  it('generates synchronous simulator calls and reports completed variables',()=>{
    const program=fromCommands([{type:'move',distanceMm:300,speedPercent:60}]);program.variables=[{id:'v',name:'for'}];
    const source=generateGearsPython(program);expect(source).toContain('robot.move_cm(30, speed=60)');expect(source).not.toContain('await ');expect(source).toContain('runloop.report({"for": for_2})');
  });
  it('rejects source text disguised as a number or loop keyword',()=>{
    const program=fromCommands([]);program.blocks.blocks[0].next={block:{type:'math_number',fields:{NUM:'1; print("injected")'}}};expect(()=>generateGearsPython(program)).toThrow();
    program.blocks.blocks[0].next={block:{type:'controls_flow_statements',fields:{FLOW:'BREAK\nprint("injected")'}}};expect(()=>generateGearsPython(program)).toThrow();
  });
  it('preserves student text containing Python keywords',()=>{
    const program=fromCommands([]);program.blocks.blocks[0].next={block:{type:'spike_print',inputs:{VALUE:{block:{type:'text',fields:{TEXT:'await the robot; async def hello()'}}}}}};
    expect(generateGearsPython(program)).toContain('print("await the robot; async def hello()")');
  });
});
