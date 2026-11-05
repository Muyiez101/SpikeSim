// @vitest-environment node
import {readFileSync,existsSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import fields from './gears-missions.json' with {type:'json'};

describe('competition field contents',()=>{
  it('lists eight FLL mats and both RePLAY layouts with accurate model availability',()=>{
    const fll=fields.filter(field=>field.file.includes('/FLL/'));
    expect(fll).toHaveLength(9);
    const images=new Set<string>();
    for(const field of fields){
      const world=JSON.parse(readFileSync(new URL('../../public/gears/'+field.file.split('?')[0],import.meta.url),'utf8'));
      expect(field.content,field.name).toBe(world.options.objects.length?'mission-models':'mat-only');
      expect(existsSync(new URL('../../public/gears/'+world.options.imageURL,import.meta.url)),field.name).toBe(true);
      if(fll.includes(field))images.add(world.options.imageURL);
    }
    expect(images.size).toBe(8);
    expect(fll.filter(field=>field.content==='mat-only').map(field=>field.name.slice(0,4))).toEqual(['2025','2019','2018']);
  });
});
