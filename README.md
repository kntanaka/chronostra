# Chronostra

**Chronos** (time) + **Stratum** (layer) — a hierarchical life-planning table that lives inside your Obsidian vault.

---

## The Problem

Life planning tools fall into two camps: beautiful but locked inside proprietary apps, or flexible but scattered across dozens of markdown files with no structure. You end up choosing between control and clarity.

Chronostra refuses to choose. It gives you a structured, zoomable view of your future — from high-level life categories down to individual tasks — while keeping every byte of your data in a plain markdown file you own.

## What It Does

Chronostra renders a single `future-data` code block in your Obsidian vault as a full-width interactive table:

```
Category → Goal → Project → Task
```

Each row carries three metric columns — **Future** (where you want to be), **Now** (where you are), and **Gap** (the delta) — plus a 25-year timeline spanning 2025–2050.

The table supports:

- **1000+ rows** with virtual scrolling at 60fps
- **Frozen columns** — Plan, Future, Now, and Gap stay locked while you scroll through the timeline
- **Inline editing** — double-click any cell to edit, changes auto-save to your markdown file
- **Tree operations** — right-click to add children, siblings, or delete rows
- **Expand/collapse** — drill into or hide any branch of your plan
- **Bidirectional sync** — edit the JSON in your markdown file, and the table updates; edit the table, and the file updates

## Data Format

Your data lives in a fenced code block inside any markdown file:

````markdown
```future-data
[
  {
    "id": "1",
    "path": ["Health"],
    "metrics": { "future": "Run a marathon", "now": "5K runner", "gap": "Training plan" },
    "timeline": [{ "year": 2025, "text": "Start training", "status": "active" }]
  },
  {
    "id": "2",
    "path": ["Health", "Fitness"],
    "metrics": { "future": "Daily habit", "now": "3x/week", "gap": "Consistency" },
    "timeline": []
  }
]
```
````

The `path` array defines hierarchy. `["Health"]` is a category. `["Health", "Fitness"]` is a goal under Health. Four levels deep: **Category → Goal → Project → Task**.

No database. No sync service. No lock-in. Just JSON in a markdown file.

## Installation

1. Clone or download this repository
2. Run `npm install` and `npm run build`
3. Copy `dist/main.js`, `dist/styles.css`, and `dist/manifest.json` to your vault's `.obsidian/plugins/chronostra/` directory
4. Enable the plugin in Obsidian Settings → Community Plugins

Or symlink for development:

```sh
ln -s /path/to/chronostra/dist /path/to/vault/.obsidian/plugins/chronostra
```

## Development

```sh
npm install
npm run dev    # watch mode — rebuilds on every change
npm run build  # production build
```

The build outputs a single `dist/main.js` bundle, `dist/styles.css`, and `dist/manifest.json`.

## Tech Stack

- **Svelte 5** — runes-based reactivity ($state, $derived, $effect)
- **TanStack Virtual Core** — row virtualization for large datasets
- **Obsidian API** — ItemView, vault read/write, settings persistence
- **esbuild** — fast bundling with esbuild-svelte

## Design

Chronostra follows the Swiss/International Typographic Style: monochrome palette, typographic hierarchy over decorative elements, generous use of whitespace, and functional minimalism. It inherits your Obsidian theme's CSS variables, so it looks native in any theme — light or dark.

## License

MIT
