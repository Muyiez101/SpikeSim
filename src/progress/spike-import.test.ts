// @vitest-environment node
import { describe,expect,it } from 'vitest';
import * as Blockly from 'blockly/core';
import { registerBlocks } from '../editor/blocks';
import { visualProgramSchema } from '../editor/program';
import { executeVisualProgram } from '../runtime/visual-runtime';
import { mapFiles } from '../sim/maps';
import { importSpikeArchive,convertSpikeProject } from './spike-import';
import { exportProgramFile,parseProgramFile } from './program-file';
import { ZipReader } from './zip-reader';
import { makeZip,spikeArchive,spikeProject } from '../../tests/fixtures/spike-project';

describe('SPIKE project import',()=>{
  it('opens a nested compressed .llsp3, preserves ports, back direction and steering through Blockly and file export',async()=>{
    const imported=await importSpikeArchive(spikeArchive(),'route.llsp3');
    expect(imported.ok).toBe(true); if (!imported.ok) return;
    expect(imported.program.robot?.motors.map(m=>m.port)).toEqual(['C','D']);
    registerBlocks(); const workspace=new Blockly.Workspace();
    try {
      Blockly.serialization.workspaces.load(imported.program.visualProgram!,workspace);
      const visual=visualProgramSchema.parse(Blockly.serialization.workspaces.save(workspace));
      const before=executeVisualProgram(imported.program.visualProgram!,mapFiles['open-floor'],imported.program.robot!);
      const after=executeVisualProgram(visual,mapFiles['open-floor'],imported.program.robot!);
      expect(before.error).toBeUndefined(); expect(after.error).toBeUndefined();
      expect(after.result.end).toEqual(before.result.end);
      expect(after.result.end.robot.x).toBeLessThan(mapFiles['open-floor'].spawn.x);
      expect(after.result.end.robot.heading).toBeLessThan(0);
      const file=exportProgramFile(imported.program.name,{...imported.program,outcome:null,visualProgram:visual});
      const restored=parseProgramFile(file.content,[]);
      expect(restored.ok && restored.program.robot).toEqual(imported.program.robot);
    } finally {workspace.dispose();}
  });
  it('rejects unknown instructions even when disconnected',()=>{
    const project=spikeProject(); Object.assign(project.targets[0].blocks,{unknown:{opcode:'custom_execute',topLevel:true}});
    const result=convertSpikeProject(project,'Unsafe');
    expect(result.ok).toBe(false); expect(!result.ok && result.unsupported).toEqual(['custom_execute']);
  });
  it('reports Python and icon projects accurately before looking for Scratch data',async()=>{
    for (const type of ['python','icon-blocks']) {
      const result=await importSpikeArchive(makeZip({'manifest.json':JSON.stringify({type})}),'file.llsp3');
      expect(!result.ok && result.unsupported).toEqual([type]);
    }
  });
  it('rejects cyclic graphs, conflicting ports and simultaneous starts',()=>{
    const cyclic=spikeProject(); cyclic.targets[0].blocks.pair.next='pair';
    expect(convertSpikeProject(cyclic,'Cycle').ok).toBe(false);
    const ports=spikeProject(); ports.targets[0].blocks.pairValue.fields.VALUE=['CC',null];
    expect(convertSpikeProject(ports,'Ports').ok).toBe(false);
    const multiple=spikeProject(); Object.assign(multiple.targets[0].blocks,{second:{opcode:'flipperevents_whenProgramStarts',topLevel:true}});
    expect(convertSpikeProject(multiple,'Starts').ok).toBe(false);
  });
  it('validates CRC, decompression size limits and paths without extracting archives',async()=>{
    const corrupt=makeZip({'project.json':'{}'},false); corrupt[30+'project.json'.length]=65;
    await expect(new ZipReader(corrupt).read('project.json')).rejects.toThrow('checksum');
    const bomb=makeZip({'project.json':'x'.repeat(100_000)});
    await expect(new ZipReader(bomb).read('project.json',1000)).rejects.toThrow('oversized');
    expect(()=>new ZipReader(makeZip({'../project.json':'{}'}))).toThrow('name');
    expect((await importSpikeArchive(new Uint8Array(10_000_001),'huge.llsp3')).ok).toBe(false);
  });
});
