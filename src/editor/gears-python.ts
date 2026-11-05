import { generatePython } from './python';
import { visualProgramSchema, type VisualProgram, type BlockState } from './program';

/** Only validated block graphs reach the embedded interpreter. No raw Python input. */
export function generateGearsPython(program: VisualProgram): string {
  visualProgramSchema.parse(program);
  const check = (block: BlockState) => {
    if (block.type === 'math_number' && !Number.isFinite(Number(block.fields?.NUM))) throw new Error('Invalid number');
    if (block.type === 'controls_flow_statements' && !['BREAK','CONTINUE'].includes(String(block.fields?.FLOW))) throw new Error('Invalid loop control');
    Object.values(block.inputs ?? {}).forEach(input => { if (input.block) check(input.block); if (input.shadow) check(input.shadow); });
    if (block.next?.block) check(block.next.block);
  };
  program.blocks.blocks.forEach(check);
  const lines = generatePython(program);
  const events=lines.some(line=>line.text.startsWith('runloop.run_events('));
  const names=lines.filter(line=>/^\w+ = 0$/.test(line.text)).map(line=>line.text.split(' ')[0]);
  const output = ['from spikesim import robot, sensors, hub, runloop'];
  for (const line of lines.slice(1)) {
    const awaited=/^\s*await /.test(line.text);
    let source = line.text.replace(/^(\s*)async def /,'$1def ').replace(/^(\s*)await /,'$1');
    if (source === 'runloop.run(main())') source = 'main()';
    const indent = source.match(/^\s*/)?.[0] ?? '';
    if (line.blockId && source.trim() && !/^\s*(elif |else:|def )/.test(source)){output.push(`${indent}runloop.mark(${JSON.stringify(line.blockId)})`);if(events)output.push(`${indent}yield None`);}
    if(events&&awaited){
      const call=source.trim();
      if(/^(robot|hub|sensors|runloop)\./.test(call))source=`${indent}yield ${call}`;
      else source=`${indent}for _spike_token in ${call}:\n${indent}    yield _spike_token`;
    }
    output.push(source);
    if(events&&/^\s*def /.test(source))output.push(`${indent}    if False: yield None`);
    if(source==='main()' && program.variables?.length)output.push(`runloop.report({${program.variables.map((variable,index)=>`${JSON.stringify(variable.name)}: ${names[index]}`).join(', ')}})`);
    if (/^\s*(while |for )/.test(source)) output.push(`${indent}    ${events?'yield None':'runloop.yield_tick()'}`);
  }
  return output.join('\n');
}
