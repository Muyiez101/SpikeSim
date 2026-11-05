import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { BlockEditor } from '../ui/BlockEditor';
import { matchBlockTypes, validateMatchProgram } from '../lan/program';
import { sumoExample } from '../lan/example';
import type { VisualProgram } from '../editor/program';
import { en } from '../shared/strings/en';
import { operationId } from './client';
import { downloadProgram, draftSchema, importProgram, type LocalDraft } from './files';
import type { CompetitionAction, CompetitionOperation, CompetitionView } from './protocol';
import type { Run } from './TeacherDesk';
import { soloBlockTypes, soloStarter, validateSoloProgram } from './challenges';
import { ArenaStage3D } from './ArenaStage3D';

const c = en.classroom;
export function StudentDesk({
  view,
  busy,
  live,
  send,
  act,
  run,
}: {
  view: CompetitionView & { ownEntry: NonNullable<CompetitionView['ownEntry']> };
  busy: boolean;
  live: boolean;
  send: (op: CompetitionOperation) => Promise<CompetitionView | null>;
  act: (action: CompetitionAction) => Promise<CompetitionView | null>;
  run: Run;
}) {
  const entry = view.ownEntry;
  const solo = view.settings.kind === 'challenge';
  const [practice, setPractice] = useState<{ id: string; program: VisualProgram }>();
  const [practiceResult, setPracticeResult] = useState('');
  const storageKey = `spikesim.classroom.draft.${view.code}.${view.memberId}.${entry.id}`;
  const [loaded] = useState(() => {
    const empty: LocalDraft = {
      version: 1,
      program: entry.program,
      baseRevision: entry.revision,
      dirty: false,
      pending: [],
    };
    try {
      const text = localStorage.getItem(storageKey);
      return { draft: text ? draftSchema.parse(JSON.parse(text)) : empty, damaged: false };
    } catch {
      return { draft: empty, damaged: true };
    }
  });
  const [draft, setDraft] = useState(loaded.draft),
    [damaged, setDamaged] = useState(loaded.damaged);
  const [storageError, setStorageError] = useState(''),
    [historyRevision, setHistoryRevision] = useState(''),
    [reset, setReset] = useState(0);
  const [otherWindow, setOtherWindow] = useState(false);
  const latest = useRef(draft),
    flushing = useRef(false),
    priorLive = useRef(false);
  const clean = !draft.dirty && draft.pending.length === 0;
  const program = clean ? entry.program : draft.program;
  const baseRevision = clean ? entry.revision : draft.baseRevision;
  const held = entry.lock?.memberId === view.memberId;
  const editingOpen =
    ['lobby', 'preparing'].includes(view.phase) && entry.submittedRevision === null;
  const canEdit = held && editingOpen && !busy && draft.pending.length === 0;
  const conflict = draft.dirty && draft.baseRevision !== entry.revision;
  const remember = useCallback(
    (next: LocalDraft) => {
      latest.current = next;
      setDraft(next);
      if (damaged || otherWindow) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        setStorageError('');
      } catch {
        setStorageError(c.errors.storage);
      }
    },
    [storageKey, damaged, otherWindow],
  );
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setOtherWindow(true);
      }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [storageKey]);
  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      let current = latest.current;
      while (current.pending.length) {
        const op = current.pending[0],
          result = await send(op);
        if (!result?.ownEntry) throw Error(c.errors.approval);
        current = {
          ...current,
          pending: current.pending.slice(1),
          baseRevision: result.ownEntry.revision,
          dirty: false,
        };
        remember(current);
      }
    } finally {
      flushing.current = false;
    }
  }, [send, remember]);
  useEffect(() => {
    const reconnected = live && !priorLive.current;
    priorLive.current = live;
    if (reconnected && latest.current.pending.length) void run(flush);
  }, [live, flush, run]);
  function replace(next: VisualProgram) {
    remember({ version: 1, program: next, baseRevision: entry.revision, dirty: true, pending: [] });
    setReset((n) => n + 1);
  }
  function queue(submit: boolean) {
    void run(async () => {
      if (solo) validateSoloProgram(program); else validateMatchProgram(program);
      const pending: CompetitionOperation[] = [];
      if (draft.dirty)
        pending.push({
          version: 1,
          opId: operationId(),
          action: { type: 'save', baseRevision, program },
        });
      if (submit)
        pending.push({
          version: 1,
          opId: operationId(),
          action: {
            type: 'submit',
            revision: baseRevision + (draft.dirty ? 1 : 0),
            round: view.round,
          },
        });
      remember({ version: 1, program, baseRevision, dirty: draft.dirty, pending });
      await flush();
    });
  }
  const action = (value: CompetitionAction) => {
    void run(() => act(value));
  };
  return (
    <section className="class-card class-workbench" aria-label={c.workspace}>
      <div className="class-card-heading">
        <div>
          <span className="class-eyebrow">
            {view.settings.mode === 'team' ? c.myEntry : c.entry}
          </span>
          <h2>{entry.name}</h2>
        </div>
        <span className="class-pill">{c.revision(entry.revision)}</span>
      </div>
      <p>
        {held
          ? c.turnHeld
          : entry.lock
            ? c.editor(view.members.find((m) => m.id === entry.lock?.memberId)?.name ?? c.student)
            : editingOpen
              ? c.readOnly
              : c.noEditing}
      </p>
      {entry.submittedRevision !== null && (
        <p className="class-notice">{c.submitted(entry.submittedRevision)}</p>
      )}
      {draft.dirty && <p>{c.localDraft}</p>}
      {storageError && (
        <p className="class-error" role="alert">
          {storageError}
        </p>
      )}
      {damaged && (
        <div className="class-notice">
          <p>{c.draftDamaged}</p>
          <button
            onClick={() => {
              if (confirm(c.replaceDraftConfirm)) {
                setDamaged(false);
                try {
                  localStorage.setItem(storageKey, JSON.stringify(latest.current));
                  setStorageError('');
                } catch {
                  setStorageError(c.errors.storage);
                }
              }
            }}
          >
            {c.replaceDraft}
          </button>
        </div>
      )}
      {(conflict || otherWindow) && (
        <div className="class-notice" role="alert">
          <p>{c.conflict}</p>
          <div className="class-actions">
            <button
              disabled={busy || draft.pending.length > 0}
              onClick={() => {
                if (confirm(c.replaceConfirm)) {
                  setOtherWindow(false);
                  remember({
                    version: 1,
                    program: entry.program,
                    baseRevision: entry.revision,
                    dirty: false,
                    pending: [],
                  });
                  setReset((n) => n + 1);
                }
              }}
            >
              {c.useShared}
            </button>
            <button
              disabled={!held || busy || draft.pending.length > 0}
              onClick={() => {
                setOtherWindow(false);
                remember({ ...draft, program, baseRevision: entry.revision, dirty: true });
              }}
            >
              {c.keepLocal}
            </button>
          </div>
        </div>
      )}
      {draft.pending.length > 0 && (
        <div className="class-notice" role="status">
          <strong>{c.queue(draft.pending.length)}</strong>
          <p>{c.pendingSubmit}</p>
          <div className="class-actions">
            <button
              disabled={busy}
              onClick={() => {
                void run(flush);
              }}
            >
              {c.retry}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (confirm(c.discardConfirm)) remember({ ...draft, pending: [], dirty: true });
              }}
            >
              {c.discardQueue}
            </button>
          </div>
        </div>
      )}
      <div className="class-actions class-program-tools">
        {!held && editingOpen && (
          <button
            className="class-primary"
            disabled={busy || !live || Boolean(entry.lock)}
            onClick={() => action({ type: 'take' })}
          >
            {c.editingTurn}
          </button>
        )}
        {held && editingOpen && (
          <>
            <button
              disabled={busy || !live || draft.pending.length > 0}
              onClick={() => {
                if (!draft.dirty || confirm(c.unsavedHandover)) action({ type: 'release' });
              }}
            >
              {c.release}
            </button>
            <button
              disabled={busy || !draft.dirty || conflict || draft.pending.length > 0}
              onClick={() => queue(false)}
            >
              {c.save}
            </button>
            <button
              className="class-primary"
              disabled={busy || view.phase !== 'preparing' || conflict || draft.pending.length > 0}
              onClick={() => queue(true)}
            >
              {c.submit}
            </button>
          </>
        )}
        {entry.submittedRevision !== null && view.phase === 'preparing' && (
          <button disabled={busy || !live} onClick={() => action({ type: 'withdraw' })}>
            {c.withdraw}
          </button>
        )}
        <button onClick={() => downloadProgram(program)}>
          <Download size={16} aria-hidden="true" />
          {c.localDraftDownload}
        </button>
      </div>
      <div className="class-editor" inert={!canEdit} aria-label={c.workspace}>
        <BlockEditor
          key={`${baseRevision}-${reset}`}
          initial={program}
          allowedTypes={solo ? soloBlockTypes : matchBlockTypes}
          onSelect={() => {}}
          onChange={(next, edited) => {
            if (edited && canEdit)
              remember({ version: 1, program: next, baseRevision, dirty: true, pending: [] });
          }}
        />
      </div>
      <div className="class-actions class-program-tools">
        <button
          disabled={!canEdit}
          onClick={() => {
            if (confirm(solo ? c.resetSoloConfirm : c.exampleConfirm)) replace(solo ? soloStarter() : sumoExample());
          }}
        >
          {solo ? c.resetSolo : c.example}
        </button>
        <label className={`class-file-button${canEdit ? '' : ' is-disabled'}`}>
          <Upload size={16} aria-hidden="true" />
          {c.openProgram}
          <input
            type="file"
            accept=".rlproj"
            disabled={!canEdit}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file)
                void run(async () => {
                  const next = await importProgram(file, view.settings.kind);
                  if (confirm(c.replaceConfirm)) replace(next);
                });
            }}
          />
        </label>
      </div>
      <p className="class-small">{c.programFormat}</p>
      {solo && editingOpen && <div className="class-practice">
        <p>{c.practiceOnly}</p>
        <button onClick={() => { setPracticeResult(''); setPractice({ id: operationId(), program: structuredClone(program) }); }}>{c.practiceRun}</button>
        {practice && <><button onClick={() => setPractice(undefined)}>{en.studio.stop}</button><ArenaStage3D key={practice.id} settings={view.settings} spectator={false} program={practice.program} onUpdate={update => { if (update.type === 'finish' && update.verdict) setPracticeResult(`${update.verdict.completed ? c.completed : c.incomplete} · ${c.preciseSeconds(update.verdict.seconds)}${update.verdict.error ? ` · ${update.verdict.error}` : ''}`); }} /></>}
        {practiceResult && <p role="status">{practiceResult}</p>}
      </div>}
      <details>
        <summary>{c.history}</summary>
        <div className="class-row">
          <label>
            {c.historySelect}
            <select value={historyRevision} onChange={(e) => setHistoryRevision(e.target.value)}>
              <option value="">{c.historySelect}</option>
              {entry.history
                .slice()
                .reverse()
                .map((v) => (
                  <option key={v.revision} value={v.revision}>
                    {c.revision(v.revision)} · {new Date(v.savedAt).toLocaleTimeString()}
                  </option>
                ))}
            </select>
          </label>
          <button
            disabled={!canEdit || !live || historyRevision === ''}
            onClick={() => {
              if (confirm(c.restoreConfirm))
                void run(async () => {
                  const result = await act({
                    type: 'restore',
                    revision: Number(historyRevision),
                    baseRevision: entry.revision,
                  });
                  if (result?.ownEntry) {
                    remember({
                      version: 1,
                      program: result.ownEntry.program,
                      baseRevision: result.ownEntry.revision,
                      dirty: false,
                      pending: [],
                    });
                    setReset((n) => n + 1);
                  }
                });
            }}
          >
            {c.restore}
          </button>
        </div>
      </details>
    </section>
  );
}
