import RAPIER from '@dimforge/rapier2d-deterministic-compat';
import type { MapFile } from '../schemas';

export type RapierSimulation = {
  world: RAPIER.World;
  robot: RAPIER.RigidBody;
  dispose: () => void;
};

export async function createRapierSimulation(map: MapFile, robotWidth: number, robotLength: number, x: number, y: number): Promise<RapierSimulation> {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: 0 });
  for (const wall of map.walls) {
    for (let index = 1; index < wall.points.length; index += 1) {
      const [x1, y1] = wall.points[index - 1];
      const [x2, y2] = wall.points[index];
      const length = Math.hypot(x2 - x1, y2 - y1);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation((x1 + x2) / 2, (y1 + y2) / 2).setRotation(angle));
      world.createCollider(RAPIER.ColliderDesc.cuboid(length / 2, wall.thickness / 2), body);
    }
  }
  const robot = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y));
  world.createCollider(RAPIER.ColliderDesc.cuboid(robotLength / 2, robotWidth / 2), robot);
  return { world, robot, dispose: () => world.free() };
}
