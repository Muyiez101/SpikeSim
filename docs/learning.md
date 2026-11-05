# Learn

The Learn screen is a seventeen-lesson path for secondary-school students using the current block simulator, with a
searchable glossary. It covers movement, turns, events/output, loops, distance,
colour, decisions, variables, My Blocks and their inputs, yaw/gyro sensing, a reusable
gyro turn, unit conversions, attachments, debugging, line following and Python reading.
Each lesson connects a familiar situation (school directions, book deliveries,
bicycle parking, warehouse lifting) to a worked robot example. Predictions and
understanding checks explain the reasoning behind every answer. Physical-robot
notes explain the difference between a simulated result and real-world testing.

The lesson library can show all lessons, completed lessons, or lessons still to
complete. These filters combine with search and announce the number of results.
The glossary searches all its terms independently of the lesson progress filter.
An empty lesson result offers a way to clear both the search and filter.

Choose **Learn**, open a lesson, then **Try this example**. The experiment opens
editable blocks beside the real 3D simulation. On smaller windows the panels stack
vertically. It supplies the matching robot, field and objective. Sensor readings,
final variable values and goal results help students compare a change with the
original. Restore example blocks or download a named `.rlproj` for later use.
The Python view remains a read-only explanation of simulator helper calls.

Experiments keep separate drafts under `spikesim.learning.v1`; Home and Free play
are not overwritten. A completed run plus a correct understanding answer marks a
lesson complete. An altered experiment need not earn the original mission's stars:
observing why an intentional change fails is part of learning. Quizzes alone and
merely watching a video do not complete a lesson. No XP or fixed fake progress is
shown. Unread records are retained until explicitly replaced; failed saves stay in
memory, and conflicting windows require an explicit choice.

## Existing media

Fourteen successful existing recordings serve the seventeen lessons locally in
`public/learn`, with 51 PNG stills, native playback/speed controls, caption tracks
and jump buttons. Some lessons reuse a recording with a different explanation.
The captions describe what to watch; these videos do not have a narrated lesson.
There are no external video hosts or runtime downloads. New mission recording was
paused at the user's request. Source videos in `recordings/videos` are unchanged.
Some original recordings retain idle footage at the end; the reviewed jump points
go to the relevant action.

`npm run learn:media` requires the web preview at 127.0.0.1:5173 and installed Chrome.
It validates successful source results and previous decode checks, copies the
videos and extracts frames through Chrome's decoder. Playwright's minimal FFmpeg
cannot decode these MP4s. `src/learn/media.json` records source IDs, timestamps and
SHA-256 values. The script does not launch or record a simulation.

The gyro My Block is a new editable wrapper around the verified gyro correction
loop, with a 1° tolerance matching the native turn helper. Its media is explicitly labelled as the original gyro exercise; no new video
was made. Its target input and repeated calls have separate execution checks.
The yaw-arrow explorer explains signed angles and shortest turns. The wheel
calculator shows cm/mm/m, circumference, wheel rotations and wheel degrees with
worked arithmetic, input validation and explicit direct-drive/no-slip assumptions.
Small lengths retain significant digits in unit conversions (0.1 cm is 0.001 m).
Worked wheel calculations use the original inputs and π at each step, then round
the displayed result; students are prompted to round only at the end.
The Python lesson annotates real generated lines, arguments, indentation, the main
routine and its call. It teaches code reading alongside blocks, not typing and
executing arbitrary Python. The simulator helpers differ from physical hub commands.

Content lives in `src/shared/strings/learn-en.ts` and `learn-advanced-en.ts`, exposed as `en.learning`.
`src/learn/catalog.ts` validates the content and binds it to maintained mission,
attachment and line-course references. Tests compare executable logic, robot,
custom field and goals against the projects used for the recorded runs. Keep the
written steps, visible-frame descriptions, selected timestamps and program in
agreement when editing lessons. Review every replacement still visually.
