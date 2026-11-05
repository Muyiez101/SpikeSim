import {en} from '../shared/strings/en';
const fills:Record<string,string>={black:'#20222a',white:'#ffffff',red:'#ed4250',yellow:'#f9d549',green:'#38b96d',blue:'#3d87df',purple:'#9758cd',cyan:'#36c9dc'};
export const sensorColorOptions=en.extraBlocks.sensorColors.map(([label,value])=>[
  fills[value]?{src:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"><rect x="1" y="1" width="20" height="20" rx="4" fill="${fills[value]}" stroke="#69758a"/></svg>`)}`,width:22,height:22,alt:label}:label,value,
]);
