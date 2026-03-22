# Chronostra Design Principles

- **Zero Latency**: Every interaction must feel instantaneous.
- **Data Portability**: The single JSON source is sacred. It must remain human-readable.
- **Visual Hierarchy**: Users should feel the "depth" of their plans through subtle UI cues.
- **Obsidian Native**: It's a plugin first. Respect the host application's environment.

## Tech Stack
- Svelte 5 with TypeScript (compiled via esbuild-svelte)
- TanStack Virtual Core (row virtualization)
- Obsidian API (ItemView, vault, settings)
- esbuild for bundling

## Architecture
- Obsidian plugin: `src/main.ts` → `Plugin`, `src/view.ts` → `ItemView`
- Single JSON data model stored in Markdown `\`\`\`future-data` code block
- Flat JSON array with `path` arrays → parsed into Category > Goal > Project > Task tree
- Bidirectional sync via `app.vault.process()` + `vault.on('modify')`
- Virtual scrolling for 1000+ rows at 60fps
- CSS sticky columns (no sync-scroll hacks)
- Svelte 5 runes ($state, $derived, $effect) for reactivity
- Obsidian native CSS variables for theme compatibility

## Build
- `npm run build` → `dist/main.js` + `dist/styles.css` + `dist/manifest.json`
- `npm run dev` → watch mode
