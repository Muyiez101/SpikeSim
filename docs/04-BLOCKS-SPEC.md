# 04: Blocks Specification

Blocks match the **categories and behaviour** of SPIKE Prime word blocks, with original styling. Every block compiles to Python that matches the **SPIKE App 3 Python API** (`hub`, `motor`, `motor_pair`, `color_sensor`, `distance_sensor`, `force_sensor`, `runloop`).

> **Important for the AI:** the Python names below are from memory of the SPIKE App 3 API. Before implementing, check them against the official LEGO Education SPIKE Python documentation and fix any difference in this file first. Real programs students write here should paste into the real SPIKE app and work.

## Program shape

```python
from hub import port, light_matrix, light, sound, button, motion_sensor
import motor, motor_pair, color_sensor, distance_sensor, force_sensor, color, runloop
import random, time

async def main():
    # generated blocks
    pass

runloop.run(main())
```

Event blocks become extra coroutines passed to `runloop.run(main(), when_color_red(), ...)`. The generator adds only the imports a program uses.

## Generator rules

1. Any block that waits (move for, wait, run for, beep with duration, wait until) generates `await`.
2. Any function that contains an `await` becomes `async def`, and every call to it is awaited. Propagate this through nested My Blocks.
3. Variables used inside functions get `global` declarations automatically.
4. Names: variables and My Blocks become snake_case, deduplicated, never Python keywords.
5. Output is PEP 8 formatted, 4-space indent, one statement per line.
6. **Teaching comments** (setting on by default for beginners): a short plain comment above each statement, for example `# Drive forward for 2 rotations`.
7. **Learning mode** inserts `await __hl("blockId")` before statements; these are removed from the displayed code and kept in the executed code. A `sourceMap` links each displayed line to a block ID.
8. Unconnected blocks are ignored in the program but shown with a dashed outline and a hint ("This block is not connected").
9. Port fields are dropdowns A to F, and the chosen port is validated against the robot design (warn if no motor or sensor of that type is on that port).

## Units

- **Speed** in blocks is a percentage (-100 to 100). Python velocity = `percent * 10` deg/s for motors (tunable constant `SPEED_SCALE`).
- **Distance** blocks accept cm or inches, converted with the robot's wheel circumference to degrees.
- **Turn** blocks use degrees using the gyro (accurate) or wheel calculation (setting).
- **Steering** is -100 to 100.

## Blocks by category

### Motors (single motor)
| Block | Python |
|---|---|
| run [port] [direction] for [n] [rotations/degrees/seconds] | `await motor.run_for_degrees(port.A, deg, vel)` or `await motor.run_for_time(port.A, ms, vel)` |
| start motor [port] [direction] | `motor.run(port.A, vel)` |
| stop motor [port] | `motor.stop(port.A)` |
| run [port] to position [deg] | `await motor.run_to_absolute_position(port.A, deg, vel)` |
| set [port] speed to [%] | sets the default velocity used by later Motors blocks |
| reporter: position of [port] | `motor.relative_position(port.A)` |
| reporter: absolute position of [port] | `motor.absolute_position(port.A)` |
| reporter: speed of [port] | `motor.velocity(port.A)` |
| reset [port] relative position to [n] | `motor.reset_relative_position(port.A, n)` |

### Movement (two motors, driving base)
| Block | Python |
|---|---|
| set movement motors to [port] and [port] | `motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)` |
| move [forward/backward] for [n] [cm/in/rotations/degrees/seconds] | `await motor_pair.move_for_degrees(motor_pair.PAIR_1, deg, 0, velocity=vel)` or `move_for_time` |
| start moving [direction] | `motor_pair.move(motor_pair.PAIR_1, 0, velocity=vel)` |
| move with steering [n] for [n] [unit] | `await motor_pair.move_for_degrees(PAIR_1, deg, steering, velocity=vel)` |
| start moving with steering [n] | `motor_pair.move(PAIR_1, steering, velocity=vel)` |
| tank move for [n] [unit], left [%] right [%] | `await motor_pair.move_tank_for_degrees(PAIR_1, deg, left, right)` |
| start tank move left [%] right [%] | `motor_pair.move_tank(PAIR_1, left, right)` |
| stop moving | `motor_pair.stop(motor_pair.PAIR_1)` |
| set movement speed to [%] | sets default velocity for Movement blocks |
| turn [left/right] by [degrees] | gyro-based helper (see below) |
| set wheel size to [mm] | stored on the robot design, affects cm conversions |

