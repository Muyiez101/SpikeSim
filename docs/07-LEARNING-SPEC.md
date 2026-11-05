# 07: Learning Specification

The simulator exists to teach. Every feature here should help a student understand what their program does and why. All learning content is data in `src/learn/` and all text goes through `src/shared/strings/`.

## Learning loop

Every mission follows the same loop:

1. **Learn:** a short story and one new idea, with the Explain panel open on the new block.
2. **Predict:** before the first run, the student can tap "What will the robot do?" and sketch or pick the answer.
3. **Try:** run the program, watch, adjust. Hints are available any time.
4. **Understand:** on success, the result screen shows what they did well and reveals the Python for their blocks.
5. **Check:** a one-question quiz confirms the idea. Wrong answers explain, never punish.

## Explain panel

Opens from: right-click or the `?` on any block, the toolbox, the Learn screen, and mission intros.

Each block has one entry in `src/learn/blocks/<blockId>.ts`:

```ts
type BlockExplain = {
  blockId: string;
  title: string;                    // "Move forward"
  summary: string;                  // one sentence, plain words
  detail: string;                   // 3 to 6 sentences: what happens inside the robot
  inputs: { name: string; meaning: string; example: string; range?: string }[];
  python: { code: string; note: string };           // the line it becomes and what each part means
  tryIt: { mapId: string; blocksXml: string; caption: string };   // loads a tiny demo that runs in the stage
  commonMistakes: { mistake: string; fix: string }[];
  realRobot: string;                // what is different on the real hub
  vocab: string[];                  // glossary ids
  relatedBlocks: string[];
};
```

Rules:
- Write for ages 10 to 17. Short sentences. No jargon without a glossary link.
- Every block has a working `tryIt` demo with a "Run this example" button that runs in the stage without changing the student's program.
- A "See Python" toggle shows the Python line next to the explanation, with each part labeled.
- Concepts (loops, variables, if/else, functions, sensors, units, angles) each get a short illustrated lesson in `src/learn/concepts/` with one animation or demo.
- A searchable **Glossary** lists every term (degrees, rotation, velocity, steering, yaw, loop, variable, function, sensor, async, etc.).

## Block and Python together

- The Python panel updates live as blocks change. Clicking a block highlights its Python line and clicking a line highlights its block.
- **Python peek:** in World 1 and 2 Python is collapsed with a "Peek at Python" button. From World 3 on it is open by default. Students can set this in Settings and teachers can lock it.
- **Convert and learn:** a "Make this a block" mode lets a student edit the Python of a simple program and see the blocks update, as long as the code stays in the supported shape. If not, show a plain message ("This code is too custom to show as blocks").

## Run feedback and replay

- Block highlight while running: the executing block glows, and a small badge shows live values of variables and sensor blocks.
- **What just happened?** replays the last run from the snapshot stream with a scrubber. As the scrubber moves, the timeline shows which block ran, sensor values, and motor speeds. This is the main debugging tool.
- **Sensor lens** (toggle): draws the color sensor footprint and the distance ray, with the current values next to them.
- **Slow motion** and **Step** (run one command at a time).

## Hints (three tiers)

Each mission has hints in `hints[]`:

```ts
type Hint = { tier: 1 | 2 | 3; text: string; highlightBlockId?: string; showConcept?: string };
```

- Tier 1 (nudge): points at the idea ("What should the robot do when it sees the line?").
- Tier 2 (concept): shows or opens the Explain entry for the block they need.
- Tier 3 (near solution): shows the structure, with blanks, never the full answer.
- Hint button appears after 45 seconds without a run or after 2 failed runs, and is always available in the mission panel.
- Hints never cost stars or XP. The student can always ask.
- Count hint use for the teacher report only.

## Friendly errors

Never show raw Python tracebacks to a student first. Map every error to a plain message, highlight the block or line, and keep a "Show details" link for the technical text.

