import { visualProgramSchema, inputBlock, nextBlock, fieldText, variableId, type BlockState, type VisualProgram } from '../editor/program';
import { en } from '../shared/strings/en';
const copy=en.sumo.errors;
const stopProgram=Symbol('stop');

const supported = new Set(['spike_start','spike_speed','spike_move','spike_move_default','spike_turn','spike_tank','spike_wait','spike_start_move','spike_start_tank','spike_stop_move','spike_stop','spike_forever','spike_wait_until','spike_motor_position','spike_motor_reset','spike_reset_yaw','spike_reset_timer','spike_heading','spike_timer','spike_distance','spike_distance_compare','spike_color','spike_color_is','spike_reflection','spike_reflection_compare','controls_repeat_ext','controls_whileUntil','controls_if','math_number','math_arithmetic','math_single','logic_compare','logic_operation','logic_negate','logic_boolean','variables_get','variables_set','math_change','text','procedures_defnoreturn','procedures_callnoreturn']);
export function validateMatchProgram(value: unknown): VisualProgram {
  const program = visualProgramSchema.parse(value);
  const walk = (block: BlockState) => {
    if (!supported.has(block.type)) throw Error(copy.unsupported(block.type));
    if(block.type.startsWith('procedures_')&&(Array.isArray(block.extraState?.params)&&block.extraState.params.length||Object.keys(block.inputs??{}).some(name=>/^ARG\d+$/.test(name))))throw Error(en.sumo.parameterError);
    const port=fieldText(block,'PORT');
    if (block.type.startsWith('spike_motor_')&&!['A','B'].includes(port) || block.type.startsWith('spike_distance')&&port!=='E' || ['spike_color','spike_color_is','spike_reflection','spike_reflection_compare'].includes(block.type)&&!['D','F'].includes(port)) throw Error(copy.ports);
    const options:Record<string,string[]>={math_single:['ABS','NEG'],math_arithmetic:['ADD','MINUS','MULTIPLY','DIVIDE','POWER'],logic_compare:['EQ','NEQ','LT','LTE','GT','GTE'],logic_operation:['AND','OR'],spike_distance_compare:['LT','GT'],spike_reflection_compare:['LT','GT']};
    if(options[block.type]&&!options[block.type].includes(fieldText(block,'OP')))throw Error(copy.math);
    Object.values(block.inputs ?? {}).forEach(child => { if (child.block) walk(child.block); if (child.shadow) walk(child.shadow); });
    if (block.next?.block) walk(block.next.block);
  };
  program.blocks.blocks.forEach(walk);
  if (program.blocks.blocks.filter(block => block.type === 'spike_start' && block.enabled!==false && !block.disabledReasons?.length).length !== 1) throw Error(copy.start);
  if (program.blocks.blocks.some(block => !['spike_start','procedures_defnoreturn'].includes(block.type))) throw Error(copy.stacks);
  return program;
}
export const matchBlockTypes=[...supported];
export type MatchSensors = { time: number; heading: number; distance: number; colors: [string,string]; wheels: [number,number] };
type Value = number | string | boolean;
export class MatchRunner {
  left = 0; right = 0; activeId?: string; error?: string;
  private state: MatchSensors = { time:0,heading:0,distance:-1,colors:['white','white'],wheels:[0,0] };
  private variables = new Map<string,Value>();
  private procedures = new Map<string,BlockState>();
  private speed = 50; private yaw = 0; private timer = 0; private offsets = [0,0]; private operations = 0;
  private execution: Generator<void>;
  constructor(program: VisualProgram, initialHeading=0) {
    validateMatchProgram(program); this.yaw=initialHeading;
    program.variables?.forEach(v => this.variables.set(v.id,0));
    program.blocks.blocks.filter(b => b.type==='procedures_defnoreturn').forEach(b => this.procedures.set(fieldText(b,'NAME'),b));
    this.execution = this.chain(program.blocks.blocks.find(b => b.type==='spike_start'));
  }
  step(state: MatchSensors) {
    this.state = state; this.operations = 0;
    try { if (this.execution.next().done) this.left=this.right=0; }
    catch (error) { this.left=this.right=0; if(error===stopProgram)return; this.error=error instanceof Error?error.message:copy.stopped; }
  }
  private count() { if (++this.operations>1000) throw Error(copy.operations); }
  private number(value: Value) { const n=Number(value); if (!Number.isFinite(n)||Math.abs(n)>1e8) throw Error(copy.number); return n; }
  private input(b:BlockState,name:string):Value { const child=inputBlock(b,name); if(!child)throw Error(copy.input(name));return this.expression(child); }
  private num(b:BlockState,name:string) { return this.number(this.input(b,name)); }
  private expression(b:BlockState):Value {
    this.count(); const port=fieldText(b,'PORT'),index=port==='F'?1:0;
    switch(b.type){
      case 'math_number':return this.number(fieldText(b,'NUM'));
      case 'text':return fieldText(b,'TEXT');
      case 'logic_boolean':return fieldText(b,'BOOL')==='TRUE';
      case 'variables_get':return this.variables.get(variableId(b))??0;
      case 'spike_heading':return this.state.heading-this.yaw;
      case 'spike_timer':return this.state.time-this.timer;
      case 'spike_motor_position':if(!['A','B'].includes(port))throw Error(copy.ports);return this.state.wheels[port==='B'?1:0]-this.offsets[port==='B'?1:0];
      case 'spike_distance':if(port!=='E')throw Error(copy.ports);return this.state.distance;
      case 'spike_distance_compare':if(port!=='E')throw Error(copy.ports);return this.state.distance>=0&&(fieldText(b,'OP')==='LT'?this.state.distance<this.num(b,'DISTANCE'):this.state.distance>this.num(b,'DISTANCE'));
      case 'spike_color':case 'spike_color_is':case 'spike_reflection':case 'spike_reflection_compare':{
        if(!['D','F'].includes(port))throw Error(copy.ports);
        const color=this.state.colors[index],reflection=color==='white'?90:color==='red'?25:0;
        if(b.type==='spike_color')return color;if(b.type==='spike_color_is')return color===fieldText(b,'COLOR');
        if(b.type==='spike_reflection')return reflection;return fieldText(b,'OP')==='LT'?reflection<this.num(b,'VALUE'):reflection>this.num(b,'VALUE');
      }
      case 'math_arithmetic':{const a=this.num(b,'A'),c=this.num(b,'B');const op=fieldText(b,'OP');if(op==='DIVIDE'&&c===0)throw Error(copy.divide);return this.number(op==='ADD'?a+c:op==='MINUS'?a-c:op==='MULTIPLY'?a*c:op==='DIVIDE'?a/c:a**c);}
      case 'math_single':{const n=this.num(b,'NUM');if(fieldText(b,'OP')==='ABS')return Math.abs(n);if(fieldText(b,'OP')==='NEG')return -n;throw Error(copy.math);}
      case 'logic_compare':{const a=this.input(b,'A'),c=this.input(b,'B');switch(fieldText(b,'OP')){case 'EQ':return a===c;case 'NEQ':return a!==c;case 'LT':return a<c;case 'LTE':return a<=c;case 'GT':return a>c;default:return a>=c;}}
      case 'logic_operation':return fieldText(b,'OP')==='AND'?Boolean(this.input(b,'A'))&&Boolean(this.input(b,'B')):Boolean(this.input(b,'A'))||Boolean(this.input(b,'B'));
      case 'logic_negate':return !this.input(b,'BOOL');
      default:throw Error(copy.unsupported(b.type));
    }
  }
  private motors(left:number,right:number){if(Math.abs(left)>100||Math.abs(right)>100)throw Error(copy.speed);this.left=left;this.right=right;}
  private *wait(seconds:number){if(seconds<0||seconds>60)throw Error(copy.wait);const until=this.state.time+seconds;while(this.state.time<until)yield;}
  private *chain(first?:BlockState,depth=0):Generator<void>{
    if(depth>30)throw Error(copy.depth);
    for(let b=first;b;b=nextBlock(b)){
      this.count();if(b.enabled===false||b.disabledReasons?.length)continue;this.activeId=b.id;
      switch(b.type){
        case 'spike_start':break;
        case 'spike_speed':this.speed=this.num(b,'SPEED');if(this.speed<1||this.speed>100)throw Error(copy.moveSpeed);break;
        case 'spike_start_move':{const speed=this.speed*(fieldText(b,'DIRECTION')==='backward'?-1:1);this.motors(speed,speed);break;}
        case 'spike_start_tank':this.motors(this.num(b,'LEFT'),this.num(b,'RIGHT'));break;
        case 'spike_stop_move':this.motors(0,0);break;
        case 'spike_stop':throw stopProgram;
        case 'spike_wait':yield* this.wait(this.num(b,'TIME'));break;
        case 'spike_tank':this.motors(this.num(b,'LEFT'),this.num(b,'RIGHT'));yield* this.wait(this.num(b,'TIME'));this.motors(0,0);break;
        case 'spike_move':case 'spike_move_default':{
          const distance=this.num(b,'DISTANCE'),magnitude=b.type==='spike_move'?this.num(b,'SPEED'):this.speed;
          if(magnitude<1||magnitude>100)throw Error(copy.moveSpeed);const speed=magnitude*Math.sign(distance),initial=(this.state.wheels[0]+this.state.wheels[1])/2;
          this.motors(speed,speed);while(Math.abs((this.state.wheels[0]+this.state.wheels[1])/2-initial)<Math.abs(distance)*360/(5.6*Math.PI))yield;this.motors(0,0);break;
        }
        case 'spike_turn':{const angle=this.num(b,'ANGLE'),speed=Math.abs(this.num(b,'SPEED'))*Math.sign(angle),target=this.state.heading+angle;if(!speed&&angle)throw Error(copy.moveSpeed);this.motors(speed,-speed);while((target-this.state.heading)*Math.sign(angle)>1)yield;this.motors(0,0);break;}
        case 'spike_reset_yaw':this.yaw=this.state.heading-this.num(b,'ANGLE');break;
        case 'spike_reset_timer':this.timer=this.state.time;break;
        case 'spike_motor_reset':{const i=fieldText(b,'PORT')==='B'?1:0;this.offsets[i]=this.state.wheels[i]-this.num(b,'POSITION');break;}
        case 'spike_wait_until':while(!this.input(b,'CONDITION'))yield;break;
        case 'spike_forever':for(;;){yield* this.chain(inputBlock(b,'DO'),depth+1);yield;}break;
        case 'controls_repeat_ext':{const n=Math.max(0,Math.floor(this.num(b,'TIMES')));for(let i=0;i<n;i++){yield* this.chain(inputBlock(b,'DO'),depth+1);yield;}break;}
        case 'controls_whileUntil':while(Boolean(this.input(b,'BOOL'))!==(fieldText(b,'MODE')==='UNTIL')){yield* this.chain(inputBlock(b,'DO'),depth+1);yield;}break;
        case 'controls_if':{let taken=false;for(let i=0;inputBlock(b,`IF${i}`);i++)if(this.input(b,`IF${i}`)){yield* this.chain(inputBlock(b,`DO${i}`),depth+1);taken=true;break;}if(!taken)yield* this.chain(inputBlock(b,'ELSE'),depth+1);break;}
        case 'variables_set':this.variables.set(variableId(b),this.input(b,'VALUE'));break;
        case 'math_change':this.variables.set(variableId(b),this.number(this.variables.get(variableId(b))??0)+this.num(b,'DELTA'));break;
        case 'procedures_callnoreturn':{const p=this.procedures.get(String(b.extraState?.name??''));if(!p)throw Error(copy.procedure);yield* this.chain(inputBlock(p,'STACK'),depth+1);break;}
        
        default:throw Error(copy.unsupported(b.type));
      }
    }
  }
}