Gyro turn helper (generated into the program only when used):
```python
async def turn_by(degrees, velocity=300):
    motion_sensor.reset_yaw(0)
    direction = 1 if degrees > 0 else -1
    motor_pair.move_tank(motor_pair.PAIR_1, velocity * direction, -velocity * direction)
    await runloop.until(lambda: abs(motion_sensor.tilt_angles()[0] // 10) >= abs(degrees))
    motor_pair.stop(motor_pair.PAIR_1)
```
(Yaw units and sign must be checked against the official docs.)

### Light
| Block | Python |
|---|---|
| write [text] | `await light_matrix.write("Hi")` |
| show image [image] | `light_matrix.show_image(light_matrix.IMAGE_HAPPY)` |
| turn on pixel [x][y] at [brightness] | `light_matrix.set_pixel(x, y, brightness)` |
| turn off pixels | `light_matrix.clear()` |
| set hub button light to [color] | `light.color(light.POWER, color.RED)` |

### Sound
| Block | Python |
|---|---|
| play beep [note/frequency] for [seconds] | `await sound.beep(freq, ms, volume)` |
| play sound [name] until done | simulator bundled sounds, `await sound.play(...)` |
| stop all sounds | `sound.stop()` |
| set volume to [%] | stored default volume |

### Events
| Block | Python |
|---|---|
| when program starts | the `main()` body |
| when [color sensor port] sees [color] | coroutine: `while True: await runloop.until(lambda: color_sensor.color(port.C) == color.RED); ...` |
| when distance [closer/farther] than [n] | coroutine using `distance_sensor.distance` |
| when [force sensor] [pressed/released] | coroutine using `force_sensor.pressed` |
| when hub button [left/right] pressed | coroutine using `button.pressed` |
| when timer > [s] | coroutine using the sim clock |
| broadcast [message] / when I receive [message] | shared message queue helper |

### Control
| Block | Python |
|---|---|
| wait [s] seconds | `await runloop.sleep_ms(ms)` |
| repeat [n] | `for _ in range(n):` |
| forever | `while True:` |
| if / else if / else | `if ... : / elif ... : / else:` |
| wait until [condition] | `await runloop.until(lambda: cond)` |
| repeat until [condition] | `while not cond:` with an await in the body so the loop yields |
| stop [this program/all] | `return` or raise `StopProgram` |

Every loop body that does not contain an await gets an automatic `await runloop.sleep_ms(0)` at the end so loops never freeze the simulator.

### Sensors
| Block | Python |
|---|---|
| reporter: color of [port] | `color_sensor.color(port.C)` |
| reporter: reflected light of [port] | `color_sensor.reflection(port.C)` |
| condition: [port] sees [color] | `color_sensor.color(port.C) == color.RED` |
| reporter: distance of [port] in [cm/in] | `distance_sensor.distance(port.D)` converted from mm (`-1` if out of range) |
| condition: distance [<, >] [n] | comparison on the above |
| condition: [port] pressed | `force_sensor.pressed(port.E)` |
| reporter: force of [port] | `force_sensor.force(port.E)` |
| reporter: yaw angle | `motion_sensor.tilt_angles()[0]` scaled |
| reset yaw angle | `motion_sensor.reset_yaw(0)` |
| reporter: timer / reset timer | sim clock helper |
| condition: hub button [left/right] pressed | `button.pressed(button.LEFT)` |

### Operators
Add, subtract, multiply, divide, mod, round, random number between, comparisons (`<`, `>`, `=`, `!=`), and, or, not, join text, length of text, absolute value, min, max.

### Variables
Create variable, set, change by, variable reporter. Lists: create list, add item, item at, length of list, delete item, in list. Variables show their live value in a small badge on the block while running.

### My Blocks (functions)
Define a block with a name and inputs (number, text, true/false). Calling it generates `def name(a, b):`. Use the Explain panel to teach why functions help.

## Block explanation requirements

Every block above must have a content entry in `src/learn/blocks/<blockId>.ts` following the schema in `07-LEARNING-SPEC.md` (plain summary, inputs explained, example, Python equivalent, common mistakes, try-it mission).

## Tests

- One snapshot test per block: input block XML to expected Python.
- Round trip tests for My Blocks and nested loops.
- Generated programs are executed headlessly against reference maps and must produce the expected end pose.
