# 10: Quality Checklist

Use this at the end of Phase 10, and also as a smaller check at the end of every phase. Tick every item. Anything that cannot be ticked becomes a bug with an owner.

## 1. Definition of done for v1

- [ ] All 11 phases in `09-BUILD-PLAN.md` have passed their acceptance lists.
- [ ] All 41 missions have a reference solution that earns 3 stars in CI.
- [ ] Every block has a snapshot test, an Explain entry, and a `tryIt` demo.
- [ ] No placeholder text, lorem ipsum, or "TODO" in the shipped UI or content.
- [ ] A new student runs a first program within 2 minutes of opening the app (test with 3 people who have never seen it).
- [ ] No crash in a 60-minute classroom session with 10 or more students on separate laptops.

## 2. Automated checks (run on every commit)

- [ ] `npm run lint`, `npm run typecheck`, `npm test` pass with zero warnings.
- [ ] Playwright end-to-end suite passes on Windows and Linux (macOS before release).
- [ ] Mission check: all reference solutions reach 3 stars.
- [ ] Block check: every block generates valid Python that runs in the worker.
- [ ] Zod validation tests: valid and invalid samples for projects, robots, missions, maps, and progress.
- [ ] Determinism test: 100 runs of the same program, seed, and map give identical end states.
- [ ] Readability check on student-facing text (grade 5 to 7).
- [ ] Dependency audit (`npm audit`) has no high or critical issues. Lockfile committed.

## 3. Performance budgets

Test on a low-end school laptop (for example 4 GB RAM, integrated graphics, dual-core).

- [ ] Cold start to usable Home screen: under 5 s.
- [ ] Python worker ready: under 3 s, loaded in the background.
- [ ] 2D stage: 60 fps. 3D stage: 30 fps or more. Auto quality picks a setting that meets this.
- [ ] Block editor stays responsive with 300 blocks on screen.
- [ ] Memory: under 800 MB after a 60-minute session, with no growth after 20 reset-and-run cycles.
- [ ] Headless mission check: 60 simulated seconds in under 2 s.
- [ ] Installer size: under 300 MB. Installed size: under 700 MB.
- [ ] Battery: the app idles at under 5 percent CPU on the Home screen.

## 4. Accessibility

- [ ] Everything works with the keyboard alone. Focus is always visible and follows a sensible order.
- [ ] Run, Stop, Pause, Reset have shortcuts that are shown in tooltips.
- [ ] Contrast meets WCAG AA for text and controls in both themes.
- [ ] Color is never the only signal: block categories also use icons and shapes, port colors also have letters, mission checks also have icons.
- [ ] Reduced motion setting is respected (camera transitions, celebrations, tour).
- [ ] Text size setting works from 100 to 150 percent with no clipped or overlapping UI.
- [ ] Screen reader labels on all buttons and icons. Live region announces run state and results.
- [ ] Sound can be muted. Nothing important is communicated by sound alone.
- [ ] Fonts bundled and legible at small sizes. Body text uses a highly legible face.
- [ ] Touch and pen friendly targets (44 px minimum) for 2-in-1 laptops.

## 5. Offline and privacy

- [ ] Disconnect the network, install, and run: everything works (fonts, Python, models, sounds).
- [ ] Devtools network panel shows no requests during a full session.
- [ ] No telemetry, analytics, crash uploaders, or auto-updaters that call out.
- [ ] Student data stays in the app data folder. A "Reset all data" option exists in Settings.
- [ ] Teacher PIN is stored hashed, not in plain text.

## 6. Security

- [ ] `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` for all windows.
- [ ] Strict Content Security Policy. No remote scripts. No inline script.
- [ ] Preload bridge exposes only the typed functions listed in `02-ARCHITECTURE.md`.
- [ ] Student programs run only in the worker, with a watchdog and a memory cap.
- [ ] Imported files validated and size-limited. Fuzz test with malformed and oversized files.
- [ ] Navigation and new-window requests are blocked.
- [ ] No use of `eval` or `new Function` on any imported or student content outside the Pyodide worker.

## 7. Simulation accuracy

- [ ] Straight-line distance within 1 percent for 20 random commands.
- [ ] Turn angle within 1 degree for 20 random commands.
- [ ] Motor stall behaves correctly against a wall (stalls, does not clip through).
- [ ] Color sensor returns the correct color for all card colors and the white and black reflection range on the line map.
- [ ] Distance sensor accuracy within 1 mm in range, returns `-1` out of range.
- [ ] Replay matches the live run frame for frame.
- [ ] Real-world mode noise stays inside its documented bounds (when implemented).

## 8. Content review (human)

A teacher reviews every item and signs off:

- [ ] Every Explain entry is correct, plain, and matches how the real SPIKE Prime behaves.
- [ ] Every Python API difference from the real hub is listed in the "On the real robot" note.
- [ ] Mission stories and goals are clear and not too long.
- [ ] Hints go from nudge to concept to near-solution, and never give the full answer.
- [ ] Quizzes have exactly one correct answer, and explanations are accurate.
- [ ] Nothing in the app copies LEGO logos, artwork, fonts, or product names beyond describing compatibility.

## 9. Packaging and install

- [ ] Windows installer (NSIS) installs, runs, uninstalls cleanly on Windows 10 and 11.
- [ ] macOS DMG opens and runs on current and one previous macOS version.
- [ ] Linux AppImage and deb run on Ubuntu LTS.
- [ ] File associations: `.rlproj`, `.rlrobot`, `.rlmission` open in the app.
- [ ] App icon, name, and version shown correctly in each OS.
- [ ] Code-signing steps documented in `docs/packaging.md` (and used before wide distribution so school PCs do not show security warnings).
- [ ] Offline install tested from a USB stick on a machine with no internet.
- [ ] Teacher guide includes how to install on many laptops (shared installer, silent install flag).

## 10. Classroom pilot

Run before release, with real students and one teacher:

- [ ] 8 to 15 students, ages 10 to 17, mixed experience, 60 minutes.
- [ ] Observe without helping. Note where students hesitate, misclick, or ask "what does this do?".
- [ ] Measure: time to first run, time to first star, number of hints used, number of crashes.
- [ ] Ask each student to explain one block category in their own words.
- [ ] Fix the top 10 issues, then repeat with a new group.

## 11. Release

- [ ] Version number, changelog, and known issues written.
- [ ] User guide and teacher guide included inside the app and as PDFs.
- [ ] Backup of installers and source tagged in the repository.
- [ ] A feedback channel (email or form) shown in Settings, opens outside the app.
