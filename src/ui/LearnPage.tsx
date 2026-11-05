import { useEffect, useMemo, useRef, useState } from 'react';
import {
  lessons,
  lessonExperiment,
  lessonMedia,
  type Lesson,
  type LessonId,
  type LessonQuestion,
} from '../learn/catalog';
import { completeLesson, recordLessonRun, saveLessonDraft } from '../learn/progress';
import mediaManifest from '../learn/media.json';
import { en } from '../shared/strings/en';
import type { useLearningProgress } from './useLearningProgress';
import { BlockEditor, type BlockEditorHandle } from './BlockEditor';
import { UnifiedStage } from './UnifiedStage';
import { generatePython } from '../editor/python';
import { checkMission } from '../missions/engine';
import { exportProgramFile } from '../progress/program-file';
import type { Execution } from '../runtime/visual-runtime';
import type { SimSnapshot } from '../sim/types';
import type { GoalProgress } from '../challenges/schemas';
import './learn.css';
import { LessonExplorer } from './LessonExplorer';

const copy = en.learning;
type Progress = ReturnType<typeof useLearningProgress>;
type Sound = { sound: boolean; onSoundChange: (value: boolean) => void };
const terms = Object.entries(copy.glossaryEntries);
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export function LearnPage({ progress, ...sound }: { progress: Progress } & Sound) {
  const [selected, setSelected] = useState<LessonId | null>(null),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState<'all' | 'unfinished' | 'completed'>('all'),
    [tab, setTab] = useState<'lessons' | 'glossary'>('lessons');
  const heading = useRef<HTMLHeadingElement>(null);
  const lesson = lessons.find((item) => item.id === selected);
  function open(id: LessonId | null) {
    setSelected(id);
    if (id) progress.update((state) => ({ ...state, last: id }));
  }
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [selected]);
  const matches = (text: string) =>
    text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  const visible = lessons.filter(
    (item) =>
      matches([item.title, item.tag, item.summary, ...item.terms].join(' ')) &&
      (filter === 'all' || progress.state.completed.includes(item.id) === (filter === 'completed')),
  );
  const visibleTerms = terms.filter(([, value]) =>
    matches(`${value.term} ${value.meaning} ${value.example}`),
  );
  return (
    <div className="learn-page">
      <header className="learn-heading">
        <div>
          <span className="tag">{copy.path}</span>
          <h1 ref={heading} tabIndex={-1}>
            {lesson?.title ?? copy.title}
          </h1>
          <p>{lesson?.summary ?? copy.intro}</p>
        </div>
        <div className="learn-progress">
          <strong>{copy.progress(progress.state.completed.length, lessons.length)}</strong>
          <progress
            aria-label={copy.path}
            value={progress.state.completed.length}
            max={lessons.length}
          />
        </div>
      </header>
      {progress.status !== 'saved' && (
        <div role="alert" className="learn-notice">
          <p>
            {progress.status === 'invalid'
              ? copy.invalidProgress
              : progress.status === 'conflict'
                ? copy.conflict
                : copy.saveError}
          </p>
          {progress.status === 'invalid' ? (
            <button
              onClick={() => {
                if (window.confirm(copy.freshConfirm)) progress.replace();
              }}
            >
              {copy.freshProgress}
            </button>
          ) : progress.status === 'conflict' ? (
            <>
              <button onClick={progress.useSaved}>{copy.useSaved}</button>
              <button
                onClick={() => {
                  if (window.confirm(copy.keepConfirm)) progress.replace();
                }}
              >
                {copy.keepMine}
              </button>
            </>
          ) : (
            <button onClick={progress.retry}>{copy.retrySave}</button>
          )}
        </div>
      )}
      {lesson ? (
        <>
          <div className="learn-toolbar">
            <button onClick={() => open(null)}>← {copy.back}</button>
            <label>
              {copy.lessons}
              <select
                aria-label={copy.lessons}
                value={selected!}
                onChange={(event) => open(event.target.value as LessonId)}
              >
                {lessons.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.number}. {item.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <LessonReader key={lesson.id} lesson={lesson} progress={progress} {...sound} />
          {lessons[lesson.number] && (
            <button className="learn-next" onClick={() => open(lessons[lesson.number].id)}>
              {copy.next}: {lessons[lesson.number].title} →
            </button>
          )}
        </>
      ) : (
        <>
          <div className="learn-toolbar">
            <div className="learn-switch">
              <button aria-pressed={tab === 'lessons'} onClick={() => setTab('lessons')}>
                {copy.lessons}
              </button>
              <button aria-pressed={tab === 'glossary'} onClick={() => setTab('glossary')}>
                {copy.glossary}
              </button>
            </div>
            <label>
              {copy.search}
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            {tab === 'lessons' && (
              <label>
                {copy.filter}
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as typeof filter)}
                >
                  <option value="all">{copy.all}</option>
                  <option value="unfinished">{copy.unfinished}</option>
                  <option value="completed">{copy.completed}</option>
                </select>
              </label>
            )}
            {progress.state.last && (
              <button onClick={() => open(progress.state.last!)}>{copy.continue}</button>
            )}
          </div>
          <p role="status" aria-live="polite" aria-atomic="true">
            {tab === 'lessons'
              ? copy.lessonCount(visible.length)
              : copy.termCount(visibleTerms.length)}
          </p>
          {tab === 'lessons' ? (
            <div className="learn-cards">
              {visible.map((item) => (
                <button
                  key={item.id}
                  className="learn-card"
                  aria-label={copy.openNamed(item.title)}
                  onClick={() => open(item.id)}
                >
                  <span className="learn-card-top">
                    <span className="learn-number">{String(item.number).padStart(2, '0')}</span>
                    <span>
                      {progress.state.completed.includes(item.id)
                        ? `✓ ${copy.completed}`
                        : copy.minutes(item.minutes)}
                    </span>
                  </span>
                  <span className="tag">{item.tag}</span>
                  <h2>{item.title}</h2>
                  <p>{item.summary}</p>
                  <strong>{copy.open} →</strong>
                </button>
              ))}
              {!visible.length && (
                <div>
                  <p>
                    {filter === 'completed'
                      ? copy.noCompleted
                      : filter === 'unfinished'
                        ? copy.noUnfinished
                        : copy.empty}
                  </p>
                  <button
                    onClick={() => {
                      setQuery('');
                      setFilter('all');
                    }}
                  >
                    {copy.clearFilters}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <dl className="learn-glossary">
              {visibleTerms.map(([key, value]) => (
                <div key={key}>
                  <dt>{value.term}</dt>
                  <dd>
                    {value.meaning}
                    <p>{value.example}</p>
                  </dd>
                </div>
              ))}
              {!visibleTerms.length && <p>{copy.empty}</p>}
            </dl>
          )}
        </>
      )}
    </div>
  );
}

