import {test,expect} from '@playwright/test';
import {spikeArchive} from '../fixtures/spike-project';
import {fromCommands, literal} from '../../src/editor/program';
import {templateRobot} from '../../src/sim/gears-catalog';

test('3D starts while the hidden legacy toolbox is still loading',async({page})=>{
  test.setTimeout(60000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  let requested=false,releaseToolbox:()=>void=()=>{};
  const toolboxGate=new Promise<void>(resolve=>{releaseToolbox=resolve;});
  await page.route('**/gears/toolbox.xml*',async route=>{requested=true;await toolboxGate;await route.continue();});
  try{
    await page.goto('/');
    await expect(page.locator('.unified-stage')).toHaveAttribute('data-status','ready',{timeout:45000});
    expect(requested).toBe(true);
    await expect(page.frameLocator('iframe[title="3D robot simulator"]').locator('body>header')).toBeHidden();
    expect(errors).toEqual([]);
  }finally{releaseToolbox();await page.unrouteAll({behavior:'wait'});}
});

test('a failed 3D load can be retried without losing student blocks',async({page})=>{
  test.setTimeout(80000);
  let requests=0;
  await page.route('**/gears/student.html',route=>++requests===1?route.abort():route.continue());
  await page.goto('/');
  await page.getByRole('button',{name:'Add block',exact:true}).click();
  await page.getByRole('button',{name:'Retry loading',exact:true}).click({timeout:30000});
  await expect(page.locator('.unified-stage')).toHaveAttribute('data-status','ready',{timeout:45000});
  await expect(page.locator('.blocklyWorkspace').first()).toContainText('move');
  await page.getByRole('button',{name:'Run program',exact:true}).click();
  await expect(page.locator('.unified-stage')).toHaveAttribute('data-status','complete',{timeout:20000});
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('one student workspace uses our blocks with 3D motors, sensors and mission scoring',async({page})=>{
  test.setTimeout(60000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('navigation').getByRole('button',{name:'Gears library',exact:true})).toHaveCount(0);
  await expect(page.getByRole('application',{name:'Block programming canvas'})).toBeVisible();
  await expect(page.locator('.unified-stage')).toHaveAttribute('data-status','ready',{timeout:40000});
  const picker=page.getByRole('combobox',{name:'Choose a mission or world'});
  await expect(picker.locator('option')).toHaveCount(112);
  await page.getByRole('button',{name:'Add block',exact:true}).click();
  await page.getByRole('button',{name:'Add block',exact:true}).click();
  await page.getByRole('button',{name:'Run program',exact:true}).click();
  await expect(page.locator('.unified-stage')).toHaveAttribute('data-status','complete',{timeout:20000});
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('tab',{name:'Mission',exact:true}).click();
  await expect(page.getByLabel('3 of 3 stars', {exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Sensors',exact:true}).click();
  await expect(page.locator('.workspace-sensor-grid')).not.toContainText('not connected');
  expect(errors).toEqual([]);
});

test('our SPIKE blocks drive on a bundled FLL field and import keeps editable ports',async({page})=>{
  test.setTimeout(90000);const failures:string[]=[];page.on('requestfailed',r=>failures.push(r.url()));
  await page.goto('/');await expect(page.locator('.unified-stage')).toHaveAttribute('data-status','ready',{timeout:40000});
  await page.getByLabel('Choose a program file').setInputFiles({name:'route.llsp3',mimeType:'application/zip',buffer:spikeArchive()});
  await page.getByRole('button',{name:'Open program',exact:true}).click();
  await expect(page.locator('.unified-stage')).toHaveAttribute('data-status','ready',{timeout:40000});
  await expect(page.locator('.blocklyWorkspace').first()).toContainText('backward');
  const picker=page.getByRole('combobox',{name:'Choose a mission or world'});
  await picker.selectOption({label:'2025 FLL (Unearthed) — Mat only'});
  await expect(page.locator('.unified-stage')).toHaveAttribute('data-status','loading');
  await expect(page.locator('.unified-stage')).toHaveAttribute('data-status','ready',{timeout:45000});
  await page.getByRole('button',{name:'Run program',exact:true}).click();
  await expect(page.locator('.unified-stage')).toHaveAttribute('data-status','complete',{timeout:20000});
  await expect(page.getByRole('alert')).toHaveCount(0);
  const child=page.frames().find(f=>f.url().includes('student.html'))!;
  expect(await child.evaluate(()=>document.querySelector('#blocklyDiv')?.getBoundingClientRect().width)).toBe(0);
  expect(failures).toEqual([]);
});

test('sensor loops stop at the wall; stop and reset cancel continuous motors',async({page})=>{
  test.setTimeout(90000);
  page.on('dialog',dialog=>dialog.accept());
  await page.goto('/');
  const stage=page.locator('.unified-stage');
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
  await page.getByRole('combobox',{name:'Examples',exact:true}).selectOption('sensorExample');
  await page.getByRole('button',{name:'Run program',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','complete',{timeout:30000});
  await expect(page.getByRole('alert')).toHaveCount(0);
  const frame=page.frames().find(f=>f.url().includes('student.html'))!;
  const distance=await frame.evaluate(()=>{
    const sim=window as unknown as {robot:{components:{type:string;getDistance:()=>number}[]}};
    return sim.robot.components.find(c=>c.type==='UltrasonicSensor')!.getDistance();
  });
  expect(distance).toBeGreaterThan(0);expect(distance).toBeLessThanOrEqual(21);
  const program=fromCommands([]);
  program.blocks.blocks[0].next={block:{type:'spike_start_move',id:'start-moving',fields:{DIRECTION:'forward'},next:{block:{type:'spike_wait',id:'keep-moving',inputs:{TIME:literal(60)}}}}};
  await page.getByLabel('Choose a program file').setInputFiles({name:'continuous.rlproj',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schemaVersion:1,kind:'spikesim-program',name:'Continuous',missionId:null,steps:[],visualProgram:program}))});
  await page.getByRole('button',{name:'Open program',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
  await page.getByRole('button',{name:'Run program',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','running');
  await page.getByRole('button',{name:'Stop',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','stopped');
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:20000});
  await expect(stage.locator('.unified-tools')).toContainText('0.0 s');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('robot arms run with student motor blocks and world/robot choices survive reload',async({page})=>{
  test.setTimeout(90000);
  await page.goto('/');
  const stage=page.locator('.unified-stage');
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
  const robot=templateRobot('crane');
  const program=fromCommands([{type:'motor',port:'C',speedPercent:15,durationMs:400},{type:'move',distanceMm:100,speedPercent:50}]);
  await page.getByLabel('Choose a program file').setInputFiles({name:'crane.rlproj',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schemaVersion:1,kind:'spikesim-program',name:'Crane',missionId:null,scene:'world:grid',robotTemplate:'crane',robot,steps:[],visualProgram:program}))});
  await page.getByRole('button',{name:'Open program',exact:true}).click();
  await expect(page.getByRole('combobox',{name:'Robot',exact:true})).toHaveValue('crane');
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
  await page.getByRole('button',{name:'Run program',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','complete',{timeout:20000});
  await expect(page.getByRole('alert')).toHaveCount(0);
  const frame=page.frames().find(f=>f.url().includes('student.html'))!;
  expect(Math.abs(await frame.evaluate(()=>{
    const sim=window as unknown as {robot:{components:{type:string;position:number}[]}};
    return sim.robot.components.find(c=>c.type==='ArmActuator')!.position;
  }))).toBeGreaterThan(5);
  await page.reload();
  await expect(page.getByRole('combobox',{name:'Robot',exact:true})).toHaveValue('crane');
  await expect(page.getByRole('combobox',{name:'Choose a mission or world'})).toHaveValue('world:grid');
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
});
