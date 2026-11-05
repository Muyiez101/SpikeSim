import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

// An explicit source allowlist keeps real classroom sessions, browser profiles,
// credentials, logs and mixed local Git history out of the public repository.
// Every run creates a new snapshot; it never deletes or edits an older one.
const directories = ['src', 'electron', 'tests', 'scripts', 'docs', 'public', 'website', 'recordings'];
const files = [
  'README.md', 'LICENSE', 'NOTICE.md', 'THIRD_PARTY_NOTICES.md',
  'package.json', 'package-lock.json', 'index.html', 'tsconfig.json',
  'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'eslint.config.js',
  '.prettierrc.json', '.prettierignore', 'vercel.json',
  '11-CLASSROOM-AND-SYNC-SPEC.md', 'ADDENDUM-RULES.md',
];
const root = resolve('.');
await mkdir('.local', { recursive: true });
const destination = await mkdtemp(resolve('.local/publication-'));
const source = join(destination, 'source');
await mkdir(source);
const inventory = [];
const forbiddenName = /^(?:\.git|\.local|\.debug|\.reference|\.vercel|node_modules|sessions\.json|\.env(?:\..*)?|.*\.(?:log|pem|p12|pfx|key))$/i;
const secret = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b|\bAKIA[0-9A-Z]{16}\b/;
// Keep the original planning pack local; the public repository has user guides.
const localPlanningFiles = new Set([
  'docs/01-PRD.md', 'docs/02-ARCHITECTURE.md', 'docs/03-DESIGN-SYSTEM.md',
  'docs/04-BLOCKS-SPEC.md', 'docs/05-SIMULATION-SPEC.md', 'docs/06-MISSIONS-SPEC.md',
  'docs/07-LEARNING-SPEC.md', 'docs/08-ROBOT-BUILDER-SPEC.md',
  'docs/09-BUILD-PLAN.md', 'docs/10-QUALITY-CHECKLIST.md',
]);

async function include(path) {
  if (localPlanningFiles.has(path.replaceAll('\\', '/'))) return;
  const original = join(root, path);
  const info = await lstat(original);
  if (info.isSymbolicLink()) throw new Error(`Symlink needs explicit review: ${path}`);
  if (path.split(/[\\/]/).some(part => forbiddenName.test(part))) throw new Error(`Private file in source: ${path}`);
  if (info.isDirectory()) {
    for (const entry of (await readdir(original)).sort()) await include(join(path, entry));
    return;
  }
  if (!info.isFile()) throw new Error(`Unsupported source entry: ${path}`);
  if (info.size >= 100 * 1024 * 1024) throw new Error(`File exceeds GitHub's source limit: ${path}`);
  const content = await readFile(original);
  if (secret.test(content.toString('utf8'))) throw new Error(`Possible credential requires review: ${path}`);
  const target = join(source, path);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(original, target);
  inventory.push({ path: path.replaceAll('\\', '/'), bytes: info.size, sha256: createHash('sha256').update(content).digest('hex') });
}

for (const path of [...files, ...directories]) await include(path);
// No internal agent notes/history are copied. All simulator source and assets,
// including the user's requested full FLL bundle, remain byte-identical.
const ignore = await readFile('.gitignore', 'utf8') + '\n.debug/\n.vercel/\nnotes/\nHANDOFF.md\nCOORDINATION.md\n';
await writeFile(join(source, '.gitignore'), ignore);
inventory.push({ path: '.gitignore', bytes: Buffer.byteLength(ignore), sha256: createHash('sha256').update(ignore).digest('hex') });
inventory.sort((a, b) => a.path.localeCompare(b.path));
const report = {
  createdAt: new Date().toISOString(), source, count: inventory.length,
  bytes: inventory.reduce((total, item) => total + item.bytes, 0),
  repository: 'https://github.com/Muyiez101/SpikeSim', hosting: 'Vercel static website',
  scope: 'Full source and bundled simulator assets; private local data excluded',
  published: false, inventory,
};
await writeFile(join(destination, 'inventory.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ source, files: report.count, bytes: report.bytes, report: join(destination, 'inventory.json'), published: false }, null, 2));
