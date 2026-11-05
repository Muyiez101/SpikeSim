import { deflateRawSync } from 'node:zlib';
import { crc32 } from '../../src/progress/zip-reader';

export function makeZip(files: Record<string, Uint8Array | string>, compressed = true): Buffer {
  const locals: Buffer[] = [], directory: Buffer[] = []; let offset = 0;
  for (const [name, input] of Object.entries(files)) {
    const filename = Buffer.from(name), data = Buffer.from(input), payload = compressed ? deflateRawSync(data) : data;
    const local = Buffer.alloc(30), central = Buffer.alloc(46), checksum = crc32(data);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20,4); local.writeUInt16LE(compressed ? 8 : 0,8);
    local.writeUInt32LE(checksum,14); local.writeUInt32LE(payload.length,18); local.writeUInt32LE(data.length,22); local.writeUInt16LE(filename.length,26);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6); central.writeUInt16LE(compressed ? 8 : 0,10);
    central.writeUInt32LE(checksum,16); central.writeUInt32LE(payload.length,20); central.writeUInt32LE(data.length,24); central.writeUInt16LE(filename.length,28); central.writeUInt32LE(offset,42);
    locals.push(local,filename,payload); directory.push(central,filename); offset += local.length + filename.length + payload.length;
  }
  const central = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(directory.length / 2,8); end.writeUInt16LE(directory.length / 2,10); end.writeUInt32LE(central.length,12); end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,central,end]);
}

// Original synthetic graph with SPIKE selectors, including the real saved spelling of "back".
export function spikeProject() {
  const selector = (opcode: string,value: string) => ({opcode,shadow:true,fields:{VALUE:[value,null]}});
  return {targets:[{blocks:{
    start:{opcode:'flipperevents_whenProgramStarts',topLevel:true,x:40,y:40,next:'pair'},
    pair:{opcode:'flippermove_setMovementPair',inputs:{PAIR:[1,'pairValue']},next:'wheel'},
    pairValue:selector('flippermove_movement-port-selector','CD'),
    wheel:{opcode:'flippermove_setDistance',inputs:{DISTANCE:[1,[4,'17.5']]},fields:{UNIT:['cm',null]},next:'move'},
    move:{opcode:'flippermove_move',inputs:{DIRECTION:[1,'direction'],VALUE:[1,[4,'10']]},fields:{UNIT:['cm',null]},next:'steer'},
    direction:selector('flippermove_custom-icon-direction','back'),
    steer:{opcode:'flippermove_steer',inputs:{STEERING:[1,'steering'],VALUE:[1,[4,'0.25']]},fields:{UNIT:['rotations',null]}},
    steering:selector('flippermove_rotation-wheel','left: -90'),
  },variables:{}}]};
}
export function spikeArchive(project: unknown = spikeProject(), type = 'word-blocks') {
  return makeZip({'manifest.json':JSON.stringify({name:'Synthetic SPIKE route',type}), 'scratch.sb3':makeZip({'project.json':JSON.stringify(project)})});
}
