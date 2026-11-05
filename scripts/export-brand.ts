import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { brand } from '../src/shared/brand';

// Local artwork only. Chrome renders the existing bundled font; no image service
// or runtime dependency is required. Run with npm run brand:export.
const root = new URL('../', import.meta.url);
const output = new URL('public/brand/', root);
await mkdir(output, { recursive: true });
const fontPath = 'node_modules/@fontsource/lexend/files/lexend-latin-600-normal.woff2';
const font = (await readFile(new URL(fontPath, root))).toString('base64');
const fontStyle = `@font-face{font-family:Lexend;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:600}text{font-family:Lexend,sans-serif;font-weight:600}`;
const mark = await readFile(new URL('public/icon.svg', root), 'utf8');
const symbol = mark.replace(/<svg[^>]*>/, '').replace('</svg>', '');
const svg = (width: number, height: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>${fontStyle}</style>${body}</svg>`;
const wordmark = (color: string) => svg(380, 80, `<g transform="translate(8 8)">${symbol}</g><text x="88" y="54" font-size="49" letter-spacing="-2" fill="${color}">${brand.name}</text>`);
const artwork: Record<string, { source: string; width: number; height: number }> = {
  'wordmark-light': { source: wordmark('#172342'), width: 380, height: 80 },
  'wordmark-dark': { source: wordmark('#ffffff'), width: 380, height: 80 },
  'social-card': {
    width: 1200, height: 630,
    source: svg(1200, 630, `
      <rect width="1200" height="630" fill="#172342"/>
      <g transform="translate(66 56) scale(.8)">${symbol}</g>
      <text x="132" y="94" font-size="34" letter-spacing="-1" fill="#fff">${brand.name}</text>
      <text x="66" y="232" font-size="66" letter-spacing="-3" fill="#fff">A little code.</text>
      <text x="66" y="318" font-size="66" letter-spacing="-3" fill="#b9e769">A world of</text>
      <text x="66" y="404" font-size="66" letter-spacing="-3" fill="#b9e769">possibilities.</text>
      <path d="M745 0V138q0 32 32 32h370q32 0 32 32v428M711 630V509q0-32 32-32h350" fill="none" stroke="#354362" stroke-width="2"/>
      <g transform="translate(796 187) scale(4.6)">${symbol}</g>
      <text x="66" y="542" font-size="24" fill="#d4dcf0">Build. Code. Try again.</text>
      <text x="66" y="579" font-size="17" fill="#d4dcf0">Robotics for curious minds and classrooms.</text>
    `),
  },
};
await writeFile(new URL('mark.svg', output), mark);
await writeFile(new URL('mark-mono.svg', output), mark.replace('#5745c9', '#172342').replaceAll('#b9e769', '#fff'));
for (const [name, art] of Object.entries(artwork)) await writeFile(new URL(`${name}.svg`, output), art.source);
await copyFile(new URL(fontPath, root), new URL('lexend-latin-600.woff2', output));
await copyFile(new URL('node_modules/@fontsource/lexend/LICENSE', root), new URL('Lexend-OFL.txt', output));
await copyFile(new URL('node_modules/@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2', root), new URL('atkinson-latin-400.woff2', output));
await copyFile(new URL('node_modules/@fontsource/atkinson-hyperlegible/LICENSE', root), new URL('Atkinson-OFL.txt', output));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const render = async (source: string, width: number, height: number, name: string) => {
    console.log(`Rendering ${name}`);
    await page.setViewportSize({ width, height });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style>${source}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    return page.screenshot({ path: fileURLToPath(new URL(name, output)), omitBackground: true });
  };
  for (const [name, art] of Object.entries(artwork)) await render(art.source, art.width, art.height, `${name}.png`);
  const png1024 = await render(mark, 1024, 1024, 'icon-1024.png');
  const png256 = await render(mark, 256, 256, 'icon-256.png');
  await render(mark, 180, 180, 'apple-touch-icon.png');
  // Modern Windows icons carry a 256 px PNG; macOS ic10 carries a 1024 px PNG.
  const ico = Buffer.alloc(22);
  ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
  ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
  ico.writeUInt32LE(png256.length, 14); ico.writeUInt32LE(22, 18);
  await writeFile(new URL('icon.ico', output), Buffer.concat([ico, png256]));
  const icns = Buffer.alloc(16);
  icns.write('icns'); icns.writeUInt32BE(png1024.length + 16, 4);
  icns.write('ic10', 8); icns.writeUInt32BE(png1024.length + 8, 12);
  await writeFile(new URL('icon.icns', output), Buffer.concat([icns, png1024]));
} finally {
  await browser.close();
}
console.log('SpikeSim artwork exported to public/brand. Review /brand/index.html.');
