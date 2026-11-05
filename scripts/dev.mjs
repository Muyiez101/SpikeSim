import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import electronPath from 'electron';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({ root: projectRoot, server: { host: '127.0.0.1', port: 5173, strictPort: true } });
let electron;
const stop = () => { electron?.kill(); void server.close(); };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

try {
  await server.listen();
  await import('./build-electron.mjs');
  const environment = { ...process.env, VITE_DEV_SERVER_URL: 'http://127.0.0.1:5173' };
  delete environment.ELECTRON_RUN_AS_NODE;
  electron = spawn(electronPath, [projectRoot], {
    cwd: projectRoot,
    stdio: 'inherit',
    windowsHide: true,
    env: environment,
  });
  const code = await new Promise((resolve, reject) => {
    electron.once('error', reject);
    electron.once('exit', resolve);
  });
  if (typeof code === 'number' && code !== 0) process.exitCode = code;
} finally {
  electron?.kill();
  await server.close();
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
}