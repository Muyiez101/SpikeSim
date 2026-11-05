import { z } from 'zod';
import competitionFields from './gears-missions.json' with {type:'json'};
import practiceWorlds from './gears-worlds.json' with {type:'json'};
import templates from './gears-robots.json' with {type:'json'};
import { robotSchema, type RobotDesign } from './schemas';
import { robotPresets } from './presets';
import { en } from '../shared/strings/en';

export { competitionFields, practiceWorlds };
const scenes = new Set(['', 'custom', ...competitionFields.map(field => field.file), ...practiceWorlds.map(world => world.id)]);
export const sceneSchema = z.string().refine(scene => scenes.has(scene), 'Choose a bundled world');
export const robotTemplateSchema = z.string().refine(id => id==='custom'||templates.some(template => template.id === id), 'Choose a bundled robot');
export const sceneTitle = (scene: string) => competitionFields.find(field => field.file === scene)?.name ?? practiceWorlds.find(world => world.id === scene)?.name;

/** Six student ports. The hub gyro remains available through the heading blocks. */
export function templateRobot(id: string): RobotDesign {
  if (id === 'singleFollower') return robotPresets['driving-base'];
  const template = templates.find(item => item.id === id);
  if (!template) throw new Error('Unknown robot template');
  const ports = ['C', 'F', 'E', 'D'] as const;
  const actuators = template.components.filter(component => component.type.endsWith('Actuator')).slice(0, 4);
  const motors: RobotDesign['motors'] = [
    ...robotPresets['driving-base'].motors,
    ...actuators.map((component, index) => ({port: ports[index], side: component.type === 'ArmActuator' ? 'arm' as const : 'other' as const, maxSpeed: 800, maxTorque: 0.18})),
  ];
  const available = ['D', 'E', 'F', 'C'].filter(port => !motors.some(motor => motor.port === port));
  const types: Record<string, RobotDesign['devices'][number]['type']> = {ColorSensor: 'color', UltrasonicSensor: 'distance', LaserRangeSensor: 'distance', TouchSensor: 'force', GyroSensor: 'gyro'};
  // The hub gyro uses no external port. Keep both colour sensors on a line follower.
  const sensors = template.components.filter(component => types[component.type]&&component.type!=='GyroSensor');
  // Keep one of each sensor type before assigning spare ports to duplicates.
  const primary = sensors.filter((sensor, index) => sensors.findIndex(item => types[item.type] === types[sensor.type]) === index);
  const ordered = [...primary, ...sensors.filter(sensor => !primary.includes(sensor))];
  return robotSchema.parse({
    ...robotPresets['driving-base'], id: `gears-${id}`, name: en.unified.robots.find(([key]) => key === id)?.[1] ?? id,
    width: template.width * 10, length: template.length * 10,
    wheelDiameter: template.wheelDiameter * 10, trackWidth: template.trackWidth * 10, motors,
    devices: ordered.slice(0, available.length).map((component, index) => ({
      type: types[component.type], port: available[index], x: component.position[2] * 10, y: component.position[0] * 10,
      heading: (component.rotation?.[1] ?? 0) * 180 / Math.PI,
    })),
  });
}
