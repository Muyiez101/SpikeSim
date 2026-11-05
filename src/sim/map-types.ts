import type { MapFile as ZodMapFile, RobotDesign as ZodRobotDesign } from './schemas';

export type Zone = ZodMapFile['zones'][number];
export type MapObject = ZodMapFile['objects'][number];
export type MapFile = ZodMapFile;
export type RobotDesign = ZodRobotDesign;
