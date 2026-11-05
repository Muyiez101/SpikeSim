# 01: Product Requirements

## Purpose
Let students practise robotics and programming on a virtual SPIKE Prime-style robot, with no physical robot needed, so they arrive at the real robot already understanding the code.

## Users
- **Students (10 to 17).** Mixed experience. Many have never coded. They need clear explanations, quick wins, and fun.
- **Teachers.** Often one teacher for many students and few robots. They need to assign missions, see progress, and create their own challenges.

## Principles
1. **See it work.** Every program runs visibly, can be slowed down, paused, and replayed.
2. **Understand it.** Every block can be explained in plain words and shown as Python.
3. **Fun first.** Missions, stars, badges, and a friendly guide keep students going.
4. **Easy to navigate.** Maximum two clicks to anything. Run controls always visible.
5. **Works anywhere.** Offline, installs on ordinary school laptops.

## Platforms
Windows 10/11 (primary), macOS, Linux. Installers for each.

## Feature list

### Must have (v1)
- Block editor with SPIKE-style categories: Motors, Movement, Light, Sound, Events, Control, Sensors, Operators, Variables, My Blocks (see `04-BLOCKS-SPEC.md`).
- Live block-to-Python view, with block highlighting while running.
- Python editor with the same runtime (SPIKE App 3 style API).
- Simulator with 2D and 3D views and a one-click toggle (see `05-SIMULATION-SPEC.md`).
- Virtual hub, motors, color, distance, and force sensors, and gyro.
- Mission system with at least 35 missions in 8 worlds (see `06-MISSIONS-SPEC.md`).
- Explain panel for every block and concept (see `07-LEARNING-SPEC.md`).
- Robot builder with presets and saved designs (see `08-ROBOT-BUILDER-SPEC.md`).
- Open, save, import, and export projects (`.rlproj` files).
- Stars, XP, badges, and unlockable worlds, saved locally.
- Teacher mode (PIN protected): unlock everything, export progress, import custom missions.
- Built-in guided tour for first launch.
- Light and dark themes, adjustable text size.

### Should have (v1.1)
- Map editor so teachers and students can design courses.
- "Real-world noise" setting (wheel slip, sensor noise).
- Class progress report export (CSV and PDF).
- Ramps and tipping (full 3D physics).

### Not in scope
- Connecting to a real hub over Bluetooth.
- Online accounts, cloud sync, or multiplayer.
- Using LEGO trademarks, logos, or artwork.

## Success measures
- A new student runs their first program within 2 minutes of opening the app.
- A student can explain what each block category does after World 3.
- No crashes in a 60-minute classroom session.
- Runs at 60 fps in 2D and at least 30 fps in 3D on a school laptop.
