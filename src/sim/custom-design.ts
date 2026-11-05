import {z} from 'zod';
import {robotSchema, type RobotDesign} from './schemas';
import {robotPresets} from './presets';

export type DesignOptions = Record<string, unknown>;
const localAsset = (value:string) => value === '' || /^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(value)
  || /^(textures|images|models)\/[a-zA-Z0-9_./% ()?=&-]+$/.test(value) && !value.includes('..');

/** Builders return data only. No code, remote URLs, inherited keys or unbounded trees. */
const optionsSchema = z.custom<DesignOptions>(input => {
  if(!input || typeof input !== 'object' || Array.isArray(input))return false;
  let count=0;
  const visit=(value:unknown,depth:number,key=''):boolean=>{
    if(++count>16000 || depth>16)return false;
    if(typeof value==='number')return Number.isFinite(value)&&Math.abs(value)<=1e8;
    if(typeof value==='string')return (key.endsWith('URL')?localAsset(value):value.length<10000&&!/[<>]/.test(value));
    if(typeof value==='boolean'||value===null)return true;
    if(Array.isArray(value))return value.length<=300&&value.every(item=>visit(item,depth+1));
    if(typeof value==='object'&&value)return Object.entries(value).every(([name,item])=>!['__proto__','constructor','prototype','callback','script'].includes(name)&&visit(item,depth+1,name));
    return false;
  };
  try{return JSON.stringify(input).length<=180000&&visit(input,0);}catch{return false;}
},'Choose a bounded design with bundled assets');

const vector=(value:unknown)=>Array.isArray(value)&&value.length===3&&value.every(item=>typeof item==='number'&&Number.isFinite(item));
const partTypes=new Set(['Box','Cylinder','Sphere','ColorSensor','UltrasonicSensor','LaserRangeSensor','GyroSensor','GPSSensor','TouchSensor','MagnetActuator','ArmActuator','SwivelActuator','LinearActuator','PaintballLauncherActuator','WheelActuator','WheelOmniActuator','WheelPassive','Pen','CameraSensor','LidarSensor']);
function parts(value:unknown):boolean{return Array.isArray(value)&&value.length<=80&&value.every(item=>{
  if(!item||typeof item!=='object')return false;
  const part=item as DesignOptions;
  return partTypes.has(String(part.type))&&vector(part.position)&&(part.rotation===undefined||vector(part.rotation))&&(part.components===undefined||parts(part.components));
});}
function worldObjects(value:unknown):boolean{return Array.isArray(value)&&value.length<=200&&value.every(item=>{
  if(!item||typeof item!=='object')return false;
  const object=item as DesignOptions;
  return ['box','cylinder','sphere','model','compound','hinge','ballJoint'].includes(String(object.type))&&(object.position===undefined||vector(object.position))&&(object.objects===undefined||worldObjects(object.objects));
});}

export const customRobotSchema=z.object({name:z.string().trim().min(1).max(80),portMap:robotSchema.optional(),options:optionsSchema.refine(options=>
  options.wheels===true && ['bodyWidth','bodyLength','bodyHeight','wheelDiameter','wheelWidth'].every(key=>typeof options[key]==='number'&&(options[key] as number)>0&&(options[key] as number)<=100)
  && parts(options.components), 'The student robot needs two drive wheels and valid dimensions')});
export const customWorldSchema=z.object({name:z.string().trim().min(1).max(80),options:optionsSchema.refine(options=>worldObjects(options.objects))});
export type CustomRobot=z.infer<typeof customRobotSchema>;
export type CustomWorld=z.infer<typeof customWorldSchema>;

export function designRobot(custom:CustomRobot,previous:RobotDesign|undefined=custom.portMap):RobotDesign {
  const all:DesignOptions[]=[];
  const walk=(items:unknown[])=>items.forEach(item=>{const component=item as DesignOptions;all.push(component);if(Array.isArray(component.components))walk(component.components);});
  walk(custom.options.components as unknown[]);
  const ports=['C','F','E','D'] as const;
  const actuators=all.filter(component=>String(component.type).endsWith('Actuator'));
  if(actuators.length>4)throw new Error('A student robot supports four attachment motors.');
  const motors:RobotDesign['motors']=[...robotPresets['driving-base'].motors,...actuators.map((component,index)=>({port:ports[index],side:component.type==='ArmActuator'?'arm' as const:'other' as const,maxSpeed:800,maxTorque:0.18}))];
  const available=['D','E','F','C'].filter(port=>!motors.some(motor=>motor.port===port));
  const types:Record<string,string>={ColorSensor:'color',UltrasonicSensor:'distance',LaserRangeSensor:'distance',TouchSensor:'force',GyroSensor:'gyro'};
  const sensors=all.filter(component=>types[String(component.type)]&&component.type!=='GyroSensor');
  const primary=sensors.filter((component,index)=>sensors.findIndex(item=>types[String(item.type)]===types[String(component.type)])===index);
  const ordered=[...primary,...sensors.filter(item=>!primary.includes(item))];
  const design=robotSchema.parse({...robotPresets['driving-base'],id:'custom-robot',name:custom.name,
    width:Number(custom.options.bodyWidth)*10,length:Number(custom.options.bodyLength)*10,wheelDiameter:Number(custom.options.wheelDiameter)*10,
    trackWidth:(Number(custom.options.bodyWidth)+Number(custom.options.wheelWidth)+2*Number(custom.options.wheelToBodyOffset??0.2))*10,motors,
    devices:ordered.slice(0,available.length).map((component,index)=>({type:types[String(component.type)],port:available[index],x:Number((component.position as number[])[2])*10,y:Number((component.position as number[])[0])*10,heading:Number((component.rotation as number[]|undefined)?.[1]??0)*180/Math.PI}))});
  if(previous){
    type Port=RobotDesign['motors'][number]['port'];
    const used=new Set<Port>();
    const choose=(wanted:Port|undefined,fallback:Port):Port=>{const port=([wanted,fallback,'A','B','C','D','E','F'] as (Port|undefined)[]).find(value=>value&&!used.has(value))!;used.add(port);return port;};
    const attachments=previous.motors.filter(motor=>!['left','right'].includes(motor.side));
    design.motors.forEach((motor,index)=>{motor.port=choose(index<2?previous.motors.find(item=>item.side===motor.side)?.port:attachments[index-2]?.port,motor.port);});
    const seen:Record<string,number>={};
    design.devices.forEach(device=>{const index=seen[device.type]??0;seen[device.type]=index+1;device.port=choose(previous.devices.filter(item=>item.type===device.type)[index]?.port,device.port);});
  }
  return design;
}
