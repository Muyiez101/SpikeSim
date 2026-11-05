import { Download } from 'lucide-react';
import { en } from '../shared/strings/en';
import type { CompetitionView } from './protocol';
import { exportScoreboard } from './files';

const c = en.classroom;
export function SoloScoreboard({ view, disabled, download }: { view: CompetitionView; disabled: boolean; download: (attemptId: string) => void }) {
  return <>
    <section className="class-card class-scoreboard class-solo-scoreboard">
      <div className="class-card-heading"><h2>{c.leaderboard}</h2><button onClick={() => exportScoreboard(view)}><Download size={16} aria-hidden="true" />{c.export}</button></div>
      <p>{c.soloRuleSummary}</p>
      <div className="class-table-scroll"><table>
        <thead><tr>{[c.rank, c.entry, c.attempts, c.result, c.goals, c.bestTime].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{view.soloStandings.map(row => <tr key={row.entryId}><td>{row.rank}</td><th scope="row">{row.name}</th><td>{row.attempts}</td><td>{row.completed ? c.completed : row.attempts ? c.incomplete : c.notRun}</td><td>{row.attempts ? `${row.goals} / ${row.total}` : '—'}</td><td>{row.seconds === null ? '—' : row.seconds.toFixed(2)}</td></tr>)}</tbody>
      </table></div>
    </section>
    <section className="class-card"><h2>{c.soloResults}</h2>{!view.attempts.length && <p>{c.soloNoResults}</p>}
      <ol className="class-result-list">{view.attempts.slice().reverse().map(result => <li key={result.id}>
        <div><strong>{result.entryName} · {result.void ? c.void : result.verdict.completed ? c.completed : c.incomplete}</strong><span>{c.goalCount(result.verdict.goals.filter(g => g.passed).length, result.verdict.goals.length)} · {c.preciseSeconds(result.verdict.seconds)}</span><small>{c.round(result.round)} · {c.revision(result.revision)}</small></div>
        {(view.role === 'teacher' || result.entryId === view.ownEntry?.id) && <button disabled={disabled} onClick={() => download(result.id)}>{c.download}: {result.entryName}</button>}
      </li>)}</ol>
    </section>
  </>;
}
