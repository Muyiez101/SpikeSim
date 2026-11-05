import {describe,expect,it} from 'vitest';
import {executeVisualProgram} from './visual-runtime';
import {literal,type BlockState,type VisualProgram} from '../editor/program';
import {mapFiles} from '../sim/maps';
import {defaultRobot} from '../sim/presets';
const program=(blocks:BlockState[]):VisualProgram=>{
  const start:BlockState={type:'spike_start'}; let tail=start;
  for(const block of blocks){tail.next={block};tail=block;}
  return {blocks:{languageVersion:0,blocks:[start]}};
};
const run=(blocks:BlockState[])=>executeVisualProgram(program(blocks),mapFiles['open-floor'],defaultRobot);
describe('SPIKE continuous devices',()=>{
  it('advances moving motors while waiting for a live distance condition and stops before the obstacle',()=>{
    const result=run([
      {type:'spike_start_move',fields:{DIRECTION:'forward'}},
      {type:'spike_wait_until',inputs:{CONDITION:{block:{type:'spike_distance_compare',fields:{PORT:'E',OP:'LT'},inputs:{DISTANCE:literal(20)}}}}},
      {type:'spike_stop_move'},
      {type:'spike_wait',inputs:{TIME:literal(1)}},
    ]);
    expect(result.error).toBeUndefined();
    expect(Number(result.result.end.sensors.E)).toBeGreaterThan(150);
    expect(Number(result.result.end.sensors.E)).toBeLessThan(200);
    const finalFrames=result.result.snapshots.filter(s=>s.t>result.result.end.t-0.9);
    expect(new Set(finalFrames.map(s=>s.robot.x)).size).toBe(1);
  });
  it('keeps the other motor running when a single motor is stopped, and resets encoder readings',()=>{
    const result=run([
      {type:'spike_start_tank',inputs:{LEFT:literal(40),RIGHT:literal(40)}},
      {type:'spike_wait',inputs:{TIME:literal(0.2)}},
      {type:'spike_motor_stop',fields:{PORT:'A'}},
      {type:'spike_wait',inputs:{TIME:literal(0.2)}},
      {type:'spike_motor_reset',fields:{PORT:'B'},inputs:{POSITION:literal(12)}},
      {type:'spike_print',inputs:{VALUE:{block:{type:'spike_motor_position',fields:{PORT:'B'}}}}},
    ]);
    expect(result.error).toBeUndefined();
    expect(result.result.end.robot.wheels[1]).toBeGreaterThan(result.result.end.robot.wheels[0]);
    expect(result.output.at(-1)?.text).toBe('12');
  });
  it('produces a playable bounded Forever preview while ordinary infinite loops still fail',()=>{
    const result=run([{type:'spike_forever',inputs:{DO:{block:{type:'spike_wait',inputs:{TIME:literal(0.1)}}}}}]);
    expect(result.error).toBeUndefined();expect(result.limitedPreview).toBe(true);
    expect(result.result.end.t).toBeGreaterThanOrEqual(30);expect(result.result.end.t).toBeLessThan(31);
  });
  it('records distance-sensor light values at their actual replay times',()=>{
    const result=run([{type:'spike_distance_lights',fields:{PORT:'E'},inputs:{L0:literal(0),L1:literal(25),L2:literal(50),L3:literal(100)}},{type:'spike_wait',inputs:{TIME:literal(0.1)}}]);
    expect(result.error).toBeUndefined();
    expect(result.result.snapshots[0].hub.distanceLights).toBeUndefined();
    expect(result.result.end.hub.distanceLights?.E).toEqual([0,25,50,100]);
  });
});
