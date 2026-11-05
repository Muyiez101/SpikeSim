# 08: Robot Builder Specification

Students design a robot, save it, and use it in missions and Free play. The builder is original art: it looks like a studded building plate but uses no LEGO logos, artwork, or fonts.

## Goals

- A student with no experience can build a working driving robot in under 3 minutes.
- Designs change how the robot behaves (wheel size, motor position, sensor placement, weight).
- Works fully offline and uses the same Three.js renderer as the stage.

## Screen layout

```
+---------------------------------------------------------------+
| Back   Robot name              Undo Redo   Test drive   Save  |
+----------+--------------------------------------+-------------+
| Parts    |                                      | Inspector   |
| catalog  |        Build plate (3D, orbit)       |  selected   |
| (search, |        studded grid, snap            |  part,      |
| groups)  |                                      |  ports,     |
|          |                                      |  checks     |
+----------+--------------------------------------+-------------+
| Build guide: step 3 of 8   Previous  Next  Show next part     |
+---------------------------------------------------------------+
```

- Drag parts from the catalog onto the plate, they snap to the stud grid (8 mm pitch) and to other parts.
- Orbit and zoom the plate. A "Top view" button snaps to a flat layout for precision.
- Rotate in 90 degree steps with `R`, flip with `F`, delete with `Delete`, duplicate with `Ctrl+D`, mirror left to right with `M`.
- The Inspector lists the selected part, its port, direction, and any warnings.
- "Test drive" opens a small empty mat in the stage so students can drive immediately with arrow keys.

## Parts catalog (v1)

Defined in `src/builder/parts/*.json` and validated with Zod. Each part has: `id`, `name`, `group`, `size` (studs), `mass` (g), `model` (primitive recipe or glTF id), `ports` (attachment points), and `sim` (what it does in the simulator).

| Group | Parts |
|---|---|
| Brain | Hub (5x5 matrix, 6 ports, buttons) |
| Motors | Large motor, Medium motor |
| Sensors | Color sensor, Distance sensor, Force sensor |
| Wheels | Small wheel (44 mm), Standard wheel (56 mm), Large wheel (88 mm), Ball caster |
| Frame | Plates (4x8, 6x12), Beams (5, 9, 13), Corner brackets |
| Tools | Arm, Claw (open and close), Pusher plow, Bumper |
| Extras | Weight block, Battery shell (cosmetic), Color caps (cosmetic) |

`sim` fields:
- Motor: type, `maxSpeed`, `maxTorque`, mounting axis.
- Wheel: `diameter`, `width`, `friction`.
- Sensor: sensor type, forward direction, height above plate, field of view or footprint.
- Frame and tools: mass and collision shape (box or hull).

## Validation rules

Show warnings in the Inspector and a summary chip ("2 problems") that opens a checklist. A robot with errors can be saved but not used in missions.

Errors (block use):
1. No hub.
2. Two devices on the same port, or more than 6 devices.
3. Motor or sensor not attached to any frame part (floating).
4. No drive wheels connected to motors, when a mission needs driving.

Warnings (allowed, with explanation):
1. Drive wheels are not symmetric left to right ("The robot will curve even if you drive straight").
2. Center of mass is far from the wheel axis ("Robot may tip backwards when stopping", for the 3D physics phase).
3. Sensor is blocked by another part or not facing the ground or front as expected.
4. Robot is wider than the mission's gate or maze (shown in mission intro for "student" robots).

## Port assignment

- Click a device and pick a port (A to F) from the Inspector. Free ports show in white, used ports in grey.
- Colors and icons per port are consistent with the block editor port pickers.
- Default left and right drive motors are suggested as A and B. Tell the student when blocks assume other ports ("Your 'move' blocks use ports A and B").

## From design to simulation

On Save and on mission start, `src/builder/compile.ts` turns the design into a `RobotModel` used by `src/sim/robot/`:

- Total mass and center of mass from all parts.
- Chassis collision hull from frame and tool parts (simplified to a convex hull or a few boxes).
- Wheels: position, diameter, width, friction, driving motor port.
- Motors: type, port, mounting axis (drive, arm, or custom).
- Sensors: type, port, position, direction, height.
- Arms and claws: joint axis, range of motion, linked motor port.

Same compile step is used for presets so there is one path.

## Presets

Presets live as `.rlrobot` files in `assets/robots/`, with a build guide each.

1. **Driving Base:** two big wheels, caster, hub, ports A and B, color sensor D, distance sensor E, force sensor F. Default for World 1.
2. **Line Follower:** low base, two color sensors facing down, small wheels.
3. **Claw Bot:** driving base with a claw on port C.
4. **Sumo Pusher:** wide plow, low center of mass, weight block.
5. **Sorter Arm:** fixed base with a pivoting arm and color sensor.
6. **Speedster:** large wheels, narrow body, distance sensor front.

Missions pick a preset (`robot: 'driving-base'`) or `student` to use the saved design.

## Build guides

Step-by-step guides teach building and also teach engineering ideas (stability, gearing, symmetry).

```ts
type BuildGuide = {
  id: string;
  robot: string;                     // preset id
  steps: {
    title: string;                   // "Attach the wheels"
    text: string;                    // 1 or 2 sentences, plain words
    addParts: { partId: string; position: [number, number, number]; rotation: number; port?: string }[];
    camera: { position: [number, number, number]; target: [number, number, number] };
    tip?: string;                    // engineering idea
  }[];
};
```

Behavior:
- Guide mode shows a ghost of the next part at its target position, with an arrow, and highlights the right catalog item.
- "Check my build" compares the student's build with the guide and lists what is missing or misplaced.
- "Explode view" slides parts apart to show how they fit.
- Each guide ends with a Test drive and a one-question quiz.
- Six guides in v1 (one per preset).

## Design file (`.rlrobot`)

```ts
type RobotDesign = {
  schemaVersion: 1;
  id: string;
  name: string;
  parts: { id: string; partId: string; position: [number, number, number]; rotation: number; flipped?: boolean; port?: string; mirrorOf?: string }[];
  ports: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', { partId: string; role?: 'left-drive' | 'right-drive' | 'arm' | 'custom' } | null>;
  paint?: { partId: string; color: string }[];
  createdAt: string;
  updatedAt: string;
};
```

- Saved in the app data folder and exportable as a file to share with classmates.
- Imports are validated with Zod and capped in size and part count (500 parts).

## Performance and polish

- Build plate renders at 60 fps up to 200 parts on integrated graphics (use instanced meshes).
- Autosave every 10 seconds and on exit.
- Undo and redo hold the last 100 actions.
- Snap, hover, attach, and delete have short sounds and a 150 ms animation. Both can be turned off.

## Tests

- Unit: validation rules, compile output for each preset, snapping math.
- Golden: each preset compiled and driven 1 m straight in the headless sim, ending within 2 percent of the expected distance.
- E2E (Playwright): build the Driving Base from the guide, save, start World 1 mission 1, and finish it.
