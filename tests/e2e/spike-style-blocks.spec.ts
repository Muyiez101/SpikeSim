import {test,expect} from '@playwright/test';
import {fromCommands,literal,type BlockState} from '../../src/editor/program';
import {exportProgramFile} from '../../src/progress/program-file';
const say=(text:string):BlockState=>({type:'spike_print',inputs:{VALUE:{block:{type:'text',fields:{TEXT:text}}}}});

test('control exposes both if shapes and Events and Sensors have the expected blocks',async({page})=>{
  await page.goto('/');
  await page.locator('.blocklyTreeRow').filter({hasText:/^Control$/}).click();
  const flyout=page.locator('.blocklyFlyout').last();
  await expect(flyout).toContainText('then');await expect(flyout).toContainText('else');
  await page.locator('.blocklyTreeRow').filter({hasText:/^Events$/}).click();
  await expect(flyout).toContainText('when program starts');await expect(flyout).toContainText('when I receive');
  await page.locator('.blocklyTreeRow').filter({hasText:/^Sensors$/}).click();
  await expect(flyout).toContainText('reflected light');await expect(flyout).toContainText('button pressed?');
});

test('events run alongside movement and handle broadcasts, sensors and virtual hub buttons',async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width:1024,height:640});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const program=fromCommands([{type:'wait',durationMs:5000}]);
  program.blocks.blocks[0].next!.block!.next={block:{type:'controls_if',extraState:{hasElse:true},inputs:{IF0:{block:{type:'logic_boolean',fields:{BOOL:'FALSE'}}},DO0:{block:say('wrong branch')},ELSE:{block:say('else branch')}}}};
  program.blocks.blocks.push(
    {type:'spike_when_timer',id:'timer-event',inputs:{TIME:literal(.3)},next:{block:{type:'spike_broadcast',fields:{MESSAGE:'ready'}}}},
    {type:'spike_when_message',id:'message-event',fields:{MESSAGE:'ready'},next:{block:say('message received')}},
    {type:'spike_when_button',id:'button-event',fields:{BUTTON:'left'},next:{block:say('button pressed')}},
    {type:'spike_when_distance',id:'distance-event',fields:{PORT:'E',OP:'GT'},inputs:{DISTANCE:literal(1)},next:{block:say('distance event')}},
  );
  const file=exportProgramFile('Event checks',{missionId:null,steps:[],visualProgram:program,outcome:null});
  await page.goto('/');
  await page.getByLabel('Choose a program file').setInputFiles({name:file.name,mimeType:'application/json',buffer:Buffer.from(file.content)});
  await page.getByRole('button',{name:'Open program',exact:true}).click();
  const stage=page.locator('.unified-stage');await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
  const hub=page.frameLocator('iframe[title="3D robot simulator"]').locator('.spike-hub');
  await expect(hub.getByRole('button',{name:'Left hub button',exact:true})).toHaveText('◀');
  await expect(hub.getByRole('button',{name:'Right hub button',exact:true})).toHaveText('▶');
  const hubBounds=await hub.boundingBox(),canvasBounds=await page.locator('.unified-canvas').boundingBox();
  expect(hubBounds!.width).toBeLessThanOrEqual(105);expect(hubBounds!.height).toBeLessThanOrEqual(115);
  expect(hubBounds!.y+hubBounds!.height).toBeLessThanOrEqual(canvasBounds!.y+canvasBounds!.height);
  await page.getByRole('button',{name:'Run program',exact:true}).click();
  await expect(page.locator('.unified-output')).toContainText('message received',{timeout:15000});
  await expect(page.locator('.unified-output')).toContainText('distance event');
  const button=page.frameLocator('iframe[title="3D robot simulator"]').getByRole('button',{name:'Left hub button',exact:true});
  await button.focus();await button.press('Space',{delay:300});
  await expect(page.locator('.unified-output')).toContainText('button pressed',{timeout:10000});
  await expect(page.locator('.unified-output')).toContainText('else branch',{timeout:15000});
  const output=await page.locator('.unified-output').innerText();expect(output.indexOf('message received')).toBeLessThan(output.indexOf('else branch'));
  await expect(page.locator('.unified-output')).not.toContainText('wrong branch');
  await expect(stage).toHaveAttribute('data-status','running');
  await page.getByRole('button',{name:'Stop',exact:true}).click();await expect(stage).toHaveAttribute('data-status','stopped');
  expect(errors).toEqual([]);
});
