import { readFile, readdir, mkdir, copyFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const rows = [], missing = [];
const seen = new Set();
for (const [directory, entry] of Object.entries(lock.packages)) {
  if (!directory || entry.dev) continue;
  let metadata;
  try { metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')); }
  catch { if (!entry.optional) missing.push(directory); continue; }
  const key = `${metadata.name}@${metadata.version}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const folder = key.replace(/[^a-zA-Z0-9.-]/g, '_');
  const target = join('public/licenses/npm', folder);
  await mkdir(target, { recursive: true });
  const files = [];
  for (const file of await readdir(directory)) {
    if (!/^(licen[cs]e|copying|notice)(?:[._-]|$)/i.test(file) || !(await stat(join(directory, file))).isFile()) continue;
    await copyFile(join(directory, file), join(target, file));
    files.push(file);
  }
  if (metadata.name === 'blockly') {
    for (const file of ['Apache-2.0.txt', 'Blockly-NOTICE.txt']) {
      await copyFile(join('public/licenses', file), join(target, file)); files.push(file);
    }
  }
  if (metadata.name === 'saxes' && !files.length) {
    await copyFile('public/licenses/vendor/saxes-6.0.0-LICENSE.txt', join(target, 'LICENSE')); files.push('LICENSE');
  }
  if (!files.length || typeof metadata.license !== 'string') missing.push(key);
  rows.push({ name: metadata.name, version: metadata.version, license: metadata.license ?? 'Review required', files: files.map(file => `${target.replaceAll('\\', '/')}/${file}`) });
}
if (missing.length) throw new Error(`Missing production license evidence: ${missing.join(', ')}`);
rows.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
await mkdir('public/licenses/electron', { recursive: true });
await copyFile('node_modules/electron/dist/LICENSE', 'public/licenses/electron/LICENSE');
await copyFile('node_modules/electron/dist/LICENSES.chromium.html', 'public/licenses/electron/LICENSES.chromium.html');
await copyFile('LICENSE', 'public/licenses/GPL-3.0.txt');
const intro = `# Open-source acknowledgements and third-party notices

Original SpikeSim code is GPL-3.0-only. Third-party components retain their own
licenses and copyright notices. This inventory records installed production npm
dependencies from package-lock.json; it is not a blanket license for artwork.
Regenerate it with \`npm run licenses:collect\` after changing dependencies.

## Main foundations

- **Gears** — Cort Wee / A Posteriori and contributors; GPL-3.0. Upstream:
  https://github.com/QuirkyCort/gears, source revision
  \`20b8e874ab9c3e08a37dfbcb6b10bbef94f90921\`. Preserve its source, individual
  asset notices, LICENSE and SPIKESIM-NOTICE.md with applicable distributions.
- **Blockly** — Google LLC and contributors; Apache-2.0. The student editor uses
  11.2.2; Gears also retains its own bundled Blockly versions and notices.
- **Babylon.js 4.2.1** — Microsoft and contributors; Apache-2.0.
  License: \`public/licenses/vendor/Babylon-4.2.1-LICENSE.txt\`.
- **Ammo.js / Bullet** — their respective contributors; zlib license.
  License: \`public/licenses/vendor/Ammo-LICENSE.txt\`.
- **Skulpt 0.11.0** — Skulpt contributors; MIT and its retained license exceptions.
  License: \`public/licenses/vendor/Skulpt-0.11.0-LICENSE.txt\`.
- **Electron 45.0.0** — OpenJS Foundation and contributors; MIT.
  \`public/licenses/electron/\` includes its license and Chromium's bundled notices.
- **React, React DOM, Zod** — MIT; **Rapier** — Apache-2.0;
  **Lucide** — ISC, including retained Feather notices. Full texts appear below.
- **Lexend, Atkinson Hyperlegible, JetBrains Mono** — SIL OFL-1.1, with their
  individual copyright notices included below and alongside the brand assets.

Gears also includes Ace, jQuery, JSZip, pointer-event support and asset collections
from Kenney, Quaternius, KayKit, Creazilla and other credited creators. Their local
headers and individual license files remain authoritative for those files.
Code licenses do not establish permission for all FLL/WRO artwork or trademarks.
Unresolved artwork must be omitted or cleared before a public distribution.

The development toolchain includes TypeScript, Vite, esbuild, electron-builder,
ESLint, Vitest and Playwright. Thank you to their maintainers and contributors.

## Production npm dependencies

Versions below describe the current Windows dependency graph, including runtime
transitive dependencies. Some modules are bundled at build time; preserving all
of their notices avoids omitting the notices of a bundled dependency.

| Component | Version | Declared license | Full notice files |
| --- | --- | --- | --- |
`;
const table = rows.map(row => `| ${row.name} | ${row.version} | ${row.license} | ${row.files.map(file => `[${file.split('/').at(-1)}](${file})`).join(', ')} |`).join('\n') + '\n';
await writeFile('THIRD_PARTY_NOTICES.md', intro + table);
await writeFile('public/licenses/THIRD_PARTY_NOTICES.md', (intro + table).replaceAll('public/licenses/', './'));
await writeFile('public/licenses/inventory.json', JSON.stringify({ source: 'package-lock.json; installed production packages', electron: '45.0.0', components: rows }, null, 2) + '\n');
console.log(`Collected complete license files for ${rows.length} production packages, Electron and Chromium.`);
