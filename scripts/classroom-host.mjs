import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const {startLanServer}=require('../dist-electron/lan-server.js');
const host=await startLanServer({
  root:fileURLToPath(new URL('../dist',import.meta.url)),
  workerPath:fileURLToPath(new URL('../dist-electron/match-worker.js',import.meta.url)),
  competitionFile:process.env.SPIKESIM_CLASSROOM_FILE?resolve(process.env.SPIKESIM_CLASSROOM_FILE):fileURLToPath(new URL('../.local/classroom/sessions.json',import.meta.url)),
  port:Number(process.env.SPIKESIM_CLASSROOM_PORT)||41866,
});
console.log(`Open ${host.origin}/?competition=host to host a class. Keep this process open during competitions.`);
let closing=false;
const close=()=>{if(closing)return;closing=true;void host.close().then(()=>process.exit());};
process.once('SIGINT',close);process.once('SIGTERM',close);
