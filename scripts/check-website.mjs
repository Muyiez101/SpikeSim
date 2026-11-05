import { chromium, expect } from '@playwright/test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { startWebsite } from './website-server.mjs';

await mkdir('.local', { recursive: true });
const directory = await mkdtemp(resolve('.local/website-review-'));
const site = await startWebsite({port:0});
const browser = await chromium.launch({channel:'chrome'});
const errors = [], failures = [];
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror', e=>errors.push(e.message));
  page.on('response', response=>{if(response.status()>=400)failures.push({url:response.url(),status:response.status()});});
  await page.goto(site.url);
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.getByRole('heading',{level:1})).toContainText('A little code.');
  await expect(page.locator('#release-state')).toContainText("We're preparing");
  await expect(page.locator('#windows-download')).toBeHidden();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  for (const picture of await page.locator('img').all()) {
    await picture.scrollIntoViewIfNeeded();
    await expect.poll(() => picture.evaluate(element => element.complete && element.naturalWidth > 0), { timeout: 15000 }).toBe(true);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const localLinks = await page.locator('a[href]').evaluateAll(links=>links.map(link=>link.href).filter(href=>new URL(href).origin===location.origin));
  for(const url of new Set(localLinks)){const response=await page.request.get(url);expect(response.ok(),url).toBe(true);}
  await page.screenshot({path:join(directory,'desktop.png'),fullPage:true});
  // Exercise the real bundled clips, captions and seeking, not just posters.
  for (const id of ['move', 'loops', 'distance']) {
    await page.locator(`[data-demo="${id}"]`).click();
    await expect(page.locator(`[data-demo="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    const player = page.locator('#demo-video');
    await expect.poll(() => player.evaluate(element => element.readyState)).toBeGreaterThanOrEqual(1);
    expect(await player.evaluate(element => element.paused)).toBe(true);
    await player.evaluate(element => element.play());
    await expect.poll(() => player.evaluate(element => element.currentTime)).toBeGreaterThan(0.1);
    await expect.poll(() => player.evaluate(element => element.textTracks[0]?.cues?.length ?? 0)).toBeGreaterThan(0);
    const target = await player.evaluate(element => { element.pause(); element.currentTime = element.duration / 2; return element.currentTime; });
    await expect.poll(() => player.evaluate(element => element.seeking)).toBe(false);
    expect(await player.evaluate(element => element.currentTime)).toBeCloseTo(target, 1);
    const range = await page.request.get(site.url + `assets/demos/${id}.mp4`, { headers: { Range: 'bytes=0-63' } });
    expect(range.status()).toBe(206);
    expect((await range.body()).length).toBe(64);
  }
  for(const width of [390,320]){
    await page.setViewportSize({width,height:844});
    await page.goto(site.url);
    await page.evaluate(()=>document.fonts.ready);
    for (const picture of await page.locator('img').all()) {
      await picture.scrollIntoViewIfNeeded();
      await expect.poll(() => picture.evaluate(element => element.complete && element.naturalWidth > 0), { timeout: 15000 }).toBe(true);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px overflow`).toBe(true);
    await page.screenshot({path:join(directory,`mobile-${width}.png`),fullPage:true});
    await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:/Get SpikeSim/}).click();
    await expect(page.locator('#download-title')).toBeInViewport();
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(site.url+'credits.html');
  await expect(page.getByRole('heading',{level:1})).toContainText("Good software");
  await expect(page.locator('main')).toContainText('Cort Wee');
  await page.screenshot({path:join(directory,'credits.png'),fullPage:true});
  expect((await page.request.get(site.url + 'credits')).ok()).toBe(true);
  await page.route('**/release.json',route=>route.fulfill({json:{repository:'Muyiez101/SpikeSim',published:true,version:'0.1.0-preview.1',windows:{url:'javascript:alert(1)',sha256:'a'.repeat(64),bytes:1234,signed:false}}}));
  await page.goto(site.url);
  await expect(page.locator('#release-state')).toContainText('could not be checked');
  await expect(page.locator('#windows-download')).toBeHidden();
  await page.unroute('**/release.json');
  await page.route('**/release.json',route=>route.fulfill({json:{repository:'Muyiez101/SpikeSim',published:true,version:'0.1.0-preview.1',windows:{url:'https://github.com/Muyiez101/SpikeSim/releases/download/v0.1.0-preview.1/SpikeSim.Setup.exe',sha256:'a'.repeat(64),bytes:202298647,signed:false}}}));
  await page.goto(site.url);
  await expect(page.locator('#windows-download')).toBeVisible();
  await expect(page.locator('#signing-note')).toBeVisible();
  await page.getByText('Verify your download',{exact:true}).click();
  await expect(page.locator('#release-checksum')).toHaveText('A'.repeat(64));
  expect(errors).toEqual([]);expect(failures).toEqual([]);
  await writeFile(join(directory,'report.json'),JSON.stringify({passed:true,errors,failures,checks:['Vercel root and clean URL','desktop','390px and 320px','keyboard skip link','local links','image and font loading','three real demo videos with captions and seeking','video byte ranges','unpublished downloads','rejected unsafe download URL','published metadata presentation'],note:'Published manifest is a test fixture, not an uploaded release.'},null,2));
  console.log('Website acceptance passed:',directory);
}finally{await browser.close();await new Promise(resolve=>site.server.close(resolve));}
