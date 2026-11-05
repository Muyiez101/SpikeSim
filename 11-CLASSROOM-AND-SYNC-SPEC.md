# 11: Classroom and Sync Specification

A teacher posts work. Students do it alone or in groups, at school or at home. The teacher reviews and gives feedback. It must work with poor or no internet.

## Principles

1. **Offline-first.** Work is saved on the device. Sending is a separate, retryable step.
2. **One protocol, three transports.** File, school network, cloud. Same data, same screens.
3. **Small and cheap.** Mobile data is expensive. Keep every transfer small and let users control when sync happens.
4. **Safe for children.** Minimum data, no student-to-student messaging, teacher in control (see `ADDENDUM-RULES.md`).
5. **Simple for teachers.** Post an assignment in under a minute. See who has done it at a glance.

## Roles

- **Teacher:** creates classes, posts assignments and materials, forms groups, reviews, gives feedback, exports reports. Can have several classes.
- **Student:** joins a class, sees assignments and materials, works, submits, reads feedback.
- **School admin (later):** manages several teachers. Not in this phase.

## Core objects

```ts
type Class = { id: string; name: string; teacherIds: string[]; joinCode: string; joinCodeExpiresAt?: string; createdAt: string; archived?: boolean };

type Member = { id: string; classId: string; role: 'teacher' | 'student'; displayName: string; avatar?: string; joinedAt: string; muted?: boolean };

type Assignment = {
  id: string; classId: string; title: string; instructions: string;   // plain text with simple formatting, max 4000 chars
  kind: 'mission' | 'custom-mission' | 'free-project' | 'robot-build';
  missionId?: string;                    // kind 'mission'
  attachments: AttachmentRef[];          // .rlmission, .rlrobot, guides, PDFs, images
  mode: 'individual' | 'group';
  groupIds?: string[];                   // for group mode
  dueAt?: string;
  rubric?: { criteria: { id: string; label: string; maxPoints: number }[] };
  allowResubmit: boolean;
  status: 'draft' | 'published' | 'closed';
  publishedAt?: string;
};

type Group = { id: string; classId: string; assignmentId?: string; name: string; memberIds: string[]; projectId: string };

type Submission = {
  id: string; assignmentId: string; classId: string;
  ownerType: 'student' | 'group'; ownerId: string;
  status: 'not-started' | 'in-progress' | 'submitted' | 'returned' | 'graded';
  projectRef: FileRef;                   // .rlproj
  result?: { missionId?: string; stars?: number; simSeconds?: number; blockCount?: number; hintsUsed?: number; quizScore?: number };
  replayRef?: FileRef;                   // optional, opt-in, compressed
  thumbnailRef?: FileRef;
  submittedAt?: string; version: number;
};

type Feedback = { id: string; submissionId: string; authorId: string; comment: string; rubricScores?: Record<string, number>; stars?: number; returnedForRevision: boolean; createdAt: string };

type Announcement = { id: string; classId: string; text: string; createdAt: string };      // teacher to class, read-only

type Material = { id: string; classId: string; title: string; kind: 'pdf' | 'guide' | 'robot' | 'mission' | 'image'; fileRef: FileRef; createdAt: string };

type Comment = { id: string; submissionId: string; authorId: string; text: string; createdAt: string };   // teacher and owner(s) only
```

All objects have `schemaVersion`, `updatedAt`, and a client-generated UUID. All are validated with Zod.

## Student and teacher screens

**Student: "My class"**
- Header: class name, connection status chip, sync button.
- Tabs: **To do**, **Submitted**, **Returned**, **Materials**.
- Assignment card: title, due date, individual or group badge, status. Opening it shows instructions, attachments, a **Start** or **Continue** button that opens the workspace with the right mission, robot, and starter files, and a **Submit** button.
- Submit shows a short check: "Your program ran with 3 stars. Send it to your teacher?" Optional checkbox: "Include a replay".
- Returned work shows the teacher's comment, rubric scores, and a **Revise** button when allowed.

