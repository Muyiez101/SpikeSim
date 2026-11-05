import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  ChevronRight,
  CircleHelp,
  CirclePlay,
  Compass,
  FolderOpen,
  Gamepad2,
  Home as HomeIcon,
  Keyboard,
  LockKeyhole,
  Map,
  Maximize2,
  Moon,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  StepForward,
  Sun,
  Wrench,
  X,
} from 'lucide-react';
import { brand } from '../shared/brand';
import { BrandLockup } from './BrandLockup';
import { en } from '../shared/strings/en';
import type {
  Preferences,
  PreviewStatus,
  Screen,
  Theme,
  TextSize,
  ViewMode,
} from '../shared/types';
import { readPreferences, writePreferences } from '../progress/preferences';
import { readProjects, type PreviewProject } from '../progress/projects';
import { RobotWorkspace as Playground } from './RobotWorkspace';
import { usePlaygroundDrafts } from './usePlaygroundDrafts';
import { browserStorage } from '../progress/storage';
import { MissionCatalog } from './MissionCatalog';
import { SaveConflict } from './SaveConflict';
import { ProgramLibrary } from './ProgramLibrary';
import { draftSize } from '../progress/playground';
import {SumoPage} from './SumoPage';
import {CompetitionPage} from '../classroom/CompetitionPage';
import {LearnPage} from './LearnPage';
import {useLearningProgress} from './useLearningProgress';

const navItems: { id: Screen; label: string; icon: typeof HomeIcon }[] = [
  { id: 'home', label: en.nav.home, icon: HomeIcon },
  { id: 'missions', label: en.nav.missions, icon: Map },
  { id: 'learn', label: en.nav.learn, icon: BookOpen },
  { id: 'builder', label: en.nav.builder, icon: Bot },
  { id: 'play', label: en.nav.play, icon: Gamepad2 },
  { id: 'sumo', label: en.sumo.title, icon: Gamepad2 },
  { id: 'classroom', label: en.classroom.title, icon: Gamepad2 },
  { id: 'projects', label: en.nav.projects, icon: FolderOpen },
  { id: 'settings', label: en.nav.settings, icon: SettingsIcon },
];

const themeOptions: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: en.settings.light, icon: Sun },
  { id: 'dark', label: en.settings.dark, icon: Moon },
];

type RobotPose = { x: number; y: number; heading: number };
const initialPose: RobotPose = { x: 24, y: 57, heading: 0 };
const demoPath: RobotPose[] = [
  initialPose,
  { x: 33, y: 57, heading: 0 },
  { x: 42, y: 57, heading: 0 },
  { x: 51, y: 57, heading: 0 },
  { x: 60, y: 54, heading: -18 },
  { x: 68, y: 49, heading: -18 },
];

