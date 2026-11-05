import {describe,it,expect} from 'vitest';
import {measureRoute,turnAngle} from './measurement';
describe('mat measurements in centimetres',()=>{
  it('measures planar distance, signed turns and wheel rotations',()=>{
    const route=measureRoute([{x:0,y:0},{x:30,y:40},{x:30,y:60}],0,5.6);
    expect(route.total).toBe(70);expect(route.segments[0].distance).toBe(50);
    expect(route.segments[0].bearing).toBeCloseTo(36.8699,3);
    expect(route.segments[1].turn).toBeCloseTo(-36.8699,3);
    expect(route.segments[0].wheelDegrees).toBeCloseTo(50/(Math.PI*5.6)*360);
  });
  it('handles backwards routes, wraparound and repeated points',()=>{
    expect(turnAngle(350)).toBe(-10);expect(turnAngle(-350)).toBe(10);
    const route=measureRoute([{x:0,y:10},{x:0,y:0},{x:0,y:0}],180);
    expect(route.total).toBe(10);expect(route.segments.map(s=>s.turn)).toEqual([0,0]);
  });
});
