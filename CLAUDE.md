# Chronostra Design Principles

- **Zero Latency**: Every interaction must feel instantaneous.
- **Data Portability**: The single JSON source is sacred. It must remain human-readable.
- **Visual Hierarchy**: Users should feel the "depth" of their plans through subtle UI cues.
- **Obsidian Native**: It's a plugin first. Respect the host application's environment.

## Tech Stack
- Svelte 5 (SvelteKit) with TypeScript
- TanStack Virtual Core (row virtualization)
- Tailwind CSS v4

## Architecture
- Single JSON data model: Category > Goal > Project > Task
- Virtual scrolling for 1000+ rows at 60fps
- CSS sticky columns (no sync-scroll hacks)
- Svelte 5 runes ($state, $derived, $effect) for reactivity
