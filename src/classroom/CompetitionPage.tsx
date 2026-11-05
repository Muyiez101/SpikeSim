import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Download, LogOut, Swords, Timer, Users, Wifi } from 'lucide-react';
import { en } from '../shared/strings/en';
import { BrandLockup } from '../ui/BrandLockup';
import { ConnectionError, LanCompetitionTransport, operationId, SignInError } from './client';
import {
  defaultSettings,
  type CompetitionAction,
  type CompetitionAuth,
  type CompetitionInfo,
  type CompetitionOperation,
  type CompetitionSettings,
  type CompetitionView,
} from './protocol';
import { downloadProgram, exportScoreboard } from './files';
import { CompetitionArena } from './CompetitionArena';
import { TeacherDesk } from './TeacherDesk';
import { StudentDesk } from './StudentDesk';
import { ChallengePicker, SoloArena, arenaTitle } from './SoloArena';
import { SoloScoreboard } from './SoloScoreboard';
import './classroom.css';

const c = en.classroom;
export function CompetitionPage() {
  const [client] = useState(() => new LanCompetitionTransport());
  const [enabled, setEnabled] = useState(() =>
    new URLSearchParams(location.search).has('competition'),
  );
  const [info, setInfo] = useState<CompetitionInfo | null>(null),
    [auth, setAuth] = useState<CompetitionAuth | null>(null),
    [view, setView] = useState<CompetitionView | null>(null);
  const [settings, setSettings] = useState<CompetitionSettings>({
    ...defaultSettings,
    title: c.defaultName,
  });
  const [pin, setPin] = useState(''),
    [teacherPin, setTeacherPin] = useState(''),
    [name, setName] = useState('');
  const [code, setCode] = useState(
    () => new URLSearchParams(location.search).get('competition')?.replace(/^host$/, '') ?? '',
  );
  const [resumeCode, setResumeCode] = useState(''),
    [address, setAddress] = useState('');
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [live, setLive] = useState(false);
  const requestVersion = useRef(0),
    working = useRef(false),
    createId = useRef(operationId());
  const run = useCallback(async (work: () => Promise<unknown>) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : c.errors.invalid);
      if (e instanceof ConnectionError) setLive(false);
      if (e instanceof SignInError) {
        setAuth(null);
        setView(null);
      }
    } finally {
      working.current = false;
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void client
      .info()
      .then((value) => {
        if (!cancelled) setInfo(value);
      })
      .catch(() => {
        if (!cancelled) setError(c.hostUnavailable);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, client]);
  useEffect(() => {
    if (!auth) return;
    let cancelled = false,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!working.current) {
        const version = ++requestVersion.current;
        try {
          const value = await client.read(auth.view.code, auth.token);
          if (!cancelled && version === requestVersion.current) {
            setView(value);
            setLive(true);
          }
        } catch (e) {
          if (!cancelled && version === requestVersion.current) {
            setLive(false);
            if (e instanceof SignInError) {
              setError(e.message);
              setAuth(null);
              setView(null);
              return;
            }
          }
        }
      }
      if (!cancelled)
        timer = setTimeout(() => {
          void poll();
        }, 250);
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [auth, client]);
  function remember(value: CompetitionAuth) {
    ++requestVersion.current;
    setAuth(value);
    setView(value.view);
    setCode(value.view.code);
    setResumeCode(value.view.code);
    setLive(true);
    setPin('');
    setTeacherPin('');
    history.replaceState(
      null,
      '',
      `?competition=${value.view.role === 'teacher' ? 'host' : value.view.code}`,
    );
  }
  const send = useCallback(
    async (op: CompetitionOperation) => {
      if (!auth) throw new SignInError(c.loginAgain);
      ++requestVersion.current;
      const next = await client.act(auth.view.code, auth.token, op);
      setView(next);
      setLive(true);
      if (!next) {
        setAuth(null);
        void client
          .info()
          .then(setInfo)
          .catch(() => {});
      }
      return next;
    },
    [auth, client],
  );
  const act = useCallback(
    (action: CompetitionAction) => send({ version: 1, opId: operationId(), action }),
    [send],
  );
  const signOut = () => {
    ++requestVersion.current;
    setAuth(null);
    setView(null);
    setLive(false);
    setPin('');
    setTeacherPin('');
  };
  const connect = () => {
    setEnabled(true);
    void run(async () => setInfo(await client.info()));
  };
  const openLink = async () => {
    let url: URL;
    try {
      url = new URL(address);
    } catch {
      throw Error(c.errors.invalid);
    }
    const local =
      /^(127\.|10\.|192\.168\.|169\.254\.)/.test(url.hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname);
    const joinCode = url.searchParams.get('competition') ?? code;
    if (
      url.protocol !== 'http:' ||
      !/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) ||
      !local ||
      url.username ||
      url.password ||
      !url.port ||
      !/^[A-HJ-NP-Z2-9]{6}$/.test(joinCode)
    )
      throw Error(c.errors.invalid);
    if (window.desktop) await window.desktop.joinCompetition(joinCode, url.origin);
    else location.assign(`${url.origin}/?competition=${joinCode}`);
  };
  const getProgram = async (entryId: string) => {
    if (auth && view)
      downloadProgram((await client.program(view.code, auth.token, entryId)).program);
  };
  return (
    <section className="class-page">
      {new URLSearchParams(location.search).has('competition') && <div className="session-brand"><BrandLockup compact /></div>}
      <header className="class-heading">
        <div>
          <span className="class-eyebrow">
            <Swords size={16} aria-hidden="true" />
            {c.badge}
          </span>
          <h1>{view?.settings.title ?? c.title}</h1>
          <p>
            {view
              ? `${view.settings.kind === 'challenge' && view.phase === 'running' ? c.soloRunning : c.phase[view.phase]} · ${c.count(view.members.length, view.entries.length)}`
              : c.intro}
          </p>
        </div>
        {view ? (
          <div className="class-heading-actions">
            <span className="class-pill" role="status">
              <Wifi size={14} aria-hidden="true" />
              {live ? c.connected : c.stale}
            </span>
            <button onClick={signOut} disabled={busy}>
              <LogOut size={16} aria-hidden="true" />
              {c.signOut}
            </button>
          </div>
        ) : (
          <span className="class-pill">
            <Wifi size={14} aria-hidden="true" />
            {en.sumo.network}
          </span>
        )}
      </header>
      {error && (
        <p className="class-error" role="alert">
          {error}
        </p>
      )}
      {!view && (
        <>
          {!info && (
            <section className="class-card class-connect">
              <div>
                <h2>{c.hostHelp}</h2>
                <p>{c.connectFirst}</p>
              </div>
              <div className="class-actions">
                <button className="class-primary" disabled={busy} onClick={connect}>
                  {c.connect}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                {window.desktop && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      void run(() => window.desktop!.hostCompetition());
                    }}
                  >
                    {c.desktopHost}
                  </button>
                )}
              </div>
              <form
                className="class-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(openLink);
                }}
              >
                <label>
                  {c.hostLink}
                  <input
                    type="url"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </label>
                <button disabled={busy}>{c.launch}</button>
              </form>
            </section>
          )}
          {info?.loadError && (
            <p className="class-error" role="alert">
              {c.errors.file}
            </p>
          )}
          {info && !info.loadError && (
            <div className="class-setup-grid">
              {info.canHost && (
                <section className="class-card class-setup">
                  <span className="class-eyebrow">{c.teacher}</span>
                  <h2>{c.setup}</h2>
                  <p>{c.setupHelp}</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => {
                        remember(await client.create(settings, teacherPin, createId.current));
                        createId.current = operationId();
                      });
                    }}
                  >
                    <label>
                      {c.sessionName}
                      <input
                        required
                        maxLength={80}
                        value={settings.title}
                        onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                      />
                    </label>
                    <fieldset className="class-format-picker">
                      <legend>{c.format}</legend>
                      {(['sumo', 'challenge'] as const).map(kind => <label key={kind} data-selected={settings.kind === kind}>
                        <input type="radio" name="competition-format" checked={settings.kind === kind} onChange={() => setSettings({ ...settings, kind })} />
                        <span><strong>{c.formats[kind]}</strong><small>{c.formatHelp[kind]}</small></span>
                      </label>)}
                    </fieldset>
                    <div className="class-form-pair">
                      <label>
                        {c.mode}
                        <select
                          value={settings.mode}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              mode: e.target.value as CompetitionSettings['mode'],
                            })
                          }
                        >
                          <option value="individual">{c.individual}</option>
                          <option value="team">{c.team}</option>
                        </select>
                      </label>
                      {settings.mode === 'team' && (
                        <label>
                          {c.teamSize}
                          <input
                            type="number"
                            required
                            min={2}
                            max={6}
                            value={settings.teamSize}
                            onChange={(e) =>
                              setSettings({ ...settings, teamSize: Number(e.target.value) })
                            }
                          />
                        </label>
                      )}
                    </div>
                    {settings.kind === 'sumo' ? <><fieldset className="class-arena-picker">
                      <legend>{c.arena}</legend>
                      {(['compact', 'standard', 'wide'] as const).map((arena) => (
                        <label key={arena} data-selected={settings.arena === arena}>
                          <input
                            type="radio"
                            name="arena"
                            checked={settings.arena === arena}
                            value={arena}
                            onChange={() => setSettings({ ...settings, arena })}
                          />
                          <span className={`class-ring-icon ${arena}`} aria-hidden="true" />
                          <strong>{c.arenaNames[arena]}</strong>
                        </label>
                      ))}
                    </fieldset>
                    <p className="class-small">{c.arenaHelp}</p>
                    </> : <ChallengePicker settings={settings} onChange={setSettings} />}
                    <div className="class-form-pair">
                      <label>
                        {c.preparation}
                        <input
                          type="number"
                          required
                          min={1}
                          max={60}
                          value={settings.preparationMinutes}
                          onChange={(e) =>
                            setSettings({ ...settings, preparationMinutes: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        {settings.kind === 'challenge' ? c.runLimit : c.duration}
                        <input
                          type="number"
                          required
                          min={10}
                          max={settings.kind === 'challenge' ? 600 : 120}
                          value={settings.roundSeconds}
                          onChange={(e) =>
                            setSettings({ ...settings, roundSeconds: Number(e.target.value) })
                          }
                        />
                      </label>
                    </div>
                    <p className="class-small">{c.runLimitHelp}</p>
                    <label>
                      {c.teacherPin}
                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        required
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={teacherPin}
                        onChange={(e) => setTeacherPin(e.target.value)}
                      />
                    </label>
                    <button className="class-primary" disabled={busy}>
                      {c.host}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </form>
                </section>
              )}
              <div className="class-login-column">
                <section className="class-card">
                  <span className="class-eyebrow">{c.student}</span>
                  <h2>{c.join}</h2>
                  <p>{c.joinHelp}</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run(async () => remember(await client.join(code, name, pin)));
                    }}
                  >
                    <label>
                      {c.code}
                      <input
                        required
                        pattern="[A-HJ-NP-Z2-9]{6}"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                      />
                    </label>
                    <label>
                      {c.name}
                      <input
                        required
                        autoComplete="nickname"
                        maxLength={48}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                    <label>
                      {c.pin}
                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="off"
                        pattern="[0-9]{4}"
                        required
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                      />
                    </label>
                    <p className="class-small">{c.privacyHelp}</p>
                    <button className="class-primary" disabled={busy}>
                      {c.join}
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                    <p>{c.reconnectHelp}</p>
                  </form>
                </section>
                {info.canHost && (
                  <section className="class-card">
                    <h2>{c.resume}</h2>
                    {!info.sessions.length ? (
                      <p>{c.noSessions}</p>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void run(async () =>
                            remember(await client.teacher(resumeCode, teacherPin)),
                          );
                        }}
                      >
                        <label>
                          {c.savedSessions}
                          <select
                            required
                            value={resumeCode}
                            onChange={(e) => setResumeCode(e.target.value)}
                          >
                            <option value="">{c.openSession}</option>
                            {info.sessions.map((s) => (
                              <option key={s.code} value={s.code}>
                                {s.title} · {s.code}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          {c.teacherPin}
                          <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="off"
                            pattern="[0-9]{6}"
                            required
                            maxLength={6}
                            value={teacherPin}
                            onChange={(e) => setTeacherPin(e.target.value)}
                          />
                        </label>
                        <button disabled={busy}>{c.teacherSignIn}</button>
                      </form>
                    )}
                  </section>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {view && auth && (
        <>
          {view.storage !== 'saved' && (
            <div className="class-notice" role="status">
              <p>{view.storage === 'error' ? c.hostStorageError : c.memoryHost}</p>
              {view.storage === 'error' && view.role === 'teacher' && (
                <button
                  disabled={busy || !live}
                  onClick={() => {
                    void run(() => act({ type: 'retry-save' }));
                  }}
                >
                  {c.retryHostSave}
                </button>
              )}
            </div>
          )}
          <div className="class-session-strip">
            <span>
              <Users size={18} aria-hidden="true" />
              {view.settings.mode === 'team' ? c.team : c.individual}
            </span>
            <span>{c.formats[view.settings.kind]}</span>
            <span>{view.settings.kind === 'challenge' ? arenaTitle(view.settings) : c.arenaNames[view.settings.arena]}</span>
            <span>
              <Timer size={18} aria-hidden="true" />
              {c.seconds(view.settings.roundSeconds)}
            </span>
            <span className="class-prep-clock">
              {c.preparationLeft}
              <strong role="timer">
                {view.phase === 'preparing'
                  ? c.clock(
                      (view.remainingMs ??
                        Math.max(0, (view.deadline ?? view.serverTime) - view.serverTime)) / 1000,
                    )
                  : '—'}
              </strong>
              {view.remainingMs !== null && <small>{c.paused}</small>}
            </span>
          </div>
          <div className={`class-session-grid class-role-${view.role}`}>
            <div className="class-desk">
              {view.role === 'teacher' ? (
                <TeacherDesk
                  view={view}
                  busy={busy}
                  live={live}
                  act={act}
                  run={run}
                  download={getProgram}
                />
              ) : view.ownEntry ? (
                <StudentDesk
                  key={`${view.code}.${view.memberId}.${view.ownEntry.id}`}
                  view={{ ...view, ownEntry: view.ownEntry }}
                  busy={busy}
                  live={live}
                  send={send}
                  act={act}
                  run={run}
                />
              ) : (
                <section className="class-card">
                  <h2>{c.pending}</h2>
                  <p>{c.waitingApproval}</p>
                </section>
              )}
            </div>
            <div className="class-match-column">
              {view.settings.kind === 'challenge' ? <>
                <SoloArena view={view} live={live} client={client} token={auth.token} />
                <SoloScoreboard view={view} disabled={busy || !live} download={attemptId => {
                  void run(async () => downloadProgram((await client.attemptProgram(view.code, auth.token, attemptId)).program));
                }} />
              </> : <>
              <CompetitionArena view={view} live={live} />
              <section className="class-card class-scoreboard">
                <div className="class-card-heading">
                  <h2>{c.leaderboard}</h2>
                  <button onClick={() => exportScoreboard(view)}>
                    <Download size={16} aria-hidden="true" />
                    {c.export}
                  </button>
                </div>
                <p>{c.ruleSummary}</p>
                <div className="class-table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {[c.rank, c.entry, c.played, c.wins, c.draws, c.points].map((label) => (
                          <th scope="col" key={label}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {view.standings.map((row) => (
                        <tr key={row.entryId}>
                          <td>{row.rank}</td>
                          <th scope="row">{row.name}</th>
                          <td>{row.played}</td>
                          <td>{row.wins}</td>
                          <td>{row.draws}</td>
                          <td>
                            <strong>{row.points}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="class-card">
                <h2>{c.results}</h2>
                {!view.results.length && <p>{c.noResults}</p>}
                <ol className="class-result-list">
                  {view.results
                    .slice()
                    .reverse()
                    .map((result) => (
                      <li key={result.id}>
                        <div>
                          <strong>{result.entryNames.join(' / ')}</strong>
                          <span>
                            {result.void
                              ? c.void
                              : result.frame.winner === null
                                ? c.draw
                                : c.winner(result.entryNames[result.frame.winner])}
                          </span>
                          <small>
                            {c.round(result.round)} · {c.seconds(result.frame.time)}
                          </small>
                        </div>
                        <div className="class-actions">
                          {result.entryIds.map(
                            (entryId, side) =>
                              (view.role === 'teacher' || entryId === view.ownEntry?.id) && (
                                <button
                                  key={side}
                                  disabled={busy || !live}
                                  onClick={() => {
                                    void run(async () =>
                                      downloadProgram(
                                        (
                                          await client.resultProgram(
                                            view.code,
                                            auth.token,
                                            result.id,
                                            side,
                                          )
                                        ).program,
                                      ),
                                    );
                                  }}
                                >
                                  {c.download}: {result.entryNames[side]}
                                </button>
                              ),
                          )}
                        </div>
                      </li>
                    ))}
                </ol>
              </section>
              </>}
            </div>
          </div>
          {view.role === 'student' && (
            <button
              className="class-danger class-leave"
              disabled={busy || !live || view.phase === 'running'}
              onClick={() => {
                if (confirm(c.leaveConfirm)) void run(() => act({ type: 'leave' }));
              }}
            >
              {c.leave}
            </button>
          )}
        </>
      )}
      <footer className="class-footer">
        <p>{c.limits}</p>
        <details>
          <summary>{c.privacy}</summary>
          <p>{c.privacyText}</p>
        </details>
      </footer>
    </section>
  );
}
