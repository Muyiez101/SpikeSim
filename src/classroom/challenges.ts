import { z } from 'zod';
import { fromCommands, supportedBlocks, visualProgramSchema, type BlockState, type VisualProgram } from '../editor/program';
import { liveDefinitions } from '../editor/live-blocks';
import { missionsById, missionWorldMap } from '../missions/content';
import { robotPresets } from '../sim/presets';
import { en } from '../shared/strings/en';
import { arenaPoseSchema } from './arenas3d';

// Each offered field has a reference that passes the deterministic goal checks.
export const challengeIds = ['basics-2','basics-4','loops-1','champions-2','champions-3'] as const;
export const challengeIdSchema = z.enum(challengeIds);
export type ChallengeId = z.infer<typeof challengeIdSchema>;
export const challengeCatalog = challengeIds.map(id=>missionsById[id]);
export function challengeEquipment(id: ChallengeId) {
  const mission=missionsById[id];return { mission,map:missionWorldMap(mission),robot:robotPresets[mission.robotPreset] };
}
export const soloBlockTypes=supportedBlocks;
export const planarBlockTypes=supportedBlocks.filter(type=>!liveDefinitions.some(definition=>definition.type===type));
export function validateSoloProgram(input: unknown):VisualProgram {
  const program=visualProgramSchema.parse(input);
  if(program.blocks.blocks.filter(b=>b.type==='spike_start'&&b.enabled!==false).length!==1)throw Error(en.sumo.errors.start);
  const walk=(block:BlockState)=>{
    if(!soloBlockTypes.includes(block.type))throw Error(en.classroom.soloUnsupported);
    Object.values(block.inputs??{}).forEach(input=>{if(input.block)walk(input.block);if(input.shadow)walk(input.shadow);});
    if(block.next?.block)walk(block.next.block);
  };
  program.blocks.blocks.forEach(block=>{if(!['spike_start','procedures_defnoreturn'].includes(block.type))throw Error(en.sumo.errors.stacks);walk(block);});
  return program;
}
export const soloStarter=()=>fromCommands([]);
export const soloFrameSchema=z.object({time:z.number().finite().min(0).max(601),robot:z.object({x:z.number().finite(),y:z.number().finite(),heading:z.number().finite()}),objects:z.array(z.object({id:z.string(),x:z.number().finite(),y:z.number().finite(),heading:z.number().finite()})).max(50),pose:arenaPoseSchema.optional(),running:z.boolean().optional(),awaitingConfirmation:z.boolean().optional()});
export type SoloFrame=z.infer<typeof soloFrameSchema>;
export const soloVerdictSchema=z.object({completed:z.boolean(),goals:z.array(z.object({label:z.string(),passed:z.boolean()})).max(20),seconds:z.number().finite().min(0).max(601),error:z.string().nullable()});
export const soloMessageSchema=z.object({frame:soloFrameSchema,finished:z.boolean(),verdict:soloVerdictSchema.optional()});
export const attemptSchema=z.object({id:z.string().uuid(),round:z.number().int(),entryId:z.string().uuid(),entryName:z.string().max(48),revision:z.number().int(),program:visualProgramSchema,challenge:challengeIdSchema,seconds:z.number().int().min(10).max(600),startedAt:z.number()});
export const attemptResultSchema=attemptSchema.extend({finishedAt:z.number(),void:z.boolean(),frame:soloFrameSchema,verdict:soloVerdictSchema});
export type AttemptResult=z.infer<typeof attemptResultSchema>;
export function initialSoloFrame(id:ChallengeId):SoloFrame {const {map}=challengeEquipment(id);return {time:0,robot:{...map.spawn,heading:map.spawn.heading*Math.PI/180},objects:map.objects.map(o=>({id:o.id,x:o.x,y:o.y,heading:0}))};}
export const soloStandingSchema=z.object({entryId:z.string(),name:z.string(),rank:z.number(),attempts:z.number(),completed:z.boolean(),goals:z.number(),total:z.number(),seconds:z.number().nullable()});
export function soloStandings(entries:{id:string;name:string}[],results:AttemptResult[]) {
  const metric=(r:AttemptResult)=>({completed:r.verdict.completed,goals:r.verdict.goals.filter(g=>g.passed).length,seconds:r.verdict.seconds});
  const compare=(a:ReturnType<typeof metric>,b:ReturnType<typeof metric>)=>Number(b.completed)-Number(a.completed)||b.goals-a.goals||(a.completed&&b.completed?a.seconds-b.seconds:0);
  const rows=entries.map(entry=>{const attempts=results.filter(r=>r.entryId===entry.id&&!r.void),best=attempts.slice().sort((a,b)=>compare(metric(a),metric(b)))[0];return {entryId:entry.id,name:entry.name,rank:0,attempts:attempts.length,completed:best?.verdict.completed??false,goals:best?.verdict.goals.filter(g=>g.passed).length??0,total:best?.verdict.goals.length??0,seconds:best?.verdict.completed?best.verdict.seconds:null};}).sort((a,b)=>compare({...a,seconds:a.seconds??0},{...b,seconds:b.seconds??0})||a.name.localeCompare(b.name));
  rows.forEach((row,i)=>{const prev=rows[i-1];row.rank=prev&&row.completed===prev.completed&&row.goals===prev.goals&&row.seconds===prev.seconds?prev.rank:i+1;});
  return rows;
}
