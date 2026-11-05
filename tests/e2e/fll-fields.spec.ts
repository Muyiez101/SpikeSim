import {test,expect} from '@playwright/test';
import fields from '../../src/sim/gears-missions.json' with {type:'json'};

test('all FLL choices render their mat and available models after switching fields',async({page})=>{
  test.setTimeout(180000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  const stage=page.locator('.unified-stage');
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
  const picker=page.getByRole('combobox',{name:'Choose a mission or world'});
  const scene=page.frameLocator('iframe[title="3D robot simulator"]').locator('body');
  const state=()=>scene.evaluate(()=>{
    type Mesh={id:string};
    const {babylon}=window as unknown as {babylon:{world:{options:{imageURL:string;objects:unknown[]}};scene:{getFrameId:()=>number;getActiveMeshes:()=>{data:Mesh[];length:number};textures:{name:string;isReady:()=>boolean}[]}}};
    if(!babylon?.scene||!babylon.world?.options)return {image:'',objects:0,frame:0,visibleModels:0,textureReady:false};
    const meshes=babylon.scene.getActiveMeshes();
    return {image:babylon.world.options.imageURL,objects:babylon.world.options.objects.length,frame:babylon.scene.getFrameId(),visibleModels:meshes.data.slice(0,meshes.length).filter(mesh=>mesh.id.startsWith('worldBaseObject')).length,textureReady:babylon.scene.textures.some(texture=>texture.name===babylon.world.options.imageURL&&texture.isReady())};
  });
  for(const field of fields.filter(field=>field.file.includes('/FLL/'))){
    await picker.selectOption(field.file);
    const image='textures/maps/FLL/'+field.file.split('/').at(-1)!.split('.')[0].replace('v2','')+'.jpg';
    await expect.poll(async()=>(await state()).image,{timeout:45000}).toBe(image);
    await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
    const loaded=await state();
    // A loaded mesh list alone missed a fatal physics error that froze the canvas.
    await expect.poll(async()=>(await state()).frame,{timeout:10000}).toBeGreaterThan(loaded.frame+1);
    expect(loaded.textureReady,field.name).toBe(true);
    if(field.content==='mission-models'){
      expect(loaded.objects,field.name).toBeGreaterThan(0);
      expect(loaded.visibleModels,field.name).toBeGreaterThan(0);
      await expect(page.locator('.workspace-field-note')).toContainText('Mission models included');
    }else{
      expect(loaded.objects,field.name).toBe(0);
      expect(loaded.visibleModels,field.name).toBe(0);
      await expect(picker.locator('option:checked')).toContainText('Mat only');
      await expect(page.locator('.workspace-field-note')).toContainText('no 3D mission models');
    }
    expect(errors,field.name).toEqual([]);
  }
  await picker.selectOption({label:'2024 FLL (Submerged)'});
  await expect.poll(async()=>(await state()).image,{timeout:45000}).toBe('textures/maps/FLL/FLL2024.jpg');
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:45000});
  await page.getByRole('button',{name:'Add block',exact:true}).click();
  await page.getByRole('button',{name:'Run program',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','complete',{timeout:20000});
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(stage).toHaveAttribute('data-status','ready',{timeout:20000});
  expect(errors).toEqual([]);
});