function Question({
  question,
  title,
  onAnswer,
}: {
  question: LessonQuestion;
  title: string;
  onAnswer?: (correct: boolean) => void;
}) {
  const [choice, setChoice] = useState<number>(),
    [checked, setChecked] = useState<number>();
  return (
    <section className="learn-question">
      <h2>{title}</h2>
      <fieldset>
        <legend>{question.prompt}</legend>
        {question.options.map((option, index) => (
          <label key={option}>
            <input
              type="radio"
              name={title}
              checked={choice === index}
              onChange={() => {
                setChoice(index);
                setChecked(undefined);
              }}
            />
            {option}
          </label>
        ))}
      </fieldset>
      <button
        disabled={choice === undefined}
        onClick={() => {
          setChecked(choice);
          onAnswer?.(choice === question.correct);
        }}
      >
        {copy.checkAnswer}
      </button>
      {checked !== undefined && (
        <p role="status" className="learn-feedback">
          <strong>{checked === question.correct ? copy.correct : copy.tryAgain}. </strong>
          {question.feedback[checked]}
        </p>
      )}
    </section>
  );
}

function LessonReader({
  lesson,
  progress,
  ...sound
}: { lesson: Lesson; progress: Progress } & Sound) {
  const [experiment, setExperiment] = useState(false),
    [quizCorrect, setQuizCorrect] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const completed = progress.state.completed.includes(lesson.id),
    ran = progress.state.runs.includes(lesson.id);
  const onAnswer = (correct: boolean) => {
    setQuizCorrect(correct);
    progress.update((state) => completeLesson(state, lesson.id, correct));
  };
  const onRun = () =>
    progress.update((state) =>
      completeLesson(recordLessonRun(state, lesson.id), lesson.id, quizCorrect),
    );
  return (
    <article className="learn-reader">
      <p className="learn-objective">
        <strong>{copy.objective}: </strong>
        {lesson.objective}
      </p>
      <div className="learn-reading">
        <div className="learn-copy">
          <section className="learn-story">
            <h2>{copy.story}</h2>
            <p>{lesson.story}</p>
          </section>
          <section>
            <h2>{copy.idea}</h2>
            {lesson.explanation.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
          <section>
            <h2>{copy.steps}</h2>
            <ol>
              {lesson.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
        </div>
        <LessonMedia lesson={lesson} videoRef={video} />
      </div>
      {lesson.codeSteps && (
        <section className="learn-code-walk">
          <h2>{copy.codeWalk}</h2>
          <dl>
            {lesson.codeSteps.map((step) => (
              <div key={step.code}>
                <dt>
                  <pre>{step.code}</pre>
                </dt>
                <dd>{step.meaning}</dd>
              </div>
            ))}
          </dl>
          <p>{copy.pythonNote}</p>
        </section>
      )}
      <LessonExplorer lesson={lesson.id} />
      <Question title={copy.predict} question={lesson.prediction} />
      <section className="learn-try">
        <div>
          <h2>{copy.change}</h2>
          <p>{lesson.experiment}</p>
          <h3>{copy.compare}</h3>
          <p>{lesson.compare}</p>
        </div>
        <button
          className="learn-primary"
          onClick={() => {
            video.current?.pause();
            setExperiment(!experiment);
          }}
          aria-expanded={experiment}
        >
          {experiment ? copy.closeExperiment : copy.try}
        </button>
      </section>
      {experiment && (
        <LessonExperiment
          key={`${lesson.id}:${progress.resetKey}`}
          lesson={lesson}
          progress={progress}
          onRun={onRun}
          {...sound}
        />
      )}
      <div className="learn-reading">
        <section>
          <h2>{copy.mistakes}</h2>
          <dl className="learn-mistakes">
            {lesson.mistakes.map(([problem, fix]) => (
              <div key={problem}>
                <dt>{problem}</dt>
                <dd>{fix}</dd>
              </div>
            ))}
          </dl>
          <h2>{copy.realRobot}</h2>
          <p>{lesson.physical}</p>
        </section>
        <Question title={copy.check} question={lesson.quiz} onAnswer={onAnswer} />
      </div>
      <p className="learn-completion" role="status">
        {completed
          ? `✓ ${copy.success}`
          : ran
            ? `${copy.runDone} ${copy.finishHint}`
            : copy.finishHint}
      </p>
      <section>
        <h2>{copy.words}</h2>
        <dl className="learn-glossary learn-inline-terms">
          {lesson.terms.map((key) => {
            const term = copy.glossaryEntries[key as keyof typeof copy.glossaryEntries];
            return (
              <div key={key}>
                <dt>{term.term}</dt>
                <dd>
                  {term.meaning}
                  <p>{term.example}</p>
                </dd>
              </div>
            );
          })}
        </dl>
      </section>
    </article>
  );
}

function LessonMedia({
  lesson,
  videoRef,
}: {
  lesson: Lesson;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const media = lessonMedia(lesson.id),
    metadata = mediaManifest.find((item) => item.id === lesson.id)!;
  const notes = copy.mediaNotes[lesson.id];
  const imageButton = useRef<HTMLButtonElement | null>(null);
  const [speed, setSpeed] = useState(1),
    [error, setError] = useState(false),
    [enlarged, setEnlarged] = useState<number>();
  return (
    <aside className="learn-media">
      <h2>{copy.watch}</h2>
      <p>{lesson.id === 'gyroturn' ? copy.gyroVideoHelp : copy.videoHelp}</p>
      <video
        ref={videoRef}
        controls
        preload="metadata"
        playsInline
        poster={asset(media.stills[0])}
        onError={() => setError(true)}
      >
        <source src={asset(media.video)} type="video/mp4" />
        <track
          default
          kind="captions"
          src={asset(media.captions)}
          srcLang="en"
          label={copy.captionLanguage}
        />
      </video>
      {error && <p role="alert">{copy.mediaError}</p>}
      <label className="learn-video-speed">
        {copy.speed}
        <select
          aria-label={copy.speed}
          value={speed}
          onChange={(event) => {
            const value = Number(event.target.value);
            setSpeed(value);
            if (videoRef.current) videoRef.current.playbackRate = value;
          }}
        >
          {[0.5, 0.75, 1, 1.25, 1.5].map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>
      </label>
      <h3>{copy.stills}</h3>
      <div className="learn-stills">
        {media.stills.map((src, index) => (
          <figure key={src}>
            <button
              onClick={(event) => {
                imageButton.current = event.currentTarget;
                videoRef.current?.pause();
                setEnlarged(index);
              }}
              aria-label={`${copy.imageHint}: ${notes[index]}`}
            >
              <img src={asset(src)} alt={copy.imageAlt(lesson.title, index + 1)} loading="lazy" />
            </button>
            <figcaption>
              <strong>{[copy.before, copy.during, copy.after][index]}</strong>
              <p>{notes[index]}</p>
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.currentTime = metadata.times[index];
                    videoRef.current.scrollIntoView({ block: 'center' });
                  }
                }}
              >
                {copy.jump([copy.before, copy.during, copy.after][index])}
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
      {enlarged !== undefined && (
        <Screenshot
          src={asset(media.stills[enlarged])}
          caption={notes[enlarged]}
          onClose={() => {
            setEnlarged(undefined);
            requestAnimationFrame(() => imageButton.current?.focus());
          }}
        />
      )}
    </aside>
  );
}

function Screenshot({
  src,
  caption,
  onClose,
}: {
  src: string;
  caption: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      className="learn-image-dialog"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={caption}
    >
      <button onClick={onClose}>{copy.closeImage}</button>
      <img src={src} alt={caption} />
      <p>{caption}</p>
    </dialog>
  );
}

function LessonExperiment({
  lesson,
  progress,
  onRun,
  ...sound
}: { lesson: Lesson; progress: Progress; onRun: () => void } & Sound) {
  const [setup] = useState(() => lessonExperiment(lesson.id));
  const [program, setProgram] = useState(
      () => progress.state.drafts.find((d) => d.id === lesson.id)?.program ?? setup.program,
    ),
    [mode, setMode] = useState<'blocks' | 'python'>('blocks'),
    [valid, setValid] = useState(true),
    [selected, setSelected] = useState(''),
    [active, setActive] = useState<string>(),
    [snapshot, setSnapshot] = useState<SimSnapshot>(),
    [execution, setExecution] = useState<Execution>(),
    [goal, setGoal] = useState<GoalProgress>(),
    [notice, setNotice] = useState('');
  const heading = useRef<HTMLHeadingElement>(null),
    editor = useRef<BlockEditorHandle>(null);
  useEffect(() => {
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: 'start' });
  }, []);
  const verdict = useMemo(
    () =>
      execution && setup.mission
        ? checkMission(setup.mission, execution.result, setup.map, execution)
        : undefined,
    [execution, setup],
  );
  const python = useMemo(() => generatePython(program), [program]);
  function download() {
    try {
      const file = exportProgramFile(lesson.title, {
        missionId: setup.mission?.id ?? null,
        steps: [],
        outcome: null,
        visualProgram: program,
        robot: setup.robot,
        scene: setup.scene ?? undefined,
        robotTemplate: setup.template,
        customRobot: setup.customRobot,
        customWorld: setup.customWorld,
        fieldGoal: setup.fieldGoal,
      });
      const url = URL.createObjectURL(new Blob([file.content], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(copy.projectSaved);
    } catch {
      setNotice(copy.exportError);
    }
  }
  return (
    <section className="learn-experiment">
      <header>
        <h2 ref={heading} tabIndex={-1}>
          {copy.sandbox}
        </h2>
        <p>{copy.sandboxHelp}</p>
        <div className="learn-toolbar">
          <button
            onClick={() => {
              if (window.confirm(copy.resetConfirm)) editor.current?.load(setup.program);
            }}
          >
            {copy.reset}
          </button>
          <button onClick={download}>{copy.saveProject}</button>
        </div>
        {notice && <p role="status">{notice}</p>}
      </header>
      <div className="learn-lab">
        <div className="learn-editor">
          <div className="learn-switch">
            <button aria-pressed={mode === 'blocks'} onClick={() => setMode('blocks')}>
              {copy.showBlocks}
            </button>
            <button aria-pressed={mode === 'python'} onClick={() => setMode('python')}>
              {copy.showPython}
            </button>
          </div>
          <div className="learn-blocks" hidden={mode !== 'blocks'}>
            <BlockEditor
              ref={editor}
              initial={program}
              onSelect={setSelected}
              activeId={active}
              onValidity={setValid}
              onChange={(next, edited) => {
                setProgram(next);
                if (edited) {
                  setExecution(undefined);
                  setGoal(undefined);
                  progress.update((state) => saveLessonDraft(state, lesson.id, next));
                }
              }}
            />
          </div>
          {mode === 'python' && (
            <div className="learn-python">
              <p>{copy.pythonNote}</p>
              <pre tabIndex={0}>{python.map((line) => line.text).join('\n')}</pre>
            </div>
          )}
          <p className="learn-block-help">
            {selected
              ? (en.blocks.help[selected as keyof typeof en.blocks.help] ?? en.studio.defaultHelp)
              : copy.selectBlock}
          </p>
        </div>
        <UnifiedStage
          fixedEquipment
          map={setup.map}
          robot={setup.robot}
          program={program}
          worldFile={setup.scene}
          template={setup.template}
          customRobot={setup.customRobot}
          customWorld={setup.customWorld}
          savedRobotName={setup.robot.name}
          onEditRobot={() => {}}
          onTemplateChange={() => {}}
          canRun={valid}
          {...sound}
          sceneName={lesson.title}
          fieldGoal={setup.fieldGoal}
          onGoalProgress={setGoal}
          onFrame={setSnapshot}
          onActiveBlock={setActive}
          onReset={() => {
            setExecution(undefined);
            setGoal(undefined);
          }}
          onComplete={(result) => {
            setExecution(result);
            onRun();
          }}
        />
      </div>
      <div className="learn-live">
        <section>
          <h3>{en.studio.sensors}</h3>
          <dl>
            {Object.entries(snapshot?.sensors ?? {}).map(([port, value]) => (
              <div key={port}>
                <dt>
                  {setup.robot.devices.find((d) => d.port === port)?.type === 'gyro'
                    ? copy.currentYaw
                    : en.studio.port(port)}
                </dt>
                <dd>
                  {en.studio.sensorValue(
                    setup.robot.devices.find((d) => d.port === port)?.type ?? 'color',
                    value,
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3>{copy.runResult}</h3>
          {execution ? (
            <>
              <p role="status">
                {(verdict?.passed ?? goal?.passed) ? copy.goalPassed : copy.goalMissed}
              </p>
              {verdict && (
                <ul>
                  {verdict.goals.map((item) => (
                    <li key={item.label}>
                      {item.passed ? '✓' : '○'} {item.label}
                    </li>
                  ))}
                </ul>
              )}
              {execution.variables && (
                <>
                  <h4>{copy.variables}</h4>
                  <dl>
                    {Object.entries(execution.variables).map(([name, value]) => (
                      <div key={name}>
                        <dt>{name}</dt>
                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
            </>
          ) : (
            <p>{copy.noRun}</p>
          )}
        </section>
      </div>
    </section>
  );
}
