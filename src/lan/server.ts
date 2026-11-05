import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {createSocket} from 'node:dgram';
import {networkInterfaces} from 'node:os';
import {randomBytes,randomInt} from 'node:crypto';
import {realpath,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import path from 'node:path';
import {Worker} from 'node:worker_threads';
import {validateMatchProgram} from './program';
import type {VisualProgram} from '../editor/program';
import type {MatchFrame} from './match';
import type {RoomView,Seat} from './protocol';
import {en} from '../shared/strings/en';
import {lanAssetPolicy} from '../shared/content-security';
import {CompetitionHost} from '../classroom/host';

const errors=en.sumo.errors;
export const discoveryPort=41863;
export function localIPv4(ip:string){return /^(127\.|10\.|192\.168\.|169\.254\.)/.test(ip)||/^172\.(1[6-9]|2\d|3[01])\./.test(ip);}
export function localAddresses(){return Object.values(networkInterfaces()).flatMap(entries=>entries??[]).filter(n=>n.family==='IPv4'&&!n.internal&&localIPv4(n.address)).map(n=>n.address);}
export function localJoinUrl(value:string){
  const url=new URL(value);
  if(url.protocol!=='http:'||!/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)||!localIPv4(url.hostname)||url.username||url.password||!url.port)throw Error(errors.notFound);
  return url.origin;
}
type Player={token:string;name:string;ready:boolean;program?:VisualProgram;seen:number};
type Room={code:string;players:Player[];phase:RoomView['phase'];frame:MatchFrame;round:number;touched:number;worker?:Worker};
const initialFrame=():MatchFrame=>({time:0,robots:[{x:0,y:-38,heading:0},{x:0,y:38,heading:180}],winner:null,reason:null,finished:false});
class RequestError extends Error {constructor(message:string,readonly status=400){super(message);}}
const token=()=>randomBytes(24).toString('base64url');
const cleanName=(name:unknown)=>typeof name==='string'&&name.trim()?name.trim().slice(0,32):en.sumo.nameDefault;
const mime:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm','.mp3':'audio/mpeg','.mp4':'video/mp4','.wav':'audio/wav','.vtt':'text/vtt','.xml':'text/xml','.txt':'text/plain','.md':'text/plain'};
async function body(req:IncomingMessage):Promise<Record<string,unknown>>{
  let size=0;const chunks:Buffer[]=[];
  for await(const chunk of req){size+=chunk.length;if(size>150_000)throw new RequestError(errors.request,413);chunks.push(chunk);}
  try{const data:unknown=JSON.parse(Buffer.concat(chunks).toString());if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data as Record<string,unknown>;}catch{throw new RequestError(errors.request);}
}

/** Serves only the built application. Room tokens and programs never appear in
 * public room views. Programs run in a bounded interpreter in a worker thread. */
