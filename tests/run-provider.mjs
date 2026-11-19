import { build } from 'esbuild';
const result = await build({entryPoints:['tests/provider.test.ts'],bundle:true,platform:'node',format:'esm',write:false,plugins:[{
  name:'obsidian-test-host', setup(b) {
    b.onResolve({filter:/^obsidian$/}, () => ({path:'obsidian',namespace:'test-host'}));
    b.onLoad({filter:/.*/,namespace:'test-host'}, () => ({contents:'export class TAbstractFile {} export class TFile extends TAbstractFile {}',loader:'js'}));
  },
}]});
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
