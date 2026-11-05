import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function startWebsite({ directory = 'website', port = 41872, basePath = '' } = {}) {
  if (!/^(?:\/[a-zA-Z0-9_-]+)*$/.test(basePath)) throw new Error('Invalid website base path');
  const root = resolve(directory);
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8' };
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
      if (!pathname.startsWith(basePath + '/')) { response.writeHead(302, { Location: basePath + '/' }).end(); return; }
      // Match Vercel cleanUrls for the credits page while retaining .html links.
      const route = pathname.slice(basePath.length);
      const file = resolve(root, '.' + route + (route.endsWith('/') ? 'index.html' : !extname(route) ? '.html' : ''));
      const local = relative(root, file);
      if (local.startsWith('..') || isAbsolute(local) || pathname.includes('\\') || !(await stat(file)).isFile()) { response.writeHead(404).end(); return; }
      const body = await readFile(file);
      if (request.headers.range && extname(file) === '.mp4') {
        const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
        const start = range ? Number(range[1]) : -1;
        const end = range?.[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
        if (start < 0 || start >= body.length || end < start) { response.writeHead(416, { 'Content-Range': `bytes */${body.length}` }).end(); return; }
        response.writeHead(206, { 'Content-Type': 'video/mp4', 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Content-Length': end-start+1, 'Accept-Ranges': 'bytes' });
        response.end(request.method === 'HEAD' ? undefined : body.subarray(start, end+1)); return;
      }
      response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Content-Length': body.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}${basePath}/` };
}

if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  const site = await startWebsite({ port: Number(process.env.SPIKESIM_WEBSITE_PORT ?? 41872) });
  console.log(`SpikeSim website: ${site.url}`);
}
