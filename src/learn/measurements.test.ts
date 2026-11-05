// @vitest-environment node
import { it, expect } from 'vitest';
import { wheelEstimate, shorterTurn } from './measurements';
import { lessonExperiment } from './catalog';
import { executeVisualProgram } from '../runtime/visual-runtime';
it('keeps units consistent, including the zero journey and invalid input', () => {
  const value = wheelEstimate(30, 5.6)!;
  expect(value.millimetres).toBe(300);
  expect(value.metres).toBe(0.3);
  expect(value.rotations * value.circumference).toBeCloseTo(30);
  expect(value.degrees).toBeCloseTo(value.rotations * 360);
  expect(wheelEstimate(30, 8)!.rotations).toBeLessThan(value.rotations);
  expect(wheelEstimate(0, 5.6)!.degrees).toBe(0);
  expect(wheelEstimate(30, 0)).toBeNull();
  expect(wheelEstimate(NaN, 5.6)).toBeNull();
  expect(wheelEstimate(-1, 5.6)).toBeNull();
});
it('explains shorter turns across the signed angle boundary', () => {
  expect(shorterTurn(70, 90)).toBe(20);
  expect(shorterTurn(170, -170)).toBe(20);
  expect(shorterTurn(-170, 170)).toBe(-20);
  expect(shorterTurn(0, 360)).toBe(0);
});
it('the gyro My Block uses its input and a second identical target does not add a quarter turn', () => {
  const setup = lessonExperiment('gyroturn');
  for (const target of [45, 90]) {
    const p = structuredClone(setup.program),
      call = p.blocks.blocks[0].next!.block!;
    call.inputs!.ARG0.shadow!.fields!.NUM = target;
    call.next = { block: structuredClone(call) };
    call.next.block!.id = 'second-call';
    call.next.block!.inputs!.ARG0.shadow!.id = 'second-input';
    const result = executeVisualProgram(p, setup.map, setup.robot);
    expect(result.error).toBeUndefined();
    expect((result.result.end.robot.heading * 180) / Math.PI).toBeCloseTo(target, 0);
  }
});
