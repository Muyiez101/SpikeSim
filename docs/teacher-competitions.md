# Teacher competitions

## Current delivery — 2026-11-04

**Class competitions** separates the competition format from the entry type.
Teachers can choose head-to-head sumo or a timed 3D arena challenge, then choose
individuals or teams. A timed challenge needs only one entry and no opponent.
Preparation lasts 1–60 minutes. The maximum run is 10–600 seconds for 3D arenas,
or 10–120 seconds for a sumo bout. The existing sumo engine retains its three
ring sizes and simplified planar contact physics.

The timed picker includes five starter courses, five original FLL practice tasks,
32 bundled practice worlds (including maze and fire rescue), and 38 FLL/WRO fields.
The starter courses, FLL practice tasks, maze finish and rescue-point target have
automatic goal checks. Other worlds use a task written by the teacher before the
session starts. The teacher watches the 3D run and chooses **Confirm task complete**
or **Mark attempt incomplete**. This was explicitly selected by the user for full
FLL/WRO fields. The timer and ranking are automatic in both cases. Mat-only fields
are labelled; the practice tasks are original exercises rather than official FLL
mission scoring.

1. Run `npm.cmd run build`, then `npm.cmd run classroom:host`. On the host computer,
   open `http://127.0.0.1:41866/?competition=host`.
2. Set the competition name, format, individual/team mode, arena and timers. Choose a
   six-digit teacher PIN. Teacher sign-in and creation use the host's local link;
   students use the invitation's Wi-Fi address.
3. Share the student invitation. Students choose a display name and four-digit
   PIN. Approve their entries or assign them to teams of up to six members.
4. Start preparation. A student takes the editing turn, saves shared blocks and
   submits a version. Teammates hand over the editor explicitly. The teacher can
   pause/resume preparation, release a lock and close joining.
5. Lock submissions. For a timed challenge, select one entry and start its attempt;
   for sumo, select two entries. Project the arena, review the result, download the
   submitted blocks and export the scoreboard. A new preparation round allows
   revisions. Stopped or interrupted attempts are void and do not affect ranking.

Students can practice the fixed 3D arena with a copy of their local blocks before
submissions lock. Practice does not submit a result. Scored 3D programs execute in
the teacher's local simulator with the locked robot, field and program. A runtime
lease prevents two teacher tabs from driving the same attempt. Students receive
3D mesh poses without receiving another entry's source code. The host measures
elapsed time after loading, enforces the deadline and persists the result. A
teacher tab must remain open during its run; a lost runner is voided. Finished
programs in teacher-confirmed fields retain their elapsed time while awaiting a
decision. Successful runs rank by best time, failures by goals achieved. A fast
failure cannot beat a completed task; equal results share a place.

The browser host saves sessions in `.local/classroom/sessions.json`. Keep that file
private. The desktop bridge uses the app's classroom data folder. Teacher and
student PINs use salted scrypt hashes; access tokens stay in memory and a reload
requires sign-in. Host restart keeps submitted programs/results and voids interrupted
matches. Reopening a finished 3D session restores its saved ending pose. Starting
another attempt resets the robot and field to their fixed starting positions.
Student drafts and queued saves/submissions stay on the student's device;
retries reuse operation IDs. Conflicting versions are retained for explicit recovery.

Classroom access is off until a user connects or opens a competition invitation.
The privacy panel describes stored data, local-network use, export/deletion and
review before school use. This is the local competition delivery; it does not
implement cloud accounts, assignment packs or the entire classroom/sync specification.

Automatic brackets, side rotation and official FLL/WRO scoring remain future work.
Mission/video recording remains paused. Consult the latest handoff for the actual
3D acceptance results; inclusion in the picker is not verification of every
possible program, official mission or school device.

Two isolated student browsers verify the flow on one computer. A second physical
Wi-Fi computer still requires acceptance. Installed Windows Electron acceptance
passed; see [packaging](packaging.md) for commands, evidence and remaining limits.

## Longer-term design

The sections below retain the broader proposal requested on 2026-11-03. They are
design intent beyond the current delivery above, not a claim that every listed
control, format or scoring mode has shipped.

## A classroom session

The teacher chooses **Host a competition**, gives it a name, chooses its rules,
and receives a student invitation link and room code. Students on the same Wi-Fi
join with a display name. A private teacher control is separate from the student
invitation. The teacher approves the roster, assigns teams, and opens practice.

For example: **Friday robotics cup**, four teams of three, the sumo ring, ten
minutes to prepare, 45 seconds per bout, and a best-of-three final. The teacher
projects the arena and scoreboard while teams prepare their programs.

## What the teacher chooses

