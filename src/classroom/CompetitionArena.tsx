import { useEffect, useId, useRef, useState } from 'react';
import { Expand, Minimize2, Trophy } from 'lucide-react';
import { en } from '../shared/strings/en';
import { arenas, type CompetitionView } from './protocol';

const c = en.classroom;
export function CompetitionArena({ view, live }: { view: CompetitionView; live: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (expanded) dialog.current?.showModal();
    else trigger.current?.focus({ preventScroll: true });
  }, [expanded]);
  const match = view.active ?? view.results.at(-1);
  const radius = match?.rules.radiusCm ?? arenas[view.settings.arena];
  const frame = match?.frame;
  const remaining =
    (match?.rules.timeLimitSeconds ?? view.settings.roundSeconds) - (frame?.time ?? 0);
  const result = !view.active ? view.results.at(-1) : undefined;
  const scene = (
    <>
      <div className="class-arena-scene">
        <div className="class-arena-status">
          <span>
            {!live ? c.stale : view.active ? c.phase.running : result ? c.latest : c.spectator}
          </span>
          <span>{c.round(view.round)}</span>
        </div>
        <div className="class-match-clock">
          <span>{en.sumo.timeLeft}</span>
          <strong role="timer">{c.clock(remaining)}</strong>
        </div>
        <svg
          className="class-ring"
          viewBox={`${-radius - 20} ${-radius - 14} ${2 * radius + 40} ${2 * radius + 32}`}
          role="img"
          aria-label={c.arenaNames[view.settings.arena]}
        >
          <defs>
            <radialGradient id={id}>
              <stop stopColor="#ffffff" />
              <stop offset="1" stopColor="#e4e8f0" />
            </radialGradient>
          </defs>
          <ellipse cy="7" rx={radius + 9} ry={radius + 6} fill="#080c18" opacity=".7" />
          <circle r={radius + 7} fill="#60708b" />
          <circle r={radius + 3} fill="#222d43" />
          <circle r={radius} fill="#e23e59" />
          <circle r={radius - 8} fill={`url(#${id})`} />
          <circle
            r={radius * 0.72}
            fill="none"
            stroke="#c7cfdd"
            strokeWidth=".5"
            strokeDasharray="2 3"
          />
          <path
            d={`M ${8 - radius} 0 H ${radius - 8} M 0 ${8 - radius} V ${radius - 8}`}
            stroke="#cbd3e0"
            strokeWidth=".5"
          />
          <circle r="14" fill="none" stroke="#a6b3c9" strokeWidth=".7" />
          {(
            frame?.robots ?? [
              { x: 0, y: -radius * 0.38, heading: 0 },
              { x: 0, y: radius * 0.38, heading: 180 },
            ]
          ).map((robot, i) => (
            <g key={i} transform={`translate(${robot.x} ${-robot.y}) rotate(${robot.heading})`}>
              <rect x="-10" y="-7" width="4" height="14" rx="1" fill="#192337" />
              <rect x="6" y="-7" width="4" height="14" rx="1" fill="#192337" />
              <rect
                x="-7"
                y="-8"
                width="14"
                height="16"
                rx="2.5"
                fill={i === 0 ? '#8051dc' : '#148895'}
                stroke={i === 0 ? '#442782' : '#07515c'}
                strokeWidth=".8"
              />
              <rect
                x="-5"
                y="-5"
                width="10"
                height="9"
                rx="1.5"
                fill={i === 0 ? '#ab86f3' : '#69ced0'}
              />
              <path
                d="M -7 -7 H 7 M -2 -3 L 0 -5 L 2 -3"
                fill="none"
                stroke="white"
                strokeWidth="1"
              />
              <rect x="-2" y="-1" width="4" height="4" rx=".6" fill="#202b43" />
              <text x="0" y="7" textAnchor="middle" fontSize="3.5" fontWeight="700" fill="white">
                {i + 1}
              </text>
            </g>
          ))}
        </svg>
        <p>{c.model(radius * 2)}</p>
      </div>
      <div className="class-contenders">
        {[0, 1].map((i) => (
          <div key={i} data-side={i}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <small>{en.sumo.player(i)}</small>
              <strong>{match?.entryNames[i] ?? c.pickEntry}</strong>
              {match && <small>{c.revision(match.revisions[i])}</small>}
            </div>
          </div>
        ))}
      </div>
      {result && (
        <div className="class-result" role="status">
          <Trophy size={22} aria-hidden="true" />
          <div>
            <strong>
              {result.void
                ? c.void
                : result.frame.winner === null
                  ? c.draw
                  : c.winner(result.entryNames[result.frame.winner])}
            </strong>
            <p>{result.frame.reason && en.sumo.reasons[result.frame.reason]}</p>
            {result.frame.robots.map(
              (r, i) =>
                r.error && (
                  <p key={i}>
                    {result.entryNames[i]}: {r.error}
                  </p>
                ),
            )}
          </div>
        </div>
      )}
    </>
  );
  return (
    <section className="class-arena" aria-label={en.sumo.arenaTitle}>
      <header>
        <div>
          <span className="class-eyebrow">{c.arenaNames[view.settings.arena]}</span>
          <h2>{en.sumo.arenaTitle}</h2>
        </div>
        <button ref={trigger} onClick={() => setExpanded(true)}>
          <Expand size={16} aria-hidden="true" />
          {c.projector}
        </button>
      </header>
      {!expanded && scene}
      {expanded && (
        <dialog
          ref={dialog}
          className="class-projector"
          aria-label={c.projector}
          onCancel={(e) => {
            e.preventDefault();
            setExpanded(false);
          }}
        >
          <header>
            <strong>{view.settings.title}</strong>
            <button autoFocus onClick={() => setExpanded(false)}>
              <Minimize2 size={16} aria-hidden="true" />
              {c.closeProjector}
            </button>
          </header>
          {scene}
        </dialog>
      )}
    </section>
  );
}
