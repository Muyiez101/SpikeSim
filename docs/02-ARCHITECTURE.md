# 02: Architecture

## Stack (use latest stable versions; verify with `npm view`)

| Layer | Choice | Why |
|---|---|---|
| Desktop shell | Electron + electron-builder | Cross-platform installers, fully offline |
| Build tool | Vite (with electron-vite or equivalent) | Fast dev loop |
| Language | TypeScript (strict) | Safety across a large codebase |
| UI | React + Radix UI primitives + CSS variables | Accessible components, full control of look |
| State | Zustand | Small, simple, testable |
| Block editor | Blockly | Free, offline, fully themeable |
| Python editor | Monaco Editor (bundled, offline) | Familiar, syntax highlighting, errors |
| Python runtime | Pyodide in a Web Worker (bundled files) | Real Python offline, sandboxed |
| Physics | Rapier (WASM, 2D first, 3D later) | Fast, deterministic, same engine for 2D and 3D |
| Rendering | Three.js (one renderer for both views) | 2D = orthographic top camera, 3D = perspective camera |
| Validation | Zod | Validates all data files and imports |
| Storage | JSON files in the app data folder | Simple, readable, easy to back up |
| Tests | Vitest (unit), Playwright (Electron end-to-end) | Covers logic and real UI |
| Fonts | @fontsource packages (bundled) | No network needed |

Using one Three.js renderer for both views means the 2D/3D toggle only changes the camera. It avoids two drawing systems and keeps the views perfectly in sync.

## Folder layout

```
robolab-sim/
  CLAUDE.md
  docs/
  electron/            main process, preload bridge, file dialogs, auto-paths
  src/
    shared/            brand.ts, strings/, types, zod schemas, constants
    ui/                screens, layout, components, theme
    editor/
      blocks/          block definitions (data) and toolbox
      generator/       blocks -> Python generator
      python/          Monaco setup, lint hints
    runtime/
      worker/          Pyodide worker, spike API shim, scheduler
      api/             hub, motor, motor_pair, sensors, runloop, sound, light_matrix
    sim/
      world/           map loading, objects, zones
      robot/           robot model, motors, sensors
      physics/         Rapier wrapper, fixed timestep loop
      headless.ts      run sim with no renderer (tests, mission checking)
    render/            Three.js scene, cameras, robot model, mat textures, effects
    missions/          engine, checks, star scoring, data (json)
    learn/             explain content (data), quizzes, hints, badges
    builder/           robot builder UI, parts catalog, validation
    progress/          XP, stars, unlocks, save/load
    teacher/           PIN, reports, mission import
  assets/              original art, sounds, textures, fonts
  tests/
```

## Module contracts

- **editor to runtime:** the editor hands the runtime a `Program { language: 'python', source, sourceMap }`. Blocks are always converted to Python first, so there is one execution path. `sourceMap` links Python lines to block IDs for highlighting.
- **runtime to sim:** the Python shim sends typed commands (`MotorRun`, `MotorStop`, `PairMove`, `LightText`, `PlaySound`) and requests sensor reads. Commands cross the worker boundary by message passing, timestamped in sim time.
- **sim to render:** each sim tick produces an immutable `SimSnapshot` (robot pose, wheel angles, arm angles, object poses, light matrix, sound events). The renderer interpolates between snapshots.
- **sim to missions:** the mission engine watches snapshots and events and evaluates checks.
- **progress:** receives mission results and updates stars, XP, badges, unlocks.

## Time and control

- Fixed physics step: 1/120 s. Render at display rate with interpolation.
- Sim time is separate from wall time. Speed control: 0.25x, 0.5x, 1x, 2x, 4x, Instant (headless fast-forward).
- The runtime is paused and resumed by the sim clock. `runloop.sleep_ms` and `runloop.until` use sim time, not real time, so programs behave the same at any speed.
- Controls: Run, Pause, Step (one command), Stop, Reset (robot to start pose).

## Running student code

1. On app start, a worker loads Pyodide and the SPIKE API shim in the background.
2. Blocks are generated to Python. In Learning mode the generator inserts `await __hl("blockId")` before each statement; these are hidden from the displayed code.
3. Python typed by the student is run as is, with line tracing for highlighting.
4. The program runs inside the worker. Runtime errors are caught and shown in plain language beside the offending block or line (see `07-LEARNING-SPEC.md`, friendly errors).
5. A watchdog stops programs that run over a configurable limit or loop without awaiting.

## Data files (all validated with Zod)

- `.rlproj`: a project (blocks XML, Python source, robot design ID or embedded design, last mission).
- `.rlrobot`: a robot design.
- `.rlmission`: a mission (see `06-MISSIONS-SPEC.md`).
- `progress.json`: stars, XP, badges, unlocks, settings.

Every file has a `schemaVersion` and a migration path.

## Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` where possible.
- Strict CSP: no remote scripts, no inline script, workers allowed from the app origin only.
- File access only through the preload bridge with a small fixed set of typed functions (open, save, export).
- Imported files are validated and size-limited. Never execute anything from an imported file other than the Python source inside the worker.

## Packaging

- electron-builder: NSIS installer for Windows, DMG for macOS, AppImage and deb for Linux.
- All assets bundled. Target installer size under 300 MB.
- Document code-signing steps in `docs/packaging.md` once reached.
