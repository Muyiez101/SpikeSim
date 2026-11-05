# GitHub source, Vercel website and Windows downloads

GitHub holds the public source and versioned Windows installers at
https://github.com/Muyiez101/SpikeSim. Vercel serves only the static `website/`
directory. The desktop app and classroom sessions do not run on Vercel.

## Prepare source

Run `npm.cmd run release:prepare` after the final checks. It creates a fresh
`.local/publication-*/source` directory and a SHA-256 inventory alongside it.
The snapshot includes all application, simulator, lesson and recording assets,
licenses and build/test sources. It excludes the original Git history, internal
agent notes, local profiles, classroom sessions, generated installers and logs.
The original working directory stays intact.

The user requested the full asset bundle. FLL mat artwork redistribution terms
remain unverified; this request does not establish permission from its owners.
Keep the upstream asset notice and all third-party licenses with the source.
The current preview is unsigned and is not a completed school deployment trial.

Before tagging, run:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test -- --maxWorkers=1
npm.cmd run site:check
npm.cmd run licenses:collect
npm.cmd run build
npm.cmd run desktop:check
```

Use a fresh repository in the prepared source directory with the maintainer's
GitHub identity. Do not commit the original mixed checkout or add automated
co-author trailers. Push to `main` without forcing existing remote history.
Review any existing remote commits before updating them.

## Connect Vercel

In Vercel, import the GitHub repository `Muyiez101/SpikeSim`. Keep the project
root at the repository root and use **Other** for the framework. The committed
`vercel.json` selects `website` as the output directory and skips installation
and build commands because the website is already static. Do not select Vite
or deploy the simulator's `dist/` directory as the download website.

Set `main` as the production branch. Subsequent pushes then deploy through
Vercel's GitHub integration. No GitHub Pages workflow is used, and no Vercel
token belongs in the repository. The Vercel dashboard supplies the actual
production URL; add canonical/Open Graph URLs only after that address is known.

Local preview: `npm.cmd run site:dev`, then http://127.0.0.1:41872/.
`npm.cmd run site:check` checks desktop/mobile layouts, navigation, real demo
video playback/captions/seeking, local links and download-state handling.
Evidence is written to a separate `.local/website-review-*` directory.

## Publish a matching Windows preview

Build and verify the Windows package from the tagged source using
[the packaging guide](packaging.md). Put the installer and `SHA256SUMS.txt` in
a GitHub Release, outside the Git source tree. Mark the initial release as a
prerelease. Supply corresponding source at the same tag and preserve licenses.
The current package version is `0.1.0`; its release tag is `v0.1.0`.

Only after uploading and verifying the real installer, update
`website/release.json`: `published: true`, version `0.1.0`, and a `windows`
object containing the exact GitHub asset `url`, SHA-256 `sha256`, byte size
`bytes`, and `signed: false`. Push that manifest update to deploy the download
button through Vercel. Keep `published: false` and `windows: null` until then.
Test fixtures used by the website checker are never release evidence.

The previous dependency audit recorded no high/critical findings and 15 moderate
development-tool findings propagated from minimatch. Do not run a forced audit
fix that downgrades the toolchain. Refresh the audit when registry access is
available; this inventory does not establish an audit of vendored Gears code.
