# 06: Missions Specification

Missions are data, not code. The engine in `src/missions/` loads `.rlmission` files (JSON), validates them with Zod, and runs them on the headless simulator. Adding a mission never needs a code change.

## Structure

- 8 worlds, 5 or 6 missions each, 41 missions in v1.
- A world unlocks when the student has earned at least 60 percent of the stars in the previous world. Teacher mode unlocks everything.
- Each mission teaches one new idea and reuses the older ones.

## Mission file (`.rlmission`)

```ts
type Mission = {
  schemaVersion: 1;
  id: string;                    // "w1-m1-first-steps"
  world: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  order: number;                 // position inside the world
  title: string;                 // strings key, not raw text
  story: string;                 // 2 to 3 sentences, strings key
  goal: string;                  // one sentence, strings key
  concepts: string[];            // e.g. ["loops", "turn-angles"]
  language: 'blocks' | 'python' | 'either';
  map: string;                   // id of a map file
  robot: string;                 // robot preset id, or "student" to use the saved design
  toolbox: {                     // what the student may use
    categories: string[];        // block categories shown
    blocks?: string[];           // optional allow-list of block ids
    locked?: string[];           // blocks shown but disabled, with a "Unlocks in World N" tip
  };
  starter?: { blocksXml?: string; python?: string };   // optional starting program
  checks: Check[];               // all "required" checks must pass for 1 star
  stars: { two: Check[]; three: Check[] };             // extra checks for stars 2 and 3
  timeLimitSec: number;          // sim seconds before the run is stopped
  hints: Hint[];                 // 3 tiers, see 07-LEARNING-SPEC.md
  explain: string[];             // explain entry ids opened before the mission
  quiz?: string;                 // quiz id shown after completion
  reference: { blocksXml?: string; python: string };   // solution used by tests (3 stars)
  xp: number;                    // base XP, bonus for stars
};
```

### Check types

Each check is `{ type, ...params, required?: boolean, label: string }` and `label` is shown to the student as a checklist item.

| type | params | passes when |
|---|---|---|
| `reachZone` | `zone` | robot center enters the zone at any time |
| `stopInZone` | `zone`, `speedBelow` | robot is inside the zone and nearly still at the end |
| `objectInZone` | `object` or `tag`, `zone`, `count?` | movable object(s) end inside the zone |
| `visitInOrder` | `zones[]` | zones entered in the given order |
| `colorSeen` | `color` | color sensor reported the color at least once |
| `pathMatches` | `shape`, `tolerance` | robot trail matches a shape (square, triangle, star, circle) within tolerance |
| `headingWithin` | `degrees`, `tolerance` | final heading is close to the target |
| `noCollision` | `with?` | no collision events (optionally with a tag) |
| `finishTimeUnder` | `seconds` | program ends before the time |
| `distanceUnder` | `mm` | total distance driven is below a limit |
| `blockCountAtMost` | `n` | block count or non-empty Python lines within limit |
| `usesBlock` | `blockId` | program contains the block (teaches a concept) |
| `usesConcept` | `concept` | program uses loop, if, variable, My Block, or function |
| `matrixShows` | `text` or `image` | light matrix showed it at some point |
| `soundPlayed` | `min?` | at least one beep or sound played |
| `variableEquals` | `name`, `value` | a variable has the value at the end |
| `survives` | none | robot not pushed out of the ring or off the map |

Checks are pure functions over the event log and final snapshot, defined in `src/missions/checks/`. Add a unit test for every check type.

### Stars

