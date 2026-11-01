import { build } from 'esbuild';
import svelte from 'esbuild-svelte';
import { createServer } from 'node:http';
const result = await build({entryPoints:['dev/planning-preview.ts'],bundle:true,write:false,format:'iife',plugins:[svelte({compilerOptions:{css:'injected'}})]});
const script = result.outputFiles[0].text;
createServer((req,res)=>{
  res.setHeader('Content-Type',req.url==='/app.js'?'application/javascript':'text/html');
  res.end(req.url==='/app.js'?script:'<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chronostra Planning Preview</title><div id="app"></div><script src="/app.js"></script></html>');
}).listen(5198,'127.0.0.1',()=>console.log('Sample planning preview: http://127.0.0.1:5198'));
