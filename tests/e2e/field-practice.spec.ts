import {test,expect} from '@playwright/test';
import {practiceIds} from '../../src/challenges/practice';
import {competitionFields} from '../../src/sim/gears-catalog';

for(const id of practiceIds)test(`physical ${id} reference completes with its recommended attachment`,async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  const stage=page.locator('.unified-stage');await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
  await page.getByRole('tab',{name:'Challenge',exact:true}).click();
  await page.getByRole('combobox',{name:'Practice task',exact:true}).selectOption(id);
  await page.getByRole('button',{name:'Open practice setup',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:30000});
  await page.getByRole('button',{name:'Load example blocks',exact:true}).click();
  await expect(page.getByRole('button',{name:'Run program',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:15000});
  await page.getByRole('button',{name:'Run program',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','complete',{timeout:35000});
  await expect(page.locator('.challenge-result')).toContainText('Objective complete');
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:15000});
  await expect(page.locator('.challenge-result')).not.toContainText('Objective complete');
  expect(errors).toEqual([]);
});

test('FLL mat measurements produce editable blocks and physical practice survives reload',async({page})=>{
  test.setTimeout(90000);
  await page.goto('/');
  const stage=page.locator('.unified-stage');await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
  await page.getByRole('combobox',{name:'Choose a mission or world'}).selectOption(competitionFields.find(field=>field.file.includes('FLL2025'))!.file);
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:30000});
  await page.getByRole('tab',{name:'Challenge',exact:true}).click();
  await page.getByRole('button',{name:'Open practice setup',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:30000});
  await expect(page.getByRole('combobox',{name:'Mission object',exact:true})).toContainText('Cargo crate');
  await page.getByRole('button',{name:'Measure mat',exact:true}).click();
  await page.getByRole('button',{name:'Clear measurements',exact:true}).click();
  for(const [x,y] of [[0,0],[30,40]]){
    await page.getByRole('spinbutton',{name:'X (cm)',exact:true}).fill(String(x));
    await page.getByRole('spinbutton',{name:'Y (cm)',exact:true}).fill(String(y));
    await page.getByRole('button',{name:'Add point',exact:true}).click();
  }
  await expect(page.locator('.measurement-result')).toContainText('50.0 cm');
  await expect(page.locator('.measurement-result')).toContainText('36.9°');
  await page.getByRole('button',{name:'Load route as blocks',exact:true}).click();
  await page.getByRole('tab',{name:'Python',exact:true}).click();
  await expect(page.locator('.workspace-python')).toContainText('robot.move_cm(50');
  await page.reload();
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
  await expect(page.getByRole('combobox',{name:'Choose a mission or world'})).toContainText('Push a cargo crate · FLL 2025');
  await expect(page.locator('.challenge-result')).toBeVisible();
});
