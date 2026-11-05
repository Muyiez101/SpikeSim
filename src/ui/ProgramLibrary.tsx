import { Code2 } from 'lucide-react';
import { draftSize, type PlaygroundDraft } from '../progress/playground';
import { missionsById } from '../missions/content';
import { en } from '../shared/strings/en';

export function ProgramLibrary({ drafts, onOpen }: { drafts: PlaygroundDraft[]; onOpen: (missionId: string | null) => void }) {
  const programs = drafts.filter(draft => draftSize(draft) > 0 || draft.name);
  if (!programs.length) return null;
  return <section className="program-library" aria-label={en.projects.program}>
    <h2>{en.projects.programs}</h2>
    <div className="project-grid">{programs.map(draft => <article className="project-card" key={draft.missionId ?? 'free-play'}>
      <div className="project-swatch"><Code2 size={28} aria-hidden="true" /></div>
      <span className="tag">{en.projects.program}</span>
      <h3>{draft.name ?? (draft.missionId ? missionsById[draft.missionId].title : en.playground.freePlay)}</h3>
      <p>{draft.visualProgram ? en.studio.blockCount(draftSize(draft)) : en.catalog.steps(draftSize(draft))}</p>
      {draft.outcome && <p>{en.catalog.lastRun(draft.outcome.stars)}</p>}
      <button className="button button-primary" onClick={() => onOpen(draft.missionId)}>{en.projects.open}</button>
    </article>)}</div>
  </section>;
}
