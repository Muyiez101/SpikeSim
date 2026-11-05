# 05: Simulation Specification

## Goals
Believable enough to teach real robotics, simple enough to run on a school laptop, deterministic enough to test and grade.

## Units and world
- Internal units are SI: meters, seconds, radians. UI shows cm and degrees.
- Standard competition-size mat 2362 x 1143 mm is the default map size. Maps may be any size up to 3000 x 3000 mm.
- Physics: Rapier 2D on a fixed 1/120 s step. Height is visual only until the 3D physics phase.
- Seeded random number generator for noise and random blocks.

## Default robot (Driving Base preset)
- Hub in the center, motors on ports A (left) and B (right), arm motor on C, color sensor on D (front, facing down), distance sensor on E (front), force sensor on F.
- Wheel diameter 56 mm, track width 112 mm, mass about 0.8 kg. All values come from the robot design file and are editable in the builder.

## Motors

Model each motor as a velocity-controlled actuator with limits:
- Medium motor: no-load speed about 135 rpm (810 deg/s), max torque about 0.18 N·m (tunable).
- Large motor: no-load speed about 175 rpm (1050 deg/s), max torque about 0.38 N·m (tunable).
- Commanded velocity ramps with an acceleration limit. Torque limit means a blocked wheel stalls instead of pushing through walls.
- Motor reports relative position (degrees since reset), absolute position (-180 to 179), and velocity.
- `run_for_degrees` and `move_for_degrees` finish within a small tolerance, then hold or coast according to the stop mode (brake, hold, coast).
- Motor pair: differential drive from left and right wheel angular velocities. Steering follows the SPIKE rule: steering shifts speed between the two wheels, +100 spins in place.

## Wheels and friction
- Wheel-ground contact applies traction with a friction coefficient per surface (mat 0.9, ice patch 0.2, sand 0.6; per-zone, set in the map).
- Default mode is "ideal" (no slip) for beginners. A setting enables "real-world" mode (slip, noise, small left/right motor mismatch).

## Sensors

### Color sensor
- Samples a small circle (about 12 mm radius) on the ground under its mounting position.
- The mat is a texture plus a vector layer of colored regions. Sampling returns the area-weighted average of colors under the footprint.
- Outputs: `color` (SPIKE color constants: black, magenta, purple, blue, azure, turquoise, green, yellow, orange, red, white, none), `reflection` 0 to 100, and RGBI.
- Sensor height above ground changes the footprint size (default 6 mm).
- Real-world mode adds noise (about 2 percent) and ambient light variation.

### Distance sensor
- Raycast forward (cone of about 10 degrees, 3 rays) against walls and objects.
- Range 20 to 2000 mm. Returns `-1` out of range. Resolution 1 mm. Real-world mode adds about 1 percent noise.
- Draw the ray in the stage when the Sensors tab is open (teaching aid).

### Force sensor
- Pressed when the sensor body is in contact with an object or wall. Force 0 to 10 N from contact impulse.

### Gyro and hub
- Yaw, pitch, roll from the robot body. Gyro drift optional in real-world mode.
- Hub buttons are clickable on the on-screen hub. 5x5 light matrix and status light mirror the program. Speaker plays through WebAudio.

## Objects and zones
- Movable objects: boxes, balls, cylinders, with mass, color, and friction.
- Static: walls, tables, ramps (visual in v1).
- Zones: goal areas, spawn areas, hazard areas, each with tags used by missions.
- Surfaces: friction regions, colored paint, lines, mazes (as wall segments).

## Time control
- Fixed step simulation, advanced by the scheduler. Speed 0.25x to 4x, plus Instant.
- Run, Pause, Step, Reset. Reset restores the robot and objects exactly.
- **Replay:** the last run is stored as a compact stream of snapshots (keyframes) and can be replayed with a scrubber. This powers the "What just happened?" feature.

## Snapshot contract (to renderer)
```ts
type SimSnapshot = {
  t: number;                          // sim seconds
  robot: { x: number; y: number; heading: number; wheels: number[]; arms: number[] };
  objects: { id: string; x: number; y: number; heading: number }[];
  hub: { matrix: number[][]; statusColor: string };
  events: { type: 'collision' | 'beep' | 'zoneEnter'; data: unknown }[];
};
```

## Rendering (Three.js)

One scene, two camera setups:
- **2D view:** orthographic camera looking straight down. Flat lighting, crisp mat texture, robot drawn from the same 3D model so both views match.
- **3D view:** perspective camera with soft shadows, ambient occlusion lite, and a subtle environment light. Camera modes: **Orbit** (drag to rotate, scroll to zoom), **Follow** (behind the robot), **Top**, **Driver** (first-person from the robot front).
- Toggle between views with a 300 ms camera transition. The scene is not rebuilt.
- Robot model: built from original parts in the catalog (`08-ROBOT-BUILDER-SPEC.md`). Start with clean primitive geometry (rounded boxes, cylinders) and upgrade to authored glTF models later.
- Teaching overlays (toggle): path trail, sensor footprint and ray, wheel direction arrows, heading arrow, grid and ruler, mission goal zones.
- Quality settings: Low (flat shading, no shadows), Medium, High. Auto-select on first run from a quick benchmark.
- Perf budgets: 2D at 60 fps and 3D at 30 fps minimum on integrated graphics.

## Full 3D physics (later phase)
- Switch to Rapier 3D with the same robot and map formats extended with height.
- Adds ramps, tipping, lifting and stacking objects.
- Gate behind a Settings toggle until stable.

## Determinism and tests
- Headless runner executes a program for N sim seconds and returns the end state and event log.
- Golden tests: for each reference mission solution, check end pose within tolerance, stars awarded, and run time.
- Property tests: motion in a straight line for a given degrees command stays within 1 percent of `degrees / 360 * wheelCircumference`.