**Teacher: "Class"**
- Class list and **Create class** (shows join code and a QR code, can regenerate or expire it).
- **Assignments:** create, edit, publish, close. Templates for the common cases (pick a mission, pick a World).
- **Submissions table:** rows are students or groups, columns are assignments. Cells show status and stars. Click to open a review.
- **Review:** opens the student's project read-only, runs it in the stage, shows replay, hints used, and checks. Feedback box, rubric, **Return** and **Mark graded**.
- **Progress:** heat map of stars by World per student.
- **Groups:** create manually, randomly, or by letting students pick (limit size). Teacher can move students.
- **Materials:** upload and organise PDFs, guides, robot files.
- **Announcements.**
- **Export:** CSV in this phase. PDF reports later.

## Groups

- A group has one shared project and submits once.
- **Check-out lock:** only one member edits at a time. Taking the project locks it for 15 minutes, refreshed while the app is open, released on close. Others see "Amina is editing" and can open a read-only copy. A teacher can unlock.
- **Version history:** the last 20 saved versions with who saved them and when. Anyone in the group can restore one.
- Offline edits by a member create a new version when they sync. If the base version is older than the latest, keep both and flag it "Needs a merge" (see conflict rules).
- Real-time co-editing is not in this phase.

## Sync design

- **Outbox:** every change made while connected or not is written to `outbox.jsonl` in the app data folder as an operation `{ opId, type, payload, createdAt, attempts }`. Operations are idempotent: sending the same `opId` twice has no extra effect.
- **Pull:** the client asks for changes `since` its last cursor. The server returns changed objects and deleted ids.
- **Triggers:** on open, on **Sync now**, after Submit, and every few minutes while the app is open and connected. Setting: **Sync on Wi-Fi only** and **Sync manually**.
- **Conflicts:**
  - Metadata (titles, comments, statuses): last write wins by `updatedAt`, server time breaks ties.
  - Project files: save with a `baseVersion`. If the server has a newer version, keep both and create "Name (copy from Amina)" and mark it for a merge. Never silently overwrite a project.
- **Sizes:** project file cap 2 MB. Replay cap 1 MB, off by default. Material file cap 10 MB each, class total 200 MB. Gzip everything. Upload only changed files.
- **Resilience:** exponential back-off, resume interrupted uploads, never mark work as sent until the server confirms. Failed items show in a visible list with a **Try again** button.
- **Status chip:** Offline, Connected, Syncing, Waiting to send (n), Problem (opens details).

## Transport 1: Files (always available)

For schools with no network at all and as a backup for every other mode.

- Teacher exports a **`.rlclass`** pack: class info, one or more assignments, and attached files. Sent by USB, messaging apps, or any means.
- Student imports it. The assignment appears in **My class** as a local, offline class.
- Student exports a **`.rlsubmit`** (project, result, optional replay and thumbnail) and sends it back. Teacher imports one or many; the app matches them to students by name and class code.
- Same Zod schemas, same screens. Imports are validated and size-limited.

## Transport 2: School network (host mode)

For classrooms with a router or Wi-Fi but no internet.

- Teacher chooses **Host a class on this network**. The teacher app starts a small server with the same API as the cloud (see below).
- Discovery by mDNS (`_robolab._tcp`), with a fallback of typing the teacher's address and port shown on screen plus the class code.
- Students join with class code, display name, and PIN. The server issues a short-lived token, kept only in memory and refreshed on reconnect.
- Data is stored on the teacher's laptop. The host stops when the teacher closes the app or ends the session.
- Use TLS with a self-signed certificate if the platform allows; otherwise allow plain connections on private networks only and show a notice. Bind to the local network interface, never to all interfaces on public networks.
- Document the usual problems in the in-app help: the firewall prompt on Windows, and "client isolation" settings on some school Wi-Fi that block device-to-device traffic (use the file transport then).
- Optional **bridge:** when the teacher later goes online, the hosted class can sync up to the cloud so students can continue from home.

## Transport 3: Cloud

For home and school, anywhere with internet.

