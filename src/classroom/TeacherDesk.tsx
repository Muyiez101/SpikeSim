import { useState } from 'react';
import { Copy, Pause, Play, Square, Users } from 'lucide-react';
import { en } from '../shared/strings/en';
import type { CompetitionAction, CompetitionView } from './protocol';
import { arena3dCatalog } from './arenas3d';

const c = en.classroom;
export type Run = (work: () => Promise<unknown>) => Promise<void>;
export function TeacherDesk({
  view,
  busy,
  live,
  act,
  run,
  download,
}: {
  view: CompetitionView;
  busy: boolean;
  live: boolean;
  act: (action: CompetitionAction) => Promise<CompetitionView | null>;
  run: Run;
  download: (entryId: string) => Promise<void>;
}) {
  const [team, setTeam] = useState(''),
    [assignments, setAssignments] = useState<Record<string, string>>({});
  const [pair, setPair] = useState<[string, string]>(['', '']),
    [copied, setCopied] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState('');
  const solo = view.settings.kind === 'challenge';
  const editable = ['lobby', 'preparing'].includes(view.phase),
    disabled = busy || !live;
  const eligible = view.entries.filter((e) => e.submittedRevision !== null);
  const action = (value: CompetitionAction) => {
    void run(() => act(value));
  };
  const invitation = view.links[0] ?? `${location.origin}/?competition=${view.code}`;
  return (
    <div className="class-teacher">
      <section className="class-card class-invitation">
        <div>
          <span className="class-eyebrow">{c.code}</span>
          <strong className="class-code">{view.code}</strong>
          <p>{c.invitationHelp}</p>
        </div>
        <label>
          {c.invitationLabel}
          <input readOnly value={invitation} onFocus={(e) => e.currentTarget.select()} />
        </label>
        <button
          onClick={() => {
            void run(async () => {
              if (navigator.clipboard) {
                try {
                  await navigator.clipboard.writeText(invitation);
                  setCopied(true);
                  return;
                } catch {
                  /* Keep the selectable invitation visible. */
                }
              }
              throw Error(c.copyHelp);
            });
          }}
        >
          <Copy size={16} aria-hidden="true" />
          {copied ? c.copied : c.invite}
        </button>
        {view.links.slice(1).map((link) => (
          <a key={link} href={link} target="_blank" rel="noreferrer">
            {link}
          </a>
        ))}
        <div className="class-row">
          <span className="class-pill">{view.joiningOpen ? c.joiningOpen : c.joiningClosed}</span>
          <button
            disabled={disabled || view.phase === 'ended'}
            onClick={() => action({ type: 'joining', open: !view.joiningOpen })}
          >
            {view.joiningOpen ? c.closeJoining : c.openJoining}
          </button>
        </div>
      </section>
      <section className="class-card">
        <h2>{c.session}</h2>
        <p>
          {c.round(view.round)} · {solo && view.phase === 'running' ? c.soloRunning : c.phase[view.phase]}
        </p>
        <div className="class-actions">
          {['lobby', 'locked'].includes(view.phase) && (
            <button
              className="class-primary"
              disabled={disabled}
              onClick={() => {
                if (view.round === 0 || confirm(c.prepWarning)) action({ type: 'prepare' });
              }}
            >
              <Play size={16} aria-hidden="true" />
              {view.round === 0 ? c.startPreparation : c.newPreparation}
            </button>
          )}
          {view.phase === 'preparing' && (
            <>
              <button
                disabled={disabled}
                onClick={() => action({ type: view.deadline === null ? 'resume' : 'pause' })}
              >
                <Pause size={16} aria-hidden="true" />
                {view.deadline === null ? c.resumePreparation : c.pausePreparation}
              </button>
              <button
                className="class-primary"
                disabled={disabled}
                onClick={() => action({ type: 'lock' })}
              >
                {c.lock}
              </button>
            </>
          )}
          {view.phase === 'running' && (
            <button
              className="class-danger"
              disabled={disabled}
              onClick={() => {
                if (confirm(solo ? c.stopAttemptConfirm : c.stopConfirm)) action({ type: 'stop' });
              }}
            >
              <Square size={16} aria-hidden="true" />
              {solo ? c.stopAttempt : c.stopMatch}
            </button>
          )}
        </div>
        {view.phase === 'locked' && <p>{solo ? c.soloLockedHelp : c.lockedHelp}</p>}
        {view.activeAttempt && view.settings.scene && !arena3dCatalog.find(a => a.id === view.settings.scene)?.automatic && view.activeAttempt.frame.time > 0 && <div className="class-actions">
          <button className="class-primary" disabled={disabled} onClick={() => { if (confirm(c.confirmFinishPrompt)) action({ type: 'judge-attempt', completed: true }); }}>{c.confirmFinish}</button>
          <button disabled={disabled} onClick={() => action({ type: 'judge-attempt', completed: false })}>{c.markIncomplete}</button>
        </div>}
        {view.phase === 'locked' && solo && (
          <form className="class-pairing" onSubmit={e => { e.preventDefault(); action({ type: 'start-attempt', entryId: selectedEntry }); }}>
            <h3>{c.soloNext}</h3>
            <label>{c.soloEntry}
              <select required value={selectedEntry} onChange={e => setSelectedEntry(e.target.value)}>
                <option value="">{c.pickEntry}</option>
                {eligible.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
            </label>
            <button className="class-primary" disabled={disabled || !eligible.some(entry => entry.id === selectedEntry)}><Play size={16} aria-hidden="true" />{c.startAttempt}</button>
          </form>
        )}
        {view.phase === 'locked' && !solo && (
          <form
            className="class-pairing"
            onSubmit={(e) => {
              e.preventDefault();
              action({ type: 'start', entryIds: pair });
            }}
          >
            <h3>{c.pair}</h3>
            {([0, 1] as const).map((i) => (
              <label key={i}>
                {i === 0 ? c.firstEntry : c.secondEntry}
                <select
                  required
                  value={pair[i]}
                  onChange={(e) =>
                    setPair((old) =>
                      i === 0 ? [e.target.value, old[1]] : [old[0], e.target.value],
                    )
                  }
                >
                  <option value="">{c.pickEntry}</option>
                  {eligible.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p>{c.pairHelp}</p>
            <button
              className="class-primary"
              disabled={disabled || !pair[0] || !pair[1] || pair[0] === pair[1]}
            >
              <Play size={16} aria-hidden="true" />
              {c.startMatch}
            </button>
          </form>
        )}
      </section>
      <section className="class-card">
        <div className="class-card-heading">
          <h2>
            <Users size={19} aria-hidden="true" />
            {c.roster}
          </h2>
          <span>{view.members.length}/32</span>
        </div>
        {view.settings.mode === 'team' && editable && (
          <form
            className="class-row"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await act({ type: 'team', name: team });
                setTeam('');
              });
            }}
          >
            <label>
              {c.teamName}
              <input
                required
                maxLength={48}
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              />
            </label>
            <button disabled={disabled || !team.trim() || view.entries.length >= 16}>
              {c.addTeam}
            </button>
          </form>
        )}
        {view.members.length === 0 && <p>{c.noMembers}</p>}
        <ul className="class-roster">
          {view.members.map((member) => (
            <li key={member.id}>
              <div className="class-member-heading">
                <strong>{member.name}</strong>
                <span className="class-pill">{member.approved ? c.approved : c.pending}</span>
              </div>
              <small>
                {member.entryId
                  ? view.entries.find((e) => e.id === member.entryId)?.name
                  : c.unassigned}
              </small>
              <div className="class-actions">
                {editable && (
                  <>
                    {view.settings.mode === 'team' && (
                      <label className="class-team-select">
                        <span className="sr-only">
                          {c.assign}: {member.name}
                        </span>
                        <select
                          value={assignments[member.id] ?? member.entryId ?? ''}
                          onChange={(e) =>
                            setAssignments((old) => ({ ...old, [member.id]: e.target.value }))
                          }
                        >
                          <option value="">{c.chooseTeam}</option>
                          {view.entries.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name} ({entry.memberIds.length}/{view.settings.teamSize})
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {(!member.approved || view.settings.mode === 'team') && (
                      <button
                        disabled={
                          disabled ||
                          (view.settings.mode === 'team' &&
                            !(assignments[member.id] ?? member.entryId))
                        }
                        onClick={() =>
                          action({
                            type: 'approve',
                            memberId: member.id,
                            ...(view.settings.mode === 'team'
                              ? { entryId: assignments[member.id] ?? member.entryId ?? undefined }
                              : {}),
                          })
                        }
                      >
                        {view.settings.mode === 'team' ? c.assign : c.approve}
                      </button>
                    )}
                  </>
                )}
                <button
                  disabled={disabled}
                  onClick={() => {
                    const pin = prompt(c.newPin);
                    if (pin !== null) action({ type: 'reset-pin', memberId: member.id, pin });
                  }}
                >
                  {c.resetPin}
                </button>
                {(editable || view.phase === 'ended') && (
                  <button
                    disabled={disabled}
                    onClick={() => {
                      if (confirm(c.removeConfirm)) action({ type: 'remove', memberId: member.id });
                    }}
                  >
                    {c.remove}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="class-card">
        <h2>{c.entries}</h2>
        {view.entries.length === 0 && <p>{c.noEntries}</p>}
        <ul className="class-roster">
          {view.entries.map((entry) => (
            <li key={entry.id}>
              <div className="class-member-heading">
                <strong>{entry.name}</strong>
                <span className="class-pill">
                  {entry.submittedRevision === null
                    ? c.notReady
                    : c.submitted(entry.submittedRevision)}
                </span>
              </div>
              <small>
                {c.revision(entry.revision)}
                {entry.lock &&
                  ` · ${c.editor(view.members.find((m) => m.id === entry.lock?.memberId)?.name ?? c.student)}`}
              </small>
              <div className="class-actions">
                <button
                  disabled={disabled}
                  onClick={() => {
                    void run(() => download(entry.id));
                  }}
                >
                  {c.download}
                </button>
                {entry.lock && (
                  <button
                    disabled={disabled}
                    onClick={() => action({ type: 'release-entry', entryId: entry.id })}
                  >
                    {c.teacherRelease}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <details className="class-card">
        <summary>
          {c.end} / {c.delete}
        </summary>
        <div className="class-actions">
          <button
            disabled={disabled || ['running', 'ended'].includes(view.phase)}
            onClick={() => {
              if (confirm(c.endConfirm)) action({ type: 'end' });
            }}
          >
            {c.end}
          </button>
          <button
            className="class-danger"
            disabled={disabled || view.phase === 'running'}
            onClick={() => {
              if (confirm(c.deleteConfirm)) action({ type: 'delete' });
            }}
          >
            {c.delete}
          </button>
        </div>
      </details>
    </div>
  );
}
