import {z} from 'zod';
export const pointSchema=z.object({x:z.number().finite().min(-5000).max(5000),y:z.number().finite().min(-5000).max(5000)});
export const measurementSchema=z.object({points:z.array(pointSchema).max(20),heading:z.number().finite(),wheelDiameter:z.number().positive().max(100)});
export type MatPoint=z.infer<typeof pointSchema>;
export const turnAngle=(degrees:number)=>((degrees+180)%360+360)%360-180;
/** Gears positions are centimetres. Mat Y points forward/north, yaw is clockwise. */
export function measureRoute(points:MatPoint[],heading=0,wheelDiameter=5.6){
  let facing=heading,total=0;
  const segments=points.slice(1).map((point,index)=>{
    const dx=point.x-points[index].x,dy=point.y-points[index].y,distance=Math.hypot(dx,dy);
    const bearing=distance?Math.atan2(dx,dy)*180/Math.PI:facing;
    const turn=turnAngle(bearing-facing);facing=bearing;total+=distance;
    return {dx,dy,distance,bearing,turn,wheelDegrees:distance/(Math.PI*wheelDiameter)*360};
  });
  return {segments,total};
}
