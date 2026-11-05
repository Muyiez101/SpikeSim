import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { missions, missionsById, worlds } from '../missions/content';
import { draftSize, type PlaygroundDraft, type SaveStatus } from '../progress/playground';
import { en } from '../shared/strings/en';
import './mission-catalog.css';

const copy = en.catalog;

export function MissionCatalog({ drafts, saveStatus, onRetrySave, onStartMission, onFreePlay }: {
  drafts: PlaygroundDraft[];
  saveStatus: SaveStatus;
  onRetrySave: () => void;
  onStartMission: (missionId: string) => void;
  onFreePlay: () => void;
}) {
  const [worldId, setWorldId] = useState<string | null>(null);
  const visibleWorlds = worldId ? worlds.filter((world) => world.id === worldId) : worlds;
  const visibleCount = visibleWorlds.reduce((count, world) => count + world.missionIds.length, 0);
  const programCount = missions.filter((mission) => drafts.some((draft) => draft.missionId === mission.id && draftSize(draft) > 0)).length;

  return (
    <div className="page mission-catalog">
      <header className="catalog-header">
        <div>
          <p className="catalog-summary">{copy.summary(worlds.length, missions.length)}</p>
          <h1>{copy.title}</h1>
          <p className="catalog-intro">{copy.intro}</p>
        </div>
        <button className="button button-secondary" onClick={onFreePlay}>
          {copy.freePlay}<ArrowRight size={17} aria-hidden="true" />
        </button>
      </header>
      <div className="catalog-toolbar">
        <nav className="catalog-filters" aria-label={copy.filterLabel}>
          <button aria-pressed={worldId === null} aria-controls="catalog-results" onClick={() => setWorldId(null)}>{copy.allWorlds}</button>
          {worlds.map((world) => (
            <button key={world.id} aria-label={world.title} aria-pressed={worldId === world.id} aria-controls="catalog-results" onClick={() => setWorldId(world.id)}>
              {world.title}<span aria-hidden="true">{world.missionIds.length}</span>
            </button>
          ))}
        </nav>
        <div className="catalog-counts">
          <p className="catalog-result-count" role="status">{copy.showing(visibleCount, missions.length)}</p>
          <p className="catalog-program-count">{copy.programCount(programCount)}</p>
        </div>
      </div>
      {saveStatus === 'error' && (
        <div className="catalog-save-message" role="alert">
          <p>{en.playground.saveStatus.error}</p>
          <button className="button button-secondary" onClick={onRetrySave}>{en.playground.retrySave}</button>
        </div>
      )}
      {saveStatus === 'recovered' && <p className="catalog-save-message" role="status">{en.playground.saveStatus.recovered}</p>}
      <div id="catalog-results" className="catalog-worlds" role="region" aria-label={copy.results}>
        {visibleWorlds.map((world) => (
          <section key={world.id} className="catalog-world" aria-labelledby={`catalog-${world.id}`}>
            <header className="catalog-world-heading">
              <div>
                <h2 id={`catalog-${world.id}`}>{world.title}</h2>
                <p>{world.description}</p>
              </div>
              <span>{copy.missionCount(world.missionIds.length)}</span>
            </header>
            <div className="catalog-cards">
              {world.missionIds.map((id, index) => {
                const mission = missionsById[id];
                const draft = drafts.find((item) => item.missionId === id);
                const stepCount = draft ? draftSize(draft) : 0;
                const outcome = draft?.outcome;
                return (
                  <article key={id} className="catalog-card" data-world={world.id} aria-labelledby={`mission-${id}`}>
                    <div className="catalog-card-top">
                      <span className="catalog-mission-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      <span className="catalog-goal-count">{copy.goalCount(mission.goals.length)}</span>
                    </div>
                    <h3 id={`mission-${id}`}>{mission.title}</h3>
                    <p className="catalog-brief">{mission.brief}</p>
                    <p className="catalog-time">{copy.threeStarTime(mission.timeLimits.threeStars)}</p>
                    <div className="catalog-program">
                      <p>{stepCount > 0 ? draft?.visualProgram ? en.studio.blockCount(stepCount) : copy.steps(stepCount) : copy.noProgram}</p>
                      {outcome ? (
                        <p className="catalog-last-run">
                          <span className="catalog-stars" aria-hidden="true">{[1, 2, 3].map((star) => <span key={star} className={star <= outcome.stars ? 'earned' : ''}>★</span>)}</span>
                          <span>{copy.lastRun(outcome.stars)}</span>
                        </p>
                      ) : stepCount > 0 ? <p className="catalog-no-run">{copy.noRun}</p> : null}
                    </div>
                    <button className={`button ${stepCount > 0 ? 'button-primary' : 'button-secondary'}`} aria-label={copy.openLabel(mission.title, stepCount > 0)} onClick={() => onStartMission(id)}>
                      {stepCount > 0 ? copy.continue : copy.start}<ArrowRight size={17} aria-hidden="true" />
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
