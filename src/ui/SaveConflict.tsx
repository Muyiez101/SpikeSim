import { en } from '../shared/strings/en';
import type { usePlaygroundDrafts } from './usePlaygroundDrafts';
import './program-files.css';

export function SaveConflict({ drafts }: { drafts: ReturnType<typeof usePlaygroundDrafts> }) {
  if (drafts.saveStatus !== 'conflict') return null;
  const copy = en.saveConflict;
  return (
    <section className="save-conflict" aria-labelledby="save-conflict-title">
      <div role="alert">
        <h2 id="save-conflict-title">{copy.title}</h2>
        <p>{copy.message}</p>
        {drafts.savedVersionUnavailable && <p>{copy.unavailable}</p>}
      </div>
      <div className="program-dialog-actions">
        <button className="button button-secondary" disabled={drafts.savedVersionUnavailable} onClick={drafts.useSavedVersion}>{copy.useSaved}</button>
        <button className="button button-secondary" onClick={drafts.keepThisTab}>{copy.keepTab}</button>
      </div>
    </section>
  );
}