export async function startLanServer(options:{root:string;workerPath:string;port?:number;bind?:string;discovery?:boolean;disconnectMs?:number;competitionFile?:string}){
  const root=await realpath(options.root);await stat(path.join(root,'index.html')).catch(()=>{throw Error(errors.assets);});
  const rooms=new Map<string,Room>(),rates=new Map<string,{start:number;count:number}>();
  const disconnectMs=options.disconnectMs??15000;
  let port=0;
  const classroom=await CompetitionHost.open({workerPath:options.workerPath,file:options.competitionFile,links:code=>localAddresses().map(ip=>`http://${ip}:${port}/?competition=${code}`)});
  const links=(code:string)=>localAddresses().map(ip=>`http://${ip}:${port}/?sumo=${code}`);
  const view=(room:Room):RoomView=>({code:room.code,phase:room.phase,round:room.round,frame:room.frame,players:room.players.map(p=>({name:p.name,ready:p.ready,connected:Date.now()-p.seen<disconnectMs})),links:links(room.code)});
  const stop=(room:Room,reason:'disconnect'|'cancelled',winner:number|null)=>{void room.worker?.terminate();room.worker=undefined;room.phase='finished';room.frame={...room.frame,finished:true,reason,winner};};
  const server=createServer((req,res)=>{void handle(req,res).catch(error=>{
    if(res.headersSent){res.destroy();return;}
    res.writeHead(error instanceof RequestError?error.status:400,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({error:error instanceof Error?error.message:errors.request}));
  });});
  server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=5000;
  function json(res:ServerResponse,value:unknown,status=200){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
  async function handle(req:IncomingMessage,res:ServerResponse){
    const host=req.headers.host??'',allowed=new Set(['127.0.0.1','localhost',...localAddresses()]);
    if(!allowed.has(host.split(':')[0])||host.split(':')[1]!==String(port))throw new RequestError(errors.request,403);
    if(req.headers.origin&&req.headers.origin!==`http://${host}`)throw new RequestError(errors.request,403);
    if(req.headers['sec-fetch-site']==='cross-site')throw new RequestError(errors.request,403);
    const url=new URL(req.url??'/',`http://${host}`);
    if(url.pathname.startsWith('/api/classroom'))return classroom.handle(req,res,url);
    if(url.pathname.startsWith('/api/sumo')){
      const ip=req.socket.remoteAddress??'',now=Date.now(),rate=rates.get(ip);
      if(!rate||now-rate.start>1000){if(rates.size>256)rates.clear();rates.set(ip,{start:now,count:1});}
      else if(++rate.count>40)throw new RequestError(errors.rate,429);
      if(req.method==='GET'&&url.pathname==='/api/sumo/info')return json(res,{available:true});
      const data=req.method==='POST'?await body(req):{};
      if(req.method==='POST'&&url.pathname==='/api/sumo/rooms'){
        if(rooms.size>=8)throw new RequestError(errors.full,409);
        const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code:string;
        do{code=Array.from({length:6},()=>alphabet[randomInt(alphabet.length)]).join('');}while(rooms.has(code));
        const player={token:token(),name:cleanName(data.name),ready:false,seen:now};
        rooms.set(code,{code,players:[player],phase:'lobby',frame:initialFrame(),round:0,touched:now});
        return json(res,{code,token:player.token,index:0} satisfies Seat,201);
      }
      const match=/^\/api\/sumo\/rooms\/([A-Z2-9]{6})(?:\/(join|ready|start|rematch|leave|close|stop))?$/.exec(url.pathname);
      if(!match)throw new RequestError(errors.notFound,404);
      const room=rooms.get(match[1]);if(!room)throw new RequestError(errors.expired,404);
      const action=match[2];
      if(req.method==='POST'&&action==='join'){
        if(room.players.length===2)throw new RequestError(errors.full,409);
        const player={token:token(),name:cleanName(data.name),ready:false,seen:now};room.players.push(player);room.touched=now;
        return json(res,{code:room.code,token:player.token,index:1} satisfies Seat);
      }
      const secret=req.headers.authorization?.replace(/^Bearer /,'');const index=room.players.findIndex(p=>p.token===secret);
      if(index<0)throw new RequestError(errors.expired,401);
      const player=room.players[index];player.seen=now;room.touched=now;
      if(req.method==='GET'&&!action)return json(res,view(room));
      if(req.method!=='POST')throw new RequestError(errors.request,405);
      if(['start','rematch','close','stop'].includes(action??'')&&index!==0)throw new RequestError(errors.owner,403);
      if(action==='ready'){
        if(room.phase==='running')throw new RequestError(errors.running,409);
        if(room.phase==='finished')throw new RequestError(errors.notReady,409);
        if(data.ready!==false){player.program=validateMatchProgram(data.program);player.ready=true;}else player.ready=false;
      }else if(action==='start'){
        if(room.phase!=='lobby'||room.players.length!==2||room.players.some(p=>!p.ready||!p.program||now-p.seen>=disconnectMs))throw new RequestError(errors.notReady,409);
        const worker=new Worker(options.workerPath,{workerData:room.players.map(p=>p.program),resourceLimits:{maxOldGenerationSizeMb:64,stackSizeMb:4}});
        room.worker=worker;room.phase='running';room.round++;room.frame=initialFrame();
        worker.on('message',(frame:MatchFrame)=>{if(room.worker!==worker)return;room.frame=frame;if(frame.finished){room.phase='finished';room.worker=undefined;void worker.terminate();}});
        worker.on('error',()=>{if(room.worker===worker)stop(room,'cancelled',null);});
        worker.on('exit',()=>{if(room.worker===worker)stop(room,'cancelled',null);});
      }else if(action==='rematch'){
        if(room.phase==='running')throw new RequestError(errors.running,409);
        room.phase='lobby';room.frame=initialFrame();room.players.forEach(p=>{p.ready=false;});
      }else if(action==='stop')stop(room,'cancelled',null);
      else if(action==='leave'||action==='close'){
        if(index===0){void room.worker?.terminate();rooms.delete(room.code);}
        else{if(room.phase==='running')stop(room,'disconnect',0);room.players.splice(1);room.players[0].ready=false;}
        return json(res,{closed:true});
      }else throw new RequestError(errors.request);
      return json(res,view(room));
    }
    if(req.method!=='GET'&&req.method!=='HEAD')throw new RequestError(errors.request,405);
    // Do not expose a source checkout, dotfiles, arbitrary paths or symlink targets.
    const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    if(relative.split(/[\\/]/).some(part=>part.startsWith('.'))||relative.includes('\\')||relative.includes('\0'))throw new RequestError(errors.notFound,404);
    const filename=await realpath(path.join(root,relative)).catch(()=>{throw new RequestError(errors.notFound,404);});
    if(!filename.startsWith(root+path.sep))throw new RequestError(errors.notFound,404);
    const info=await stat(filename);
    if(!info.isFile())throw new RequestError(errors.notFound,404);
    const assetPath = '/' + path.relative(root,filename).split(path.sep).join('/');
    const headers:Record<string,string|number>={'Content-Type':mime[path.extname(filename)]??'application/octet-stream','Content-Security-Policy':lanAssetPolicy(assetPath),'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
    let start=0,end=info.size-1,status=200;
    // Browsers seek in lesson videos by requesting a byte range. Stream the
    // selected bytes instead of reading each complete video into host memory.
    if(req.method==='GET'&&req.headers.range&&!req.headers['if-range']){
      const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      let valid=Boolean(range&&(range[1]||range[2]));
      if(range&&valid){
        if(range[1]){start=Number(range[1]);end=range[2]?Number(range[2]):end;}
        else{const suffix=Number(range[2]);valid=Number.isSafeInteger(suffix)&&suffix>0;start=Math.max(0,info.size-suffix);}
        valid=valid&&Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&start<info.size&&end>=start;
      }
      if(!valid){res.writeHead(416,{...headers,'Content-Range':`bytes */${info.size}`,'Content-Length':0}).end();return;}
      end=Math.min(end,info.size-1);status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=Math.max(0,end-start+1);
    res.writeHead(status,headers);
    if(req.method==='HEAD'||info.size===0){res.end();return;}
    await pipeline(createReadStream(filename,{start,end}),res);
  }
  try{await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(options.port??0,options.bind??'0.0.0.0',()=>{server.off('error',reject);resolve();});});}
  catch(error){await classroom.close();throw error;}
  port=(server.address() as {port:number}).port;
  const sweeper=setInterval(()=>{
    const now=Date.now();
    for(const room of rooms.values()){
      if(room.phase==='running'){
        const gone=room.players.map(p=>now-p.seen>=disconnectMs);
        if(gone.some(Boolean))stop(room,'disconnect',gone.every(Boolean)?null:gone[0]?1:0);
      }
      if(now-room.touched>30*60_000){void room.worker?.terminate();rooms.delete(room.code);}
    }
  },1000);
  const udp=options.discovery===false?undefined:createSocket({type:'udp4',reuseAddr:true});
  if(udp){udp.on('error',()=>{ /* Direct host links still work if discovery is blocked. */ });udp.on('message',(message,remote)=>{
    if(message.length>80||!localIPv4(remote.address))return;
    const query=/^SPIKESIM-SUMO ([A-Z2-9]{6})$/.exec(message.toString());if(!query||!rooms.has(query[1]))return;
    udp.send(Buffer.from(JSON.stringify({app:'spikesim-sumo',code:query[1],port})),remote.port,remote.address);
  });udp.bind(discoveryPort);}
  return {port,origin:`http://127.0.0.1:${port}`,close:async()=>{clearInterval(sweeper);await classroom.close();for(const room of rooms.values())void room.worker?.terminate();try{udp?.close();}catch{/* Already closed. */}server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}

export async function discoverRoom(code:string){
  if(!/^[A-Z2-9]{6}$/.test(code))throw Error(errors.notFound);
  const socket=createSocket('udp4');
  return new Promise<string>((resolve,reject)=>{
    let settled=false;
    const timer=setTimeout(()=>finish(undefined),2500);
    function finish(value:string|undefined){if(settled)return;settled=true;clearTimeout(timer);socket.close();if(value)resolve(value);else reject(Error(errors.notFound));}
    socket.on('error',()=>finish(undefined));socket.on('message',(buffer,remote)=>{
      if(buffer.length>200||!localIPv4(remote.address))return;
      try{const reply=JSON.parse(buffer.toString());if(reply.app==='spikesim-sumo'&&reply.code===code&&Number.isInteger(reply.port)&&reply.port>0&&reply.port<65536)finish(`http://${remote.address}:${reply.port}`);}catch{/* Ignore unrelated discovery packets. */}
    });
    socket.bind(()=>{socket.setBroadcast(true);const message=Buffer.from(`SPIKESIM-SUMO ${code}`);
      socket.send(message,discoveryPort,'127.0.0.1');socket.send(message,discoveryPort,'255.255.255.255');
      for(const entry of Object.values(networkInterfaces()).flatMap(a=>a??[]).filter(n=>n.family==='IPv4'&&!n.internal)){
        const address=entry.address.split('.').map(Number),mask=entry.netmask.split('.').map(Number);const broadcast=address.map((n,i)=>n|(255-mask[i])).join('.');socket.send(message,discoveryPort,broadcast);
      }
    });
  });
}
