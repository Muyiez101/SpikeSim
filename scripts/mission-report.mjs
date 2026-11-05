import { readFile, writeFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('recordings');
const json = async path => JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''));
const inventory = await json(resolve(root, 'inventory.json'));
const rows = [];
for (const entry of [...inventory.classroom, ...inventory.attachmentPractice]) {
  let result;
  try { result = await json(resolve(root, `results/${entry.id}.json`)); } catch { /* Not yet checked. */ }
  const passed = result?.status === 'complete' && (result.verdict?.stars === 3 || result.goal?.passed === true) && !result.errors?.length;
  const videoExists = result?.video && await stat(resolve(root, result.video)).then(file => file.size > 1000).catch(() => false);
  rows.push({ ...entry, group: entry.id.startsWith('practice-') ? 'Attachment exercise' : 'Classroom',
    status: passed && videoExists ? 'recorded' : result ? 'needs-work' : 'pending',
    label: passed && videoExists ? 'Passed in 3D · video ready' : result?.verdict?.passed ? 'Goals passed · improve reference timing' : result ? 'Needs a successful 3D run' : 'Not yet checked in this pass',
    video: passed && videoExists ? result.video : undefined,
    result: result ? `results/${entry.id}.json` : undefined,
    details: result?.verdict?.goals.filter(goal => !goal.passed).map(goal => goal.label).join('; ') ?? '',
  });
}
for (const entry of inventory.practice) {
  let result;
  if (entry.resultId) try { result = await json(resolve(root, `results/${entry.resultId}.json`)); } catch { /* Not yet checked. */ }
  const passed = result?.status === 'complete' && result.goal?.passed === true && !result.errors?.length;
  const videoExists = passed && await stat(resolve(root, result.video)).then(file => file.size > 1000).catch(() => false);
  rows.push({ ...entry, group: 'Practice world', status: videoExists ? 'recorded' : 'pending',
    label: videoExists ? `Passed in 3D · ${entry.scope}` : 'Solution and recording still needed',
    video: videoExists ? result.video : undefined,
    result: result ? `results/${entry.resultId}.json` : undefined,
  });
}
for (const entry of inventory.competition) rows.push({ ...entry, group: 'Competition field', status: 'pending', label: entry.content === 'mat-only' ? 'Mat only · mission models needed' : 'Models included · solution and scoring still needed' });
const escaped = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const classroomCount = rows.filter(row => row.group === 'Classroom' && row.status === 'recorded').length;
const exerciseCount = rows.filter(row => row.group === 'Attachment exercise' && row.status === 'recorded').length;
const practiceCount = rows.filter(row => row.group === 'Practice world' && row.status === 'recorded').length;
const link = (file, label) => file ? `<a href="${escaped(file)}"${file.endsWith('.rlproj') ? ' download' : ''}>${label}</a>` : '—';
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SpikeSim mission recordings</title>
<style>body{font:16px/1.5 system-ui,sans-serif;color:#18233b;background:#f5f6fb;margin:0}main{max-width:1200px;margin:auto;padding:32px 20px}h1{font-size:2rem;margin-bottom:8px}p{max-width:85ch}a{color:#5339bc}label{display:inline-flex;gap:8px;align-items:center;margin:8px 16px 16px 0}input,select{font:inherit;padding:8px;border:1px solid #929bad;border-radius:6px;max-width:65vw}table{border-collapse:collapse;width:100%;background:white}th,td{padding:12px;text-align:left;vertical-align:top;border-bottom:1px solid #d8dce6}th{background:#e9e4fc;position:sticky;top:0}.table{overflow:auto}small{display:block;color:#526078}.recorded{color:#176533;font-weight:600}.needs-work{color:#94341d}.counts{font-weight:600;font-size:1.1rem}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #6945d9;outline-offset:3px}</style>
<main><h1>Mission recordings and block projects</h1><p class="counts">${classroomCount} / ${inventory.classroom.length} classroom missions recorded · ${exerciseCount} / ${inventory.attachmentPractice.length} attachment exercises recorded · ${practiceCount} / ${inventory.practice.length} practice courses recorded</p>
<p>Use <strong>Import program → Open program</strong> in SpikeSim to open an editable project. Each project includes its robot and field. Videos use an overview that keeps the complete mat visible.</p>
<p>Competition fields are listed separately from solved missions. Mat-only entries still need physical mission models. Included models do not imply an official competition score.</p>
<label>Find a mission <input id="search" type="search" placeholder="Name or field"></label><label>Show <select id="filter"><option value="all">Everything</option><option value="recorded">Recorded</option><option value="needs-work">Needs a fix</option><option value="pending">Still to do</option></select></label><p id="count" aria-live="polite"></p>
<div class="table"><table><thead><tr><th scope="col">Mission</th><th scope="col">Status</th><th scope="col">Blocks</th><th scope="col">Video</th></tr></thead><tbody>${rows.map(row => `<tr data-status="${row.status}"><td>${escaped(row.name)}<small>${escaped(row.group)}</small></td><td><span class="${row.status}">${escaped(row.label)}</span>${row.details ? `<small>${escaped(row.details)}</small>` : ''}${row.result ? `<small>${link(row.result, 'Run details')}</small>` : ''}</td><td>${link(row.project, 'Open project file')}</td><td>${link(row.video, 'Watch video')}</td></tr>`).join('')}</tbody></table></div>
<p><a href="README.md">Import instructions and test scope</a></p></main>
<script>const search=document.querySelector('#search'),filter=document.querySelector('#filter'),rows=[...document.querySelectorAll('tbody tr')];function update(){let count=0;for(const row of rows){row.hidden=!(row.textContent.toLowerCase().includes(search.value.toLowerCase())&&(filter.value==='all'||row.dataset.status===filter.value));if(!row.hidden)count++;}document.querySelector('#count').textContent=count+' entries shown';}search.addEventListener('input',update);filter.addEventListener('change',update);update();</script></html>`;
await writeFile(resolve(root, 'index.html'), html);
await writeFile(resolve(root, 'coverage.json'), JSON.stringify({ generatedAt: new Date().toISOString(), classroomRecorded: classroomCount, attachmentRecorded: exerciseCount, practiceRecorded: practiceCount, entries: rows }, null, 2) + '\n');
console.log(`Report: ${classroomCount} classroom recordings, ${exerciseCount} attachment recordings, ${practiceCount} practice recordings.`);
