// @vitest-environment node
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { CompetitionHost } from './host';
import {
  authSchema,
  defaultSettings,
  viewSchema,
  type CompetitionAction,
  type CompetitionAuth,
  type CompetitionSettings,
} from './protocol';
import { fromCommands } from '../editor/program';
import { challengeEquipment, initialSoloFrame } from './challenges';
import { arena3dCatalog } from './arenas3d';
import { scoreboardCsv } from './files';

let host: CompetitionHost,
  server: Server,
  origin: string,
  now = 1_000_000;
beforeAll(async () => {
  await mkdir('.local', { recursive: true });
  await promisify(execFile)(process.execPath, ['scripts/build-electron.mjs']);
}, 30000);
async function stop() {
  await host?.close();
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
}
afterEach(stop);
async function setup(file?: string) {
  now = 1_000_000;
  host = await CompetitionHost.open({
    file,
    workerPath: resolve('dist-electron/match-worker.js'),
    now: () => now,
  });
  server = createServer((req, res) => {
    void host.handle(req, res, new URL(req.url ?? '/', origin));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
async function api(path: string, data?: unknown, token?: string) {
  return fetch(origin + '/api/classroom' + path, {
    method: data === undefined ? 'GET' : 'POST',
    headers: {
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
async function create(overrides: Partial<CompetitionSettings> = {}) {
  const response = await api('/sessions', {
    version: 1,
    opId: randomUUID(),
    settings: { ...defaultSettings, engine: 'planar', title: 'Robotics cup', ...overrides },
    pin: '123456',
  });
  expect(response.status).toBe(200);
  return authSchema.parse(await response.json());
}
async function joinStudent(teacher: CompetitionAuth, name: string) {
  return authSchema.parse(
    await (
      await api(`/sessions/${teacher.view.code}/join`, { version: 1, name, pin: '1122' })
    ).json(),
  );
}
const act = (auth: CompetitionAuth, action: CompetitionAction, opId = randomUUID()) =>
  api(`/sessions/${auth.view.code}/actions`, { version: 1, opId, action }, auth.token);
const view = async (auth: CompetitionAuth) =>
  viewSchema.parse(await (await api(`/sessions/${auth.view.code}`, undefined, auth.token)).json());
async function approve(teacher: CompetitionAuth, student: CompetitionAuth, entryId?: string) {
  expect(
    (await act(teacher, { type: 'approve', memberId: student.view.memberId!, entryId })).status,
  ).toBe(200);
}

// Several real HTTP requests and slow PIN hashes need room on school laptops.
describe('teacher competition host', { timeout: 15000 }, () => {
  it('times teacher-confirmed 3D tasks, protects the runtime and restores the finished pose', async () => {
    const directory = await mkdtemp(resolve('.local/classroom-3d-test-'));
    const file = join(directory, 'sessions.json');
    await setup(file);
    const scene = arena3dCatalog.find(a => a.group === 'FLL competition fields')!.id;
    const teacher = await create({ kind: 'challenge', engine: 'gears', scene, taskBrief: 'Deliver the cargo and return to base.', roundSeconds: 150 });
    const ada = await joinStudent(teacher, 'Ada'); await approve(teacher, ada);
    await act(teacher, { type: 'prepare' }); await act(ada, { type: 'take' });
    await act(ada, { type: 'submit', revision: 0, round: 1 }); await act(teacher, { type: 'lock' });
    const entryId = (await view(ada)).ownEntry!.id;
    await act(teacher, { type: 'start-attempt', entryId });
    const attemptId = (await view(teacher)).activeAttempt!.id, leaseId = randomUUID();
    const route = `/sessions/${teacher.view.code}/runtime`;
    const update = (type: string, extra = {}, token = teacher.token) => api(route, { type, attemptId, leaseId, ...extra }, token);
    expect((await update('claim', {}, ada.token)).status).toBe(403);
    expect((await (await update('claim')).json()).program).toEqual(fromCommands([]));
    expect((await (await update('claim', { leaseId: randomUUID() })).json()).accepted).toBe(false);
    now += 20000; // Loading does not consume attempt time.
    await update('started'); now += 6500;
    await update('frame', { frame: { ...initialSoloFrame('basics-4'), time: 0.1 } });
    expect((await view(ada)).activeAttempt!.frame.time).toBe(6.5);
    expect((await act(ada, { type: 'judge-attempt', completed: true })).status).toBe(403);
    const finalFrame = {
      ...initialSoloFrame('basics-4'),
      pose: { meshes: [
        { i: 0, p: [18.5, 3.8, -0.7], r: [0, 0, 0, 1], enabled: true },
        { i: 12, p: [2, 0.5, 9], r: [0, 1, 0, 0], enabled: false },
      ] },
    };
    await update('finish', { frame: finalFrame, verdict: { completed: true, goals: [], seconds: 0, error: null } });
    expect((await view(teacher)).attempts).toHaveLength(0);
    expect((await view(teacher)).activeAttempt!.frame.awaitingConfirmation).toBe(true);
    now += 1000;
    const operation = randomUUID();
    expect((await act(teacher, { type: 'judge-attempt', completed: true }, operation)).status).toBe(200);
    await act(teacher, { type: 'judge-attempt', completed: true }, operation);
    const scored = await view(teacher);
    expect(scored.attempts).toHaveLength(1);
    expect(scored.attempts[0].verdict).toMatchObject({ completed: true, seconds: 6.5 });
    expect(scoreboardCsv(scored)).toContain('Deliver the cargo and return to base.');
    expect((await (await update('finish')).json()).accepted).toBe(false);
    expect(scored.attempts[0].frame.pose).toEqual(finalFrame.pose);
    await stop(); await setup(file);
    expect((await api(`/sessions/${teacher.view.code}`, undefined, teacher.token)).status).toBe(401);
    const restored = authSchema.parse(await (await api(`/sessions/${teacher.view.code}/teacher`, { version: 1, pin: '123456' })).json());
    expect(restored.view.activeAttempt).toBeNull();
    expect(restored.view.attempts).toEqual(scored.attempts);
    expect(restored.view.soloStandings).toEqual(scored.soloStandings);
  });
  it('enforces 3D time limits on the host and voids a disconnected runner', async () => {
    await setup();
    const teacher = await create({ kind: 'challenge', engine: 'gears', roundSeconds: 10 });
    const ada = await joinStudent(teacher, 'Ada'); await approve(teacher, ada);
    await act(teacher, { type: 'prepare' }); await act(ada, { type: 'take' });
    await act(ada, { type: 'submit', revision: 0, round: 1 }); await act(teacher, { type: 'lock' });
    const entryId = (await view(ada)).ownEntry!.id;
    const start = async () => { await act(teacher, { type: 'start-attempt', entryId }); return { attemptId: (await view(teacher)).activeAttempt!.id, leaseId: randomUUID() }; };
    const route = `/sessions/${teacher.view.code}/runtime`;
    const first = await start();
    await api(route, { ...first, type: 'claim' }, teacher.token); await api(route, { ...first, type: 'started' }, teacher.token);
    now += 10001;
    await api(route, { ...first, type: 'finish', frame: initialSoloFrame('basics-4'), verdict: { completed: true, goals: [], seconds: 0, error: null } }, teacher.token);
    expect((await view(teacher)).attempts[0].verdict).toMatchObject({ completed: false, seconds: 10 });
    const second = await start(); await api(route, { ...second, type: 'claim' }, teacher.token);
    now += 10001;
    await expect.poll(async () => (await view(teacher)).attempts.length).toBe(2);
    expect((await view(teacher)).attempts[1].void).toBe(true);
  });
  it('runs a locked solo submission, protects its source and restores its scored result', async () => {
    const directory = await mkdtemp(resolve('.local/classroom-solo-test-'));
    const file = join(directory, 'sessions.json');
    await setup(file);
    const teacher = await create({ kind: 'challenge', challenge: 'basics-4', roundSeconds: 10 });
    const ada = await joinStudent(teacher, 'Ada'), ben = await joinStudent(teacher, 'Ben');
    await approve(teacher, ada);
    await approve(teacher, ben);
    await act(teacher, { type: 'prepare' });
    const program = fromCommands(challengeEquipment('basics-4').mission.reference);
    await act(ada, { type: 'take' });
    await act(ada, { type: 'save', baseRevision: 0, program });
    await act(ada, { type: 'submit', revision: 1, round: 1 });
    await act(teacher, { type: 'lock' });
    const entryId = (await view(ada)).ownEntry!.id;
    expect((await act(ada, { type: 'start-attempt', entryId })).status).toBe(403);
    expect((await act(teacher, { type: 'start', entryIds: [entryId, entryId] })).status).toBe(409);
    const op = randomUUID();
    expect((await act(teacher, { type: 'start-attempt', entryId }, op)).status).toBe(200);
    expect((await act(teacher, { type: 'start-attempt', entryId }, op)).status).toBe(200);
    expect((await act(teacher, { type: 'start-attempt', entryId })).status).toBe(409);
    await expect.poll(async () => (await view(teacher)).attempts.length, { timeout: 12000 }).toBe(1);
    const scored = await view(teacher), result = scored.attempts[0];
    expect(result.void).toBe(false);
    expect(result.verdict.completed).toBe(true);
    expect(result.revision).toBe(1);
    expect(result).not.toHaveProperty('program');
    expect(scored.soloStandings[0].name).toBe('Ada');
    expect(scoreboardCsv(scored)).toContain('"Precision stop","10 seconds"');
    expect(scoreboardCsv(scored)).toContain('"Ada","1","Completed","2/2"');
    const route = `/sessions/${teacher.view.code}/attempts/${result.id}/program`;
    expect((await api(route, undefined, ben.token)).status).toBe(403);
    expect((await api(route, undefined, ada.token)).status).toBe(200);
    await stop(); await setup(file);
    const restored = authSchema.parse(await (await api(`/sessions/${teacher.view.code}/teacher`, { version: 1, pin: '123456' })).json());
    expect(restored.view.attempts).toEqual(scored.attempts);
    expect(restored.view.soloStandings).toEqual(scored.soloStandings);
    expect((await (await api(route, undefined, restored.token)).json()).program).toEqual(program);
  }, 25000);

  it('voids an interrupted solo attempt without awarding a result or allowing late writes', async () => {
    await setup();
    const teacher = await create({ kind: 'challenge', challenge: 'loops-1', preparationMinutes: 1, roundSeconds: 10 });
    const ada = await joinStudent(teacher, 'Ada'); await approve(teacher, ada);
    await act(teacher, { type: 'prepare' }); await act(ada, { type: 'take' });
    await act(ada, { type: 'save', baseRevision: 0, program: fromCommands([{ type: 'wait', durationMs: 60000 }]) });
    await act(ada, { type: 'submit', revision: 1, round: 1 });
    now += 60001;
    const entryId = (await view(ada)).ownEntry!.id;
    expect((await view(teacher)).phase).toBe('locked');
    expect((await act(ada, { type: 'save', baseRevision: 1, program: fromCommands([]) })).status).toBe(409);
    expect((await act(teacher, { type: 'start-attempt', entryId })).status).toBe(200);
    expect((await act(teacher, { type: 'stop' })).status).toBe(200);
    const stopped = await view(teacher);
    expect(stopped.activeAttempt).toBeNull();
    expect(stopped.attempts[0].void).toBe(true);
    expect(stopped.soloStandings[0].attempts).toBe(0);
  });
  it('keeps teacher actions and other entries’ programs private, and deduplicates submissions', async () => {
    await setup();
    const teacher = await create(),
      ada = await joinStudent(teacher, 'Ada'),
      ben = await joinStudent(teacher, 'Ben');
    expect((await act(ada, { type: 'prepare' })).status).toBe(403);
    expect((await act(ada, { type: 'take' })).status).toBe(403);
    await approve(teacher, ada);
    await approve(teacher, ben);
    await act(teacher, { type: 'prepare' });
    await act(ada, { type: 'take' });
    const program = fromCommands([
      { type: 'tank', leftPercent: 80, rightPercent: 80, durationMs: 60000 },
    ]);
    const operation = randomUUID();
    expect((await act(ada, { type: 'save', baseRevision: 0, program }, operation)).status).toBe(
      200,
    );
    expect((await act(ada, { type: 'save', baseRevision: 0, program }, operation)).status).toBe(
      200,
    );
    expect((await view(ada)).ownEntry?.revision).toBe(1);
    const submission = randomUUID();
    await act(ada, { type: 'submit', revision: 1, round: 1 }, submission);
    await act(ada, { type: 'submit', revision: 1, round: 1 }, submission);
    expect((await view(ada)).ownEntry?.submittedRevision).toBe(1);
    const other = await view(ben),
      entry = (await view(ada)).ownEntry!;
    expect(other.entries.every((e) => !('program' in e))).toBe(true);
    expect(JSON.stringify(other)).not.toContain(teacher.token);
    expect(
      (
        await api(
          `/sessions/${teacher.view.code}/entries/${entry.id}/program`,
          undefined,
          ben.token,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await api(
          `/sessions/${teacher.view.code}/entries/${entry.id}/program`,
          undefined,
          teacher.token,
        )
      ).status,
    ).toBe(200);
    expect((await act(ada, { type: 'save', baseRevision: 1, program })).status).toBe(409);
  });
  it('gives one teammate the editing turn and preserves versions on stale writes', async () => {
    await setup();
    const teacher = await create({ mode: 'team', teamSize: 2 }),
      ada = await joinStudent(teacher, 'Ada'),
      ben = await joinStudent(teacher, 'Ben'),
      cara = await joinStudent(teacher, 'Cara');
    await act(teacher, { type: 'team', name: 'Comets' });
    const entry = (await view(teacher)).entries[0];
    await approve(teacher, ada, entry.id);
    await approve(teacher, ben, entry.id);
    expect(
      (await act(teacher, { type: 'approve', memberId: cara.view.memberId!, entryId: entry.id }))
        .status,
    ).toBe(409);
    const claims = await Promise.all([act(ada, { type: 'take' }), act(ben, { type: 'take' })]);
    expect(claims.map((r) => r.status).sort()).toEqual([200, 409]);
    const first = claims[0].ok ? ada : ben,
      second = claims[0].ok ? ben : ada;
    const a = fromCommands([{ type: 'wait', durationMs: 1000 }]),
      b = fromCommands([{ type: 'wait', durationMs: 2000 }]);
    await act(first, { type: 'save', baseRevision: 0, program: a });
    await act(first, { type: 'release' });
    await act(second, { type: 'take' });
    expect((await act(second, { type: 'save', baseRevision: 0, program: b })).status).toBe(409);
    expect((await view(second)).ownEntry?.program).toEqual(a);
    await act(second, { type: 'save', baseRevision: 1, program: b });
    expect((await view(second)).ownEntry?.history.map((v) => v.revision)).toEqual([0, 1]);
    await act(second, { type: 'restore', revision: 1, baseRevision: 2 });
    expect((await view(second)).ownEntry?.program).toEqual(a);
    expect((await view(second)).ownEntry?.revision).toBe(3);
  });
  it('pauses the preparation clock and rejects late or old-round submissions', async () => {
    await setup();
    const teacher = await create({ preparationMinutes: 1 }),
      ada = await joinStudent(teacher, 'Ada');
    await approve(teacher, ada);
    await act(teacher, { type: 'prepare' });
    now += 20000;
    await act(teacher, { type: 'pause' });
    now += 100000;
    expect((await view(teacher)).phase).toBe('preparing');
    expect((await view(teacher)).remainingMs).toBe(40000);
    await act(teacher, { type: 'resume' });
    await act(ada, { type: 'take' });
    now += 40001;
    expect((await act(ada, { type: 'submit', revision: 0, round: 1 })).status).toBe(409);
    expect((await view(teacher)).phase).toBe('locked');
    await act(teacher, { type: 'prepare' });
    await act(ada, { type: 'take' });
    expect((await act(ada, { type: 'submit', revision: 0, round: 1 })).status).toBe(409);
    expect((await act(ada, { type: 'submit', revision: 0, round: 2 })).status).toBe(200);
  });
  it('restores sessions and submitted programs, voids interrupted matches and requires fresh sign-in', async () => {
    const directory = await mkdtemp(resolve('.local/classroom-test-')),
      file = join(directory, 'sessions.json');
    await setup(file);
    const teacher = await create({ arena: 'compact', roundSeconds: 10 }),
      ada = await joinStudent(teacher, 'Ada'),
      ben = await joinStudent(teacher, 'Ben');
    for (const student of [ada, ben]) await approve(teacher, student);
    await act(teacher, { type: 'prepare' });
    for (const student of [ada, ben]) {
      await act(student, { type: 'take' });
      await act(student, { type: 'submit', revision: 0, round: 1 });
    }
    await act(teacher, { type: 'lock' });
    const entries = (await view(teacher)).entries;
    expect(
      (await act(teacher, { type: 'start', entryIds: [entries[0].id, entries[1].id] })).status,
    ).toBe(200);
    expect(
      (await act(teacher, { type: 'start', entryIds: [entries[0].id, entries[1].id] })).status,
    ).toBe(409);
    await stop();
    await setup(file);
    expect((await api(`/sessions/${teacher.view.code}`, undefined, teacher.token)).status).toBe(
      401,
    );
    const restored = authSchema.parse(
      await (
        await api(`/sessions/${teacher.view.code}/teacher`, { version: 1, pin: '123456' })
      ).json(),
    );
    expect(restored.view.phase).toBe('locked');
    expect(restored.view.results).toHaveLength(1);
    expect(restored.view.results[0].void).toBe(true);
    expect(restored.view.standings.every((r) => r.points === 0)).toBe(true);
    expect(restored.view.entries.every((e) => e.submittedRevision === 0)).toBe(true);
    const raw = await readFile(file, 'utf8');
    expect(raw).not.toContain(teacher.token);
    expect(raw).not.toContain('"pin":');
    const student = await joinStudent(restored, 'Ada');
    expect(student.view.memberId).toBe(ada.view.memberId);
    expect(student.view.ownEntry?.lock).toBeNull();
  });
  it('preserves a malformed host save rather than overwriting it', async () => {
    const directory = await mkdtemp(resolve('.local/classroom-test-')),
      file = join(directory, 'sessions.json');
    await writeFile(file, '{unread');
    await setup(file);
    expect((await (await api('/info')).json()).loadError).toBe(true);
    expect(
      (
        await api('/sessions', {
          version: 1,
          opId: randomUUID(),
          settings: { ...defaultSettings, title: 'New' },
          pin: '123456',
        })
      ).status,
    ).toBe(503);
    await stop();
    expect(await readFile(file, 'utf8')).toBe('{unread');
  });
});
