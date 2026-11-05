# 09: Build Plan

Eleven phases, built one at a time. Each phase ends with something you can run and test by hand. Do not start the next phase until the current one passes its acceptance list.

## How to run each phase

1. Open the AI coding agent in the repo with `CLAUDE.md` and `docs/` in place.
2. Paste the phase prompt below.
3. Let the agent write its plan first. Read it. Reply "go" or correct it.
4. When it finishes, run the app yourself and tick every line in the acceptance list.
5. If something fails, paste this: *"Acceptance item X failed. Here is what I did and what I saw. Find the cause, fix it, add a test so it cannot come back, and re-run the checks."*
6. Commit (the agent does this) and move on.

Tips:
- Keep each chat focused on one phase. Start a fresh chat for the next phase, and begin with "Read CLAUDE.md, the docs, and the git log, then continue with Phase N."
- When the agent asks a question, answer it in one line. If you are unsure, say "choose the simplest option and note it in docs/decisions.md".
- Ask for a short demo script at the end of every phase ("what should I click to see this working?").

---

## Phase 0: Foundations

**Prompt**
> Read CLAUDE.md and all files in docs/. Build Phase 0 from docs/09-BUILD-PLAN.md: scaffold the Electron + Vite + React + TypeScript project with strict settings, ESLint, Prettier, Vitest, Playwright, the folder layout from docs/02-ARCHITECTURE.md, the theme tokens and fonts from docs/03-DESIGN-SYSTEM.md, `src/shared/brand.ts`, and the strings system. Set up Electron security as described. Show a window with the left navigation and an empty Home screen in light and dark themes.

**Deliver**
- Project scaffold, scripts (`dev`, `build`, `lint`, `typecheck`, `test`, `e2e`, `package`), CI config.
- Theme tokens, bundled fonts, light and dark themes, text size setting.
- Left navigation and empty screens for Home, Missions, Learn, Build robot, Free play, My projects, Settings.
- Typed preload bridge with `openFile`, `saveFile`, `getAppDataPath`.

**Accept**
- `npm run dev` opens the app. Navigation works with mouse and keyboard.
- Theme and text size changes persist after restart.
- Lint, typecheck, unit tests pass. One Playwright test opens the app and visits every screen.
- Security check: nodeIntegration off, contextIsolation on, CSP set, no network calls (verify in devtools).

## Phase 1: Simulation core (headless)

**Prompt**
> Build Phase 1: the headless simulator described in docs/05-SIMULATION-SPEC.md. Rapier 2D on a fixed 1/120 s step, robot model with motors, motor pair, wheels and friction, color, distance, force sensors and gyro, map loading from `.rlmap` (docs/06-MISSIONS-SPEC.md), objects and zones, `SimSnapshot` output, a headless runner, and the replay stream. No rendering yet. Include the Driving Base preset and three test maps.

**Deliver**
- `src/sim/` with robot, physics, world, headless runner, replay recorder.
- Zod schemas for `.rlmap` and `.rlrobot`.
- A CLI: `npm run sim -- --map open-floor --commands commands.json` printing the end state.

**Accept**
- Property test: `degrees` command travels within 1 percent of the expected distance.
- Turn-in-place of 90 degrees ends within 1 degree.
- Color, distance, and force sensors return correct values on a test map.
- Same inputs and seed give identical results across 100 runs.
- 60 simulated seconds run in under 2 real seconds in headless mode.

## Phase 2: Stage renderer (2D and 3D)

**Prompt**
> Build Phase 2: the Three.js stage from docs/05-SIMULATION-SPEC.md. One scene, orthographic top camera for 2D and perspective camera for 3D with Orbit, Follow, Top, and Driver modes. Draw the robot from its design, the mat from the map layers, walls, objects, zones. Add the 2D/3D toggle with a 300 ms transition, teaching overlays (trail, sensor footprint and ray, heading arrow, grid), quality presets with an automatic first-run benchmark, and playback controls (Run, Pause, Step, Stop, Reset, speed). Drive the robot with arrow keys for now.

**Accept**
- Toggling 2D/3D never rebuilds the scene and the robot keeps moving.
- Overlays toggle independently.
- 60 fps in 2D and 30 fps or more in 3D on integrated graphics (test on a real school-class laptop).
- Resizing the window and switching themes work with no visual glitches.

## Phase 3: Python runtime

**Prompt**
> Build Phase 3: the runtime. Pyodide in a Web Worker (bundled, offline), the SPIKE-style Python API shim from docs/04-BLOCKS-SPEC.md (hub, motor, motor_pair, color_sensor, distance_sensor, force_sensor, motion_sensor, light_matrix, sound, runloop, color), the scheduler tied to sim time, the watchdog, line tracing, and plain-language error mapping. Add a temporary Monaco editor to test programs. Verify every API signature against the current official LEGO SPIKE Python documentation before implementing, and list any differences in docs/decisions.md.

**Accept**
- A program that drives a square runs and draws the right trail.
- `runloop.sleep_ms` and `runloop.until` behave the same at 0.25x, 1x, and Instant speeds.
- An infinite loop without `await` is stopped with a friendly message in under 2 seconds.
- Closing the app mid-run leaves no stray processes.
- Cold-start of the Python worker is under 3 seconds and happens in the background.

