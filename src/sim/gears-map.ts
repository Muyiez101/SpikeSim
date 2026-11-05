import type { MapFile } from './schemas';

const xml = (value:string) => value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
/** Original classroom maps become local 3D fields in the same world picker. */
export function toGearsWorld(map:MapFile) {
  const {width,height}=map.size;
  const shapes:string[]=[`<rect width="100%" height="100%" fill="${xml(map.surface.base)}"/>`];
  for(const layer of map.surface.layers) {
    if(layer.type==='line') shapes.push(`<polyline points="${layer.points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${xml(layer.color)}" stroke-width="${layer.width}" stroke-linecap="round" stroke-linejoin="round"/>`);
    else if(layer.shape==='circle') shapes.push(`<circle cx="${layer.x}" cy="${layer.y}" r="${layer.r}" fill="${xml(layer.color)}"/>`);
    else shapes.push(`<rect x="${layer.x-(layer.w??0)/2}" y="${layer.y-(layer.h??0)/2}" width="${layer.w}" height="${layer.h}" fill="${xml(layer.color)}"/>`);
  }
  for(const zone of map.zones) {
    const style=`fill="${xml(zone.color??'#b9e769')}" fill-opacity="0.25" stroke="#789440" stroke-width="2"`;
    shapes.push(zone.shape==='circle'?`<circle cx="${zone.x}" cy="${zone.y}" r="${zone.r}" ${style}/>`:`<rect x="${zone.x-zone.w/2}" y="${zone.y-zone.h/2}" width="${zone.w}" height="${zone.h}" ${style}/>`);
    if(zone.label)shapes.push(`<text x="${zone.x}" y="${zone.y}" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#344224">${xml(zone.label)}</text>`);
  }
  const objects:Record<string,unknown>[]=[];
  for(const wall of map.walls) for(let i=1;i<wall.points.length;i++) {
    const [x1,y1]=wall.points[i-1],[x2,y2]=wall.points[i];
    objects.push({type:'box',position:[((x1+x2)/2-width/2)/10,(height/2-(y1+y2)/2)/10,wall.height/20],size:[Math.hypot(x2-x1,y2-y1)/10,wall.thickness/10,wall.height/10],rotation:[0,Math.atan2(y2-y1,x2-x1)*180/Math.PI,0],color:'#c7cdda',physicsOptions:'fixed'});
  }
  const objectIndices=map.objects.map((object)=>{
    const index=objects.length;
    objects.push({type:object.kind==='ball'?'sphere':object.kind,position:[(object.x-width/2)/10,(height/2-object.y)/10,object.size/20],size:[object.size/10,object.size/10,object.size/10],color:object.color,physicsOptions:{mass:object.mass,friction:0.4,restitution:0.05},index});
    return {id:object.id,index,kind:object.kind==='ball'?'sphere':object.kind};
  });
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${shapes.join('')}</svg>`;
  return {options:{imageURL:`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,imageScale:1,wall:false,groundType:'box',startPosXYZ:[(map.spawn.x-width/2)/10,(height/2-map.spawn.y)/10,0],startRot:map.spawn.heading+90,objects},objectIndices};
}
