import {parentPort,workerData} from 'node:worker_threads';
import {SumoMatch} from './match';
import type {VisualProgram} from '../editor/program';
const match=Array.isArray(workerData)
  ?new SumoMatch(workerData as [VisualProgram,VisualProgram])
  :new SumoMatch(workerData.programs,workerData.rules);
let tick=0;
const timer=setInterval(()=>{
  const frame=match.step();
  if(++tick%3===0||frame.finished)parentPort?.postMessage(frame);
  if(frame.finished)clearInterval(timer);
},1000/60);
