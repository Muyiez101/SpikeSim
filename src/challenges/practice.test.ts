// @vitest-environment node
import {describe,it,expect} from 'vitest';
import {practiceIds,practiceTasks,practiceWorld} from './practice';
import {challengeGuide,challengeScenes,customKit} from './catalog';
import {designRobot,customWorldSchema} from '../sim/custom-design';
import {templateRobot} from '../sim/gears-catalog';
import {fromCommands,visualProgramSchema} from '../editor/program';
describe('challenge equipment and practice packages',()=>{
  it('resolves equipment for every bundled challenge',()=>{
    for(const scene of challengeScenes){const {kit}=challengeGuide(scene),custom=customKit(kit);expect((custom?designRobot(custom):templateRobot(kit)).motors.length,scene).toBeGreaterThanOrEqual(2);}
  });
  it('validates each task, its motor ports and practice models on every FLL mat',()=>{
    for(const id of practiceIds){
      const task=practiceTasks[id],custom=customKit(task.kit),robot=custom?designRobot(custom):templateRobot(task.kit);
      for(const command of task.reference)if(command.type==='motor')expect(robot.motors.some(motor=>motor.port===command.port)).toBe(true);
      expect(visualProgramSchema.safeParse(fromCommands(task.reference)).success).toBe(true);
      for(let year=2018;year<=2025;year++){const world=practiceWorld(id,`worlds/missions/FLL/FLL${year}.json`);expect(customWorldSchema.safeParse(world).success).toBe(true);expect(world.options.imageURL).toBe(`textures/maps/FLL/FLL${year}.jpg`);}
    }
  });
});
