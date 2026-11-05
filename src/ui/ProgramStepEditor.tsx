import { useId, useState } from 'react';
import type { ProgramStep } from '../progress/playground';
import type { SimCommand } from '../sim/types';
import { en } from '../shared/strings/en';

const copy = en.playground;

function commandLabel(command: SimCommand): string {
  switch (command.type) {
    case 'move': return copy.moveLabel(command.distanceMm, command.speedPercent);
    case 'turn': return copy.turnLabel(command.degrees);
    case 'tank': return copy.tankLabel(command.leftPercent, command.rightPercent, command.durationMs / 1000);
    case 'wait': return copy.waitLabel(command.durationMs / 1000);
    case 'stop': return copy.stop;
    default: return en.blocks.help[`spike_${command.type}` as keyof typeof en.blocks.help] ?? command.type;
  }
}

type NumberFieldProps = {
  label: string;
  stepNumber: number;
  value: number;
  min: number;
  max: number;
  onValue: (value: number) => void;
  onValidity: (valid: boolean) => void;
};

function NumberField({ label, stepNumber, value, min, max, onValue, onValidity }: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  return (
    <label className="pg-number-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={text}
        min={min}
        max={max}
        step="any"
        required
        aria-label={copy.fieldLabel(label, stepNumber)}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(event) => {
          const input = event.currentTarget;
          const number = input.valueAsNumber;
          const valid = input.value !== '' && Number.isFinite(number) && number >= min && number <= max;
          setText(input.value);
          setInvalid(!valid);
          onValidity(valid);
          if (valid) onValue(number);
        }}
      />
      {invalid && <span id={`${id}-error`} className="pg-field-error" role="alert">{copy.numberRange(min, max)}</span>}
    </label>
  );
}

export function ProgramStepEditor({ step, index, onChange, onRemove, onValidity }: {
  step: ProgramStep;
  index: number;
  onChange: (command: SimCommand) => void;
  onRemove: () => void;
  onValidity: (fieldId: string, valid: boolean) => void;
}) {
  const command = step.command;
  const field = (name: string, label: string, value: number, min: number, max: number, onValue: (value: number) => void) => (
    <NumberField key={name} label={label} stepNumber={index + 1} value={value} min={min} max={max}
      onValue={onValue} onValidity={(valid) => onValidity(`${step.id}:${name}`, valid)} />
  );
  return (
    <div className="pg-command">
      <div className="pg-command-heading">
        <span className="pg-command-num">{index + 1}</span>
        <span className="pg-command-label">{commandLabel(command)}</span>
        <button className="pg-command-remove" onClick={onRemove} aria-label={copy.removeStep(index + 1)}>×</button>
      </div>
      <div className="pg-command-fields">
        {command.type === 'move' && <>
          {field('distance', copy.distanceInput, command.distanceMm / 10, -300, 300,
            (value) => onChange({ ...command, distanceMm: Number((value * 10).toFixed(6)) }))}
          {field('speed', copy.speedInput, command.speedPercent, 1, 100,
            (value) => onChange({ ...command, speedPercent: value }))}
        </>}
        {command.type === 'turn' && <>
          {field('angle', copy.angleInput, command.degrees, -360, 360,
            (value) => onChange({ ...command, degrees: value }))}
          {field('speed', copy.speedInput, command.speedPercent, 1, 100,
            (value) => onChange({ ...command, speedPercent: value }))}
        </>}
        {command.type === 'wait' && field('time', copy.waitInput, command.durationMs / 1000, 0, 60,
          (value) => onChange({ ...command, durationMs: Number((value * 1000).toFixed(6)) }))}
        {command.type === 'tank' && <>
          {field('left', copy.leftSpeedInput, command.leftPercent, -100, 100,
            (value) => onChange({ ...command, leftPercent: value }))}
          {field('right', copy.rightSpeedInput, command.rightPercent, -100, 100,
            (value) => onChange({ ...command, rightPercent: value }))}
          {field('time', copy.waitInput, command.durationMs / 1000, 0, 60,
            (value) => onChange({ ...command, durationMs: Number((value * 1000).toFixed(6)) }))}
        </>}
      </div>
    </div>
  );
}
