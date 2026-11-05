# Unified student workspace

Home and Free play share the same Blockly toolbox and embedded 3D stage. Students
choose a mission/world above the editor and a robot above the simulator. Drag the
divider to resize, expand the simulator, or hide the detail drawer. Sensors shows
the selected robot's active ports. About the simulator links to source/asset notices.
Top view fits and centres the complete ground, including courses built from several
rotated tiles, and refits when the panel is resized. Use this fixed overview for
recordings so the robot, route, and obstacles remain visible throughout the run.

## Runtime

- Events and Control have separate toolbox categories. The two if shapes, repeat
  until, and wait until accept the pointed sensor conditions. Colour conditions
  use named colour swatches; round reading blocks are used inside comparisons.
  Timer, sensor, hub-button and message events run cooperatively alongside the
  program-start stack. These live event/sensor blocks select the 3D runtime.
- The virtual hub uses a compact matrix and two labelled arrow buttons, with
  pointer and keyboard press/release support. It also fits short simulator panels.
- `editor/gears-python.ts` validates a visual graph, emits synchronous helper calls,
  adds block highlighting and cooperative yields, and reports final variables.
- `public/gears/student.js`, `spikesim.py`, and `spike_native.js` implement a fixed
  motor/sensor/light/sound operation table. Runs stop at 180 wall seconds or 20,000
  native calls; individual moves/waits are bounded. Stop cancels pending operations.
- Scene changes and resets are serialized. Configuration IDs prevent stale frames
  or completion messages from scoring the wrong world.
- `runtime/live-run.ts` records observed poses, zones, objects, sensors, hub state,
  output and used blocks for mission checks. Original map walls rotate about the
  vertical Y axis. Surface SVG is rasterized locally before loading its texture.
- The 2D worker engine remains independently deterministic and supports replay.
  3D uses real-time physics, not deterministic replay. The Python tab displays
  helper code, not a promise of copy/paste compatibility with the official SPIKE API.

## Robots and files

Build a robot and Build a ground now embed the Gears component editors in a
SpikeSim dialog. Save validates the returned data and applies it directly to the
current project; Cancel leaves the project unchanged. The old appearance-only
builder is no longer the active Build robot screen. An original FLL practice
configuration (`public/gears/robots/spikesim-fll.json`) has two drive motors, two
powered attachments, color/distance sensing and a gyro. It is an adaptable starting
build, not an assertion that one fixed attachment completes every FLL mission.

App code imports this configuration from `src/sim/fll-robot.json`, because Vite's
public directory serves static assets rather than source modules. Keep both JSON
files aligned; the custom-design unit suite compares the complete definitions.

Custom robot/world data stays in the draft while presets are selected, so students
can select their custom design again. Files include both custom options and the
active selection. Custom robot saves preserve existing drive/attachment port
assignments where possible. A design has at most four attachment motors and uses
six student ports. Data is bounded to 180 KB per design, rejects code/prototype
keys and remote URLs, and validates component/object trees. Uploaded ground
images are converted to bounded JPEG data; bundled images and models keep their
local paths. The existing 256 KB project-file limit still applies to the combined
program and designs.

`student.html` starts with the student CSS class in its markup. An opaque parent
loading panel covers the iframe from its first frame through scene configuration;
upstream menus are never briefly presented as the student interface. Builder
iframes use the same loading approach. The 3D camera fits custom ground dimensions.
The student stage activates rendering directly, without invoking the hidden
upstream Blockly tab callbacks, and waits for initial meshes and scene materials.
If loading fails or takes over 20 seconds, Retry loading recreates only the
simulator iframe and keeps the student's program and saved design intact.

The student driving base adapts its dimensions and devices to the active design.
Imported motor ports and sensor ports are preserved; additional imported rotation
motors get virtual arm attachments. Selecting another bundled template deliberately
changes the project's robot/port map, visible in Sensors. Templates expose drive
motors A/B, then attachments and available sensors on C–F. Heading blocks can use
the internal gyro without a sensor port. The full upstream robot models remain
included even when they contain more devices than six student ports can expose.

Motor start/timed blocks control magnet power. Rotations/degrees do not apply to
magnets and show an explanatory error. Gears camera/GPS/pen devices and multi-robot
programming are not yet in this toolbox. Upstream XML and Python examples are
preserved under `public/gears/samples/`; they are not automatically converted.

`.rlproj` saves include optional robot design, template and scene, validated against
the bundled catalogs. SPIKE `.llsp3` contains a manifest and nested `scratch.sb3`;
the importer checks archive bounds/CRC, graph size, instructions and port conflicts.
It supports one program-start stack, loops, conditions, variables, sensors, motion,
motor encoders, matrices/text and supported sounds. Python projects, icon blocks,
unsupported events and instructions are rejected before changing the current draft.
Physical builds may differ from the simulated geometry and need route calibration.

## Physical practice and measurements

The Challenge tab offers five original exercises: pushing cargo, lifting a pallet,
turning a hinged gate, collecting/delivering a load, and parking on a measured route.
Each opens a matching physical robot and attachment, target, and editable example.
The exercises can use any bundled FLL mat; they are not official FLL mission models
or official tournament scoring. Goals measure the live object/robot pose, require
a sustained result, and reset when the simulation resets.

Measure mat records points in centimetres and reports segment distances, turns,
and wheel rotation. Load route as blocks creates an editable measured route.
Robot wheel travel, friction, and attachment geometry still require calibration.

Line Following Challenges: Obstacles 2 has a **Load Obstacle 2 program** button.
It loads a robot with colour sensors D/F, a forward range sensor E, and an internal
gyro. A front skid keeps the range sensor level while turning. Its connected blocks
follow the line, scan for the clear side, detour around three obstacles, reacquire
the line, and park at the end. Reset preserves the goal and randomizes the upstream
side obstacles. The example's dimensions are specific to this challenge.

## Acceptance limits

The FLL catalog contains eight distinct mats (2018–2025) in nine layouts, because
RePLAY 2020 has two versions. The bundled 2018, 2019 and 2025 worlds contain no
mission objects; the picker marks them **Mat only**. The 2020–2024 worlds include
mission models. Object counts describe component groups, not completed or scored
FLL missions. Competition entries now carry content availability checked against
their actual world files.

Classroom collision reporting registers only active root physics bodies and is
not attached to competition objects. Registering compound child impostors with
Ammo contact-pair callbacks could previously stop rendering while the UI reported
Ready. Readiness now waits for a completed render frame; competition cameras fit
the selected mat. Browser regression coverage checks advancing frames, visible
models and loaded textures across all nine FLL selections.

Learning stars use the selected simulator's actual run. All 41 classroom references
now have a recorded three-star run in live 3D, in addition to their 2D tests. Five
attachment exercises, Obstacle 2's mixed layout, Simple Curves, and Gaps 1 also have
successful live runs and editable projects in `recordings/index.html`. Simple Curves
and Gaps 1 expose **Load line follower program**, which installs the matching robot,
reflected-light steering blocks, measured encoder distance, and parking objective.
These examples are calibrated to their default robot and course. The remaining
practice and competition fields still need solutions and physical scoring work.
Native desktop acceptance now covers real 3D and 2D runs, builders, program files,
classroom workers and saved drafts/results. Simulator and builder replies support
Electron's opaque `file:` parent origin while keeping incoming messages bound to
the verified parent window and its original origin. See [desktop packaging and
acceptance](packaging.md) for the tested artifacts and remaining checks. No content
has been published. GPL source obligations and unresolved third-party FLL artwork
terms are recorded in `public/gears/SPIKESIM-NOTICE.md`.
