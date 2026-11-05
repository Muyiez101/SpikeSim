import { describe, expect, it } from 'vitest';
import { LiveRun } from './live-run';
import { fromCommands } from '../editor/program';
import { mapFiles } from '../sim/maps';
import { DeterministicSimulator } from '../sim/engine';
import { robotPresets } from '../sim/presets';

describe('observed 3D mission runs', () => {
  it('records real zone entries, output, devices and final object positions', () => {
    const map = mapFiles['open-floor'];
    const zone = {id:'target',shape:'rect' as const,x:400,y:200,w:100,h:100,tags:['finish']};
    const field = {...map,zones:[zone]};
    const run = new LiveRun(field,fromCommands([]));
    const initial = new DeterministicSimulator({map:field,robot:robotPresets['driving-base']}).snapshot();
    run.frame({...initial,t:0,robot:{...initial.robot,x:0,y:0}});
    expect(run.events).toEqual([]);
    run.frame({...initial,t:1,robot:{...initial.robot,x:400,y:200},objects:[{id:'crate',x:400,y:200,heading:0}]});
    run.output.push({t:1,text:'arrived'});run.variables.total=3;
    const result = run.finish()!;
    expect(result.result.events).toEqual([{type:'zoneEnter',data:{zone:'target',tags:['finish']}}]);
    expect(result.result.end.objects[0].id).toBe('crate');
    expect(result.variables).toEqual({total:3});expect(result.output[0].text).toBe('arrived');
  });
  it('does not award unexecuted branches and does not invent an empty run', () => {
    const program = fromCommands([]);
    program.blocks.blocks[0].next={block:{type:'controls_if',id:'branch',inputs:{DO2:{block:{type:'spike_move',id:'unused'}}}}};
    const run = new LiveRun(mapFiles['open-floor'],program);
    run.mark('branch');expect([...run.usedBlocks]).toEqual(['controls_if']);
    expect(run.finish()).toBeNull();run.mark('unused');expect(run.usedBlocks.has('spike_move')).toBe(true);
  });
});
