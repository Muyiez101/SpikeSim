import { randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Worker } from 'node:worker_threads';
import { ZodError } from 'zod';
import { en } from '../shared/strings/en';
import { sumoExample } from '../lan/example';
import { validateMatchProgram } from '../lan/program';
import { initialSoloFrame, soloMessageSchema, soloStarter, soloStandings, validateSoloProgram, type SoloFrame } from './challenges';
import {
  arenas,
  createSchema,
  frameSchema,
  joinSchema,
  operationSchema,
  standings,
  storeSchema,
  teacherLoginSchema,
  type CompetitionAction,
  type CompetitionEntry,
  type CompetitionSession,
  type CompetitionStore,
  type CompetitionView,
} from './protocol';
import type { MatchFrame } from '../lan/match';
import { runtime3dRequestSchema } from './runtime3d-protocol';
import { arena3dCatalog } from './arenas3d';

const copy = en.classroom,
  errors = copy.errors;
const local = (address: string | undefined) =>
  ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address ?? '');
const emptyFrame = (radius = 100): MatchFrame => ({
  time: 0,
  robots: [
    { x: 0, y: -radius * 0.38, heading: 0 },
    { x: 0, y: radius * 0.38, heading: 180 },
  ],
  winner: null,
  reason: null,
  finished: false,
});
class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
function requireCondition(value: unknown, message = errors.phase, status = 409): asserts value {
  if (!value) throw new HttpError(message, status);
}
async function derive(pin: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(pin, salt, 32, (error, key) => (error ? reject(error) : resolve(key))),
  );
}
async function hashPin(pin: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await derive(pin, salt)).toString('hex')}`;
}
async function checkPin(pin: string, encoded: string) {
  const [salt, hash] = encoded.split(':');
  return timingSafeEqual(await derive(pin, salt), Buffer.from(hash, 'hex'));
}
async function body(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 150_000) throw new HttpError(errors.invalid, 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(errors.invalid);
  }
}
type Actor = { code: string; id: string; expiresAt: number };
type Options = {
  workerPath: string;
  file?: string;
  now?: () => number;
  links?: (code: string) => string[];
};

/** Transport-independent state is persisted without access tokens. Only this
 * host starts match workers and awards points from their actual final frames. */
export class CompetitionHost {
  private store: CompetitionStore = { schemaVersion: 1, sessions: [] };
  private tokens = new Map<string, Actor>();
  private seen = new Map<string, number>();
  private attempts = new Map<string, { start: number; count: number }>();
  private workers = new Map<string, Worker>();
  private frames = new Map<string, MatchFrame>();
  private soloFrames = new Map<string, SoloFrame>();
  private runtimeLeases = new Map<string, { id: string; token: string; seen: number; start: number | null; ended: number | null }>();
  private queue: Promise<unknown> = Promise.resolve();
  private timer: ReturnType<typeof setInterval> | undefined;
  private saveError = false;
  private loadError = false;
  private closing = false;
  private now: () => number;
  private constructor(private options: Options) {
    this.now = options.now ?? Date.now;
  }

  static async open(options: Options) {
    const host = new CompetitionHost(options);
    if (options.file) {
      try {
        const text = await readFile(options.file, 'utf8');
        if (Buffer.byteLength(text) > 64_000_000) throw Error();
        host.store = storeSchema.parse(JSON.parse(text));
        for (const session of host.store.sessions) {
          requireCondition(
            new Set(session.members.map((m) => m.id)).size === session.members.length,
            errors.file,
          );
          requireCondition(
            new Set(session.entries.map((e) => e.id)).size === session.entries.length,
            errors.file,
          );
          for (const entry of session.entries) {
            requireCondition(
              entry.memberIds.every((id) =>
                session.members.some((m) => m.id === id && m.entryId === entry.id),
              ),
              errors.file,
            );
            host.validate(session,entry.program);
            entry.history.forEach((v) => host.validate(session,v.program));
            if (entry.submission) host.validate(session,entry.submission.program);
            entry.lock = null;
          }
          requireCondition(
            session.members.every(
              (m) =>
                !m.entryId ||
                session.entries.some((e) => e.id === m.entryId && e.memberIds.includes(m.id)),
            ),
            errors.file,
          );
          session.results.forEach((result) => result.programs.forEach(validateMatchProgram));
          session.attempts.forEach(result=>validateSoloProgram(result.program));
          if(session.activeAttempt)host.finishAttempt(session,initialSoloFrame(session.settings.challenge));
          if (session.active) {
            host.finish(
              session,
              { ...emptyFrame(session.active.rules.radiusCm), finished: true, reason: 'cancelled' },
              true,
            );
          }
        }
        await host.persist();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          host.store = { schemaVersion: 1, sessions: [] };
          host.loadError = true;
        }
      }
    }
    host.timer = setInterval(() => {
      void host.serial(async () => {
        if (host.closing) return;
        let changed = false;
        for (const session of host.store.sessions) {
          changed = host.deadline(session) || changed;
          const attempt = session.activeAttempt;
          if (!attempt || session.settings.engine !== 'gears') continue;
          const lease = host.runtimeLeases.get(session.code);
          if ((!lease && host.now() - attempt.startedAt > 60000) || (lease && lease.start === null && host.now() - attempt.startedAt > 90000) || (lease && host.now() - lease.seen > 10000)) {
            host.finishAttempt(session, host.soloFrames.get(session.code) ?? initialSoloFrame(attempt.challenge)); changed = true;
          } else if (lease?.start !== null && lease?.start !== undefined && lease.ended === null && host.now() - lease.start > attempt.seconds * 1000 + 1500) {
            host.finishAttempt(session, { ...(host.soloFrames.get(session.code) ?? initialSoloFrame(attempt.challenge)), time: attempt.seconds }, { completed: false, goals: [], seconds: attempt.seconds, error: copy.timeUp }); changed = true;
          }
        }
        for (const [token, actor] of host.tokens)
          if (actor.expiresAt < host.now()) host.tokens.delete(token);
        if (changed) await host.persist();
      });
    }, 500);
    return host;
  }

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(work);
    this.queue = next.catch(() => {});
    return next;
  }
  private async persist() {
    if (!this.options.file) return;
    if (this.loadError) {
      this.saveError = true;
      return;
    }
    try {
      const text = JSON.stringify(this.store);
      if (Buffer.byteLength(text) > 64_000_000) throw Error();
      await mkdir(path.dirname(this.options.file), { recursive: true });
      const temporary = this.options.file + '.tmp';
      await writeFile(temporary, text, { encoding: 'utf8', mode: 0o600 });
      await rename(temporary, this.options.file);
      this.saveError = false;
    } catch {
      this.saveError = true;
    }
  }
  private audit(session: CompetitionSession, actor: string, action: string) {
    session.audit.push({ at: this.now(), actor, action });
    session.audit = session.audit.slice(-500);
    session.updatedAt = this.now();
  }
  private deadline(session: CompetitionSession) {
    if (
      session.phase === 'preparing' &&
      session.deadline !== null &&
      this.now() >= session.deadline
    ) {
      session.phase = 'locked';
      session.deadline = null;
      session.remainingMs = null;
      session.entries.forEach((e) => {
        e.lock = null;
      });
      this.audit(session, 'host', 'deadline');
      return true;
    }
    return false;
  }
  private signIn(session: CompetitionSession, id: string) {
    const token = randomBytes(32).toString('base64url');
    this.tokens.set(token, { code: session.code, id, expiresAt: this.now() + 30 * 60_000 });
    this.seen.set(id, this.now());
    this.audit(session, id, 'sign-in');
    return { token, view: this.view(session, id) };
  }
  private actor(req: IncomingMessage, session: CompetitionSession) {
    const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
    const actor = this.tokens.get(token);
    requireCondition(
      actor &&
        actor.code === session.code &&
        actor.expiresAt >= this.now() &&
        (actor.id === 'teacher' || session.members.some((m) => m.id === actor.id)),
      errors.expired,
      401,
    );
    actor.expiresAt = this.now() + 30 * 60_000;
    this.seen.set(actor.id, this.now());
    const entry = session.entries.find((e) => e.lock?.memberId === actor.id);
    if (entry?.lock && entry.lock.expiresAt >= this.now())
      entry.lock.expiresAt = this.now() + 15 * 60_000;
    return actor.id;
  }
  private rate(req: IncomingMessage, code: string) {
    const key = `${req.socket.remoteAddress}:${code}`,
      record = this.attempts.get(key),
      now = this.now();
    if (!record || now - record.start >= 60_000) {
      if (this.attempts.size > 256) this.attempts.clear();
      this.attempts.set(key, { start: now, count: 1 });
    } else requireCondition(++record.count <= 8, errors.rate, 429);
  }
  private view(session: CompetitionSession, actor: string): CompetitionView {
    const teacher = actor === 'teacher',
      member = session.members.find((m) => m.id === actor);
    const allowed = teacher || member?.approved;
    const entryView = (entry: CompetitionEntry) => ({
      id: entry.id,
      name: entry.name,
      memberIds: entry.memberIds,
      revision: entry.revision,
      lock: entry.lock && entry.lock.expiresAt >= this.now() ? entry.lock : null,
      submittedRevision:
        entry.submission?.round === session.round ? entry.submission.revision : null,
    });
    const own = session.entries.find((e) => e.id === member?.entryId);
    return {
      code: session.code,
      settings: session.settings,
      phase: session.phase,
      joiningOpen: session.joiningOpen,
      round: session.round,
      serverTime: this.now(),
      deadline: session.deadline,
      remainingMs: session.remainingMs,
      role: teacher ? 'teacher' : 'student',
      memberId: teacher ? null : actor,
      storage: this.saveError ? 'error' : this.options.file ? 'saved' : 'memory',
      links: this.options.links?.(session.code) ?? [],
      members: session.members
        .filter((m) => allowed || m.id === actor)
        .map(({ id, name, approved, entryId }) => ({
          id,
          name,
          approved,
          entryId,
          connected: this.now() - (this.seen.get(id) ?? 0) < 15_000,
        })),
      entries: allowed ? session.entries.map(entryView) : [],
      ownEntry:
        own && allowed
          ? {
              ...entryView(own),
              program: own.program,
              history: own.history.map(({ revision, authorId, savedAt }) => ({
                revision,
                authorId,
                savedAt,
              })),
            }
          : null,
      active:
        allowed && session.active
          ? {
              ...this.publicMatch(session.active),
              frame: this.frames.get(session.code) ?? emptyFrame(session.active.rules.radiusCm),
            }
          : null,
      results: allowed
        ? session.results.map((result) => ({
            ...this.publicMatch(result),
            finishedAt: result.finishedAt,
            void: result.void,
            frame: result.frame,
          }))
        : [],
      activeAttempt: allowed&&session.activeAttempt?{...this.publicAttempt(session.activeAttempt),frame:this.soloFrames.get(session.code)??initialSoloFrame(session.settings.challenge)}:null,
      attempts: allowed?session.attempts.map(result=>({...this.publicAttempt(result),finishedAt:result.finishedAt,void:result.void,frame:result.frame,verdict:result.verdict})):[],
      soloStandings: allowed?soloStandings(session.entries,session.attempts):[],
      standings: allowed ? standings(session) : [],
    };
  }
  private publicMatch(match: NonNullable<CompetitionSession['active']>) {
    const { id, round, entryIds, entryNames, revisions, rules, startedAt } = match;
    return { id, round, entryIds, entryNames, revisions, rules, startedAt };
  }
  private publicAttempt(attempt: NonNullable<CompetitionSession['activeAttempt']>){const {id,round,entryId,entryName,revision,challenge,seconds,startedAt}=attempt;return {id,round,entryId,entryName,revision,challenge,seconds,startedAt};}
  private validate(session:CompetitionSession,program:unknown){return session.settings.kind==='challenge'?validateSoloProgram(program):validateMatchProgram(program);}
  private entry(session: CompetitionSession, actor: string) {
    const member = session.members.find((m) => m.id === actor);
    const entry = session.entries.find((e) => e.id === member?.entryId);
    requireCondition(member?.approved && entry, errors.approval, 403);
    return entry;
  }
  private canEdit(session: CompetitionSession, entry: CompetitionEntry, actor: string) {
    requireCondition(['lobby', 'preparing'].includes(session.phase));
    requireCondition(!entry.submission, errors.submitted);
    requireCondition(
      entry.lock?.memberId === actor && entry.lock.expiresAt >= this.now(),
      errors.lock,
    );
  }
  private createEntry(session: CompetitionSession, name: string) {
    requireCondition(session.entries.length < 16, errors.full);
    const entry: CompetitionEntry = {
      id: randomUUID(),
      name,
      memberIds: [],
      revision: 0,
      program: session.settings.kind==='challenge'?soloStarter():sumoExample(),
      history: [],
      submission: null,
      lock: null,
    };
    session.entries.push(entry);
    return entry;
  }
  private removeMember(session: CompetitionSession, memberId: string) {
    const member = session.members.find((m) => m.id === memberId);
    requireCondition(member, errors.missing, 404);
    const entry = session.entries.find((e) => e.id === member.entryId);
    if (entry) {
      entry.memberIds = entry.memberIds.filter((id) => id !== member.id);
      if (entry.lock?.memberId === member.id) entry.lock = null;
      if (session.settings.mode === 'individual') {
        session.entries = session.entries.filter((e) => e.id !== entry.id);
        session.results = session.results.filter((r) => !r.entryIds.includes(entry.id));
        session.attempts = session.attempts.filter(r=>r.entryId!==entry.id);
      }
    }
    session.members = session.members.filter((m) => m.id !== member.id);
    for (const [key, value] of this.tokens)
      if (value.code === session.code && value.id === memberId) this.tokens.delete(key);
  }
  private finish(session: CompetitionSession, frame: MatchFrame, voided = false) {
    if (!session.active) return;
    session.results.push({ ...session.active, finishedAt: this.now(), frame, void: voided });
    session.active = null;
    session.phase = 'locked';
    this.audit(session, 'host', voided ? 'match-void' : 'match-finished');
    const worker = this.workers.get(session.code);
    this.workers.delete(session.code);
    this.frames.delete(session.code);
    void worker?.terminate();
  }
  private launch(session: CompetitionSession) {
    const active = session.active;
    if (!active) return;
    try {
      const worker = new Worker(this.options.workerPath, {
        workerData: { programs: active.programs, rules: active.rules },
        resourceLimits: { maxOldGenerationSizeMb: 64, stackSizeMb: 4 },
      });
      this.workers.set(session.code, worker);
      worker.on('message', (value: unknown) => {
        if (this.workers.get(session.code) !== worker) return;
        const parsed = frameSchema.safeParse(value);
        if (!parsed.success) return;
        this.frames.set(session.code, parsed.data);
        if (parsed.data.finished)
          void this.serial(async () => {
            const current = this.store.sessions.find((s) => s.code === session.code);
            if (current?.active?.id === active.id) {
              this.finish(current, parsed.data);
              await this.persist();
            }
          });
      });
      const interrupted = () => {
        if (this.workers.get(session.code) !== worker) return;
        void this.serial(async () => {
          const current = this.store.sessions.find((s) => s.code === session.code);
          if (current?.active?.id === active.id) {
            this.finish(
              current,
              {
                ...(this.frames.get(session.code) ?? emptyFrame(active.rules.radiusCm)),
                winner: null,
                finished: true,
                reason: 'cancelled',
              },
              true,
            );
            await this.persist();
          }
        });
      };
      worker.on('error', interrupted);
      worker.on('exit', interrupted);
    } catch {
      void this.serial(async () => {
        const current = this.store.sessions.find((s) => s.code === session.code);
        if (current?.active?.id === active.id) {
          this.finish(
            current,
            { ...emptyFrame(active.rules.radiusCm), finished: true, reason: 'cancelled' },
            true,
          );
          await this.persist();
        }
      });
    }
  }

  private finishAttempt(session:CompetitionSession,frame:SoloFrame,verdict?:CompetitionSession['attempts'][number]['verdict']) {
    if(!session.activeAttempt)return;
    session.attempts.push({...session.activeAttempt,finishedAt:this.now(),frame,void:!verdict,verdict:verdict??{completed:false,goals:[],seconds:frame.time,error:copy.void}});
    session.activeAttempt=null;session.phase='locked';this.runtimeLeases.delete(session.code);this.audit(session,'host',verdict?'attempt-finished':'attempt-void');
    const worker=this.workers.get(session.code);this.workers.delete(session.code);this.soloFrames.delete(session.code);void worker?.terminate();
  }
  private launchAttempt(session:CompetitionSession) {
    if (session.settings.engine === 'gears') return;
    const active=session.activeAttempt;if(!active)return;
    const interrupted=()=>{void this.serial(async()=>{const current=this.store.sessions.find(s=>s.code===session.code);if(current?.activeAttempt?.id===active.id){this.finishAttempt(current,this.soloFrames.get(session.code)??initialSoloFrame(active.challenge));await this.persist();}});};
    try {
      const worker=new Worker(path.join(path.dirname(this.options.workerPath),'challenge-worker.js'),{workerData:active,resourceLimits:{maxOldGenerationSizeMb:96,stackSizeMb:4}});
      this.workers.set(session.code,worker);
      // Includes startup/computation time; an unresponsive worker never holds the host forever.
      const watchdog=setTimeout(interrupted,(active.seconds+10)*1000);
      worker.on('message',(value:unknown)=>{
        if(this.workers.get(session.code)!==worker)return;
        const parsed=soloMessageSchema.safeParse(value);if(!parsed.success)return;
        this.soloFrames.set(session.code,parsed.data.frame);
        if(parsed.data.finished)void this.serial(async()=>{const current=this.store.sessions.find(s=>s.code===session.code);if(current?.activeAttempt?.id===active.id){this.finishAttempt(current,parsed.data.frame,parsed.data.verdict);await this.persist();}});
      });
      worker.on('error',interrupted);worker.on('exit',()=>{clearTimeout(watchdog);interrupted();});
    }catch{interrupted();}
  }

  private async action(session: CompetitionSession, actor: string, action: CompetitionAction) {
    const teacher = actor === 'teacher';
    const studentActions = ['take', 'release', 'save', 'submit', 'withdraw', 'restore', 'leave'];
    if (!studentActions.includes(action.type)) requireCondition(teacher, errors.teacher, 403);
    else requireCondition(!teacher, errors.approval, 403);
    switch (action.type) {
      case 'team':
        requireCondition(
          session.settings.mode === 'team' && ['lobby', 'preparing'].includes(session.phase),
        );
        this.createEntry(session, action.name);
        break;
      case 'approve': {
        requireCondition(['lobby', 'preparing'].includes(session.phase));
        const member = session.members.find((m) => m.id === action.memberId);
        requireCondition(member, errors.missing, 404);
        let entry = session.entries.find((e) => e.id === action.entryId);
        if (session.settings.mode === 'individual')
          entry =
            session.entries.find((e) => e.id === member.entryId) ??
            this.createEntry(session, member.name);
        requireCondition(entry, errors.approval);
        requireCondition(!entry.submission, errors.submitted);
        requireCondition(
          entry.memberIds.includes(member.id) ||
            entry.memberIds.length <
              (session.settings.mode === 'individual' ? 1 : session.settings.teamSize),
          errors.full,
        );
        const previous = session.entries.find((e) => e.id === member.entryId);
        if (previous && previous.id !== entry.id) {
          requireCondition(!previous.submission, errors.submitted);
          previous.memberIds = previous.memberIds.filter((id) => id !== member.id);
          if (previous.lock?.memberId === member.id) previous.lock = null;
        }
        if (!entry.memberIds.includes(member.id)) entry.memberIds.push(member.id);
        member.entryId = entry.id;
        member.approved = true;
        break;
      }
      case 'remove':
        requireCondition(['lobby', 'preparing', 'ended'].includes(session.phase));
        this.removeMember(session, action.memberId);
        break;
      case 'reset-pin': {
        const member = session.members.find((m) => m.id === action.memberId);
        requireCondition(member, errors.missing, 404);
        member.pinHash = await hashPin(action.pin);
        for (const [key, value] of this.tokens)
          if (value.code === session.code && value.id === member.id) this.tokens.delete(key);
        break;
      }
      case 'joining':
        requireCondition(session.phase !== 'ended');
        session.joiningOpen = action.open;
        break;
      case 'prepare':
        requireCondition(['lobby', 'locked'].includes(session.phase));
        session.phase = 'preparing';
        session.round++;
        session.deadline = this.now() + session.settings.preparationMinutes * 60_000;
        session.remainingMs = null;
        session.entries.forEach((e) => {
          e.submission = null;
          e.lock = null;
        });
        break;
      case 'pause':
        requireCondition(session.phase === 'preparing' && session.deadline !== null);
        session.remainingMs = Math.max(0, session.deadline - this.now());
        session.deadline = null;
        break;
      case 'resume':
        requireCondition(session.phase === 'preparing' && session.remainingMs !== null);
        session.deadline = this.now() + session.remainingMs;
        session.remainingMs = null;
        break;
      case 'lock':
        requireCondition(session.phase === 'preparing');
        session.phase = 'locked';
        session.deadline = null;
        session.remainingMs = null;
        session.entries.forEach((e) => {
          e.lock = null;
        });
        break;
      case 'start': {
        requireCondition(session.phase === 'locked'&&session.settings.kind==='sumo');
        requireCondition(this.workers.size === 0, errors.busy);
        requireCondition(session.results.length < 200, errors.full);
        requireCondition(action.entryIds[0] !== action.entryIds[1], errors.sameEntry);
        const entries = action.entryIds.map((id) => session.entries.find((e) => e.id === id));
        requireCondition(
          entries.every((e) => e && e.memberIds.length && e.submission?.round === session.round),
          errors.notSubmitted,
        );
        const [a, b] = entries as [CompetitionEntry, CompetitionEntry];
        session.active = {
          id: randomUUID(),
          round: session.round,
          entryIds: [a.id, b.id],
          entryNames: [a.name, b.name],
          revisions: [a.submission!.revision, b.submission!.revision],
          programs: [
            structuredClone(a.submission!.program),
            structuredClone(b.submission!.program),
          ],
          rules: {
            radiusCm: arenas[session.settings.arena],
            timeLimitSeconds: session.settings.roundSeconds,
          },
          startedAt: this.now(),
        };
        session.phase = 'running';
        break;
      }
      case 'start-attempt': {
        requireCondition(session.phase==='locked'&&session.settings.kind==='challenge');
        requireCondition(this.workers.size===0 && !this.store.sessions.some(s => s.activeAttempt),errors.busy);requireCondition(session.attempts.length<200,errors.full);
        const entry=session.entries.find(e=>e.id===action.entryId);
        requireCondition(entry?.memberIds.length&&entry.submission?.round===session.round,errors.soloNotSubmitted);
        session.activeAttempt={id:randomUUID(),round:session.round,entryId:entry.id,entryName:entry.name,revision:entry.submission.revision,program:structuredClone(entry.submission.program),challenge:session.settings.challenge,seconds:session.settings.roundSeconds,startedAt:this.now()};
        session.phase='running';break;
      }
      case 'judge-attempt': {
        const attempt = session.activeAttempt, lease = this.runtimeLeases.get(session.code);
        requireCondition(attempt && lease && lease.start !== null && session.settings.scene && !arena3dCatalog.find(a => a.id === session.settings.scene)?.automatic);
        const seconds = Math.min(attempt.seconds, ((lease.ended ?? this.now()) - lease.start) / 1000);
        requireCondition(seconds < attempt.seconds || !action.completed);
        const frame = this.soloFrames.get(session.code) ?? initialSoloFrame(attempt.challenge);
        this.finishAttempt(session, { ...frame, time: seconds }, { completed: action.completed, goals: [{ label: session.settings.taskBrief, passed: action.completed }], seconds, error: null });
        break;
      }
      case 'stop':
        requireCondition(session.phase === 'running');
        if(session.activeAttempt){this.finishAttempt(session,this.soloFrames.get(session.code)??initialSoloFrame(session.settings.challenge));break;}
        this.finish(
          session,
          {
            ...(this.frames.get(session.code) ?? emptyFrame(arenas[session.settings.arena])),
            winner: null,
            finished: true,
            reason: 'cancelled',
          },
          true,
        );
        break;
      case 'end':
        requireCondition(session.phase !== 'running');
        session.phase = 'ended';
        session.joiningOpen = false;
        session.deadline = null;
        session.remainingMs = null;
        session.entries.forEach((e) => {
          e.lock = null;
        });
        break;
      case 'delete':
        requireCondition(session.phase !== 'running');
        this.store.sessions = this.store.sessions.filter((s) => s.code !== session.code);
        break;
      case 'retry-save':
        break;
      case 'release-entry': {
        const entry = session.entries.find((e) => e.id === action.entryId);
        requireCondition(entry, errors.missing, 404);
        entry.lock = null;
        break;
      }
      case 'leave':
        requireCondition(session.phase !== 'running');
        this.removeMember(session, actor);
        break;
      default: {
        const entry = this.entry(session, actor);
        if (action.type === 'release') {
          requireCondition(!entry.lock || entry.lock.memberId === actor, errors.lock);
          entry.lock = null;
          break;
        }
        if (action.type === 'withdraw') {
          requireCondition(session.phase === 'preparing');
          requireCondition(
            !entry.lock || entry.lock.memberId === actor || entry.lock.expiresAt < this.now(),
            errors.lock,
          );
          entry.submission = null;
          break;
        }
        requireCondition(['lobby', 'preparing'].includes(session.phase));
        requireCondition(!entry.submission, errors.submitted);
        if (action.type === 'take') {
          requireCondition(
            !entry.lock || entry.lock.memberId === actor || entry.lock.expiresAt < this.now(),
            errors.lock,
          );
          entry.lock = { memberId: actor, expiresAt: this.now() + 15 * 60_000 };
          break;
        }
        this.canEdit(session, entry, actor);
        if (action.type === 'save' || action.type === 'restore') {
          requireCondition(action.baseRevision === entry.revision, errors.conflict);
          const source =
            action.type === 'save'
              ? action.program
              : entry.history.find((v) => v.revision === action.revision)?.program;
          requireCondition(source, errors.missing, 404);
          const program = this.validate(session,source);
          entry.history.push({
            revision: entry.revision,
            program: entry.program,
            authorId: actor,
            savedAt: this.now(),
          });
          entry.history = entry.history.slice(-20);
          entry.program = structuredClone(program);
          entry.revision++;
        } else if (action.type === 'submit') {
          requireCondition(session.phase === 'preparing' && action.round === session.round);
          requireCondition(action.revision === entry.revision, errors.conflict);
          entry.submission = {
            round: session.round,
            revision: entry.revision,
            program: structuredClone(this.validate(session,entry.program)),
          };
          entry.lock = null;
        }
      }
    }
  }

  async handle(req: IncomingMessage, res: ServerResponse, url: URL) {
    const json = (value: unknown, status = 200) => {
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify(value));
    };
    try {
      const data = req.method === 'POST' ? await body(req) : undefined;
      const response = await this.serial(async () => {
        requireCondition(!this.closing, errors.unavailable, 503);
        const canHost = local(req.socket.remoteAddress);
        if (url.pathname === '/api/classroom/info' && req.method === 'GET')
          return {
            available: true,
            canHost,
            loadError: this.loadError,
            sessions: canHost
              ? this.store.sessions.map((s) => ({
                  code: s.code,
                  title: s.settings.title,
                  phase: s.phase,
                }))
              : [],
          };
        requireCondition(!this.loadError, errors.file, 503);
        if (url.pathname === '/api/classroom/sessions' && req.method === 'POST') {
          requireCondition(canHost, errors.localHost, 403);
          this.rate(req, 'create');
          const value = createSchema.parse(data);
          requireCondition(value.settings.kind === 'challenge' || value.settings.roundSeconds <= 120, errors.invalid, 400);
          if (value.settings.kind === 'challenge' && value.settings.scene) {
            requireCondition(value.settings.engine === 'gears', errors.invalid, 400);
            if (!arena3dCatalog.find(a => a.id === value.settings.scene)?.automatic) requireCondition(value.settings.taskBrief.length >= 10, copy.refereeHelp, 400);
          }
          const prior = this.store.sessions.find((s) => s.creationId === value.opId);
          if (prior) {
            requireCondition(await checkPin(value.pin, prior.teacherPinHash), errors.auth, 401);
            return this.signIn(prior, 'teacher');
          }
          requireCondition(this.store.sessions.length < 8, errors.full);
          const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let code: string;
          do {
            code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
          } while (this.store.sessions.some((s) => s.code === code));
          const now = this.now();
          const session: CompetitionSession = {
            schemaVersion: 1,
            id: randomUUID(),
            code,
            creationId: value.opId,
            createdAt: now,
            updatedAt: now,
            teacherPinHash: await hashPin(value.pin),
            settings: value.settings,
            phase: 'lobby',
            joiningOpen: true,
            round: 0,
            deadline: null,
            remainingMs: null,
            members: [],
            entries: [],
            active: null,
            results: [],
            activeAttempt:null,
            attempts:[],
            operations: [],
            audit: [],
          };
          this.store.sessions.push(session);
          await this.persist();
          return this.signIn(session, 'teacher');
        }
        const match =
          /^\/api\/classroom\/sessions\/([A-HJ-NP-Z2-9]{6})(?:\/(join|teacher|actions|runtime|entries\/([\w-]+)\/program|results\/([\w-]+)\/program|attempts\/([\w-]+)\/program))?$/.exec(
            url.pathname,
          );
        requireCondition(match, errors.missing, 404);
        const session = this.store.sessions.find((s) => s.code === match[1]);
        requireCondition(session, errors.missing, 404);
        if (this.deadline(session)) await this.persist();
        if (match[2] === 'join' && req.method === 'POST') {
          this.rate(req, session.code);
          const value = joinSchema.parse(data);
          let member = session.members.find(
            (m) => m.name.toLocaleLowerCase() === value.name.toLocaleLowerCase(),
          );
          if (member) requireCondition(await checkPin(value.pin, member.pinHash), errors.auth, 401);
          else {
            requireCondition(session.joiningOpen && session.phase !== 'ended', errors.closed);
            requireCondition(session.members.length < 32, errors.full);
            member = {
              id: randomUUID(),
              name: value.name,
              pinHash: await hashPin(value.pin),
              approved: false,
              entryId: null,
            };
            session.members.push(member);
            await this.persist();
          }
          return this.signIn(session, member.id);
        }
        if (match[2] === 'teacher' && req.method === 'POST') {
          requireCondition(canHost, errors.localHost, 403);
          this.rate(req, session.code);
          const value = teacherLoginSchema.parse(data);
          requireCondition(await checkPin(value.pin, session.teacherPinHash), errors.auth, 401);
          return this.signIn(session, 'teacher');
        }
        const actor = this.actor(req, session);
        if (match[2] === 'runtime' && req.method === 'POST') {
          requireCondition(actor === 'teacher', errors.teacher, 403);
          const update = runtime3dRequestSchema.parse(data), attempt = session.activeAttempt;
          if (!attempt || attempt.id !== update.attemptId || session.settings.engine !== 'gears') return { accepted: false };
          const token = req.headers.authorization ?? '';
          let lease = this.runtimeLeases.get(session.code);
          if (update.type === 'claim') {
            if (lease && (lease.id !== update.leaseId || lease.token !== token)) return { accepted: false };
            lease ??= { id: update.leaseId, token, seen: this.now(), start: null, ended: null };
            this.runtimeLeases.set(session.code, lease); lease.seen = this.now();
            return { accepted: true, program: attempt.program };
          }
          requireCondition(lease && lease.id === update.leaseId && lease.token === token, errors.teacher, 403);
          lease.seen = this.now();
          if (update.type === 'started') { lease.start ??= this.now(); return { accepted: true }; }
          if (update.type === 'error') { this.finishAttempt(session, this.soloFrames.get(session.code) ?? initialSoloFrame(attempt.challenge)); await this.persist(); return { accepted: true }; }
          const frame = update.frame;
          if (frame) {
            const elapsed = lease.start === null ? 0 : Math.min(attempt.seconds, Math.max(0, ((lease.ended ?? this.now()) - lease.start) / 1000));
            this.soloFrames.set(session.code, { ...frame, time: elapsed });
          }
          if (update.type === 'finish') {
            requireCondition(lease.start !== null && frame && update.verdict);
            lease.ended ??= this.now();
            const seconds = Math.min(attempt.seconds, (lease.ended - lease.start) / 1000);
            const finalFrame = { ...frame, time: seconds };
            const manual = session.settings.scene && !arena3dCatalog.find(a => a.id === session.settings.scene)?.automatic;
            if (manual && seconds < attempt.seconds && !update.verdict.error) {
              this.soloFrames.set(session.code, { ...finalFrame, awaitingConfirmation: true });
            } else {
              const timedOut = seconds >= attempt.seconds || frame.time >= attempt.seconds;
              const recordedSeconds = timedOut ? attempt.seconds : seconds;
              this.finishAttempt(session, { ...finalFrame, time: recordedSeconds }, { ...update.verdict, completed: !manual && !timedOut && update.verdict.completed, seconds: recordedSeconds, error: timedOut ? copy.timeUp : update.verdict.error });
              await this.persist();
            }
          }
          return { accepted: true };
        }
        if (!match[2] && req.method === 'GET') return this.view(session, actor);
        if (req.method === 'GET' && (match[3] || match[4] || match[5])) {
          if(match[5]){
            const result=session.attempts.find(r=>r.id===match[5]);requireCondition(result,errors.missing,404);
            requireCondition(actor==='teacher'||session.entries.find(e=>e.id===result.entryId)?.memberIds.includes(actor),errors.teacher,403);
            this.audit(session,actor,'read-attempt-program');await this.persist();return {program:result.program,revision:result.revision};
          }
          if (match[3]) {
            const entry = session.entries.find((e) => e.id === match[3]);
            requireCondition(entry, errors.missing, 404);
            requireCondition(
              actor === 'teacher' || entry.memberIds.includes(actor),
              errors.teacher,
              403,
            );
            this.audit(session, actor, 'read-program');
            return {
              program: entry.submission?.program ?? entry.program,
              revision: entry.submission?.revision ?? entry.revision,
            };
          }
          const result = session.results.find((r) => r.id === match[4]),
            side = Number(url.searchParams.get('side'));
          requireCondition(result && (side === 0 || side === 1), errors.missing, 404);
          requireCondition(
            actor === 'teacher' ||
              session.entries
                .find((e) => e.id === result.entryIds[side])
                ?.memberIds.includes(actor),
            errors.teacher,
            403,
          );
          this.audit(session, actor, 'read-result-program');
          return { program: result.programs[side], revision: result.revisions[side] };
        }
        requireCondition(match[2] === 'actions' && req.method === 'POST', errors.invalid, 405);
        const operation = operationSchema.parse(data);
        if (session.operations.some((op) => op.id === operation.opId && op.actor === actor))
          return { view: this.view(session, actor) };
        const before = structuredClone(this.store);
        try {
          await this.action(session, actor, operation.action);
        } catch (error) {
          this.store = before;
          throw error;
        }
        session.operations.push({ id: operation.opId, actor });
        session.operations = session.operations.slice(-500);
        this.audit(session, actor, operation.action.type);
        await this.persist();
        if (operation.action.type === 'start') this.launch(session);
        if (operation.action.type === 'start-attempt') this.launchAttempt(session);
        return {
          view: ['leave', 'delete'].includes(operation.action.type)
            ? null
            : this.view(session, actor),
        };
      });
      json(response);
    } catch (error) {
      json(
        {
          error:
            error instanceof HttpError
              ? error.message
              : error instanceof ZodError
                ? errors.invalid
                : error instanceof Error
                  ? error.message
                  : errors.invalid,
        },
        error instanceof HttpError ? error.status : 400,
      );
    }
  }

  async close() {
    this.closing = true;
    clearInterval(this.timer);
    await this.serial(async () => {
      for(const session of this.store.sessions)if(session.activeAttempt)this.finishAttempt(session,this.soloFrames.get(session.code)??initialSoloFrame(session.settings.challenge));
      for (const session of this.store.sessions)
        if (session.active)
          this.finish(
            session,
            {
              ...(this.frames.get(session.code) ?? emptyFrame(session.active.rules.radiusCm)),
              winner: null,
              finished: true,
              reason: 'cancelled',
            },
            true,
          );
      await this.persist();
      this.tokens.clear();
    });
  }
}
