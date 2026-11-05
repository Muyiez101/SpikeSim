# Mission recordings and runnable projects

Open [the searchable index](index.html) to find a mission, download its editable
project, and watch its successful run. With the preview running, the same index is
at <http://127.0.0.1:5173/recordings/index.html>.

The November 1 live-physics pass includes all **41 classroom missions**, each with
a three-star result, plus all **five attachment exercises**, **Obstacle 2**,
**Simple Curves**, and **Gaps 1**: 49 recorded examples in total.
The classroom and attachment projects are under `projects/`, with matching videos
under `videos/` and measured outcomes under `results/`. Import a `.rlproj` using
**Import program**, then **Open program** or **Replace and open**. It contains the
blocks, robot, and selected field.

All 49 MP4s passed native Chrome metadata and beginning/middle/end decoding and
seeking checks. Representative frames were visually reviewed. `video-validation.json`
records the checks. Resolutions vary from 1034×548 to 1440×1000; all use a fixed
full-field view. Lift and carry use an angled view to show the raised mechanism.

## Obstacle 2 line follower

- Watch `Line-follower-Obstacle-2.mp4`. The fixed overhead view shows the complete course from left to right, including the robot, obstacles, and finish zone.
- Import `Obstacle-2-line-follower.rlproj` using **Import program**, then **Open program**. It includes the editable blocks, robot, field selection, and parking objective.
- Alternatively select **Line Following Challenges: Obstacles 2** and choose **Load Obstacle 2 program** in the app.
- Sensors: D/F colour, E forward distance; A/B drive motors and an internal gyro. The blocks scan the obstacles, choose the clear side, and find the line again using reflected light.
- The latest recording uses left–right–left side obstacles under the corrected wheel physics. The 104-second program stopped 2.9 cm from the parking target; the video includes setup and the final held state. Reset randomizes the side obstacles. This validates that layout, not every random arrangement.

## Repeat the checks

Simple Curves and Gaps 1 also have **Load line follower program** buttons in the
workspace. Each loads both colour sensors, reflected-light steering, an encoder
stop calibrated for that course, and its parking target. Their project files are
`projects/line-simple.rlproj` and `projects/line-gaps1.rlproj`. Changing the robot,
wheel diameter, or course requires recalibrating the encoder distance.

- `npm.cmd run missions:export` rebuilds validated classroom/attachment files and the complete inventory.
- `npm.cmd run missions:check -- sensors-1 sensors-3` runs selected classroom projects in actual browser physics. Omit the IDs to run all 41. The preview must be running. Fresh checks go into `regressions/`, preserving the evidence paired with recordings.
- `npm.cmd run missions:report` regenerates the searchable index and `coverage.json` from the saved recording results.
- `scripts/browser-field-review.mjs` and `scripts/browser-video-review.mjs` support the native Chrome recording and playback review. Run one simulation at a time.

## Before Learn

Complete a mission-by-mission coverage pass: test the appropriate robot and attachments, fix failures, save a runnable project, and record a successful run with the full field and relevant action visible. Keep unavailable models and unvalidated missions explicit. The bundled FLL 2018, 2019, and 2025 entries currently contain mats without mission models.

The remaining Gears practice variants and competition fields need their own
solutions, objectives, and recordings. Rendering a competition mat or seeing its
models is not proof of solving its missions or achieving an official score.
There are 32 practice variants and 38 competition fields in `inventory.json`;
FLL contributes eight unique mats in nine layouts. Work on Learn remains after
this coverage and reliability work.
