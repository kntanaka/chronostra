import esbuild from "esbuild";
import esbuildSvelte from "esbuild-svelte";
import { compileModule } from "svelte/compiler";
import { readFileSync, copyFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import process from "process";

/** Plugin to compile .svelte.ts/.svelte.js files using Svelte 5's compileModule */
const svelteModulePlugin = {
  name: "svelte-module",
  setup(build) {
    build.onLoad({ filter: /\.svelte\.[tj]s$/ }, async (args) => {
      const source = readFileSync(args.path, "utf-8");
      // Strip TypeScript first
      const stripped = await esbuild.transform(source, {
        loader: "ts",
        tsconfigRaw: '{}',
      });
      const result = compileModule(stripped.code, {
        filename: args.path,
        generate: "client",
      });
      return {
        contents: result.js.code,
        loader: "js",
        resolveDir: dirname(args.path),
      };
    });
  },
};

mkdirSync("dist", { recursive: true });

const isWatch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "dist/main.js",
  format: "cjs",
  target: "es2022",
  platform: "browser",
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
  ],
  plugins: [
    svelteModulePlugin,
    esbuildSvelte({
      compilerOptions: { css: "injected" },
    }),
  ],
  logLevel: "info",
  sourcemap: "inline",
});

if (isWatch) {
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}

// Copy static files to dist
copyFileSync("manifest.json", "dist/manifest.json");
copyFileSync("src/styles.css", "dist/styles.css");