## Phase 4: Block editor

**Prompt**
> Build Phase 4: the Blockly editor. Use the block list in docs/04-BLOCKS-SPEC.md as data, add category colors and shapes (not color alone), custom renderer, toolbox, the blocks-to-Python generator with source map, live Python panel, block highlighting while running, variables and My Blocks, and the unit-test snapshot for every block. Port and color pickers should be visual. Theme to match docs/03-DESIGN-SYSTEM.md.

**Accept**
- Every block in the spec exists, generates the right Python, and has a snapshot test.
- Block highlight follows execution at all speeds. Python lines and blocks cross-highlight on click.
- Unconnected blocks show a dashed outline and a hint.
- A first-time user can build and run "drive forward" in under 60 seconds.

## Phase 5: App shell and workspace

**Prompt**
> Build Phase 5: the workspace screen from docs/03-DESIGN-SYSTEM.md with resizable panels (mission panel, blocks and Python tabs, stage, console), the persistent run bar, Home screen with the Continue card, Free play, open and save of `.rlproj` projects with autosave, import and export, recent projects, Settings, and the first-launch guided tour with coach marks.

**Accept**
- Run controls are always visible and keyboard accessible (`F5` run, `Esc` stop).
- Projects open and save through native dialogs, and bad files show a plain error.
- Autosave recovers the last session after a forced quit.
- Guided tour finishes in under 90 seconds and can be replayed.

## Phase 6: Mission engine and Worlds 1 to 2

**Prompt**
> Build Phase 6: the mission engine from docs/06-MISSIONS-SPEC.md. Load `.rlmission` files, apply toolbox limits, run checks on the event log, award stars and XP, show the mission intro and result screens, save progress, and add the world map. Author Worlds 1 and 2 (10 missions) with reference solutions, and the `mission:check` CLI.

**Accept**
- All 10 reference solutions reach 3 stars in CI.
- Mission intro, checklist, and result screens match the design system.
- Progress persists and survives a restart. World 3 unlocks at 60 percent of stars in Worlds 1 and 2.
- A student can finish World 1 mission 1 within 2 minutes of the first launch.

## Phase 7: Learning layer

**Prompt**
> Build Phase 7: the learning features from docs/07-LEARNING-SPEC.md. Explain panel with `tryIt` demos for every block, concept lessons, glossary, three-tier hints, friendly error mapping, "What just happened?" replay with scrubber, sensor lens, predict-the-path quizzes, XP, levels, streaks, badges, and the guide character. Write the real content for every block explain entry and every mission hint (no placeholders).

**Accept**
- Every block has an explain entry with a working demo.
- Every error row in the spec is triggered by a test and shows the right message.
- Replay scrubber matches the original run exactly.
- Readability check passes on all student-facing text.

## Phase 8: Robot builder

**Prompt**
> Build Phase 8: the robot builder from docs/08-ROBOT-BUILDER-SPEC.md. Parts catalog data, build plate with snapping, inspector, port assignment, validation, compile to `RobotModel`, presets, build guide mode with ghost parts and "Check my build", save and share, and Test drive.

**Accept**
- All 6 presets build from their guides without errors.
- A custom robot with different wheel size changes the driving distance as expected.
- Invalid designs cannot be used in missions and explain why.
- 60 fps on the build plate with 200 parts.

## Phase 9: Remaining worlds and teacher mode

**Prompt**
> Build Phase 9: author Worlds 3 to 8 (31 missions) with maps, hints, quizzes, and reference solutions. Add the computer opponent for sumo, Python-first missions with starter code, the "Design your own" slot, and teacher mode: PIN, unlock all, lock Python peek, class progress import and CSV export, student project review, assignments, custom mission import.

**Accept**
- All 41 reference solutions reach 3 stars in CI.
- Randomized missions (card order, start rotation) cannot be solved by hard-coding a single answer.
- Teacher PIN works, resets with the recovery phrase, and hides tools from students.
- A teacher can import 5 student progress files and export a correct CSV.

## Phase 10: Polish, performance, and packaging

**Prompt**
> Build Phase 10: performance pass, accessibility audit, sound design, final animations, empty states, settings completeness, and installers for Windows, macOS, and Linux. Run everything in docs/10-QUALITY-CHECKLIST.md and fix what fails. Write the user guide and teacher guide as markdown inside the app.

**Accept**
- Every item in `docs/10-QUALITY-CHECKLIST.md` is ticked.
- Installers run on clean machines with no internet, and the app works fully.
- A 60-minute classroom pilot with real students completes with no crashes.

---

## After v1

- **v1.1:** map editor, real-world noise mode, class report PDF, ramps and tipping with full 3D physics (Rapier 3D).
- **Later ideas:** more languages, a sharing folder for teachers, extra worlds, bring-your-own 3D robot models, optional connection to a real hub.

## Decision log

Keep `docs/decisions.md`. The agent adds one line for each choice it made when the docs did not decide it: date, decision, reason. Review it at the end of each phase.
