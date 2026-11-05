import type { MatchFrame } from './match';
import {z} from 'zod';
export type RoomView={code:string;phase:'lobby'|'running'|'finished';players:{name:string;ready:boolean;connected:boolean}[];frame:MatchFrame;round:number;links:string[]};
export const seatSchema=z.object({code:z.string().regex(/^[A-Z2-9]{6}$/),token:z.string().regex(/^[A-Za-z0-9_-]{32}$/),index:z.union([z.literal(0),z.literal(1)])});
export type Seat=z.infer<typeof seatSchema>;
