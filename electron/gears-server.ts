import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { gearsPolicy } from './content-security';

const mime: Record<string,string> = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.wasm':'application/wasm','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.mp3':'audio/mpeg','.wav':'audio/wav','.md':'text/plain','.txt':'text/plain','.xml':'text/xml'};

/** Gears gets a separate loopback origin and no Electron preload privileges. */
export async function startGearsServer(directory: string) {
  const root = path.resolve(directory);
  let origin = '';
  const server = createServer(async (request, response) => {
    try {
      if (!origin || request.headers.host !== new URL(origin).host || !['GET','HEAD'].includes(request.method ?? '')
        || request.headers.origin && request.headers.origin !== origin && request.headers.origin !== 'null') {
        response.writeHead(403).end(); return;
      }
      const pathname = decodeURIComponent(new URL(request.url ?? '/',origin).pathname);
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      const relative = path.relative(root,file);
      if (relative.startsWith('..') || path.isAbsolute(relative) || pathname.includes('\\') || !(await stat(file)).isFile()) { response.writeHead(404).end(); return; }
      const contents = await readFile(file);
      response.writeHead(200, {'Content-Type':mime[path.extname(file)] ?? 'application/octet-stream','Content-Length':contents.length,'X-Content-Type-Options':'nosniff','Content-Security-Policy':gearsPolicy});
      response.end(request.method === 'HEAD' ? undefined : contents);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Loopback server did not start');
  origin = `http://127.0.0.1:${address.port}`;
  return {origin,close:()=>server.close()};
}