function App() {
  const [screen, setScreen] = useState<Screen>(()=>new URLSearchParams(location.search).has('sumo')?'sumo':'home');
  const mainContent = useRef<HTMLElement>(null);
  const previousScreen = useRef(screen);
  const playgroundDrafts = usePlaygroundDrafts();
  const learningProgress = useLearningProgress();
  const [preferences, setPreferences] = useState<Preferences>(() =>
    readPreferences(browserStorage),
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [projects] = useState<PreviewProject[]>(() =>
    readProjects(browserStorage),
  );
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    mainContent.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [screen]);

  useEffect(() => {
    if (playgroundDrafts.resetKey === 0) return;
    mainContent.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [playgroundDrafts.resetKey]);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.textSize = preferences.textSize;
    document.documentElement.dataset.reducedMotion = String(preferences.reducedMotion);
    writePreferences(browserStorage, preferences);
  }, [preferences]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };


  const filteredNavItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return navItems;
    return navItems.filter((item) => item.label.toLowerCase().includes(query));
  }, [search]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {en.ui.active}
      </a>
      <Sidebar screen={screen} onNavigate={setScreen} />
      <div className="app-frame">
        <TopBar screen={screen} onSearch={() => setSearchOpen(true)} onNavigate={setScreen} />
        {screen !== 'home' && screen !== 'play' && <SaveConflict drafts={playgroundDrafts} />}
        <main ref={mainContent} id="main-content" className={`main-content${screen === 'home' || screen === 'play' || screen === 'builder' || screen === 'learn' ? ' main-content-full' : ''}`} tabIndex={-1}>
          {(screen === 'home' || screen === 'play') && <Playground workspace={screen} drafts={playgroundDrafts} sound={preferences.sound} onSoundChange={(value) => updatePreference('sound', value)} />}
          {screen === 'missions' && <MissionCatalog drafts={playgroundDrafts.state.drafts} saveStatus={playgroundDrafts.saveStatus}
            onRetrySave={playgroundDrafts.retrySave}
            onStartMission={(missionId) => {
              playgroundDrafts.selectMission('home', missionId);
              setScreen('home');
            }}
            onFreePlay={() => {
              playgroundDrafts.selectMission('play', null);
              setScreen('play');
            }} />}
          {screen === 'learn' && <LearnPage progress={learningProgress} sound={preferences.sound} onSoundChange={value=>updatePreference('sound',value)} />}
          {screen === 'sumo' && <SumoPage/>}
          {screen === 'classroom' && <CompetitionPage/>}
          {screen === 'builder' && <Playground workspace="play" drafts={playgroundDrafts} sound={preferences.sound} onSoundChange={value=>updatePreference('sound',value)} initialBuilder="robot" />}
          {screen === 'projects' && <><Projects projects={projects} onNavigate={setScreen} hasPrograms={playgroundDrafts.state.drafts.some(draft => draftSize(draft) > 0 || draft.name)} /><ProgramLibrary drafts={playgroundDrafts.state.drafts} onOpen={(missionId) => { playgroundDrafts.selectMission(missionId ? 'home' : 'play', missionId); setScreen(missionId ? 'home' : 'play'); }} /></>}
          {screen === 'settings' && (
            <Settings preferences={preferences} onChange={updatePreference} />
          )}
        </main>
      </div>
      {searchOpen && (
        <SearchDialog
          query={search}
          results={filteredNavItems}
          onQueryChange={setSearch}
          onClose={() => setSearchOpen(false)}
          onNavigate={(next) => {
            setScreen(next);
            setSearchOpen(false);
            setSearch('');
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function Sidebar({ screen, onNavigate }: { screen: Screen; onNavigate: (screen: Screen) => void }) {
  return (
    <aside className="sidebar" aria-label={en.ui.navigation}>
      <button
        className="brand-lockup"
        onClick={() => onNavigate('home')}
        aria-label={en.ui.homeShortcut}
      >
        <BrandLockup />
      </button>
      <div className="sidebar-label">{en.app.explore}</div>
      <nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = item.id === screen;
          return (
            <button
              key={item.id}
              className={`nav-item${selected ? ' is-selected' : ''}`}
              aria-current={selected ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>{item.label}</span>
              {selected && <span className="nav-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="offline-chip">
          <span className="status-dot" />
          {en.app.offline}
        </div>
        <div className="sidebar-tip">
          <Keyboard size={15} aria-hidden="true" />
          <span>{en.ui.navHint}</span>
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  screen,
  onSearch,
  onNavigate,
}: {
  screen: Screen;
  onSearch: () => void;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <header className="top-bar">
      <div className="breadcrumb">
        <span>{brand.name}</span>
        <ChevronRight size={15} aria-hidden="true" />
        <strong>{navItems.find((item) => item.id === screen)?.label}</strong>
      </div>
      <div className="top-actions">
        {screen !== 'home' && screen !== 'play' && screen !== 'missions' && screen !== 'learn' && screen !== 'classroom' && screen !== 'sumo' && <span className="saved-indicator">
          <span className="saved-dot" />
          {en.app.saved}
        </span>}
        <button
          className="icon-button"
          onClick={onSearch}
          title={`${en.app.search} (${en.app.searchHint})`}
          aria-label={en.app.search}
        >
          <Search size={18} aria-hidden="true" />
        </button>
        <button className="help-button" onClick={() => onNavigate('learn')}>
          <CircleHelp size={17} aria-hidden="true" />
          {en.app.help}
        </button>
      </div>
    </header>
  );
}

export function HomePreview({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  return (
    <div className="page page-home">
      <div className="home-intro">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-dot" />
            {en.hero.chip}
          </p>
          <h1>
            {en.hero.line1}
            <br />
            <em>{en.hero.line2}</em>
          </h1>
          <p className="lead">{en.hero.description}</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => onNavigate('missions')}>
              <CirclePlay size={18} aria-hidden="true" />
              {en.hero.start}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <button className="button button-quiet" onClick={() => onNavigate('play')}>
              {en.hero.play}
            </button>
          </div>
          <div className="proof-row">
            <span>
              <Check size={15} aria-hidden="true" />
              {en.ui.offline}
            </span>
            <span>
              <Check size={15} aria-hidden="true" />
              {en.ui.keyboard}
            </span>
            <span>
              <Check size={15} aria-hidden="true" />
              {en.app.saved}
            </span>
          </div>
        </div>
        <StageCard />
      </div>
      <section className="section-block">
        <SectionHeading
          title={en.home.chooseTitle}
          subtitle={en.home.chooseSub}
          action={en.missions.select}
          onClick={() => onNavigate('missions')}
        />
        <div className="mission-cards">
          <MissionCard
            number="01"
            title={en.home.first}
            detail={en.missions.starOne}
            color="violet"
            onClick={() => onNavigate('missions')}
          />
          <MissionCard
            number="02"
            title={en.home.challenge}
            detail={en.missions.starTwo}
            color="lime"
            onClick={() => onNavigate('missions')}
          />
          <MissionCard
            number="03"
            title={en.home.sensor}
            detail={en.missions.starThree}
            color="coral"
            onClick={() => onNavigate('missions')}
          />
        </div>
      </section>
      <div className="home-bottom-grid">
        <button className="wide-card play-card" onClick={() => onNavigate('play')}>
          <span className="card-icon card-icon-dark">
            <Gamepad2 size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>{en.home.quickTitle}</strong>
            <small>{en.home.quickDescription}</small>
          </span>
          <ArrowRight size={19} aria-hidden="true" />
        </button>
        <button className="wide-card build-card" onClick={() => onNavigate('builder')}>
          <span className="card-icon card-icon-lime">
            <Wrench size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>{en.home.builderTitle}</strong>
            <small>{en.home.builderText}</small>
          </span>
          <ArrowRight size={19} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function StageCard({
  worldId = 'open-floor',
  camera = 'Orbit',
  sensorLens = false,
  ruler = false,
}: {
  worldId?: string;
  camera?: string;
  sensorLens?: boolean;
  ruler?: boolean;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [status, setStatus] = useState<PreviewStatus>('ready');
  const [step, setStep] = useState(0);
  const [pose, setPose] = useState<RobotPose>(initialPose);
  const [trail, setTrail] = useState<RobotPose[]>([initialPose]);
  const [distanceTravelled, setDistanceTravelled] = useState(0);
  const poseRef = useRef(initialPose);

  const applyPose = useCallback((nextPose: RobotPose, addToTrail = true) => {
    poseRef.current = nextPose;
    setPose(nextPose);
    if (addToTrail) setTrail((current) => [...current.slice(-12), nextPose]);
  }, []);

  const resetRobot = useCallback(() => {
    setStatus('ready');
    setStep(0);
    setDistanceTravelled(0);
    poseRef.current = initialPose;
    setPose(initialPose);
    setTrail([initialPose]);
  }, []);

  const moveRobot = useCallback(
    (centimetres: number) => {
      const current = poseRef.current;
      const radians = (current.heading * Math.PI) / 180;
      const nextPose = {
        x: Math.max(14, Math.min(80, current.x + Math.cos(radians) * centimetres * 0.75)),
        y: Math.max(28, Math.min(74, current.y + Math.sin(radians) * centimetres * 0.75)),
        heading: current.heading,
      };
      applyPose(nextPose);
      setDistanceTravelled((currentDistance) => currentDistance + Math.abs(centimetres));
    },
    [applyPose],
  );

  const turnRobot = useCallback(
    (degrees: number) => {
      applyPose({ ...poseRef.current, heading: poseRef.current.heading + degrees });
    },
    [applyPose],
  );

  const startDemo = useCallback(() => {
    setStep(0);
    setDistanceTravelled(0);
    applyPose(initialPose, false);
    setTrail([initialPose]);
    setStatus('running');
  }, [applyPose]);

  useEffect(() => {
    if (status !== 'running') return undefined;
    if (step >= demoPath.length - 1) {
      const completeTimer = window.setTimeout(() => setStatus('complete'), 0);
      return () => window.clearTimeout(completeTimer);
    }
    const timer = window.setTimeout(() => {
      const nextStep = step + 1;
      setStep(nextStep);
      applyPose(demoPath[nextStep]);
      setDistanceTravelled(nextStep * 12.4);
    }, 380);
    return () => window.clearTimeout(timer);
  }, [applyPose, status, step]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (event.key === 'ArrowUp') moveRobot(6);
        else turnRobot(-15);
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
        event.preventDefault();
        if (event.key === 'ArrowDown') moveRobot(-6);
        else turnRobot(15);
      }
      if (event.key === 'F5') {
        event.preventDefault();
        startDemo();
      }
      if (event.key === 'Escape') resetRobot();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveRobot, resetRobot, startDemo, turnRobot]);

  const robotStyle = {
    left: `${pose.x}%`,
    top: `${pose.y}%`,
    '--robot-turn': `${pose.heading}deg`,
  } as CSSProperties;
  const distance = `${distanceTravelled.toFixed(1)} cm`;
  const sensorDistance = `${Math.max(8, 34 - Math.round(distanceTravelled / 4))} cm`;
  const statusLabel =
    status === 'running'
      ? en.hero.running
      : status === 'paused'
        ? en.hero.paused
        : status === 'complete'
          ? en.hero.complete
          : en.hero.ready;

  return (
    <section
      className={`stage-card stage-${viewMode} camera-${camera.toLowerCase()}`}
      aria-label={en.ui.sampleStage}
    >
      <div className="stage-glow" aria-hidden="true" />
      <div className="stage-header">
        <span className="live-pill">
          <span className="status-dot" />
          {en.hero.live}
        </span>
        <button
          className="icon-button stage-fullscreen"
          title={en.hero.fullscreen}
          aria-label={en.hero.fullscreen}
        >
          <Maximize2 size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="stage-canvas">
        <div className="stage-grid" aria-hidden="true" />
        <div className={`world-decoration world-${worldId}`} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        {sensorLens && (
          <>
            <div className="sensor-ray" aria-label={en.robot.distanceSensor} />
            <div className="sensor-footprint" aria-label={en.robot.colorSensor} />
          </>
        )}
        {ruler && (
          <div className="stage-ruler" aria-label={en.simulator.ruler}>
            <span />
            <span />
            <strong>{en.simulator.rulerValue}</strong>
          </div>
        )}
        <svg className="stage-trail" viewBox="0 0 100 100" role="img" aria-label={en.ui.path}>
          <polyline points={trail.map((point) => `${point.x},${point.y}`).join(' ')} />
        </svg>
        <div className="robot-shadow" style={robotStyle} aria-hidden="true" />
        <div className="robot-preview" style={robotStyle} role="img" aria-label={en.robot.original}>
          <RobotModel />
        </div>
        <div className="stage-label stage-label-top">
          <span className="label-line" />
          {camera}
        </div>
        <div className="stage-label stage-label-bottom">
          <span className="label-dot" />
          {statusLabel}
        </div>
        <div className="stage-telemetry" aria-label={en.robot.telemetry}>
          <div>
            <span>{en.hero.distance}</span>
            <strong>{distance}</strong>
          </div>
          <div>
            <span>{en.robot.distanceSensor}</span>
            <strong>{sensorDistance}</strong>
          </div>
          <div>
            <span>{en.robot.heading}</span>
            <strong>{Math.round(pose.heading)}°</strong>
          </div>
        </div>
      </div>
      <div className="stage-footer">
        <div className="segmented-control" role="group" aria-label={en.ui.viewMode}>
          <button
            className={viewMode === '2d' ? 'is-active' : ''}
            onClick={() => setViewMode('2d')}
          >
            {en.hero.view2d}
          </button>
          <button
            className={viewMode === '3d' ? 'is-active' : ''}
            onClick={() => setViewMode('3d')}
          >
            {en.hero.view3d}
          </button>
        </div>
        <div className="stage-controls" aria-label={en.ui.controls}>
          <button
            className="stage-control"
            onClick={() =>
              status === 'running'
                ? setStatus('paused')
                : status === 'paused'
                  ? setStatus('running')
                  : startDemo()
            }
            aria-label={status === 'running' ? en.ui.pausePreview : en.ui.runPreview}
          >
            {status === 'running' ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            className="stage-control"
            onClick={() => moveRobot(7)}
            aria-label={en.ui.stepPreview}
          >
            <StepForward size={16} />
          </button>
          <button className="stage-control" onClick={resetRobot} aria-label={en.ui.resetPreview}>
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
      <div className="stage-hint">
        <Keyboard size={14} aria-hidden="true" />
        {en.robot.driveHint}
        <span>F5</span>
      </div>
    </section>
  );
}

function RobotModel({ large = false }: { large?: boolean }) {
  return (
    <div className={`robot-model${large ? ' robot-model-large' : ''}`}>
      <div className="robot-chassis">
        <span />
        <span />
        <span />
      </div>
      <div className="robot-motor robot-motor-left">
        <span>A</span>
      </div>
      <div className="robot-motor robot-motor-right">
        <span>B</span>
      </div>
      <div className="robot-hub">
        <div className="robot-hub-top">
          <span className="robot-hub-light" />
          <span className="robot-hub-port">C</span>
          <span className="robot-hub-port">D</span>
        </div>
        <div className="robot-hub-screen">
          <span />
          <span />
        </div>
        <div className="robot-hub-bottom">
          <span>{en.robot.hub}</span>
          <span className="robot-hub-port">E</span>
          <span className="robot-hub-port">F</span>
        </div>
      </div>
      <div className="robot-wheel robot-wheel-left" />
      <div className="robot-wheel robot-wheel-right" />
      <div className="robot-distance-sensor">
        <span />
        <span />
      </div>
      <div className="robot-color-sensor" />
      <div className="robot-front-attachment">
        <span />
        <span />
      </div>
    </div>
  );
}

function MissionCard({
  number,
  title,
  detail,
  color,
  onClick,
}: {
  number: string;
  title: string;
  detail: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button className={`mission-card mission-${color}`} onClick={onClick}>
      <span className="mission-number">{number}</span>
      <span className="mission-card-body">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ChevronRight size={19} aria-hidden="true" />
    </button>
  );
}

function SectionHeading({
  title,
  subtitle,
  action,
  onClick,
}: {
  title: string;
  subtitle: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action && onClick && (
        <button className="text-button" onClick={onClick}>
          {action}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function ScreenHeader({ screen, action }: { screen: Screen; action?: ReactNode }) {
  const item = navItems.find((navItem) => navItem.id === screen);
  return (
    <div className="screen-header">
      <div>
        <p className="eyebrow">{item?.label}</p>
        <h1>{item?.label}</h1>
        <p className="lead">{screen==='classroom'?en.classroom.intro:screen==='sumo'?en.sumo.intro:en.screens[screen]}</p>
      </div>
      {action}
    </div>
  );
}

export function BuilderPreview({ onSave }: { onSave: (project: PreviewProject) => void }) {
  const [name, setName] = useState<string>(en.builder.defaultName);
  const [color, setColor] = useState('#a88cff');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const presetColors = ['#a88cff', '#b9e769', '#ff8e80', '#7bc9f4', '#ffd66b', '#7dd3c7'];
  const choosePreset = (preset: string, index: number) => {
    setSelectedPreset(index);
    setName(preset);
    setColor(presetColors[index] ?? presetColors[0]);
  };
  const save = () => {
    if (!name.trim()) return;
    onSave({
      schemaVersion: 1,
      id: `robot-${Date.now()}`,
      name: name.trim(),
      kind: 'robot',
      color,
      blocks: [],
      updatedAt: new Date().toISOString(),
    });
  };
  return (
    <div className="page">
      <ScreenHeader
        screen="builder"
        action={
          <button className="button button-primary" onClick={save}>
            <Check size={17} aria-hidden="true" />
            {en.builder.save}
          </button>
        }
      />
      <div className="builder-layout">
        <section className="builder-preview">
          <div className="preview-label">
            <Palette size={16} aria-hidden="true" />
            {en.builder.preview}
          </div>
          <div className="big-robot" style={{ '--robot-color': color } as CSSProperties}>
            <div className="big-robot-light" />
            <div className="big-robot-screen">
              <span />
              <span />
            </div>
            <div className="big-wheel left" />
            <div className="big-wheel right" />
          </div>
          <div className="color-swatches" aria-label={en.ui.color}>
            {['#a88cff', '#b9e769', '#ff8e80', '#7bc9f4'].map((swatch) => (
              <button
                key={swatch}
                className={color === swatch ? 'is-selected' : ''}
                style={{ backgroundColor: swatch }}
                onClick={() => setColor(swatch)}
                aria-label={swatch}
              >
                <Check size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
        <section className="builder-panel">
          <div className="field">
            <label htmlFor="robot-name">{en.builder.name}</label>
            <input id="robot-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="builder-section">
            <h2>{en.builder.presets}</h2>
            <div className="preset-list">
              {en.builder.presetsList.map((preset, index) => (
                <button key={preset} className={`preset-item${index === selectedPreset ? ' is-selected' : ''}`} onClick={() => choosePreset(preset, index)}>
                  <span className={`preset-mini preset-${index}`}>
                    <Bot size={17} aria-hidden="true" />
                  </span>
                  <span>{preset}</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <div className="builder-section">
            <h2>{en.builder.parts}</h2>
            <div className="part-row">
              <Bot size={19} aria-hidden="true" />
              <span>
                <strong>{en.builder.hub}</strong>
                <small>{en.builder.hubDetail}</small>
              </span>
            </div>
            <div className="part-row">
              <Wrench size={19} aria-hidden="true" />
              <span>
                <strong>{en.builder.motor}</strong>
                <small>{en.builder.motorDetail}</small>
              </span>
            </div>
            <div className="part-row">
              <Compass size={19} aria-hidden="true" />
              <span>
                <strong>{en.builder.sensors}</strong>
                <small>{en.builder.sensorsDetail}</small>
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function FreePlayPreview() {
  const [worldIndex, setWorldIndex] = useState(0);
  const [camera, setCamera] = useState<string>(en.simulator.cameras[0]);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const world = en.simulator.worlds[worldIndex];
  const challenge = en.simulator.challenges[challengeIndex];
  const tools = [
    en.simulator.sensorLens,
    en.simulator.ruler,
    en.simulator.joystick,
    en.simulator.hubButtons,
  ];

  const nextWorld = () => setWorldIndex((current) => (current + 1) % en.simulator.worlds.length);
  const resetWorld = () => {
    setWorldIndex(0);
    setCamera(en.simulator.cameras[0]);
    setActiveTool(null);
  };

  return (
    <div className="page simulator-page">
      <ScreenHeader
        screen="play"
        action={
          <span className="ready-chip">
            <span className="status-dot" />
            {en.simulator.ready}
          </span>
        }
      />
      <div className="simulator-layout">
        <section className="simulator-main">
          <div className="simulator-stage-heading">
            <div>
              <span className="tag">{en.simulator.world}</span>
              <strong>{world.title}</strong>
              <small>{world.detail}</small>
            </div>
            <button className="button button-secondary" onClick={nextWorld}>
              {en.simulator.randomize}
              <Sparkles size={16} aria-hidden="true" />
            </button>
          </div>
          <StageCard worldId={world.id} camera={camera} sensorLens={activeTool === en.simulator.sensorLens} ruler={activeTool === en.simulator.ruler} />
          <div className="simulator-controls">
            <div className="simulator-control-group">
              <span>{en.simulator.camera}</span>
              <div className="camera-pills">
                {en.simulator.cameras.map((option) => (
                  <button
                    key={option}
                    className={camera === option ? 'is-active' : ''}
                    onClick={() => setCamera(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="simulator-control-group">
              <span>{en.simulator.tools}</span>
              <div className="camera-pills">
                {tools.map((tool) => (
                  <button
                    key={tool}
                    className={activeTool === tool ? 'is-active' : ''}
                    onClick={() => setActiveTool(activeTool === tool ? null : tool)}
                  >
                    {tool}
                    <b>{activeTool === tool ? en.simulator.toolOn : en.simulator.toolOff}</b>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
        <aside className="simulator-sidebar">
          <div className="simulator-side-card challenge-card">
            <div className="side-card-heading">
              <div className="panel-icon">
                <Gamepad2 size={20} aria-hidden="true" />
              </div>
              <div>
                <span className="tag">{challenge.tag}</span>
                <h2>{en.simulator.challenge}</h2>
              </div>
            </div>
            <h3>{challenge.title}</h3>
            <p>{challenge.detail}</p>
            <div className="goal-box">
              <span>{en.simulator.goal}</span>
              <strong>{en.simulator.goalText}</strong>
            </div>
            <div className="challenge-dots">
              {en.simulator.challenges.map((item, index) => (
                <button
                  key={item.id}
                  className={index === challengeIndex ? 'is-active' : ''}
                  onClick={() => setChallengeIndex(index)}
                  aria-label={item.title}
                />
              ))}
            </div>
          </div>
          <div className="simulator-side-card">
            <div className="side-card-title">
              <Compass size={17} aria-hidden="true" />
              <h2>{en.simulator.world}</h2>
            </div>
            <div className="world-list">
              {en.simulator.worlds.map((item, index) => (
                <button
                  key={item.id}
                  className={index === worldIndex ? 'is-selected' : ''}
                  onClick={() => setWorldIndex(index)}
                >
                  <span>{item.title}</span>
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <div className="simulator-side-card sensor-card">
            <div className="side-card-title">
              <Search size={17} aria-hidden="true" />
              <h2>{en.simulator.sensorReadings}</h2>
            </div>
            <div className="sensor-reading">
              <span>{en.robot.colorSensor}</span>
              <strong>{en.simulator.colorReading}</strong>
            </div>
            <div className="sensor-reading">
              <span>{en.robot.distanceSensor}</span>
              <strong>{en.simulator.distanceReading}</strong>
            </div>
            <div className="sensor-reading">
              <span>{en.robot.heading}</span>
              <strong>{en.simulator.gyroReading}</strong>
            </div>
          </div>
        </aside>
      </div>
      <div className="simulator-bottom-card">
        <div>
          <strong>{en.simulator.objects}</strong>
          <span>{en.simulator.objectsText}</span>
        </div>
        <button className="button button-quiet" onClick={nextWorld}>
          {en.simulator.randomize}
        </button>
        <button className="button button-secondary" onClick={resetWorld}>
          <RotateCcw size={15} aria-hidden="true" />
          {en.simulator.resetWorld}
        </button>
        <div className="simulator-active-tool">
          <span>{en.simulator.camera}</span>
          <strong>{camera}</strong>
          {activeTool && (
            <>
              <span>{en.simulator.tools}</span>
              <strong>{activeTool}</strong>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Projects({
  projects,
  onNavigate,
  hasPrograms = false,
}: {
  projects: PreviewProject[];
  onNavigate: (screen: Screen) => void;
  hasPrograms?: boolean;
}) {
  return (
    <div className="page">
      <ScreenHeader
        screen="projects"
        action={
          <button className="button button-primary" onClick={() => onNavigate('builder')}>
            <Wrench size={17} aria-hidden="true" />
            {en.projects.create}
          </button>
        }
      />
      {projects.length === 0 && !hasPrograms ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FolderOpen size={28} aria-hidden="true" />
          </div>
          <h2>{en.projects.emptyTitle}</h2>
          <p>{en.projects.emptyText}</p>
          <button className="button button-secondary" onClick={() => onNavigate('builder')}>
            {en.projects.create}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-swatch" style={{ backgroundColor: project.color }}>
                <Bot size={28} aria-hidden="true" />
              </div>
              <span className="tag">
                {project.kind === 'robot' ? en.projects.robot : en.projects.program}
              </span>
              <h2>{project.name}</h2>
              <small>{en.app.saved}</small>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Settings({
  preferences,
  onChange,
}: {
  preferences: Preferences;
  onChange: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}) {
  return (
    <div className="page">
      <ScreenHeader
        screen="settings"
        action={
          <span className="saved-indicator">
            <span className="saved-dot" />
            {en.settings.saved}
          </span>
        }
      />
      <div className="settings-layout">
        <section className="brand-about" aria-label={en.identity.about}>
          <BrandLockup />
          <h2>{brand.tagline}</h2>
          <p>{brand.description}</p>
          <small>{en.identity.independent}</small>
        </section>
        <section className="settings-card">
          <div className="setting-heading">
            <div className="setting-icon">
              <Palette size={19} aria-hidden="true" />
            </div>
            <div>
              <h2>{en.settings.appearance}</h2>
              <p>{en.settings.appearanceText}</p>
            </div>
          </div>
          <div className="theme-options">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  className={`theme-option${preferences.theme === option.id ? ' is-selected' : ''}`}
                  onClick={() => onChange('theme', option.id)}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{option.label}</span>
                  {preferences.theme === option.id && <Check size={16} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>
        <section className="settings-card">
          <div className="setting-heading">
            <div className="setting-icon">
              <BookOpen size={19} aria-hidden="true" />
            </div>
            <div>
              <h2>{en.settings.size}</h2>
              <p>{en.settings.sizeText}</p>
            </div>
          </div>
          <div className="size-options">
            {(['small', 'medium', 'large'] as TextSize[]).map((size) => (
              <button
                key={size}
                className={`size-option size-${size}${preferences.textSize === size ? ' is-selected' : ''}`}
                onClick={() => onChange('textSize', size)}
              >
                {en.settings.sizes[size]}
                {preferences.textSize === size && <Check size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </section>
        <section className="settings-card settings-toggle-card">
          <div className="setting-heading">
            <div className="setting-icon">
              <Sparkles size={19} aria-hidden="true" />
            </div>
            <div>
              <h2>{en.settings.motion}</h2>
              <p>{en.settings.motionText}</p>
            </div>
          </div>
          <button
            className={`toggle${preferences.reducedMotion ? ' is-on' : ''}`}
            role="switch"
            aria-checked={preferences.reducedMotion}
            onClick={() => onChange('reducedMotion', !preferences.reducedMotion)}
          >
            <span />
            {en.settings.reduce}
          </button>
        </section>
        <section className="settings-card settings-toggle-card">
          <div className="setting-heading"><div><h2>{en.settings.sound}</h2><p>{en.settings.soundText}</p></div></div>
          <button className={`toggle${preferences.sound ? ' is-on' : ''}`} role="switch" aria-checked={preferences.sound} onClick={() => onChange('sound', !preferences.sound)}><span />{en.settings.sound}</button>
        </section>
        <div className="privacy-note">
          <LockKeyhole size={18} aria-hidden="true" />
          <div>
            <strong>{en.settings.local}</strong>
            <p>{en.settings.localText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchDialog({
  query,
  results,
  onQueryChange,
  onClose,
  onNavigate,
}: {
  query: string;
  results: { id: Screen; label: string; icon: typeof HomeIcon }[];
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
      >
        <div className="dialog-top">
          <div className="dialog-title">
            <Search size={19} aria-hidden="true" />
            <h2 id="search-title">{en.search.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={en.ui.close}>
            <X size={19} />
          </button>
        </div>
        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={en.search.placeholder}
            aria-label={en.search.label}
          />
        </label>
        <div className="search-results">
          <span className="results-label">{en.search.results}</span>
          {results.length > 0 ? (
            results.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} className="search-result" onClick={() => onNavigate(item.id)}>
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              );
            })
          ) : (
            <p className="search-empty">{en.search.empty}</p>
          )}
        </div>
        <div className="dialog-footer">
          <Keyboard size={14} aria-hidden="true" />
          {en.home.shortcut}
        </div>
      </section>
    </div>
  );
}

export { App };
