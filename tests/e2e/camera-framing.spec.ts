import {test,expect} from '@playwright/test';

test('Top view keeps the entire Obstacle 2 course visible when the simulator is resized',async({page})=>{
  test.setTimeout(90000);
  await page.setViewportSize({width:1024,height:640});
  await page.goto('/');
  const stage=page.locator('.unified-stage');
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
  await page.getByRole('combobox',{name:'Choose a mission or world'}).selectOption('world:lineFollowing:obstacles2');
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:30000});
  await page.getByRole('button',{name:'Top view',exact:true}).click();
  const camera=()=>page.frameLocator('iframe[title="3D robot simulator"]').locator('body').evaluate(()=>{
    const {babylon}=window as unknown as {babylon:{cameraMode:string;cameraArc:{alpha:number;beta:number;lockedTarget:unknown;orthoTop:number;orthoBottom:number;orthoLeft:number;orthoRight:number;getTarget:()=>{x:number;z:number}}}};
    const c=babylon.cameraArc,t=c.getTarget();
    // This mat spans X -50..50 and Z -150..150. Check the actual camera,
    // including its centre and orientation, rather than a computed fit helper.
    return babylon.cameraMode==='orthoTop'&&c.lockedTarget===null&&Math.abs(t.x)<.1&&Math.abs(t.z)<.1&&Math.abs(c.alpha+Math.PI/2)<.01&&c.beta<.02&&c.orthoTop>150&&c.orthoBottom< -150&&c.orthoLeft< -50&&c.orthoRight>50;
  });
  await expect.poll(camera).toBe(true);
  await page.getByRole('button',{name:'Expand simulator',exact:true}).click();
  await expect.poll(camera).toBe(true);
  await page.setViewportSize({width:1440,height:1000});
  await expect.poll(camera).toBe(true);
  await page.getByRole('button',{name:'Restore split view',exact:true}).click();
  await expect.poll(camera).toBe(true);
});
