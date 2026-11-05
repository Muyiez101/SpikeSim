import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {startLanServer}=require('../dist-electron/lan-server.js');
const host=await startLanServer({root:fileURLToPath(new URL('../dist',import.meta.url)),workerPath:fileURLToPath(new URL('../dist-electron/match-worker.js',import.meta.url)),port:Number(process.env.SPIKESIM_SUMO_PORT)||41864});
console.log(`Open ${host.origin}/?sumo=host to create a room. Keep this process open during matches.`);
process.on('SIGINT',()=>{void host.close().then(()=>process.exit());});
