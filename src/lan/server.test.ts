// @vitest-environment node
import {beforeAll,afterEach,describe,it,expect} from 'vitest';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {startLanServer,localJoinUrl} from './server';
import {fromCommands} from '../editor/program';
import type {RoomView,Seat} from './protocol';
let host:Awaited<ReturnType<typeof startLanServer>>;
beforeAll(async()=>{
  await mkdir('.local/lan-tests',{recursive:true});await writeFile('.local/lan-tests/index.html','<!doctype html><title>Sumo test</title>');
  await mkdir('.local/lan-tests/gears',{recursive:true});
  await mkdir('.local/lan-tests/learn',{recursive:true});
  await writeFile('.local/lan-tests/gears/student.html','<!doctype html><title>Simulator fixture</title>');
  await writeFile('.local/lan-tests/learn/example.mp4','media fixture');
  await writeFile('.local/lan-tests/learn/example.vtt','WEBVTT\n\n00:00.000 --> 00:01.000\nWatch the robot.\n');
  await promisify(execFile)(process.execPath,['scripts/build-electron.mjs']);
},30000);
afterEach(async()=>{await host?.close();});
async function setup(disconnectMs=15000){host=await startLanServer({root:resolve('.local/lan-tests'),workerPath:resolve('dist-electron/match-worker.js'),bind:'127.0.0.1',discovery:false,disconnectMs});}
async function api(path:string,data?:unknown,seat?:Seat){return fetch(`${host.origin}/api/sumo${path}`,{method:data===undefined?'GET':'POST',headers:{...(data===undefined?{}:{'Content-Type':'application/json'}),...(seat?{Authorization:`Bearer ${seat.token}`}:{})},body:data===undefined?undefined:JSON.stringify(data)});}
async function seats(){const a=await(await api('/rooms',{name:'Ada'})).json() as Seat,b=await(await api(`/rooms/${a.code}/join`,{name:'Ben'})).json() as Seat;return [a,b] as const;}
// These integration cases include a real worker launch and match polling.
describe('Wi-Fi room protocol',{timeout:15000},()=>{
  it('streams requested video ranges so students can seek without downloading the whole recording',async()=>{
    await setup();
    for(const [range,content,position] of [
      ['bytes=0-4','media','bytes 0-4/13'],
      ['bytes=6-','fixture','bytes 6-12/13'],
      ['bytes=-7','fixture','bytes 6-12/13'],
      ['bytes=6-99','fixture','bytes 6-12/13'],
    ]){
      const response=await fetch(host.origin+'/learn/example.mp4',{headers:{Range:range}});
      expect(response.status).toBe(206);expect(response.headers.get('content-range')).toBe(position);
      expect(response.headers.get('content-length')).toBe(String(content.length));expect(await response.text()).toBe(content);
    }
    for(const range of ['bytes=13-','bytes=4-2','bytes=-0','bytes=oops']){
      const response=await fetch(host.origin+'/learn/example.mp4',{headers:{Range:range}});
      expect(response.status).toBe(416);expect(response.headers.get('content-range')).toBe('bytes */13');
      expect(await response.text()).toBe('');
    }
  });
  it('serves lesson media and permits the simulator frame while keeping the app policy strict',async()=>{
    await setup();
    const app=await fetch(host.origin+'/');
    expect(app.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(app.headers.get('content-security-policy')).not.toContain("'unsafe-eval'");
    const simulator=await fetch(host.origin+'/gears/student.html');
    expect(simulator.status).toBe(200);
    expect(simulator.headers.get('content-security-policy')).toContain("frame-ancestors 'self'");
    expect(simulator.headers.get('content-security-policy')).toContain("'unsafe-eval'");
    const video=await fetch(host.origin+'/learn/example.mp4');
    expect(video.headers.get('content-type')).toBe('video/mp4');
    expect(await video.text()).toBe('media fixture');
    const captions=await fetch(host.origin+'/learn/example.vtt',{method:'HEAD'});
    expect(captions.headers.get('content-type')).toBe('text/vtt');
    expect(await captions.text()).toBe('');
  });
  it('validates invitations, capacity and private tokens',async()=>{
    await setup();const [a,b]=await seats();expect(a.code).toMatch(/^[A-Z2-9]{6}$/);expect(a.token).not.toBe(b.token);
    expect((await api(`/rooms/${a.code}`)).status).toBe(401);
    expect((await api(`/rooms/${a.code}/join`,{name:'Third'})).status).toBe(409);
    expect((await api(`/rooms/AAAAAA/join`,{})).status).toBe(404);
    const view=await(await api(`/rooms/${a.code}`,undefined,b)).json();expect(view.players).toHaveLength(2);expect(JSON.stringify(view)).not.toContain(a.token);expect(JSON.stringify(view)).not.toContain('program');
  });
  it('requires two ready programs, prevents guest control and rematches with fresh readiness',async()=>{
    await setup();const [a,b]=await seats(),base=`/rooms/${a.code}`;
    expect((await api(`${base}/start`,{},a)).status).toBe(409);
    expect((await api(`${base}/start`,{},b)).status).toBe(403);
    expect((await api(`${base}/ready`,{program:fromCommands([{type:'matrix',image:'check'}])},b)).status).toBe(400);
    for(const seat of [a,b])expect((await api(`${base}/ready`,{program:fromCommands([{type:'wait',durationMs:3000}])},seat)).ok).toBe(true);
    expect((await api(`${base}/start`,{},a)).ok).toBe(true);
    expect((await api(`${base}/ready`,{ready:false},b)).status).toBe(409);
    await expect.poll(async()=>((await(await api(base,undefined,a)).json()) as RoomView).frame.time,{timeout:4000}).toBeGreaterThan(0);
    await api(`${base}/stop`,{},a);const second=await(await api(base,undefined,b)).json() as RoomView;expect(second.frame.reason).toBe('cancelled');
    await api(`${base}/rematch`,{},a);const next=await(await api(base,undefined,b)).json() as RoomView;expect(next.phase).toBe('lobby');expect(next.players.every(p=>!p.ready)).toBe(true);expect(next.frame.time).toBe(0);
  });
  it('a disconnect ends the shared match and host close revokes the invitation',async()=>{
    await setup(500);const [a,b]=await seats(),base=`/rooms/${a.code}`;
    for(const seat of [a,b])await api(`${base}/ready`,{program:fromCommands([{type:'wait',durationMs:3000}])},seat);
    await api(`${base}/start`,{},a);
    const timer=setInterval(()=>{void api(base,undefined,a);},120);
    try{await new Promise(r=>setTimeout(r,1200));}finally{clearInterval(timer);}
    const result=await(await api(base,undefined,a)).json() as RoomView;expect(result.frame.reason).toBe('disconnect');expect(result.frame.winner).toBe(0);
    await api(`${base}/close`,{},a);expect((await api(`${base}/join`,{})).status).toBe(404);
  });
  it('blocks cross-origin writes, source files, traversal and oversized requests',async()=>{
    await setup();expect((await fetch(`${host.origin}/api/sumo/rooms`,{method:'POST',headers:{Origin:'https://example.com'},body:'{}'})).status).toBe(403);
    for(const path of ['/src/main.tsx','/.git/config','/%2e%2e%5cpackage.json'])expect((await fetch(host.origin+path)).status).toBe(404);
    expect((await api('/rooms',{name:'x'.repeat(160000)})).status).toBe(413);
    expect(()=>localJoinUrl('https://example.com')).toThrow();expect(()=>localJoinUrl('http://8.8.8.8:80')).toThrow();expect(localJoinUrl('http://192.168.1.2:41864/?sumo=ABCDEF')).toBe('http://192.168.1.2:41864');
  });
});
