import {literal,type BlockState,type VisualProgram} from '../editor/program';
/** Border detection overrides attack, allowing a student to tune speeds and turns. */
export function sumoExample():VisualProgram{
  const red=(port:string):BlockState=>({type:'spike_color_is',fields:{PORT:port,COLOR:'red'}});
  const turn:BlockState={type:'spike_turn',inputs:{ANGLE:literal(120),SPEED:literal(25)}};
  const reverse:BlockState={type:'spike_move',inputs:{DISTANCE:literal(-18),SPEED:literal(45)},next:{block:turn}};
  const seek:BlockState={type:'controls_if',extraState:{hasElse:true},inputs:{
    IF0:{block:{type:'spike_distance_compare',fields:{PORT:'E',OP:'LT'},inputs:{DISTANCE:literal(100)}}},
    DO0:{block:{type:'spike_start_tank',inputs:{LEFT:literal(85),RIGHT:literal(85)}}},
    ELSE:{block:{type:'spike_start_tank',inputs:{LEFT:literal(28),RIGHT:literal(-28)}}},
  }};
  const loop:BlockState={type:'controls_if',extraState:{hasElse:true},inputs:{IF0:{block:{type:'logic_operation',fields:{OP:'OR'},inputs:{A:{block:red('D')},B:{block:red('F')}}}},DO0:{block:reverse},ELSE:{block:seek}},next:{block:{type:'spike_wait',inputs:{TIME:literal(.03)}}}};
  const start:BlockState={type:'spike_start',x:25,y:25,next:{block:{type:'spike_forever',inputs:{DO:{block:loop}}}}};
  let id=0;function identify(b:BlockState){b.id=`match-${++id}`;Object.values(b.inputs??{}).forEach(c=>{if(c.block)identify(c.block);if(c.shadow)identify(c.shadow);});if(b.next?.block)identify(b.next.block);}identify(start);
  return {blocks:{languageVersion:0,blocks:[start]}};
}
