import { fromCommands, literal, type VisualProgram } from './program';
export const examples: Record<string, VisualProgram> = {
  square: { blocks: { languageVersion: 0, blocks: [{ type: 'spike_start', id: 'example-start', x: 50, y: 50, deletable: false, next: { block: {
    type: 'controls_repeat_ext', id: 'square-loop', inputs: { TIMES: literal(4), DO: { block: {
      type: 'spike_move', id: 'square-move', inputs: { DISTANCE: literal(15), SPEED: literal(60) }, next: { block: { type: 'spike_turn', id: 'square-turn', inputs: { ANGLE: literal(90), SPEED: literal(40) } } },
    } } },
  } } }] } },
  hello: { blocks: { languageVersion: 0, blocks: [{ type: 'spike_start', id: 'example-start', x: 50, y: 50, deletable: false, next: { block: {
    type: 'spike_image', id: 'show-heart', fields: { IMAGE: 'heart' }, next: { block: {
      type: 'spike_light', id: 'light-purple', fields: { COLOR: 'purple' }, next: { block: {
        type: 'spike_beep', id: 'beep', inputs: { FREQUENCY: literal(440), TIME: literal(0.3) }, next: { block: { type: 'spike_wait', id: 'wait', inputs: { TIME: literal(1) } } },
      } },
    } },
  } } }] } },
  sensorExample: { blocks: { languageVersion: 0, blocks: [{ type: 'spike_start', id: 'example-start', x: 50, y: 50, deletable: false, next: { block: {
    type: 'controls_whileUntil', id: 'distance-loop', fields: { MODE: 'WHILE' }, inputs: {
      BOOL: { block: { type: 'logic_compare', id: 'distance-check', fields: { OP: 'GT' }, inputs: { A: { block: { type: 'spike_distance', id: 'read-distance', fields: { PORT: 'E' } } }, B: literal(20) } } },
      DO: { block: { type: 'spike_move', id: 'approach-wall', inputs: { DISTANCE: literal(5), SPEED: literal(40) } } },
    },
  } } }] } },
  empty: fromCommands([]),
};
