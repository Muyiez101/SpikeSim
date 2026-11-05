import { parentPort, workerData } from 'node:worker_threads';
import { type SoloFrame } from './challenges';
import { runSoloAttempt } from './solo-run';

const {snapshots,verdict}=runSoloAttempt(workerData);
let index=0;
const started=performance.now();
const timer=setInterval(()=>{
  const elapsed=(performance.now()-started)/1000;
  while(index+1<snapshots.length&&snapshots[index+1].t<=elapsed)index++;
  const snapshot=snapshots[index];
  const frame:SoloFrame={time:snapshot.t,robot:{x:snapshot.robot.x,y:snapshot.robot.y,heading:snapshot.robot.heading},objects:snapshot.objects};
  const finished=index===snapshots.length-1;
  parentPort?.postMessage({frame,finished,...(finished?{verdict}:{})});
  if(finished){clearInterval(timer);parentPort?.close();}
},50);
