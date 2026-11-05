import { transform, build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const output = new URL('../dist-electron/', import.meta.url);
await mkdir(output, { recursive: true });

// These entry points only import Node and Electron. Transforming them directly
// avoids resolving unrelated ancestor folders on restricted Windows accounts.
for (const name of ['main', 'preload', 'gears-server']) {
  const source = await readFile(new URL(`../electron/${name}.ts`, import.meta.url), 'utf8');
  const result = await transform(source, {
    loader: 'ts',
    format: 'cjs',
    target: 'node20',
    sourcefile: `electron/${name}.ts`,
    sourcemap: 'inline',
  });
  await writeFile(new URL(`${name}.js`, output), result.code);
}
// The root package is ESM; Electron's main and sandboxed preload are CommonJS.
await writeFile(new URL('package.json', output), '{"type":"commonjs"}\n');
// Bundle the local host and worker graphs; package dependencies stay external.
for(const [name,entry] of [['content-security','electron/content-security.ts'],['lan-server','electron/lan-server.ts'],['match-worker','src/lan/match-worker.ts'],['challenge-worker','src/classroom/challenge-worker.ts']]){
  const root=fileURLToPath(new URL('../',import.meta.url));
  await build({absWorkingDir:root,entryPoints:[entry],outfile:fileURLToPath(new URL(`${name}.js`,output)),bundle:true,platform:'node',format:'cjs',target:'node20',tsconfigRaw:{compilerOptions:{}},plugins:[{
    name:'explicit-local-modules',setup(build){
      build.onResolve({filter:/.*/},args=>{
        if(args.kind!=='entry-point'&&!args.path.startsWith('.'))return {path:args.path,external:true};
        const filename=path.resolve(args.resolveDir||root,args.path);
        return {path:filename+(path.extname(filename)?'':'.ts'),namespace:'local-source'};
      });
      build.onLoad({filter:/.*/,namespace:'local-source'},async args=>({contents:await readFile(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':'ts',resolveDir:path.dirname(args.path)}));
    },
  }]});
}