- A hosted backend with a database, sign-in, file storage, and per-row access rules. A managed service with Postgres, auth, storage, and row-level security is recommended (for example Supabase). **Before choosing, check current free-tier limits, pricing, and the region where data is stored**, then record the choice in `docs/decisions.md`.
- The backend implements the same API as host mode, so the client code is shared.
- Teacher sign-in: email with a one-time link or password. Student sign-in: class code, display name, and 4-digit PIN (hashed server-side with a slow hash and rate-limited per class). Sessions use short-lived tokens refreshed automatically. Tokens are stored in the operating system's secure storage.
- Database tables mirror the core objects (`classes`, `members`, `assignments`, `groups`, `submissions`, `feedback`, `announcements`, `materials`, `comments`, `audit_log`). Files live in private storage buckets with signed, short-lived URLs.
- **Row-level rules (must be tested):**
  - A student can read only their class's published assignments, announcements, and materials.
  - A student can read and write only their own submission, or their group's.
  - A student can never read another student's or group's submission, comments, or feedback.
  - Only teachers of a class can create or edit assignments, groups, materials, and feedback in that class.
  - Only members of a class can see its member list, and students see display names only.
- Rate limits on sign-in, join, upload, and comment. File type and size checks on the server as well as the client.
- Backups and a documented restore. Deleting a class deletes its rows and files.

## API (shared by host mode and cloud)

| Method and path | Purpose |
|---|---|
| `POST /classes` | Teacher creates a class |
| `POST /classes/join` | Student joins with code, name, PIN |
| `GET /classes/:id/changes?since=` | Pull changes (assignments, materials, announcements, feedback, own submissions) |
| `POST /classes/:id/assignments` | Teacher creates or updates an assignment |
| `POST /classes/:id/groups` | Teacher creates or edits groups |
| `POST /submissions` | Create or update a submission record (idempotent by `opId`) |
| `PUT /submissions/:id/files/:kind` | Upload project, replay, thumbnail (resumable) |
| `POST /submissions/:id/lock` and `DELETE` | Group check-out lock |
| `POST /submissions/:id/feedback` | Teacher feedback and return |
| `POST /submissions/:id/comments` | Teacher and owner comments |
| `GET /classes/:id/materials` and `POST` | List and upload materials |
| `POST /classes/:id/announcements` | Teacher announcement |
| `DELETE /classes/:id` | Delete class and data |
| `GET /me/export` and `DELETE /me` | Student data export and deletion |

All requests carry an `opId` and a protocol `version`. The server rejects unknown versions with a clear message so old app versions can prompt for an update.

## Moderation and safety

- No student-to-student messages. Comments only between the teacher and the submission owner(s).
- A simple word filter on comments and display names (bundled list), and a **Report** button that tells the teacher.
- Teachers can mute a student, reset a PIN, remove a student, and regenerate the class code.
- Join codes are random, 6 to 8 characters, avoid look-alike characters, and can expire.

## Notifications

- In-app inbox with a badge: new assignment, due soon, returned, new feedback.
- Teachers: optional email digest in a later phase. No push in this phase.
- Never use notifications to pressure students.

## Settings (Classroom)

Join a class, Create a class, Host on this network, Import `.rlclass`, Sync on Wi-Fi only, Sync now, Include replays by default (off), Leave class, Delete my data, and a link to the privacy page.

## Tests

- **Contract suite:** the same tests run against file, host, and cloud implementations (create class, join, publish, submit, review, return).
- **Offline:** work with the network off, submit, restart the app, reconnect, and confirm it sends exactly once.
- **Conflicts:** two devices edit the same group project and confirm both versions are kept.
- **Permissions:** automated tests for every row-level rule above, using student, other student, group member, and teacher accounts.
- **Zero-network test:** classroom off means zero requests for a full session.
- **Limits:** oversized and malformed files are rejected with a plain message.
- **Low-bandwidth:** simulate a slow, flaky connection and confirm uploads resume.
- **E2E:** teacher posts a mission assignment, student completes it, submits, teacher returns it with feedback, student sees it.

## Acceptance

- A teacher creates a class and posts an assignment in under 1 minute.
- A student joins and starts the assignment in under 1 minute from a code.
- The full flow works in all three transports.
- No student can see another student's or group's work (verified by tests).
- Pulling an update after 20 assignments transfers under 100 KB when nothing new is attached.
