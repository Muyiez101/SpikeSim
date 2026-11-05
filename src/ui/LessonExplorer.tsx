import { useState } from 'react';
import type { LessonId } from '../learn/catalog';
import { wheelEstimate, shorterTurn } from '../learn/measurements';
import { en } from '../shared/strings/en';
const copy = en.learning;
export function LessonExplorer({ lesson }: { lesson: LessonId }) {
  if (lesson === 'yaw' || lesson === 'gyroturn') return <YawExplorer />;
  if (lesson === 'conversions') return <WheelExplorer />;
  return null;
}
function YawExplorer() {
  const [current, setCurrent] = useState(0),
    [target, setTarget] = useState(90),
    turn = shorterTurn(current, target);
  return (
    <section className="learn-explorer">
      <h2>{copy.yawTool}</h2>
      <div className="learn-explorer-grid">
        <svg
          viewBox="-125 -125 250 250"
          role="img"
          aria-label={`${copy.currentYaw}: ${current}. ${copy.targetYaw}: ${target}.`}
        >
          <circle r="80" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="3" />
          <path d="M0 -80V80M-80 0H80" stroke="var(--line)" />
          <g transform={`rotate(${target})`}>
            <path d="M0 -80L-8 -63H8Z" fill="var(--ink-soft)" />
          </g>
          <g transform={`rotate(${current})`}>
            <path
              d="M0 45V-55M-12 -40L0 -58L12 -40"
              stroke="var(--primary-deep)"
              strokeWidth="7"
              fill="none"
              strokeLinecap="round"
            />
          </g>
          <g fill="var(--ink)" fontSize="14" textAnchor="middle">
            <text y="-94">0°</text>
            <text x="105" y="5">
              +90°
            </text>
            <text x="-105" y="5">
              −90°
            </text>
            <text y="106">±180°</text>
          </g>
        </svg>
        <div>
          <p>{copy.yawDirection}</p>
          <label>
            {copy.currentYaw}: {current}
            <input
              aria-label={copy.currentYaw}
              type="range"
              min="-180"
              max="180"
              value={current}
              onChange={(event) => setCurrent(Number(event.target.value))}
            />
          </label>
          <label>
            {copy.targetYaw}: {target}
            <input
              aria-label={copy.targetYaw}
              type="range"
              min="-180"
              max="180"
              value={target}
              onChange={(event) => setTarget(Number(event.target.value))}
            />
          </label>
          <p aria-live="polite" className="learn-calculated">
            <strong>{copy.shortTurn}: </strong>
            {turn === 0
              ? copy.noTurn
              : `${turn > 0 ? copy.rightTurn : copy.leftTurn} ${Math.abs(turn)}°`}
          </p>
        </div>
      </div>
    </section>
  );
}
function WheelExplorer() {
  const [distance, setDistance] = useState('30'),
    [diameter, setDiameter] = useState('5.6');
  const value =
    distance.trim() && diameter.trim() ? wheelEstimate(Number(distance), Number(diameter)) : null;
  const number = (n: number) => n.toLocaleString('en', { maximumFractionDigits: 2 });
  const length = (n: number) => n.toLocaleString('en', { maximumSignificantDigits: 12 });
  return (
    <section className="learn-explorer">
      <h2>{copy.conversionTool}</h2>
      <p>{copy.conversionHelp}</p>
      <div className="learn-toolbar">
        <label>
          {copy.travelCm}
          <input
            aria-label={copy.travelCm}
            type="number"
            min="0"
            max="1000"
            step="any"
            value={distance}
            onChange={(event) => setDistance(event.target.value)}
          />
        </label>
        <label>
          {copy.diameterCm}
          <input
            aria-label={copy.diameterCm}
            type="number"
            min="1"
            max="30"
            step="any"
            value={diameter}
            onChange={(event) => setDiameter(event.target.value)}
          />
        </label>
      </div>
      {value ? (
        <>
          <dl className="learn-conversions" aria-live="polite">
            {[
              [copy.millimetres, `${length(value.millimetres)} mm`],
              [copy.metres, `${length(value.metres)} m`],
              [copy.circumference, `${number(value.circumference)} cm`],
              [copy.wheelRotations, number(value.rotations)],
              [copy.wheelDegrees, `${number(value.degrees)}°`],
            ].map(([name, result]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{result}</dd>
              </div>
            ))}
          </dl>
          <h3>{copy.calculation}</h3>
          <p>
            π × {diameter} ≈ {number(value.circumference)} cm
            <br />
            {distance} ÷ (π × {diameter}) ≈ {number(value.rotations)}
            <br />
            ({distance} ÷ (π × {diameter})) × 360 ≈ {number(value.degrees)}°
          </p>
          <p>{copy.roundingHelp}</p>
        </>
      ) : (
        <p role="status">{copy.conversionInvalid}</p>
      )}
    </section>
  );
}
