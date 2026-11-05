# 03: Design System

## Brief
Classic, clean, friendly, and trustworthy. It should feel like a well-made educational tool, not a toy and not a corporate dashboard. A first-time 10-year-old and a 17-year-old should both feel at home. Clarity beats cleverness. One memorable element: the **robot stage**, which is always the visual hero of the screen.

## Palette

| Token | Hex | Use |
|---|---|---|
| `--ink` | `#14213D` | Text, icons, dark surfaces |
| `--paper` | `#F6F8FC` | App background (light theme) |
| `--surface` | `#FFFFFF` | Panels, cards |
| `--primary` | `#2F6BFF` | Primary actions, focus, selected |
| `--accent` | `#FFC933` | Stars, rewards, highlights |
| `--success` | `#1FA971` | Passed, running OK |
| `--danger` | `#E5484D` | Errors, stop |
| `--line` | `#D9E0EE` | Borders and dividers |

Dark theme: `--paper #0F1626`, `--surface #18223A`, `--ink #EAF0FF`, `--line #2B3856`, same primary and accent (adjust for contrast).

All text and controls meet WCAG AA contrast in both themes. Color is never the only signal: pair it with icon and text.

### Block category colors (original palette, SPIKE-style grouping)

| Category | Hex |
|---|---|
| Motors | `#3E8EF7` |
| Movement | `#7B61FF` |
| Light | `#E64FA3` |
| Sound | `#B04CD9` |
| Events | `#F5A524` |
| Control | `#F2C230` |
| Sensors | `#19B8D0` |
| Operators | `#3DBE6A` |
| Variables | `#F0672B` |
| My Blocks | `#E5484D` |

Colors must stay distinguishable for color-blind users. Each category also has a unique icon shown in the palette and on the block.

## Typography (bundled via @fontsource)

- Headings and UI labels: **Lexend** (designed for readability). Weights 500, 600.
- Body and explanations: **Atkinson Hyperlegible** (designed for low-vision legibility). Weights 400, 700.
- Code: **JetBrains Mono**.
- Scale: 12, 14, 16, 18, 22, 28, 36. Body 16. Text size setting: Small, Medium, Large.
- Line length under 70 characters in explanations. Sentence case everywhere. No all-caps labels.

## Shape and spacing

- 8 px spacing grid. Radius: 12 on panels, 8 on controls, 999 on pills and the run button.
- Shadows only for floating things (menus, dialogs). Panels are separated by borders, not shadows.
- Icons: a single consistent set (Lucide), 20 px, 1.75 stroke. Original robot and part illustrations only.

## Layout

```
+--------------------------------------------------------------------------------+
| Logo  Project name              [Run]  [Pause] [Step] [Stop] [Reset]  Speed 1x  |
|                                                          [2D|3D]   Help   Menu  |
+-------+------------------------------------------+-----------------------------+
| Nav   | Code area                                | Robot stage                 |
|       | [Blocks | Python]  (side-by-side opt.)   |  (2D/3D, always visible)    |
| Home  | +--------+------------------------+      |                             |
| Learn |  Block   |  Workspace              |      |                             |
| Mis-  |  palette |                         |      +-----------------------------+
| sions |          |                         |      | Tabs: Mission | Explain |   |
| Build |          |                         |      |       Sensors | Console     |
| Free  +--------+------------------------+      |                             |
| Files                                          |                             |
+-------+------------------------------------------+-----------------------------+
```

- **Left nav (always visible, icons + labels):** Home, Missions, Learn, Build robot, Free play, My projects, Settings. Teachers see Teacher tools at the bottom.
- **Top bar:** project name, Run, Pause, Step, Stop, Reset, speed, 2D/3D toggle, Help, Menu. These never move or hide.
- **Code area:** tabs for Blocks and Python, or a split view showing both (the default in Learning mode). Python is read-only when generated from blocks, with a button "Edit as Python" that makes a copy.
- **Robot stage:** top right, largest panel, resizable, with a full-screen button. Camera buttons in 3D: Orbit, Follow, Top, Driver.
- **Info tabs below the stage:**
  - *Mission:* goal, stars needed, hints.
  - *Explain:* explanation for the selected block or concept.
  - *Sensors:* live values of every port and the hub.
  - *Console:* program messages and friendly errors.

On screens under 1100 px wide the info tabs collapse into a drawer. Minimum supported window: 1024 x 640.

## Navigation rules

1. Any screen reachable in at most two clicks from anywhere.
2. Run controls and the 2D/3D toggle are always visible on the workspace.
3. A persistent "Help" button opens the guide for the current screen.
4. Breadcrumb on every non-home screen. Back always returns to the previous screen.
5. Keyboard shortcuts: Run `F5` or `Ctrl+Enter`, Stop `Esc`, Step `F10`, Reset `Ctrl+R`, Undo `Ctrl+Z`, Redo `Ctrl+Shift+Z`, Save `Ctrl+S`, Toggle 2D/3D `Ctrl+3`, Command search `Ctrl+K`. Shortcuts shown in tooltips.
6. Autosave every 10 seconds and on run. Never lose student work.

## Key screens

- **Home:** large "Continue" card for the last mission, a progress strip across the 8 worlds, daily streak, recently opened projects. One clear next action.
- **Missions:** a world map with 8 worlds as stops on a path. Each shows stars earned and a lock if unavailable. Selecting a world opens a list with mission cards (title, concept tag, stars).
- **Mission intro:** story in 2 to 3 sentences, goal, what you will learn, "Start mission".
- **Workspace:** as above.
- **Mission result:** stars animate in, shows what the student did well, reveals the Python version, "Next mission", "Try again", "Improve my score".
- **Learn:** concept library: short lessons (blocks, loops, sensors, variables, functions, Python basics) with runnable mini-examples.
- **Build robot:** see `08-ROBOT-BUILDER-SPEC.md`.
- **Free play:** open mat, drag objects and mats, no goals.
- **Settings:** theme, text size, language, sound, reduced motion, simulation noise, teacher mode.

## Components (build once, reuse)

Button (primary, secondary, quiet), IconButton, SegmentedControl (2D|3D), Tabs, Tooltip, Dialog, Toast, Card, ProgressBar, StarRating, Badge, Drawer, Slider, Toggle, Select, ShortcutHint, EmptyState, Coach mark (guided tour).

## Motion

- Motion answers actions: run button changes to Stop, stars pop in when earned, the block being executed gets a glow, a camera switch animates over 300 ms.
- No decorative looping animation. Respect `prefers-reduced-motion` and the in-app setting.
- Rewards are the one place for celebration: stars, badge unlock, mission complete.

## Friendly guide character

A small original robot mascot ("Bolt" as a working name, change freely) appears in tours, hints, and results. It speaks in short plain sentences. It never blocks the workspace and can be hidden in Settings.

## Voice and copy

Plain verbs, sentence case, short sentences. Name things by what students understand ("Turn left", not "Differential rotate"). Errors say what happened and how to fix it. Empty states invite action ("No projects yet. Start a mission or open Free play.").

## Accessibility

Full keyboard navigation, visible focus ring (2 px `--primary` with offset), screen-reader labels on all controls, live region for run status, minimum target size 40 px, captions for any spoken guide audio, high-contrast mode option.
