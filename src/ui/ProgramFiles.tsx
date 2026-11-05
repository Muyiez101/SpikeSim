import { useEffect, useRef, useState } from 'react';
import { missions, missionsById } from '../missions/content';
import { draftSize, programNameSchema, type PlaygroundDraft } from '../progress/playground';
import { exportProgramFile, maxProgramFileBytes, parseProgramFile, type ProgramFile } from '../progress/program-file';
import { en } from '../shared/strings/en';
import { importSpikeArchive } from '../progress/spike-import';
import { maxSpikeArchiveBytes } from '../progress/zip-reader';
import './program-files.css';

const copy = en.programFiles;
const missionIds = missions.map((mission) => mission.id);

export function ProgramFiles({ draft, canExport, getDraft, onImport, onNamed }: {
  draft: PlaygroundDraft;
  canExport: boolean;
  getDraft: (missionId: string | null) => PlaygroundDraft;
  onImport: (program: ProgramFile) => void;
  onNamed: (name: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<'save' | 'open' | null>(null);
  const [name, setName] = useState('');
  const [incoming, setIncoming] = useState<ProgramFile | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [importNotes, setImportNotes] = useState<string[]>([]);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    const element = dialog.current;
    if (mode && element && !element.open) element.showModal();
    if (!mode && element?.open) element.close();
  }, [mode]);

  const review = (content: string) => {
    if (!active.current) return;
    const result = parseProgramFile(content, missionIds);
    if (!result.ok) { setError(copy.errors[result.error]); return; }
    setIncoming(result.program);
    setMode('open');
  };
  const reviewSpike = async (bytes: Uint8Array, filename: string) => {
    const result = await importSpikeArchive(bytes, filename);
    if (!active.current) return;
    if (!result.ok) { setError([result.message, ...result.unsupported].join(' ')); return; }
    setIncoming(result.program); setImportNotes(result.notes); setMode('open');
  };
  const open = async () => {
    setError('');
    setMessage('');
    setImportNotes([]);
    if (!window.desktop) { input.current?.click(); return; }
    setBusy(true);
    try {
      const file = await window.desktop.openFile();
      if (file) {
        if (file.encoding === 'base64') await reviewSpike(Uint8Array.from(atob(file.content), c => c.charCodeAt(0)), file.name);
        else review(file.content);
      }
    } catch { if (active.current) setError(copy.errors.read); }
    finally { if (active.current) setBusy(false); }
  };
  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setMessage('');
    setImportNotes([]);
    const spike = /\.(llsp3|sb3)$/i.test(file.name);
    if (file.size > (spike ? maxSpikeArchiveBytes : maxProgramFileBytes)) { setError(spike ? en.spikeImport.tooLarge : copy.errors.tooLarge); return; }
    setBusy(true);
    try { if (spike) await reviewSpike(new Uint8Array(await file.arrayBuffer()), file.name); else review(await file.text()); }
    catch { if (active.current) setError(copy.errors.read); }
    finally { if (active.current) setBusy(false); }
  };
  const save = async () => {
    if (!programNameSchema.safeParse(name).success || !canExport) return;
    setError('');
    setBusy(true);
    try {
      const file = exportProgramFile(name, draft);
      if (window.desktop) {
        if (!await window.desktop.saveFile(file.name, file.content)) return;
      } else {
        const url = URL.createObjectURL(new Blob([file.content], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      if (!active.current) return;
      onNamed(name.trim());
      setMode(null);
      setMessage(copy.saved);
    } catch (error) { if (active.current) setError(error instanceof RangeError ? copy.programTooLarge : copy.errors.write); }
    finally { if (active.current) setBusy(false); }
  };
  const replacing = incoming && draftSize(getDraft(incoming.missionId)) > 0;

  return (
    <div className="program-files">
      <div className="program-file-actions">
        <button type="button" disabled={!canExport || busy} onClick={() => {
          setError(''); setMessage('');
          setName(draft.name ?? (draft.missionId ? missionsById[draft.missionId].title : copy.defaultName));
          setMode('save');
        }}>{copy.save}</button>
        <button type="button" disabled={busy} title={en.spikeImport.hint} onClick={() => { void open(); }}>{copy.open}</button>
      </div>
      <input ref={input} type="file" accept=".rlproj,.llsp3,.sb3,application/json" hidden aria-label={copy.fileInput} onChange={(event) => {
        const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void readFile(file);
      }} />
      {error && !mode && <p className="program-file-error" role="alert">{error}</p>}
      {message && <p className="program-file-message" role="status">{message}</p>}
      <dialog ref={dialog} className="program-file-dialog" aria-labelledby="program-file-title" onCancel={(event) => {
        if (busy) event.preventDefault(); else { setError(''); setMode(null); }
      }} onClose={() => setMode(null)}>
        <h2 id="program-file-title">{mode === 'save' ? copy.save : copy.reviewTitle}</h2>
        {mode === 'save' ? (
          <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <label htmlFor="program-file-name">{copy.name}</label>
            <input id="program-file-name" autoFocus maxLength={80} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} />
            {!programNameSchema.safeParse(name).success && <p className="program-file-error">{copy.nameHint}</p>}
            <p>{copy.saveHint}</p>
            {error && <p className="program-file-error" role="alert">{error}</p>}
            <div className="program-dialog-actions">
              <button type="button" className="button button-secondary" disabled={busy} onClick={() => { setError(''); setMode(null); }}>{copy.cancel}</button>
              <button type="submit" className="button button-primary" disabled={busy || !canExport || !programNameSchema.safeParse(name).success}>{copy.saveFile}</button>
            </div>
          </form>
        ) : incoming && (
          <>
            <p className="program-import-name">{incoming.name}</p>
            {importNotes.map(note => <p key={note}>{note}</p>)}
            <p>{copy.details(incoming.missionId ? missionsById[incoming.missionId].title : en.playground.freePlay, draftSize(incoming), Boolean(incoming.visualProgram))}</p>
            <p>{replacing ? copy.replaceWarning : copy.openHint}</p>
            <div className="program-dialog-actions">
              <button type="button" autoFocus className="button button-secondary" onClick={() => setMode(null)}>{copy.cancel}</button>
              <button type="button" className="button button-primary" onClick={() => {
                setMode(null); setIncoming(null); onImport(incoming);
              }}>{replacing ? copy.replace : copy.openProgram}</button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