| Setting | Behavior |
| --- | --- |
| Individual or team | One entry per student, or one shared program per team. |
| Teams | Named teams, member limit, manual assignment or random grouping. |
| Arena | A preview of the field, its objective, robot and supported scoring. |
| Preparation time | Wall-clock time for editing and practice before submissions lock. |
| Round time | Maximum simulation time for a scored run or sumo bout. |
| Attempts | One attempt, best of a set number, or a defined qualifying stage. |
| Format | Score/time challenge, sumo round robin, or sumo knockout bracket. |
| Robot rules | A fixed shared robot initially; custom designs only when the chosen arena supports them. |
| Ranking | Published points, penalties and tie-breakers before the round begins. |
| Visibility | Projector view with names, countdown, current match and leaderboard. |

Choose rules before students submit. Changing an arena, robot, time limit or
scoring rule after locking submissions creates a new round and requires fresh
readiness; it must not silently change a result already earned.

## Two types of competition

**Head-to-head sumo.** Two entries run at once in the same authoritative match.
The host decides ring-outs and timeouts. A round robin gives every team several
matches; a knockout bracket is faster for a large group. Best-of-three matches
alternate starting sides, with a stated draw rule and teacher-approved rematches.

**Arena challenge.** Each entry attempts the same course: line following, an
obstacle route, parking or an object task. Rank successful entries by defined
points, then time or penalties. Incomplete entries must not beat a successful
run merely by stopping early. The teacher's host reruns submitted programs using
the locked field, robot and seed; client-reported scores alone are not accepted.
For 3D, run one scored simulation at a time to fit the school-laptop budget.

Only arenas with implemented and verified objectives should appear as
**Automatically scored**. Existing FLL/WRO mats do not all have mission scoring.
Other fields now offer **Teacher-confirmed task**, with a published objective
and automatic timing/ranking. More detailed point rubrics and recorded score
adjustments remain future work. Keep the paused mission-recording work paused.

## Teacher and student controls

The teacher sees joining students, teams, readiness, submitted program versions,
the run queue and results. Controls include open/close joining, start preparation,
lock submissions, start a round, stop a run, approve a rerun and end the session.
Pausing preparation is safe; an interrupted physics match should be marked void
and restarted using the same submitted programs instead of promising pause/resume
support that the current sumo engine does not have.

Students see their team, the rules, arena preview, timer, practice workspace and
**Submit program**. The server confirms which version was received and locks that
version for scoring. A reconnect restores the entry without awarding another
attempt. A failed transfer keeps the draft and shows that it has not been accepted.

Teams use one editor at a time, with an editing lock and an explicit handover.
Teammates can inspect their shared project. Keep conflicting offline versions
instead of overwriting one. Live simultaneous block editing is later work. Teams
see the public standings but cannot read other teams' submitted source programs.

## Learning before and after competing

The arena can suggest relevant existing lessons: distance sensing for obstacles,
colour and decisions for sumo boundaries, yaw and My Blocks for reliable turns,
and reflected light for line following. Teachers can pick a short practice list.
Lesson experiments remain separate from submitted competition programs.

After a round, show the result, failed objectives and the submitted blocks. Let
students explain one successful choice and one change they would try. Teachers
can export standings as CSV and retain submitted projects for review. Awarding
teacher-visible lesson progress requires the later classroom submission protocol;
the current local Learn completion counter is not a synced teacher dashboard.

## Delivered foundation and next increments

The delivered foundation includes teacher-hosted sumo and timed 3D challenges:
roster, individual/team entries, editing handover, fixed arena/robot rules,
preparation/run timers, one run at a time, standings, saved results and CSV export.
The 3D picker distinguishes automatic goal checks from teacher-confirmed tasks.

Future increments include round-robin/knockout scheduling, starting-side rotation,
attempt limits and run queues, lesson recommendations, and additional physically
verified automatic objectives. Each needs a separate implementation and acceptance
pass; the picker alone does not establish official mission-scoring support.

Extend the classroom contracts from `../11-CLASSROOM-AND-SYNC-SPEC.md` and follow
`../ADDENDUM-RULES.md`, with the client in `src/classroom/`. Keep session, entry,
submission and result schemas independent of transport. Reuse the existing
bounded sumo interpreter, add configurable match rules, and enforce teacher
authority on the host. Future file/classroom transports should use those same
contracts. Cloud accounts and home access are a separate phase.

The local delivery is designed for classroom Wi-Fi without internet or student
email addresses. A real second-computer check is required before claiming that
classroom acceptance passes. Test teacher/student permissions, simultaneous joins,
locked submissions, deterministic sumo results, reconnects, teacher-host restart,
team conflicts and export accuracy. New 3D arenas need physical scoring evidence
before they are enabled for automatic competition results.