| Situation | Message |
|---|---|
| Port has no device | "Port A has no motor in your robot. Add one in the Robot builder or pick another port." |
| Wrong device type on port | "Port D has a color sensor, but this block needs a distance sensor." |
| Program has no start block | "Your program has no 'when program starts' block, so nothing will run." |
| Unconnected blocks | "These blocks are not connected to your program." |
| Infinite loop without waiting | "This loop never gives the robot time to move. Add a 'wait' block inside it." |
| Missing `await` in Python | "This action takes time. Add `await` before it so the program waits for it to finish." |
| Python syntax error | "Python could not read line 7. Check the brackets and colons near it." |
| Name not defined | "`speed` is not set yet. Create it with a 'set' block before using it." |
| Robot hit a wall | "The robot hit a wall at 4.2 s. It stays there until the program ends." |
| Time limit hit | "The mission time ran out. Try driving faster or taking a shorter route." |
| Mission goal missed | Shows the checklist with the failed items and a Hint button. |

Keep this table as data in `src/learn/errors.ts` with the matching rules and tests.

## Quizzes

One short checkpoint after each mission, with 3 types:

- **Predict the path:** a map and a short program, the student draws or picks the end position.
- **Fill the block:** a program with a gap, choose the correct block or number.
- **Spot the bug:** a small program with a mistake, tap the wrong block or line.

Format is data (`src/learn/quizzes/`). Wrong answers show an explanation and a "Try again" button. Quizzes give XP but never block progress.

## Rewards

- **Stars:** 1 to 3 per mission (see `06-MISSIONS-SPEC.md`).
- **XP and levels:** XP from missions, quizzes, and first uses of a block. Level names are friendly ("Rookie", "Builder", "Programmer", "Engineer", "Master").
- **Streak:** days in a row with at least one run. Missing a day never resets XP.
- **Badges** (examples, each with an icon and one line):
  - First run, First star, Perfect world (3 stars on every mission in a world)
  - Loop master (used `repeat` in 5 missions), Sensor scout (used all 4 sensors), Debugger (fixed a program after 3 failed runs)
  - Python starter (finished World 7 mission 1), Function fan (My Block used in 3 missions)
  - Explorer (opened 20 Explain entries), Robot designer (saved a custom robot)
- Celebration animations only for stars, badge unlocks, and mission complete. Never block the screen for longer than 2 seconds. Respect reduced motion.

## Friendly guide

The mascot (see `03-DESIGN-SYSTEM.md`) speaks in the tour, hints, and results. Lines live in `src/learn/guide.ts`. It never repeats the same line twice in a row and can be hidden.

## Onboarding

First launch tour (5 steps, skippable, replayable from Settings):
1. Pick a name and a theme.
2. This is your program area (blocks).
3. This is the robot stage (try the 2D and 3D toggle).
4. Run, pause, and speed.
5. Start your first mission: "Drive to the finish line".

Target: first successful run in under 2 minutes.

## Teacher tools

- **Teacher mode** behind a PIN (4 digits, stored hashed, reset with a recovery phrase shown at setup).
- Unlock all worlds, lock Python peek, set a time limit per mission, hide hints.
- **Class progress:** import student `progress.json` files into a class list, view stars, XP, time, hints used, and the blocks each student has used. Export as CSV in v1 and PDF in v1.1.
- **Student project review:** open a student's `.rlproj` read-only, run it, and replay it.
- **Assign:** build a playlist of missions and export it as a file that students import.
- **Custom missions:** import `.rlmission` and `.rlmap` files; validation errors are explained in plain language.
- Students without teacher mode never see this menu.

## Content quality rules

- Reading level: aim for grade 5 to 7. Run a readability check in CI on `src/shared/strings/en.ts` and `src/learn/`.
- Every Explain entry, hint, and quiz is reviewed by a human teacher before release. Use the review checklist in `docs/10-QUALITY-CHECKLIST.md`.
- Use real examples from robotics (wheels, rotations, sensors) instead of abstract ones.
- All content is i18n-ready. English first, and add other languages later by adding string files only.
