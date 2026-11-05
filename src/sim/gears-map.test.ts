import { expect, it } from 'vitest';
import { toGearsWorld } from './gears-map';
import { mapFiles } from './maps';

it('converts millimetres to centimetres and rotates walls around the vertical axis', () => {
  const world=toGearsWorld(mapFiles['open-floor']);
  expect(world.options.startPosXYZ).toEqual([-36,0,0]);
  expect(world.options.startRot).toBe(90);
  expect(world.options.objects[1]).toMatchObject({position:[50,0,4],size:[60,2,8],rotation:[0,90,0],physicsOptions:'fixed'});
});
it('retains the object IDs used by mission scoring', () => {
  const world=toGearsWorld(mapFiles.arena);
  expect(world.objectIndices).toEqual([{id:'box-1',index:4,kind:'box'},{id:'box-2',index:5,kind:'box'}]);
});
