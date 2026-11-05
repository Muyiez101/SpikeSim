import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  Download,
  Expand,
  LogOut,
  Minimize2,
  Play,
  RotateCcw,
  Square,
  Swords,
  Timer,
  Trophy,
  Upload,
  Wifi,
} from 'lucide-react';
import { BlockEditor, type BlockEditorHandle } from './BlockEditor';
import { sumoExample } from '../lan/example';
import { validateMatchProgram, matchBlockTypes } from '../lan/program';
import type { VisualProgram } from '../editor/program';
import { seatSchema, type RoomView, type Seat } from '../lan/protocol';
import { en } from '../shared/strings/en';
import { BrandLockup } from './BrandLockup';
import './sumo.css';

const copy = en.sumo;
async function copyInvitation(text: string) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* HTTP classrooms can require the selection fallback. */
    }
  }
  const input = document.createElement('textarea');
  input.value = text;
  input.style.position = 'fixed';
  input.style.top = '0';
  document.body.append(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw Error(copy.clipboardHelp);
}
async function request<T>(url: string, data?: unknown, token?: string): Promise<T> {
  const response = await fetch(`/api/sumo${url}`, {
    method: data === undefined ? 'GET' : 'POST',
    headers: {
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(4000),
  }).catch(() => {
    throw Error(copy.errors.unavailable);
  });
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw Error(copy.errors.unavailable);
  const result = await response.json();
  if (!response.ok) throw Error(result.error ?? copy.errors.unavailable);
  return result as T;
}
function loadDraft() {
  try {
    const text = localStorage.getItem('spikesim.sumo.blocks');
    if (text) return validateMatchProgram(JSON.parse(text));
  } catch {
    /* Keep the last invalid draft untouched. */
  }
  return sumoExample();
}

export function SumoPage() {
  const [program, setProgram] = useState<VisualProgram>(loadDraft),
    [name, setName] = useState<string>(copy.nameDefault),
    [code, setCode] = useState(
      () => new URLSearchParams(location.search).get('sumo')?.replace(/^host$/, '') ?? '',
    ),
    [address, setAddress] = useState('');
  const [seat, setSeat] = useState<Seat | null>(() => {
    try {
      const room = new URLSearchParams(location.search).get('sumo');
      const saved = sessionStorage.getItem(`spikesim.sumo.seat.${room}`);
      const parsed = seatSchema.safeParse(saved ? JSON.parse(saved) : null);
      return parsed.success && parsed.data.code === room ? parsed.data : null;
    } catch {
      return null;
    }
  });
  const [room, setRoom] = useState<RoomView | null>(null),
    [hostAvailable, setHostAvailable] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false),
    [expanded, setExpanded] = useState(false),
    [live, setLive] = useState(false);
  const editor = useRef<BlockEditorHandle>(null);
  const arenaDialog = useRef<HTMLDialogElement>(null),
    expandButton = useRef<HTMLButtonElement>(null);
  const arenaId = useId();
  useEffect(() => {
    const dialog = arenaDialog.current;
    if (expanded) dialog?.showModal();
    else if (dialog?.open) {
      dialog.close();
      expandButton.current?.focus({ preventScroll: true });
    }
  }, [expanded]);
  useEffect(() => {
    let cancelled = false;
    void request('/info')
      .then(() => {
        if (!cancelled) setHostAvailable(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!seat) return;
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await request<RoomView>(`/rooms/${seat!.code}`, undefined, seat!.token);
        if (cancelled) return;
        setRoom(result);
        setLive(true);
        setError((previous) =>
          previous === copy.errors.unavailable ||
          previous === copy.errors.hostLost ||
          previous === 'Failed to fetch'
            ? ''
            : previous,
        );
      } catch (e) {
        if (cancelled) return;
        setLive(false);
        setError(e instanceof Error ? e.message : copy.errors.unavailable);
      }
      if (!cancelled)
        timer = setTimeout(() => {
          void poll();
        }, 150);
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [seat]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.errors.unavailable);
    } finally {
      setBusy(false);
    }
  };
  function remember(next: Seat) {
    setSeat(next);
    setCode(next.code);
    history.replaceState(null, '', `?sumo=${next.code}`);
    try {
      sessionStorage.setItem(`spikesim.sumo.seat.${next.code}`, JSON.stringify(next));
    } catch {
      setError(copy.errors.storage);
    }
  }
  async function command(action: string, data: unknown = {}) {
    if (!seat) return;
    const result = await request<RoomView>(`/rooms/${seat.code}/${action}`, data, seat.token);
    if (result?.frame) setRoom(result);
  }
  const locked = room?.phase === 'running' || Boolean(seat && room?.players[seat.index]?.ready),
    own = seat && room?.players[seat.index];
  const save = () => {
    const blob = new Blob([JSON.stringify({ kind: 'spikesim-sumo', program }, null, 2)], {
        type: 'application/json',
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 'sumo-blocks.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const allReady =
    room?.players.length === 2 && room.players.every((player) => player.ready && player.connected);
  const phase = room?.phase ?? 'preview';
  const hint = !seat
    ? copy.previewHelp
    : !live
      ? copy.frozenHelp
      : phase === 'running'
        ? copy.runningHelp
        : phase === 'finished'
          ? copy.finishedHelp
          : room?.players.length === 1
            ? copy.waitGuest
            : allReady
              ? copy.waitHost
              : own?.ready
                ? copy.waitReady
                : copy.readyHelp;
  const arena = (
    <section className="sumo-stage-panel" aria-label={copy.arenaLabel}>
      <header className="sumo-arena-heading">
        <div>
          <span className="sumo-eyebrow">{copy.arenaLabel}</span>
          <h2>{copy.arenaTitle}</h2>
        </div>
        <button
          ref={expandButton}
          className="sumo-icon-button"
          aria-label={expanded ? copy.restore : copy.expand}
          title={expanded ? copy.restore : copy.expand}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <Minimize2 aria-hidden="true" /> : <Expand aria-hidden="true" />}
        </button>
      </header>
      <div className="sumo-arena-scene" data-phase={phase}>
        <div className="sumo-arena-status">
          <span
            className={`sumo-phase sumo-phase-${seat && !live ? 'offline' : phase}`}
            role="status"
          >
            <span aria-hidden="true" />
            {seat && !live
              ? copy.disconnected
              : phase === 'running'
                ? copy.running
                : phase === 'finished'
                  ? copy.finished
                  : seat
                    ? copy.lobby
                    : copy.preview}
          </span>
          <span>{copy.round(Math.max(1, room?.round ?? 0))}</span>
        </div>
        <div className="sumo-clock">
          <span>{copy.timeLeft}</span>
          <strong role="timer" aria-label={copy.seconds(room?.frame.time ?? 0)}>
            {copy.clock(room?.frame.time ?? 0)}
          </strong>
        </div>
        <svg className="sumo-ring" viewBox="-122 -116 244 238" role="img" aria-label={copy.model}>
          <defs>
            <radialGradient id={`${arenaId}-mat`}>
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#e4e8f0" />
            </radialGradient>
            <linearGradient id={`${arenaId}-rim`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#9da8c0" />
              <stop offset=".5" stopColor="#35415b" />
              <stop offset="1" stopColor="#7c8bad" />
            </linearGradient>
          </defs>
          <ellipse cy="7" rx="109" ry="106" fill="#080c18" opacity=".7" />
          <circle r="107" fill={`url(#${arenaId}-rim)`} />
          <circle r="103" fill="#202b43" />
          <circle r="100" fill="#e23e59" />
          <circle r="92" fill={`url(#${arenaId}-mat)`} />
          <circle r="72" fill="none" stroke="#ced5e0" strokeWidth=".35" strokeDasharray="2 3" />
          <path d="M -92 0 H 92 M 0 -92 V 92" stroke="#d3dae5" strokeWidth=".4" />
          <circle r="14" fill="none" stroke="#bac4d3" strokeWidth=".7" />
          <circle r="2" fill="#a5afc2" />
          <path d="M -15 24 H 15 M -15 -24 H 15" stroke="#9da9be" strokeWidth="1.5" />
          {(
            room?.frame.robots ?? [
              { x: 0, y: -38, heading: 0 },
              { x: 0, y: 38, heading: 180 },
            ]
          ).map((robot, i) => (
            <g key={i} transform={`translate(${robot.x} ${-robot.y}) rotate(${robot.heading})`}>
              <rect
                x="-10"
                y="-7"
                width="20"
                height="16"
                rx="3"
                fill="#0a1021"
                opacity=".18"
                transform="translate(1 1)"
              />
              <rect x="-10" y="-7" width="4" height="14" rx="1" fill="#1a2133" />
              <rect x="6" y="-7" width="4" height="14" rx="1" fill="#1a2133" />
              <path
                d="M -9 -4 H -7 M -9 0 H -7 M -9 4 H -7 M 7 -4 H 9 M 7 0 H 9 M 7 4 H 9"
                stroke="#65738e"
                strokeWidth=".7"
              />
              <rect
                x="-7"
                y="-8"
                width="14"
                height="16"
                rx="2.5"
                fill={i === 0 ? '#7953df' : '#148895'}
                stroke={i === 0 ? '#452887' : '#09545f'}
                strokeWidth=".8"
              />
              <rect
                x="-5"
                y="-5"
                width="10"
                height="9"
                rx="1.5"
                fill={i === 0 ? '#9978f4' : '#54bcc2'}
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
        <p className="sumo-model">{copy.model}</p>
      </div>
      <div className="sumo-players">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={`sumo-player sumo-player-${i}${seat?.index === i ? ' sumo-player-own' : ''}`}
          >
            <span className="sumo-player-number" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <span className="sumo-player-label">
                {copy.player(i)}
                {seat?.index === i && <span className="sumo-you">{copy.you}</span>}
              </span>
              <strong>{room?.players[i]?.name ?? copy.waiting}</strong>
              <span className="sumo-player-state">
                {room?.players[i] ? (
                  room.players[i].connected ? (
                    room.players[i].ready ? (
                      <>
                        <Check size={13} aria-hidden="true" />
                        {copy.readyLabel}
                      </>
                    ) : (
                      copy.editing
                    )
                  ) : (
                    copy.disconnected
                  )
                ) : (
                  '—'
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
      {room?.phase === 'finished' && (
        <div role="status" className="sumo-result">
          <Trophy size={24} aria-hidden="true" />
          <div>
            <strong>
              {room.frame.winner === null
                ? copy.draw
                : copy.won(room.players[room.frame.winner]?.name ?? copy.player(room.frame.winner))}
            </strong>
            <p>{room.frame.reason && copy.reasons[room.frame.reason]}</p>
            {room.frame.robots.map(
              (robot, i) =>
                robot.error && (
                  <p key={i}>
                    {copy.player(i)}: {robot.error}
                  </p>
                ),
            )}
          </div>
        </div>
      )}
      <footer className="sumo-match-tools">
        <p>{hint}</p>
        <div className="sumo-match-actions">
          {seat && room?.phase === 'lobby' && (
            <button
              className={own?.ready ? '' : 'sumo-primary'}
              disabled={busy || !live}
              onClick={() => {
                void run(async () => {
                  if (!own?.ready) validateMatchProgram(program);
                  await command('ready', { ready: !own?.ready, program });
                });
              }}
            >
              <Check size={16} aria-hidden="true" />
              {own?.ready ? copy.unready : copy.ready}
            </button>
          )}
          {seat?.index === 0 && room?.phase === 'lobby' && (
            <button
              className="sumo-start"
              disabled={busy || !live || !allReady}
              onClick={() => {
                void run(() => command('start'));
              }}
            >
              <Play size={16} aria-hidden="true" />
              {copy.start}
            </button>
          )}
          {seat?.index === 0 && room?.phase === 'finished' && (
            <button
              className="sumo-primary"
              disabled={busy || !live}
              onClick={() => {
                void run(() => command('rematch'));
              }}
            >
              <RotateCcw size={16} aria-hidden="true" />
              {copy.rematch}
            </button>
          )}
          {seat?.index === 0 && room?.phase === 'running' && (
            <button
              className="sumo-stop"
              disabled={busy || !live}
              onClick={() => {
                void run(() => command('stop'));
              }}
            >
              <Square size={16} aria-hidden="true" />
              {en.studio.stop}
            </button>
          )}
        </div>
      </footer>
    </section>
  );
  return (
    <section className="sumo-page">
      {new URLSearchParams(location.search).has('sumo') && <div className="session-brand"><BrandLockup compact /></div>}
      <header className="sumo-heading">
        <div>
          <span className="sumo-eyebrow">
            <Swords size={15} aria-hidden="true" />
            {copy.badge}
          </span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
        </div>
        <div className="sumo-facts">
          <span>
            <Wifi size={15} aria-hidden="true" />
            {copy.network}
          </span>
          <span>
            <Timer size={15} aria-hidden="true" />
            {copy.duration}
          </span>
          <span>
            <Swords size={15} aria-hidden="true" />
            {copy.duel}
          </span>
        </div>
      </header>
      {error && (
        <p role="alert" className="sumo-error">
          {error}
        </p>
      )}
      {!seat ? (
        <section className="sumo-connect" aria-label={copy.setupTitle}>
          <div className="sumo-identity">
            <h2>{copy.setupTitle}</h2>
            <label>
              {copy.name}
              <input
                autoComplete="nickname"
                value={name}
                maxLength={32}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          </div>
          <div className="sumo-host-option">
            <p>{copy.hostHelp}</p>
            <button
              className="sumo-primary"
              disabled={busy || (!hostAvailable && !window.desktop)}
              onClick={() => {
                void run(async () => {
                  if (hostAvailable) remember(await request<Seat>('/rooms', { name }));
                  else await window.desktop?.hostSumo();
                });
              }}
            >
              <Swords size={17} aria-hidden="true" />
              {copy.host}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="sumo-join-option">
            <p>{copy.joinHelp}</p>
            <div className="sumo-join-row">
              <label>
                {copy.code}
                <input
                  className="sumo-code-input"
                  autoComplete="off"
                  spellCheck={false}
                  value={code}
                  maxLength={6}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))}
                />
              </label>
              <button
                disabled={busy || code.length !== 6}
                onClick={() => {
                  void run(async () => {
                    if (hostAvailable)
                      remember(await request<Seat>(`/rooms/${code}/join`, { name }));
                    else if (window.desktop) await window.desktop.joinSumo(code, address);
                    else {
                      const url = new URL(address);
                      if (
                        url.protocol !== 'http:' ||
                        !/^((192\.168|10|127)\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname)
                      )
                        throw Error(copy.errors.notFound);
                      location.assign(`${url.origin}/?sumo=${code}`);
                    }
                  });
                }}
              >
                {copy.join}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
            {!hostAvailable && (
              <label className="sumo-address">
                {copy.address}
                <input
                  type="url"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={copy.hostAddressExample}
                />
              </label>
            )}
          </div>
          {!hostAvailable && !window.desktop && (
            <p className="sumo-host-help">
              <Wifi size={16} aria-hidden="true" />
              {copy.localHelp}
            </p>
          )}
        </section>
      ) : (
        <section className="sumo-lobby" aria-label={copy.room}>
          <div>
            <span className="sumo-eyebrow">{copy.code}</span>
            <strong className="sumo-code">{seat.code}</strong>
          </div>
          <span className={`sumo-connection${live ? ' is-live' : ''}`} role="status">
            <Wifi size={15} aria-hidden="true" />
            {live ? copy.connected : copy.disconnected}
          </span>
          <button
            className="sumo-primary"
            onClick={() => {
              void run(async () => {
                const invite = room?.links[0];
                if (!invite) throw Error(copy.errors.network);
                await copyInvitation(`${copy.code}: ${seat.code}\n${invite}`);
                setCopied(true);
              });
            }}
          >
            {copied ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Copy size={16} aria-hidden="true" />
            )}
            {copied ? copy.copied : copy.copy}
          </button>
          <button
            className="sumo-leave"
            disabled={busy}
            onClick={() => {
              void run(async () => {
                try {
                  await command(seat.index === 0 ? 'close' : 'leave');
                } finally {
                  try {
                    sessionStorage.removeItem(`spikesim.sumo.seat.${seat.code}`);
                  } catch {
                    /* Optional persistence. */
                  }
                  setSeat(null);
                  setRoom(null);
                  setLive(false);
                  setCopied(false);
                  history.replaceState(null, '', '?sumo=');
                }
              });
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            {seat.index === 0 ? copy.close : copy.leave}
          </button>
          <div className="sumo-links">
            {room?.links.map((link) => (
              <a key={link} href={link} target="_blank" rel="noreferrer">
                {link}
              </a>
            ))}
          </div>
        </section>
      )}
      <div className="sumo-layout">
        <section className="sumo-code-panel" aria-label={copy.strategy}>
          <header className="sumo-code-heading">
            <div className="sumo-code-icon">
              <Code2 size={21} aria-hidden="true" />
            </div>
            <div>
              <h2>{copy.strategy}</h2>
              <p>{copy.strategyHelp}</p>
            </div>
            {locked && (
              <span className="sumo-locked">
                <Check size={14} aria-hidden="true" />
                {copy.locked}
              </span>
            )}
          </header>
          <div className="sumo-file-tools" role="group" aria-label={copy.programTools}>
            <button
              className="sumo-example"
              disabled={locked}
              onClick={() => editor.current?.load(sumoExample())}
            >
              <Play size={15} aria-hidden="true" />
              {copy.example}
            </button>
            <button
              className="sumo-icon-button"
              aria-label={copy.save}
              title={copy.exportHint}
              onClick={save}
            >
              <Download size={17} aria-hidden="true" />
            </button>
            <label className={`sumo-file${locked ? ' is-disabled' : ''}`} title={copy.importHint}>
              <Upload size={17} aria-hidden="true" />
              <span className="sumo-sr-only">{copy.open}</span>
              <input
                type="file"
                disabled={locked}
                accept=".json,.rlproj"
                aria-label={copy.open}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    void run(async () => {
                      if (file.size > 150000) throw Error(copy.errors.invalid);
                      let json: unknown;
                      try {
                        json = JSON.parse(await file.text());
                      } catch {
                        throw Error(copy.errors.invalid);
                      }
                      if (!json || typeof json !== 'object' || Array.isArray(json))
                        throw Error(copy.errors.invalid);
                      const data = json as Record<string, unknown>;
                      editor.current?.load(
                        validateMatchProgram(data.program ?? data.visualProgram ?? data),
                      );
                    });
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <div className="sumo-editor" inert={locked || undefined}>
            <BlockEditor
              allowedTypes={matchBlockTypes}
              ref={editor}
              initial={program}
              onSelect={() => {}}
              activeId={seat ? room?.frame.robots[seat.index]?.activeId : undefined}
              onChange={(value, edited) => {
                setProgram(value);
                if (edited)
                  try {
                    localStorage.setItem('spikesim.sumo.blocks', JSON.stringify(value));
                  } catch {
                    /* Export is still available. */
                  }
              }}
            />
          </div>
          <details className="sumo-details">
            <summary>{copy.details}</summary>
            <p>{copy.rules}</p>
            <p>{copy.supported}</p>
          </details>
        </section>
        {!expanded && arena}
      </div>
      <section className="sumo-rule-section" aria-label={copy.rulesTitle}>
        <div className="sumo-rule-intro">
          <Trophy size={20} aria-hidden="true" />
          <div>
            <h2>{copy.rulesTitle}</h2>
            <p>{copy.goal}</p>
          </div>
        </div>
        <div className="sumo-rule-cards">
          {copy.ruleCards.map((rule, index) => (
            <article key={rule.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{rule.title}</h3>
                <p>{rule.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <dialog
        className="sumo-arena-dialog"
        ref={arenaDialog}
        aria-label={copy.arenaTitle}
        onCancel={(event) => {
          event.preventDefault();
          setExpanded(false);
        }}
      >
        {expanded && arena}
        {expanded && error && (
          <p role="alert" className="sumo-error">
            {error}
          </p>
        )}
      </dialog>
    </section>
  );
}
