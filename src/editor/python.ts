import { fieldText, inputBlock, nextBlock, variableId, type BlockState, type VisualProgram } from './program';
import {isEvent,eventTypes} from './live-blocks';

export type PythonLine = { text: string; blockId?: string };
export function generatePython(program: VisualProgram): PythonLine[] {
  const lines: PythonLine[] = [];
  const names = new Map<string, string>();
  const reserved = new Set(['if', 'elif', 'else', 'while', 'for', 'def', 'async', 'await', 'class', 'return', 'import', 'from', 'pass', 'True', 'False', 'None', 'robot', 'sensors', 'hub', 'runloop', 'main', 'math', 'random', 'and', 'or', 'not', 'as', 'assert', 'break', 'continue', 'del', 'except', 'finally', 'global', 'in', 'is', 'lambda', 'nonlocal', 'raise', 'try', 'with', 'yield', 'print', 'range', 'int', 'len', 'str', 'abs', 'round', '_']);
  const safeName = (id: string, label: string) => {
    if (names.has(id)) return names.get(id)!;
    const base = label.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^[0-9]/, '_$&').replace(/^_spike_/, 'student_') || 'value';
    let name = base, suffix = 2;
    while (reserved.has(name)) name = `${base}_${suffix++}`;
    reserved.add(name); names.set(id, name); return name;
  };
  for (const variable of program.variables ?? []) safeName(variable.id, variable.name);
  const variableName = (block: BlockState) => safeName(variableId(block), program.variables?.find((variable) => variable.id === variableId(block))?.name ?? 'value');
  const value = (block: BlockState, input: string) => expr(inputBlock(block, input));
  const expr = (block: BlockState | undefined): string => {
    if (!block) return 'None';
    switch (block.type) {
      case 'math_number': return fieldText(block, 'NUM', '0');
      case 'text': return JSON.stringify(fieldText(block, 'TEXT'));
      case 'logic_boolean': return fieldText(block, 'BOOL') === 'TRUE' ? 'True' : 'False';
      case 'variables_get': return variableName(block);
      case 'spike_distance': return `sensors.distance_cm(${JSON.stringify(fieldText(block, 'PORT'))})`;
      case 'spike_color': return `sensors.color(${JSON.stringify(fieldText(block, 'PORT'))})`;
      case 'spike_force': return `sensors.force(${JSON.stringify(fieldText(block, 'PORT'))})`;
      case 'spike_heading': return 'robot.heading()'; case 'spike_timer': return 'runloop.timer()';
      case 'spike_motor_position': return `robot.motor_position(${JSON.stringify(fieldText(block, 'PORT'))})`;
      case 'spike_motor_speed_value': return `robot.motor_speed(${JSON.stringify(fieldText(block,'PORT'))})`;
      case 'spike_motor_absolute': return `(robot.motor_position(${JSON.stringify(fieldText(block,'PORT'))}) % 360)`;
      case 'spike_reflection': return `sensors.reflection(${JSON.stringify(fieldText(block,'PORT'))})`;
      case 'spike_reflection_compare': return `(sensors.reflection(${JSON.stringify(fieldText(block,'PORT'))}) ${fieldText(block,'OP')==='LT'?'<':'>'} ${value(block,'VALUE')})`;
      case 'spike_button_pressed': return `hub.button_pressed(${JSON.stringify(fieldText(block,'BUTTON'))})`;
      case 'spike_angle': return `hub.angle(${JSON.stringify(fieldText(block,'AXIS'))})`;
      case 'spike_color_is': return `(sensors.color(${JSON.stringify(fieldText(block, 'PORT'))}) == ${JSON.stringify(fieldText(block, 'COLOR'))})`;
      case 'spike_force_pressed': return `(sensors.force(${JSON.stringify(fieldText(block, 'PORT'))}) > 0)`;
      case 'spike_distance_compare': return `sensors.distance_compare(${JSON.stringify(fieldText(block, 'PORT'))}, ${JSON.stringify(fieldText(block, 'OP'))}, ${value(block, 'DISTANCE')})`;
      case 'math_arithmetic': return `(${value(block, 'A')} ${({ ADD: '+', MINUS: '-', MULTIPLY: '*', DIVIDE: '/', POWER: '**' } as Record<string, string>)[fieldText(block, 'OP')]} ${value(block, 'B')})`;
      case 'math_modulo': return `(${value(block, 'DIVIDEND')} % ${value(block, 'DIVISOR')})`;
      case 'math_single': return `${({ ROOT: 'math.sqrt', ABS: 'abs', NEG: '-', LN: 'math.log', LOG10: 'math.log10', EXP: 'math.exp', POW10: '10 **' } as Record<string, string>)[fieldText(block, 'OP')]}(${value(block, 'NUM')})`;
      case 'math_round': return `${fieldText(block, 'OP') === 'ROUNDUP' ? 'math.ceil' : fieldText(block, 'OP') === 'ROUNDDOWN' ? 'math.floor' : 'round'}(${value(block, 'NUM')})`;
      case 'math_random_int': return `random.randint(${value(block, 'FROM')}, ${value(block, 'TO')})`;
      case 'logic_compare': return `(${value(block, 'A')} ${({ EQ: '==', NEQ: '!=', LT: '<', LTE: '<=', GT: '>', GTE: '>=' } as Record<string, string>)[fieldText(block, 'OP')]} ${value(block, 'B')})`;
      case 'logic_operation': return `(${value(block, 'A')} ${fieldText(block, 'OP') === 'AND' ? 'and' : 'or'} ${value(block, 'B')})`;
      case 'logic_negate': return `(not ${value(block, 'BOOL')})`;
      case 'text_join': return `[${Object.keys(block.inputs ?? {}).sort().map((key) => `str(${value(block, key)})`).join(', ')}]` === '[]' ? '""' : `"".join([${Object.keys(block.inputs ?? {}).sort().map((key) => `str(${value(block, key)})`).join(', ')}])`;
      case 'text_length': return `len(str(${value(block, 'VALUE')}))`;
      default: return 'None';
    }
  };
  const emit = (text: string, depth: number, block?: BlockState) => lines.push({ text: `${'    '.repeat(depth)}${text}`, blockId: block?.id });
  const body = (block: BlockState | undefined, depth: number) => {
    if (depth > 40) return;
    if (!block) { emit('pass', depth); return; }
    const before = lines.length;
    for (let current: BlockState | undefined = block; current; current = nextBlock(current)) {
      if (current.enabled === false || current.disabledReasons?.length) continue;
      const b = current;
      switch (b.type) {
        case 'spike_start': break;
        case 'spike_broadcast': emit(`runloop.broadcast(${JSON.stringify(fieldText(b,'MESSAGE'))})`,depth,b);break;
        case 'spike_distance_lights': emit(`sensors.set_lights(${JSON.stringify(fieldText(b,'PORT'))}, [${[0,1,2,3].map(i=>value(b,`L${i}`)).join(', ')}])`,depth,b); break;
        case 'spike_pair': emit(`robot.pair(${JSON.stringify(fieldText(b, 'LEFT'))}, ${JSON.stringify(fieldText(b, 'RIGHT'))})`, depth, b); break;
        case 'spike_wheel_distance': emit(`robot.set_wheel_travel(${value(b, 'DISTANCE')})`, depth, b); break;
        case 'spike_move_for': emit(`await robot.move_for(${JSON.stringify(fieldText(b, 'DIRECTION'))}, ${value(b, 'AMOUNT')}, ${JSON.stringify(fieldText(b, 'UNIT'))})`, depth, b); break;
        case 'spike_steer_for': emit(`await robot.steer_for(${value(b, 'STEERING')}, ${value(b, 'AMOUNT')}, ${JSON.stringify(fieldText(b, 'UNIT'))})`, depth, b); break;
        case 'spike_start_move': emit(`robot.start_moving(${JSON.stringify(fieldText(b, 'DIRECTION'))})`, depth, b); break;
        case 'spike_start_tank': emit(`robot.start_tank(${value(b, 'LEFT')}, ${value(b, 'RIGHT')})`, depth, b); break;
        case 'spike_stop_move': emit('robot.stop_moving()', depth, b); break;
        case 'spike_motor_speed': emit(`robot.set_motor_speed(${JSON.stringify(fieldText(b, 'PORT'))}, ${value(b, 'SPEED')})`, depth, b); break;
        case 'spike_motor_start': emit(`robot.start_motor(${JSON.stringify(fieldText(b, 'PORT'))}, ${JSON.stringify(fieldText(b, 'DIRECTION'))})`, depth, b); break;
        case 'spike_motor_stop': emit(`robot.stop_motor(${JSON.stringify(fieldText(b, 'PORT'))})`, depth, b); break;
        case 'spike_motor_for': emit(`await robot.motor_for(${JSON.stringify(fieldText(b, 'PORT'))}, ${JSON.stringify(fieldText(b, 'DIRECTION'))}, ${value(b, 'AMOUNT')}, ${JSON.stringify(fieldText(b, 'UNIT'))})`, depth, b); break;
        case 'spike_motor_reset': emit(`robot.reset_motor_position(${JSON.stringify(fieldText(b, 'PORT'))}, ${value(b, 'POSITION')})`, depth, b); break;
        case 'spike_reset_yaw': emit(`robot.reset_yaw(${value(b, 'ANGLE')})`, depth, b); break;
        case 'spike_wait_until': emit(`while not (${value(b, 'CONDITION')}):`, depth, b); emit('await runloop.sleep(1 / 60)', depth + 1, b); break;
        case 'spike_forever': emit('while True:', depth, b); body(inputBlock(b, 'DO'), depth + 1); emit('await runloop.yield_tick()', depth + 1, b); break;
        case 'spike_matrix_pattern': emit(`await hub.show_pattern(${JSON.stringify(fieldText(b, 'PATTERN'))}, seconds=${value(b, 'TIME')})`, depth, b); break;
        case 'spike_text': emit(`await hub.write(${value(b, 'TEXT')})`, depth, b); break;
        case 'spike_move': emit(`await robot.move_cm(${value(b, 'DISTANCE')}, speed=${value(b, 'SPEED')})`, depth, b); break;
        case 'spike_move_default': emit(`await robot.move_cm(${value(b, 'DISTANCE')})`, depth, b); break;
        case 'spike_turn': emit(`await robot.turn(${value(b, 'ANGLE')}, speed=${value(b, 'SPEED')})`, depth, b); break;
        case 'spike_tank': emit(`await robot.tank(${value(b, 'LEFT')}, ${value(b, 'RIGHT')}, seconds=${value(b, 'TIME')})`, depth, b); break;
        case 'spike_motor': emit(`await robot.motor(${JSON.stringify(fieldText(b, 'PORT'))}, ${value(b, 'SPEED')}, seconds=${value(b, 'TIME')})`, depth, b); break;
        case 'spike_speed': emit(`robot.set_speed(${value(b, 'SPEED')})`, depth, b); break;
        case 'spike_wait': emit(`await runloop.sleep(${value(b, 'TIME')})`, depth, b); break;
        case 'spike_stop': emit('robot.stop_program()', depth, b); break;
        case 'spike_image': emit(`hub.show_image(${JSON.stringify(fieldText(b, 'IMAGE'))})`, depth, b); break;
        case 'spike_pixel': emit(`hub.set_pixel(${value(b, 'X')}, ${value(b, 'Y')}, ${value(b, 'BRIGHTNESS')})`, depth, b); break;
        case 'spike_clear': emit('hub.clear()', depth, b); break;
        case 'spike_light': emit(`hub.set_light(${JSON.stringify(fieldText(b, 'COLOR'))})`, depth, b); break;
        case 'spike_beep': emit(`await hub.beep(${value(b, 'FREQUENCY')}, seconds=${value(b, 'TIME')})`, depth, b); break;
        case 'spike_reset_timer': emit('runloop.reset_timer()', depth, b); break;
        case 'spike_print': emit(`print(${value(b, 'VALUE')})`, depth, b); break;
        case 'variables_set': emit(`${variableName(b)} = ${value(b, 'VALUE')}`, depth, b); break;
        case 'math_change': emit(`${variableName(b)} += ${value(b, 'DELTA')}`, depth, b); break;
        case 'controls_repeat_ext': emit(`for _ in range(int(${value(b, 'TIMES')})):`, depth, b); body(inputBlock(b, 'DO'), depth + 1); break;
        case 'controls_whileUntil': emit(`while ${fieldText(b, 'MODE') === 'UNTIL' ? 'not ' : ''}(${value(b, 'BOOL')}):`, depth, b); body(inputBlock(b, 'DO'), depth + 1); break;
        case 'controls_for': emit(`for ${variableName(b)} in runloop.count(${value(b, 'FROM')}, ${value(b, 'TO')}, ${value(b, 'BY')}):`, depth, b); body(inputBlock(b, 'DO'), depth + 1); break;
        case 'controls_if':
          for (let i = 0; i === 0 || inputBlock(b, `IF${i}`); i++) { emit(`${i === 0 ? 'if' : 'elif'} ${value(b, `IF${i}`)}:`, depth, b); body(inputBlock(b, `DO${i}`), depth + 1); }
          if (inputBlock(b, 'ELSE')) { emit('else:', depth, b); body(inputBlock(b, 'ELSE'), depth + 1); } break;
        case 'controls_flow_statements': emit(fieldText(b, 'FLOW').toLowerCase(), depth, b); break;
        case 'procedures_callnoreturn': {
          const name = String(b.extraState?.name ?? fieldText(b, 'NAME'));
          emit(`await ${safeName(`function:${name}`, name)}(${Object.keys(b.inputs ?? {}).sort().map((key) => value(b, key)).join(', ')})`, depth, b); break;
        }
        default: break;
      }
    }
    if (lines.length === before) emit('pass', depth);
  };
  emit('from spikesim import robot, sensors, hub, runloop', 0);
  emit('import math, random', 0); emit('', 0);
  for (const variable of program.variables ?? []) emit(`${names.get(variable.id)} = 0`, 0);
  for (const block of program.blocks.blocks) if (block.type === 'procedures_defnoreturn') {
    const name = fieldText(block, 'NAME');
    const params = block.extraState?.params;
    const args = Array.isArray(params) ? params.map((param: { name?: string; id?: string }) => safeName(param.id ?? param.name ?? '', param.name ?? 'value')) : [];
    emit(`async def ${safeName(`function:${name}`, name)}(${args.join(', ')}):`, 0, block);
    const globals = [...names.entries()].filter(([id, name]) => !id.startsWith('function:') && !args.includes(name)).map(([, name]) => name);
    if (globals.length) emit(`global ${globals.join(', ')}`, 1);
    body(inputBlock(block, 'STACK'), 1); emit('', 0);
  }
  const events=program.blocks.blocks.filter(block=>isEvent(block.type)&&block.enabled!==false&&!block.disabledReasons?.length);
  if(events.some(block=>eventTypes.some(type=>block.type===type))||events.length>1){
    const starts:string[]=[],watchers:string[]=[];
    events.forEach((block,index)=>{
      const name=`_spike_task_${index}`;
      emit(`async def ${name}():`,0);
      if(program.variables?.length)emit(`global ${program.variables.map(variable=>names.get(variable.id)).join(', ')}`,1);
      body(nextBlock(block),1);emit('',0);
      if(block.type==='spike_start'){starts.push(name);return;}
      const port=JSON.stringify(fieldText(block,'PORT'));
      const condition=block.type==='spike_when_color'?`sensors.color(${port}) == ${JSON.stringify(fieldText(block,'COLOR'))}`
        :block.type==='spike_when_distance'?`sensors.distance_compare(${port}, ${JSON.stringify(fieldText(block,'OP'))}, ${value(block,'DISTANCE')})`
        :block.type==='spike_when_force'?`sensors.force(${port}) > 0`
        :block.type==='spike_when_button'?`hub.button_pressed(${JSON.stringify(fieldText(block,'BUTTON'))})`
        :block.type==='spike_when_timer'?`runloop.timer() > ${value(block,'TIME')}`
        :block.type==='spike_when_message'?`runloop.message_count(${JSON.stringify(fieldText(block,'MESSAGE'))})`
        :value(block,'CONDITION');
      watchers.push(`(lambda: ${condition}, ${name})`);
    });
    emit(`runloop.run_events([${starts.join(', ')}], [${watchers.join(', ')}])`,0);
    return lines;
  }
  emit('async def main():', 0);
  if (program.variables?.length) emit(`global ${program.variables.map((variable) => names.get(variable.id)).join(', ')}`, 1);
  const start = program.blocks.blocks.find((block) => block.type === 'spike_start');
  body(start ? nextBlock(start) : undefined, 1);
  emit('', 0); emit('runloop.run(main())', 0);
  return lines;
}
