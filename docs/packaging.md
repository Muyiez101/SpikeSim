# Windows desktop delivery

SpikeSim packages its web interface, simulator, lessons and classroom host into
an Electron app. Node and a development server are not needed on a student's
computer after installation. This guide covers local Windows x64 acceptance;
macOS and Linux packages have not been accepted.

## Build locally

Use the versions pinned in `package-lock.json`. The verification scripts require
Node 24. With dependencies and the pinned Electron runtime installed:

```powershell
npm.cmd run build
npm.cmd run desktop:check
npm.cmd run package -- --win --x64
```

Packaging explicitly uses `--publish never`. It creates files in `release/` and
does not upload them. The packaging tools may need network access for Electron
and NSIS on the first build; this is separate from the app's runtime behavior.

To package an already-built checkout using the installed Electron executable:

```powershell
$env:ELECTRON_BUILDER_CACHE = Join-Path (Get-Location) '.local/electron-builder-cache'
node node_modules/electron-builder/cli.js --win nsis --x64 --publish never --config.electronDist=node_modules/electron/dist --config.npmRebuild=false
```

Skipping native rebuilding is appropriate for the current JavaScript/WASM
production dependencies. Revisit that flag if native production modules are added.

## Install and run

The installer is `release/SpikeSim Setup 0.1.0.exe`. The unpacked executable is
`release/win-unpacked/SpikeSim.exe`; keep its entire surrounding directory intact.
Run the installer for a normal per-user installation, then open SpikeSim from its
shortcut. Use Windows Installed apps to uninstall it.

Student drafts and preferences live in `%APPDATA%\spikesim` by default. Classroom
sessions live in `classroom/sessions.json` inside that profile. Export important
programs as `.rlproj` files and export competition results from the teacher screen.
Close the app before backing up its whole profile. A normal uninstall retains
app data; do not use the installer's `--delete-app-data` option when preserving it.
Browser previews have separate saved data from the desktop app.

Open **Class competitions**, then **Start classroom host**. Leave the teacher app
running while students connect using its invitation URL on the same network.
The simulator uses loopback HTTP locally; classroom hosting also accepts LAN
connections after the teacher explicitly starts it. See the
[teacher guide](teacher-competitions.md) for PINs, approvals and scoring limits.

## Verified local build — 2026-11-05

Windows x64 installation, installed-app acceptance and uninstall passed on this
Windows 11 laptop. The NSIS trial used silent installation in a new workspace
folder, checked registration/shortcuts and compared installed executable/archive
hashes with the package. It then ran the desktop suite and removed the trial app,
shortcuts and registration. The ordinary saved profile was not used.

- Installer: `release/SpikeSim Setup 0.1.0.exe`, 202,298,647 bytes, unsigned.
- SHA-256: `04EBC7F2B6896A8441AE7ACECEC5F3CF3AD5237A5710FE61E0BBE06DF1D96505`.
  A copy is in `release/SHA256SUMS.txt`.
- Installer evidence: `.local/install-check-4b18a427/report.json`.
- Installed-app evidence and screenshots: `.local/desktop-check-s2CoAU/`.
- Built-checkout acceptance: `.local/desktop-check-4kP74R/`.

Final code checks passed: production build, lint, standalone typecheck, all 269
unit tests across 31 files, and all 12 targeted Chrome cases for classroom
recovery/workflows, builders, sumo and hosted Learn. Browser cases ran sequentially
against the preserved preview with tracing disabled.

Desktop acceptance waits for Electron's actual process IDs to exit before reusing
its profile. The Windows install trial also waits for executable/DLL mappings to
be released before uninstalling; an earlier immediate uninstall left two test
binaries, which were hash-verified and cleaned up before the passing trial.

## Repeatable acceptance

```powershell
npm.cmd run desktop:check -- "C:\path\to\SpikeSim.exe"
```

The command creates a fresh `.local/desktop-check-*/profile`, supplies it through
Electron's `--user-data-dir` switch and leaves a report and screenshots alongside
it. It uses synthetic students and sessions and does not use the normal profile.

It checks a real three-star 3D mission, the 2D worker, renderer sandbox/preload
isolation, file export/import and invalid-file rejection, robot/ground builders,
lesson video decoding/seeking, hosted video byte ranges, a classroom sumo worker,
saved results and exact draft restoration after restart. Non-loopback renderer
HTTP(S) requests are blocked and reported. File-dialog selections use controlled
test paths while the real preload, IPC and disk I/O execute; the native picker
interface itself still needs an interactive user check.

Browser regression should use one worker on this laptop. Reuse the running Vite
preview at port 5173: Windows can hang when Playwright shuts down its own temporary
Vite process. Installed Chrome has passed the two-client 3D workflow where bundled
headless Chromium stalled:

```powershell
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = 'chrome'
npm.cmd run e2e -- tests/e2e/classroom-recovery.spec.ts tests/e2e/classroom.spec.ts tests/e2e/sumo.spec.ts tests/e2e/design-builders.spec.ts --workers=1 --trace=off --reporter=line
```

## Remaining acceptance and release limits

The user deferred the second physical Wi-Fi device trial. That check still needs
to confirm invitation access, live updates, reconnects and school firewall/router
behavior. Local multi-client checks cannot establish those network conditions.
Native file-picker interaction, other operating systems and performance on the
target school's hardware also remain outside automated acceptance.

This is a local build, not a public release. Preserve the bundled Gears source,
GPL and asset notices. Public redistribution rights for upstream FLL artwork
remain unverified; see [the asset notice](../public/gears/SPIKESIM-NOTICE.md).
Scheduling, attempt limits, official FLL/WRO scoring and the paused mission/video
coverage are separate future work, as described in the existing project guides.
