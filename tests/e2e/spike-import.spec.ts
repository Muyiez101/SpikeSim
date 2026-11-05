import {test,expect} from '@playwright/test';

// These regressions cover the deterministic 2D replay; unified.spec.ts covers the default 3D view.
test.beforeEach(async ({context})=>{await context.addInitScript(()=>{try{localStorage.setItem('spikesim.renderer','2d');}catch{/* Storage-denial coverage. */}});});
import {spikeArchive,spikeProject} from '../fixtures/spike-project';

test('imports a SPIKE ZIP into editable blocks, runs with original ports, persists and exports it',async({page})=>{
  await page.goto('/');
  await page.getByLabel('Choose a program file').setInputFiles({name:'route.llsp3',mimeType:'application/zip',buffer:spikeArchive()});
  const review=page.getByRole('dialog');
  await expect(review).toContainText('Synthetic SPIKE route');
  await expect(review).toContainText('C: left, D: right');
  await page.getByRole('button',{name:'Open program',exact:true}).click();
  await expect(page.locator('.blocklyWorkspace').first()).toContainText('backward');
  await page.getByRole('button',{name:'Run program',exact:true}).click();
  await expect(page.locator('.sim-stage')).toHaveAttribute('data-status','complete');
  await page.getByRole('tab',{name:'Sensors',exact:true}).click();
  await expect(page.locator('.workspace-info-body')).toContainText('C: left, D: right');
  await page.reload();
  await expect(page.locator('.blocklyWorkspace').first()).toContainText('backward');
  await page.getByRole('button',{name:'Export program',exact:true}).click();
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Save file',exact:true}).click();
  expect((await download).suggestedFilename()).toContain('.rlproj');
});

test('unsupported SPIKE instructions explain the issue and keep the current project',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Add block',exact:true}).click();
  await expect(page.getByText('Program saved on this device',{exact:true})).toBeVisible();
  const before=await page.evaluate(()=>localStorage.getItem('spikesim.playground.v1'));
  const project=spikeProject();Object.assign(project.targets[0].blocks,{event:{opcode:'flipperevents_whenButton',topLevel:true}});
  await page.getByLabel('Choose a program file').setInputFiles({name:'unsupported.llsp3',mimeType:'application/zip',buffer:spikeArchive(project)});
  await expect(page.getByRole('alert')).toContainText('flipperevents_whenButton');
  expect(await page.evaluate(()=>localStorage.getItem('spikesim.playground.v1'))).toBe(before);
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('gives the simulator more space and can collapse its details',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/');
  const original=await page.locator('.sim-canvas').boundingBox();
  expect(original!.width).toBeGreaterThan(650);expect(original!.height).toBeGreaterThan(380);
  await page.getByRole('button',{name:'Hide details',exact:true}).click();
  expect((await page.locator('.sim-canvas').boundingBox())!.height).toBeGreaterThan(original!.height+100);
  await expect(page.locator('#simulation-details')).not.toBeVisible();
  await page.getByRole('button',{name:'Show details',exact:true}).click();
  await page.setViewportSize({width:1024,height:640});
  const small=await page.locator('.sim-canvas').boundingBox();expect(small!.height).toBeGreaterThan(150);
  await expect(page.getByRole('button',{name:'Run program',exact:true})).toBeInViewport();
});