- **1 star:** all `checks` pass.
- **2 stars:** plus all `stars.two` checks (usually precision, no collisions, or time).
- **3 stars:** plus all `stars.three` checks (usually efficiency or using the mission's key concept well).
- XP: `xp` for the first completion, plus 10 per extra star, plus 5 for a first-try success. Replays only award XP for new stars.

## Map file (`.rlmap`)

```ts
type MapFile = {
  schemaVersion: 1;
  id: string;
  size: { width: number; height: number };           // mm
  surface: {
    base: string;                                     // texture id or hex color
    layers: Layer[];                                  // paint, lines, patches
  };
  walls: { points: [number, number][]; thickness: number; height: number }[];
  objects: { id: string; kind: 'box' | 'ball' | 'cylinder'; x: number; y: number; size: number; mass: number; color: string; tags?: string[] }[];
  zones: { id: string; shape: 'rect' | 'circle'; x: number; y: number; w?: number; h?: number; r?: number; tags: string[]; color?: string; label?: string }[];
  friction: { zone: string; coefficient: number }[];
  spawn: { x: number; y: number; heading: number };   // default robot start
  decor?: { model: string; x: number; y: number; scale: number }[];   // visual only, 3D view
};

type Layer =
  | { type: 'line'; points: [number, number][]; width: number; color: string }    // black lines for followers
  | { type: 'patch'; shape: 'rect' | 'circle'; x: number; y: number; w?: number; h?: number; r?: number; color: string }
  | { type: 'image'; asset: string; x: number; y: number; w: number; h: number };
```

- Maps are drawn into a texture at load, and the color sensor samples the vector layers (not the pixels) for accuracy.
- Make 20 reusable base maps in v1 (open floor, parking, line tracks, intersections, three mazes, city, bins, arena, sumo ring, grand prix track). Missions pick a map and can override objects and zones.

## Mission list (v1, 41 missions)

For each mission: the goal, the concept, and what earns stars 2 and 3. Every mission has a reference solution that must reach 3 stars in tests.

### World 1: Boot Camp (move, turn, light, sound)
| id | Title | Goal | Concept | Star 2 | Star 3 |
|---|---|---|---|---|---|
| w1-m1 | First steps | Drive to the finish line | move blocks, units | stop inside the line zone | 3 blocks or fewer |
| w1-m2 | Turn the corner | Reach the garage by turning right once | turn angles | arrive facing the garage door | no wall touches |
| w1-m3 | Park it | Reverse into the parking bay | negative direction, speed | stop fully inside the bay | under 12 s |
| w1-m4 | Say hello | Show text on the hub, beep, then reach the finish | light and sound | use a beep and text | under 6 blocks |
| w1-m5 | The long way | Follow an L-shaped route around two crates | sequencing | no collisions | within 5 percent of shortest distance |

### World 2: Pattern Park (loops)
| id | Title | Goal | Concept | Star 2 | Star 3 |
|---|---|---|---|---|---|
| w2-m1 | Square dance | Draw a square | repeat | shape within tolerance | use `repeat` with 4 or fewer inner blocks |
| w2-m2 | Triangle trail | Draw a triangle | angles (120) | shape within tolerance | end at the start point |
| w2-m3 | Star power | Draw a five-point star | exterior angles (144) | shape within tolerance | 5 or fewer blocks in the loop |
| w2-m4 | Flower garden | Draw 6 circular petals | nested loops | 6 petals | under 20 s |
| w2-m5 | Dance routine | Move, flash lights, and play sounds for 20 s | loops and timing | uses light and sound | runs 20 s plus or minus 1 s |

### World 3: Sensor Lab (sensors)
| id | Title | Goal | Concept | Star 2 | Star 3 |
|---|---|---|---|---|---|
| w3-m1 | Stop at the wall | Stop 10 cm from the wall | distance sensor, wait until | within 1 cm | no wall touch, any start distance |
| w3-m2 | Color gate | Drive until you see red, then stop | color sensor | stop on the red | under 4 blocks |
| w3-m3 | Bump and back | Drive until the force sensor is pressed, then back up 20 cm | force sensor | back up 18 to 22 cm | show a warning on the matrix |
| w3-m4 | Gyro turn | Turn exactly 90 degrees four times | gyro, yaw | each turn within 2 degrees | use a loop |
| w3-m5 | Color reporter | Show the color you see on the matrix | sensor to light | works on 3 colors | works on all 6 cards |

### World 4: Decision Town (decisions, events, line following)
| id | Title | Goal | Concept | Star 2 | Star 3 |
|---|---|---|---|---|---|
| w4-m1 | Green means go | Wait for green, then drive to finish | wait until, events | start within 0.5 s of green | no early start |
| w4-m2 | Two lanes | Turn left on red cards and right on blue cards | if / else | works on both cards | works on random card order |
| w4-m3 | Line follower | Follow a black line to the end | on-off control | reach end | under 40 s |
| w4-m4 | Smooth line follower | Follow a curved line with smooth motion | proportional control | reach end | under 30 s |
| w4-m5 | Intersections | Line follow and turn at colored markers | combining ideas | follow the marker order | under 60 s |

### World 5: Maze City (variables, algorithms)
| id | Title | Goal | Concept | Star 2 | Star 3 |
|---|---|---|---|---|---|
| w5-m1 | Corridor run | Reach the end of a simple maze | distance plus turning | no collisions | under 45 s |
| w5-m2 | Wall follower | Solve a maze with the right-hand rule | algorithms | reach exit | on 3 different mazes |
| w5-m3 | Deliver the parcel | Visit 3 stops in order | planning | all stops in order | shortest route |
| w5-m4 | Count the lines | Count 5 black lines, then stop | variables | stop on line 5 | show the count live on the matrix |
| w5-m5 | Escape room | Find the exit from a random start rotation | search strategy | reach exit | under 90 s on 3 seeds |

### World 6: Function Factory (My Blocks, operators, sorting)
| id | Title | Goal | Concept | Star 2 | Star 3 |
|---|---|---|---|---|---|
| w6-m1 | My first block | Make a `drive square` My Block and use it twice | functions | block used twice | block has an input for side length |
| w6-m2 | Sort by color | Push red boxes to the red bin and blue to the blue bin | if plus functions | all boxes sorted | under 60 s |
| w6-m3 | Conveyor count | Count 8 passing objects and show the total | variables, sensors | count correct | show count on matrix in real time |
| w6-m4 | Math mover | Drive a distance computed from two inputs | operators | correct for 3 inputs | use a My Block with inputs |
| w6-m5 | Pick and place | Use the arm to move a box to the shelf | arm motor, positions | box on shelf | under 25 s |

### World 7: Python Peak (text coding)
| id | Title | Goal | Concept | Star 2 | Star 3 |
|---|---|---|---|---|---|
| w7-m1 | Hello Python | Run the given Python, then change one number to change the drive distance | reading code | reach the new target | explain the line in a quiz |
| w7-m2 | Fix the bug | Find and fix 3 bugs in a program | debugging | all 3 fixed | fixed in 5 runs or fewer |
| w7-m3 | Write a loop | Drive a square using a `for` loop | for loops | square within tolerance | under 8 lines |
| w7-m4 | Await and wait | Use `await` and `runloop` to stop at the wall | async basics | stops at the wall | no `sleep` guesses used |
| w7-m5 | Python line follower | Write a line follower using a function | functions in Python | reach end | under 30 lines |

### World 8: Champion Arena (challenges)
| id | Title | Goal | Concept | Star 2 | Star 3 |
|---|---|---|---|---|---|
| w8-m1 | Sumo rookie | Push 3 boxes out of the ring | strategy | all 3 out | robot stays in the ring |
| w8-m2 | Sumo champion | Beat a computer robot | strategy and sensors | win | win in under 30 s |
| w8-m3 | Warehouse run | Deliver 4 items to their shelves in order | planning | correct order | under 90 s |
| w8-m4 | Rescue mission | Cross a hazard area, find the target, bring it home | combined skills | target home | no hazard touches |
| w8-m5 | Grand Prix | Race a track as fast as you can | optimisation | finish | under the gold time |
| w8-m6 | Design your own | Teacher or student makes a mission | creativity | n/a (no stars) | n/a |

World 8 mission 6 is a sandbox slot: in v1 it opens Free play with imported missions, and in v1.1 it opens the map editor.

## Computer opponents and objects

- The sumo opponent runs a simple scripted behavior defined in the mission (`opponent: { script: 'pusher' | 'spinner' | 'defender', speed }`) and uses the same physics as the student robot.
- Random elements (card order, start rotation) use the mission seed. Reset restores the same seed, and a "Try a new seed" button changes it so students cannot hard-code answers.

## Authoring and testing

- A CLI script `npm run mission:check <id>` runs the reference solution headless and prints stars, time, and any failed check.
- CI runs all missions, and fails if any reference solution does not reach 3 stars.
- Teacher import: `.rlmission` files are validated and shown in a "Custom missions" shelf.
