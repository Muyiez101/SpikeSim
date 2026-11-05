import {mkdir,writeFile} from 'node:fs/promises';
import {sumoExample} from '../src/lan/example';
import {validateMatchProgram} from '../src/lan/program';
import {fromCommands} from '../src/editor/program';
import {sumoPracticeFile} from '../src/challenges/sumo';
import {programFileSchema} from '../src/progress/program-file';
await mkdir('recordings/projects',{recursive:true});
for(const [name,program] of [['sumo-lan-blue',sumoExample()],['sumo-lan-teal',fromCommands([{type:'tank',leftPercent:20,rightPercent:20,durationMs:60000}])]] as const){
  await writeFile(`recordings/projects/${name}.json`,JSON.stringify({kind:'spikesim-sumo',program:validateMatchProgram(program)},null,2)+'\n');
}
await writeFile('recordings/projects/sumo-practice.rlproj',JSON.stringify(programFileSchema.parse(sumoPracticeFile())));
process.stdout.write('Exported two Wi-Fi sumo programs and the four-dummy practice project.\n');
