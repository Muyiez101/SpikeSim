import { readdir, readFile, writeFile } from 'node:fs/promises';
const root = new URL('../public/gears/', import.meta.url);
const policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";
for (const file of await readdir(root)) {
  if (!file.endsWith('.html')) continue;
  const url = new URL(file, root);
  let html = await readFile(url, 'utf8');
  if (html.includes('spikesim-local.js')) continue;
  html = html.replace(/<head>/i, `<head>\n<meta http-equiv="Content-Security-Policy" content="${policy}">\n<link rel="stylesheet" href="spikesim-local.css">\n<script src="spikesim-local.js"></script>`);
  await writeFile(url, html);
}
