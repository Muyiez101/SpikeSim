import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Node 24 runner for the local verification scripts, without a compiler process.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(candidate)) return { url: candidate.href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.ts') && !url.includes('/node_modules/')) {
      return { format: 'module', source: stripTypeScriptTypes(readFileSync(fileURLToPath(url), 'utf8'), { mode: 'transform' }), shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
const target = process.argv[2];
if (!target) throw Error('Provide a TypeScript script path');
process.argv.splice(1, 1);
await import(pathToFileURL(resolve(target)).href);
