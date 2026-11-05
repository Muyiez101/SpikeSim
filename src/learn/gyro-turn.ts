import {
  visualProgramSchema,
  type BlockState,
  type VisualProgram,
  literal,
} from '../editor/program';
import { en } from '../shared/strings/en';

/** Reuses the verified quarter-turn correction loop, replacing its two target
 * constants with one My Block parameter. It is a nearby-heading teaching example. */
export function gyroTurnProgram(reference: VisualProgram): VisualProgram {
  const original = reference.blocks.blocks[0].next?.block;
  if (!original) throw Error(en.learning.loadError);
  const body = structuredClone(original);
  function parameterize(block: BlockState) {
    // The native turn settles within 1°. Asking the outer loop for 0.5° can
    // repeatedly request corrections that the motor helper considers finished.
    if (block.type === 'math_number' && Number(block.fields?.NUM) === 0.5)
      block.fields = { NUM: 1 };
    if (block.type === 'math_number' && Number(block.fields?.NUM) === 90) {
      block.type = 'variables_get';
      block.fields = { VAR: { id: 'target' } };
    }
    for (const child of Object.values(block.inputs ?? {})) {
      if (child.block) parameterize(child.block);
      if (child.shadow) {
        if (child.shadow.type === 'math_number' && Number(child.shadow.fields?.NUM) === 90) {
          child.block = child.shadow;
          delete child.shadow;
          parameterize(child.block);
        } else parameterize(child.shadow);
      }
    }
    if (block.next?.block) parameterize(block.next.block);
  }
  parameterize(body);
  const blocks: BlockState[] = [
    {
      type: 'spike_start',
      x: 30,
      y: 30,
      next: {
        block: {
          type: 'procedures_callnoreturn',
          extraState: { name: en.learning.gyroBlockName, params: ['target'] },
          inputs: { ARG0: literal(90) },
        },
      },
    },
    {
      type: 'procedures_defnoreturn',
      x: 30,
      y: 180,
      fields: { NAME: en.learning.gyroBlockName },
      extraState: { params: [{ name: 'target', id: 'target' }] },
      inputs: { STACK: { block: body } },
    },
  ];
  let index = 0;
  function identify(block: BlockState) {
    block.id = `lesson-gyro-${index++}`;
    for (const child of Object.values(block.inputs ?? {})) {
      if (child.block) identify(child.block);
      if (child.shadow) identify(child.shadow);
    }
    if (block.next?.block) identify(block.next.block);
  }
  blocks.forEach(identify);
  return visualProgramSchema.parse({
    blocks: { languageVersion: 0, blocks },
    variables: [{ id: 'target', name: 'target' }],
  });
}
