// @vitest-environment node
import {describe,it,expect} from 'vitest';
import {fromCommands,literal,type BlockState,type VisualProgram} from '../editor/program';
import {SumoMatch} from './match';
import {MatchRunner,validateMatchProgram,type MatchSensors} from './program';
import {sumoExample} from './example';
import {seatSchema} from './protocol';
const program=(block:BlockState):VisualProgram=>({blocks:{languageVersion:0,blocks:[{type:'spike_start',next:{block}}]}});
const drive=(speed:number)=>program({type:'spike_start_tank',inputs:{LEFT:literal(speed),RIGHT:literal(speed)},next:{block:{type:'spike_wait',inputs:{TIME:literal(60)}}}});
const sensors:MatchSensors={time:0,heading:180,distance:60,colors:['white','white'],wheels:[0,0]};
function finish(match:SumoMatch){for(let i=0;i<3601&&!match.frame().finished;i++)match.step();return match.frame();}
describe('authoritative sumo round',()=>{
  it('uses the selected ring and round limit with repeatable results',()=>{
    for(const radiusCm of [80,100,120] as const){
      const idle=finish(new SumoMatch([fromCommands([]),fromCommands([])],{radiusCm,timeLimitSeconds:10}));
      expect(idle.reason).toBe('time');expect(idle.time).toBe(10);expect(idle.robots[0].y).toBe(-radiusCm*.38);
      const a=finish(new SumoMatch([drive(90),drive(20)],{radiusCm,timeLimitSeconds:30}));
      const b=finish(new SumoMatch([drive(90),drive(20)],{radiusCm,timeLimitSeconds:30}));
      expect(a).toEqual(b);expect(a.winner).toBe(0);expect(a.robots[1].y).toBeGreaterThan(radiusCm);
    }
    expect(()=>new SumoMatch([drive(20),drive(20)],{timeLimitSeconds:999})).toThrow();
  });
  it('equal opposing forces cannot pass through each other and time out identically',()=>{
    const a=finish(new SumoMatch([drive(60),drive(60)])),b=finish(new SumoMatch([drive(60),drive(60)]));
    expect(a).toEqual(b);expect(a.reason).toBe('time');expect(a.winner).toBeNull();expect(Math.abs(a.robots[1].y-a.robots[0].y)).toBeGreaterThanOrEqual(15.99);
  });
  it('a stronger drive pushes an opponent out through physical contact',()=>{
    const result=finish(new SumoMatch([drive(90),drive(20)]));
    expect(result.reason).toBe('ring-out');expect(result.winner).toBe(0);expect(result.robots[1].y).toBeGreaterThan(100);expect(result.robots[0].y).toBeLessThan(100);
  });
  it('border-aware example runs to a legal outcome without invalid blocks',()=>{
    const result=finish(new SumoMatch([sumoExample(),drive(70)]));
    expect(result.finished).toBe(true);expect(result.robots.every(r=>!r.error)).toBe(true);
  });
  it('rejects unsupported blocks, wrong ports, operators and extra start stacks before ready',()=>{
    expect(()=>validateMatchProgram(fromCommands([{type:'matrix',image:'check'}]))).toThrow(/spike_image/);
    expect(()=>validateMatchProgram(program({type:'spike_motor_reset',fields:{PORT:'D'},inputs:{POSITION:literal(0)}}))).toThrow(/A\/B/);
    expect(()=>validateMatchProgram(program({type:'math_single',fields:{OP:'EXP'},inputs:{NUM:literal(3)}}))).toThrow(/operator/);
    const p=fromCommands([]);p.blocks.blocks.push({type:'spike_start'});expect(()=>validateMatchProgram(p)).toThrow(/one enabled/);
  });
  it('Stop inside a loop stops the entire program',()=>{
    const runner=new MatchRunner(program({type:'controls_repeat_ext',inputs:{TIMES:literal(2),DO:{block:{type:'spike_stop'}}},next:{block:{type:'spike_start_tank',inputs:{LEFT:literal(50),RIGHT:literal(50)},next:{block:{type:'spike_wait',inputs:{TIME:literal(5)}}}}}}));
    runner.step(sensors);runner.step({...sensors,time:.1});expect(runner.error).toBeUndefined();expect(runner.left).toBe(0);
  });
  it('second player heading starts at zero relative to its own launch direction',()=>{
    const runner=new MatchRunner(program({type:'controls_if',inputs:{IF0:{block:{type:'logic_compare',fields:{OP:'EQ'},inputs:{A:{block:{type:'spike_heading'}},B:literal(0)}}},DO0:{block:{type:'spike_tank',inputs:{LEFT:literal(40),RIGHT:literal(40),TIME:literal(1)}}}}}),180);
    runner.step(sensors);expect(runner.left).toBe(40);
  });
  it('caps recursive procedures and reports invalid arithmetic as a loss',()=>{
    const p=program({type:'procedures_callnoreturn',extraState:{name:'again'}});p.blocks.blocks.push({type:'procedures_defnoreturn',fields:{NAME:'again'},inputs:{STACK:{block:{type:'procedures_callnoreturn',extraState:{name:'again'}}}}});
    const result=new SumoMatch([p,drive(20)]).step();expect(result.reason).toBe('program-error');expect(result.winner).toBe(1);
  });
  it('rejects parameterized My Blocks and treats negative movement speed as an error',()=>{
    const p=program({type:'procedures_callnoreturn',extraState:{name:'travel',params:['distance']}});
    expect(()=>validateMatchProgram(p)).toThrow(/parameters/);
    const runner=new MatchRunner(program({type:'spike_move',inputs:{DISTANCE:literal(20),SPEED:literal(-10)}}));runner.step(sensors);
    expect(runner.error).toMatch(/1 to 100/);expect(runner.left).toBe(0);
  });
  it('accepts only well-formed persisted seats',()=>{
    expect(seatSchema.safeParse({code:'ABC234',token:'x'.repeat(32),index:1}).success).toBe(true);
    for(const value of [null,{}, {code:'../bad',token:'x'.repeat(32),index:0},{code:'ABC234',token:'x',index:0},{code:'ABC234',token:'x'.repeat(32),index:99}])expect(seatSchema.safeParse(value).success).toBe(false);
  });
});
