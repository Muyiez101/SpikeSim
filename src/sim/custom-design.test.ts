// @vitest-environment node
import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {customRobotSchema,customWorldSchema,designRobot} from './custom-design';
import {exportProgramFile,parseProgramFile} from '../progress/program-file';
import fllOptions from './fll-robot.json';

const options=JSON.parse(readFileSync(new URL('../../public/gears/robots/spikesim-fll.json',import.meta.url),'utf8'));
describe('editable robot and ground designs',()=>{
  it('keeps the app robot definition aligned with the bundled simulator robot',()=>{
    expect(fllOptions).toEqual(options);
  });
  it('maps the FLL robot to drive motors, two attachments, and two sensors',()=>{
    const design=designRobot(customRobotSchema.parse({name:'FLL',options}));
    expect(design.motors.map(m=>m.port)).toEqual(['A','B','C','F']);
    expect(design.devices.map(d=>[d.port,d.type])).toEqual([['D','color'],['E','distance']]);
    const previous=structuredClone(design);previous.motors[0].port='C';previous.motors[1].port='D';previous.motors[2].port='A';previous.motors[3].port='B';previous.devices[0].port='E';previous.devices[1].port='F';
    expect(designRobot({name:'FLL',options},previous).motors.map(m=>m.port)).toEqual(['C','D','A','B']);
    expect(designRobot({name:'Saved FLL',options,portMap:previous}).motors.map(m=>m.port)).toEqual(['C','D','A','B']);
  });
  it('preserves edited parts and ground objects in exported projects',()=>{
    const customRobot={name:'Fork robot',options};
    const customWorld={name:'My field',options:{imageURL:'textures/maps/grid.png',objects:[{type:'box',position:[0,0,4],size:[8,8,8],color:'#ff8800'}]}};
    const file=exportProgramFile('My design',{missionId:null,steps:[],outcome:null,customRobot,customWorld,robot:designRobot(customRobot),robotTemplate:'custom',scene:'custom'});
    const parsed=parseProgramFile(file.content,[]);
    expect(parsed.ok&&parsed.program.customWorld).toEqual(customWorld);
    expect(parsed.ok&&parsed.program.customRobot).toEqual(customRobot);
  });
  it('rejects executable content, malformed parts and external asset URLs',()=>{
    expect(customRobotSchema.safeParse({name:'Bad',options:{...options,components:[null]}}).success).toBe(false);
    expect(customWorldSchema.safeParse({name:'Bad',options:{objects:[null]}}).success).toBe(false);
    for(const imageURL of ['https://example.com/image.png','javascript:alert(1)','data:text/html;base64,abc']){
      expect(customWorldSchema.safeParse({name:'Bad',options:{imageURL,objects:[]}}).success).toBe(false);
    }
    expect(customWorldSchema.safeParse({name:'Bad',options:{objects:[],callback:'alert(1)'}}).success).toBe(false);
  });
});
