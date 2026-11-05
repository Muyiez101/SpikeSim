# ADDENDUM-RULES: Rules for the classroom and sharing work

Read the original `CLAUDE.md` first. It still applies to everything. This file only changes the points below. Where this file conflicts with `CLAUDE.md`, **this file wins for code in `src/classroom/`, `server/`, and the classroom screens**. For everything else, `CLAUDE.md` wins.

## 1. The one exception to "offline only"

`CLAUDE.md` says there are no network requests at runtime. That stays true for the whole app **except** the classroom module, under these conditions:

- All network code lives in `src/classroom/` (client) and `server/` (cloud backend). No other folder imports a network library or calls `fetch`.
- The classroom module is **off by default**. Nothing connects until a user chooses "Join a class", "Create a class", or "Host a class on this network" in Settings.
- With the module off, a network-capture test must show zero requests during a full session. Keep this test in CI.
- The app must never block, slow down, or show errors on startup because the network is missing.
- The Content Security Policy allows connections only to the host(s) the user configured for their class, never to a wildcard.
- No telemetry, analytics, crash reporters, or ad or tracking code, ever, even in classroom mode.

When you finish Phase 11, ask the human to approve updating the line in `CLAUDE.md` that says "no network requests at runtime" to mention this exception. Do not edit `CLAUDE.md` or any original doc yourself. Record every deviation in `docs/decisions.md`.

## 2. Offline-first behavior

- Every existing feature keeps working with no connection and no classroom.
- The local device is the source of truth. A student can finish, save, and "submit" while offline. The submission waits in an outbox and sends when a connection appears.
- Show clear, calm status: "Waiting to send (2)", "Sent", "Could not reach the class. Your work is saved." Never lose a student's work because of a failed sync.

## 3. Children's data and privacy

Many users are under 18. Treat all student data as sensitive.

- Collect the minimum: display name, class membership, project files, results, and teacher feedback. No student email, phone number, photos, location, or device identifiers.
- Students sign in with class code, display name, and PIN (hashed with a slow hash). Teachers sign in with email.
- No messaging between students. No public profiles. No search for other users.
- Teachers can delete a class and all its data. Students can export and delete their own data.
- Store sign-in tokens with the operating system's secure storage (Electron `safeStorage`), never in plain files.
- Log access to student data on the server (who, what, when) but never log project contents or PINs.
- Write a plain-language privacy page inside the app and mention that a legal and school-policy review is needed before real use.

## 4. One protocol, three transports

Do not build three separate classroom systems. Build one protocol (`docs/11`) with three transports (file, school network, cloud) behind one interface. The same contract test suite must pass against all three.

## 5. Safety of imported and shared files

- Everything from the network or from a file is untrusted. Validate with Zod, enforce size and count limits, and reject with a plain explanation.
- Allowed types: `.rlproj`, `.rlrobot`, `.rlmission`, `.rlmap`, `.rlclass`, `.rlsubmit`, `.ldr`, `.mpd`, PDF, PNG, JPEG. Check content, not just file extension.
- PDFs open only in the bundled, sandboxed viewer. Never open files with the operating system or run anything inside them.
- Student Python still runs only in the Pyodide worker, including code from classmates and teachers.

## 6. Copy and design

- Classroom screens follow `docs/03-DESIGN-SYSTEM.md` and the same voice rules. Plain words for 10 to 17 year olds. Errors say what happened and what to do.
- Teachers see an extra "Class" area in the navigation. Students see "My class" only after joining.

## 7. Working style (unchanged)

One phase at a time. Plan first. Small commits. Lint, typecheck, tests, and a manual check at the end of every task. Report what works, what does not, and decisions the human must make.
