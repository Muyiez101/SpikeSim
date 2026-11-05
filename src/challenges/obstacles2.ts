import {en} from '../shared/strings/en';
import {customRobotSchema,designRobot} from '../sim/custom-design';
import base from '../sim/fll-robot.json' with {type:'json'};
import {literal,visualProgramSchema,type BlockState} from '../editor/program';

export const obstacleScene='world:lineFollowing:obstacles2';
export const obstacleRobot=customRobotSchema.parse({name:en.field.obstacleRobot,options:{...base,bodyWidth:12,bodyLength:16,bodyEdgeToWheelCenterZ:8,components:[
  {type:'ColorSensor',position:[-2,-1,6],rotation:[Math.PI/2,0,0],options:{}},
  {type:'ColorSensor',position:[2,-1,6],rotation:[Math.PI/2,0,0],options:{}},
  {type:'LaserRangeSensor',position:[0,3,9],rotation:[-Math.PI/2,0,0],options:{}},
  {type:'GyroSensor',position:[0,2,0],rotation:[0,0,0],options:{}},
  // Front skid keeps the range sensor level when the centred axle pivots.
  {type:'Sphere',position:[0,-2.8,5.5],rotation:[0,0,0],options:{diameter:2,color:'#64748b'}},
]}});
export const obstacleDesign=designRobot(obstacleRobot);
const chain=(...blocks:BlockState[]):BlockState=>{blocks.forEach((block,i)=>{while(block.next?.block)block=block.next.block;if(blocks[i+1])block.next={block:blocks[i+1]};});return blocks[0];};
const sensor=(type:BlockState['type'],port:string):BlockState=>({type,fields:{PORT:port}});
const input=(block:BlockState)=>({block});
const compare=(op:string,a:BlockState,b:BlockState):BlockState=>({type:'logic_compare',fields:{OP:op},inputs:{A:input(a),B:input(b)}});
const num=(n:number)=>literal(n).shadow!;
const value=(name:string):BlockState=>({type:'variables_get',fields:{VAR:{id:name}}});
const assign=(name:string,n:number):BlockState=>({type:'variables_set',fields:{VAR:{id:name}},inputs:{VALUE:literal(n)}});
const calc=(op:string,a:BlockState,b:BlockState):BlockState=>({type:'math_arithmetic',fields:{OP:op},inputs:{A:input(a),B:input(b)}});
const wait=(n=.03):BlockState=>({type:'spike_wait',inputs:{TIME:literal(n)}});
const drive=(cm:number):BlockState=>({type:'spike_move',inputs:{DISTANCE:literal(cm),SPEED:literal(30)}});
const face=(angle:BlockState):BlockState=>({type:'spike_turn',inputs:{ANGLE:input(calc('MINUS',angle,{type:'spike_heading'})),SPEED:literal(25)}});
// Colour chooses a gentle heading; the gyro keeps a missed sample from becoming
// an ever-growing turn while the sensors cross the narrow line.
const steer=(target:number):BlockState=>{
  const correction=()=>calc('MULTIPLY',calc('MINUS',num(target),{type:'spike_heading'}),num(.8));
  return {type:'spike_start_tank',inputs:{LEFT:input(calc('ADD',num(16),correction())),RIGHT:input(calc('MINUS',num(16),correction()))}};
};
const branch=(condition:BlockState,yes:BlockState,no?:BlockState):BlockState=>({type:'controls_if',...(no?{extraState:{hasElse:true}}:{}),inputs:{IF0:input(condition),DO0:input(yes),...(no?{ELSE:input(no)}:{})}});
const colour=(port:string):BlockState=>({type:'spike_color_is',fields:{PORT:port,COLOR:'black'}});
const dark=(port:string):BlockState=>({type:'spike_reflection_compare',fields:{PORT:port,OP:'LT'},inputs:{VALUE:literal(50)}});
const call=(name:string):BlockState=>({type:'procedures_callnoreturn',extraState:{name}});
const follower=branch(colour('D'),steer(-8),branch(colour('F'),steer(8),steer(0)));
const blocked:BlockState={type:'spike_distance_compare',fields:{PORT:'E',OP:'LT'},inputs:{DISTANCE:literal(20)}};
const scan=(angle:number,limit:number)=>chain(face(num(angle)),wait(.15),branch({type:'logic_operation',fields:{OP:'AND'},inputs:{A:input(compare('GT',sensor('spike_distance','E'),num(0))),B:input(compare('LT',sensor('spike_distance','E'),num(limit)))}},assign('side',1)));
const avoid=chain(assign('side',-1),scan(-75,55),scan(-45,65),scan(-30,95),face(calc('MULTIPLY',value('side'),num(90))),drive(29),face(num(0)),drive(70),face(calc('MULTIPLY',value('side'),num(-90))),
  {type:'spike_speed',inputs:{SPEED:literal(10)}},{type:'spike_start_move',fields:{DIRECTION:'forward'}},
  {type:'spike_wait_until',inputs:{CONDITION:input({type:'logic_operation',fields:{OP:'OR'},inputs:{A:input(dark('D')),B:input(dark('F'))}})}},
  {type:'spike_stop_move'},drive(6),face(num(0)));
const main=chain({type:'spike_reset_yaw',inputs:{ANGLE:literal(0)}},{type:'controls_repeat_ext',inputs:{TIMES:literal(3),DO:input(chain({type:'controls_whileUntil',fields:{MODE:'UNTIL'},inputs:{BOOL:input(blocked),DO:input(chain(follower,wait()))}},{type:'spike_stop_move'},call(en.field.obstacleAvoid)))}},drive(15),wait(3),{type:'spike_image',fields:{IMAGE:'check'}});
let id=0;
const program={blocks:{languageVersion:0,blocks:[{type:'spike_start',x:35,y:35,next:input(main)},{type:'procedures_defnoreturn',x:460,y:35,fields:{NAME:en.field.obstacleAvoid},inputs:{STACK:input(avoid)}}]},variables:[{id:'side',name:en.field.obstacleSide}]} as import('../editor/program').VisualProgram;
function identify(block:BlockState){block.id=`obstacles2-${++id}`;for(const entry of Object.values(block.inputs??{})){if(entry.block)identify(entry.block);if(entry.shadow)identify(entry.shadow);}if(block.next?.block)identify(block.next.block);}
program.blocks.blocks.forEach(identify);
export const obstacleProgram=visualProgramSchema.parse(program);
