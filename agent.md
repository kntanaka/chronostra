# Chronostra UI Style Guardrails

This file defines the menu and popup tone that future changes must preserve.

## Source Of Truth

The visual baseline for contextual UI is the row right-click menu in `src/components/ChronoTable.svelte`.

If a new popup, dropdown, context menu, or action list is introduced, it must match that menu before it matches any generic component library pattern.

## Menu Tone

- Flat, Obsidian-native, restrained.
- Dark and ink-like on dark themes. Do not drift into bright card UI.
- No floating-card styling. Avoid rounded corners, glow, blur, or heavy shadows.
- Border is subtle and structural, not decorative.
- Hover state is a soft background shift only. Do not use loud accent fills.

## Required Menu Rules

- Background: use `var(--background-primary)`.
- Border: use `1px solid var(--background-modifier-border)`.
- Radius: `0`.
- Shadow: `none`.
- Item padding: `5px 12px`.
- Item font size: `11px`.
- Section label padding: `4px 12px 2px`.
- Section label font size: `9px`.
- Item hover: use `var(--background-secondary)`.
- Danger actions stay muted by default and only strengthen on hover.

## Scope

These rules apply to:

- Row right-click menus
- Header context menus
- Filter dropdown panels
- Toolbar action menus
- Template menus
- Similar action popups anchored to controls

Tooltips may be lighter-weight, but they should still stay visually compatible with this tone.

## Implementation Rule

When in doubt, copy the row context menu styling exactly rather than inventing a new popup style.

If a new menu-like surface looks more like a modern floating card than an Obsidian menu, it is wrong for this project.

## PR Review Reference

If asked to check PR comments, review feedback, or bot remarks for this project, start from this pull request unless the user provides a different PR:

- `https://github.com/obsidianmd/obsidian-releases/pull/11269`

Treat that PR as the default review context for comment-follow-up work.

## Obsidian Review Bot Guardrails

Before finishing changes that may ship to the plugin repo, do a quick pass against the patterns that ObsidianReviewBot has already flagged on this project.

### Required Checks

- Promise-returning calls must be `await`ed, chained with rejection handling, or explicitly marked with `void`.
- Do not make lifecycle methods `async` unless they actually need `await`.
- Avoid `any`. Use a concrete type or `unknown` plus narrowing.
- UI copy must use sentence case.
- Do not mutate presentation via `element.style.maxWidth`, `element.style.setProperty`, or similar inline style writes for theming/layout.
- Prefer CSS classes or `setCssProps` when CSS custom properties must be updated dynamically.

### Project-Specific Watchouts

- Settings labels and descriptions in `src/settings.ts` are review-bot-sensitive. Recheck sentence case there before shipping.
- Changes in `src/main.ts` that touch DOM styling should default to classes, not imperative style mutation.
- If a new fire-and-forget async path is intentional, mark it with `void` so the intent is explicit.

### Pre-Push Habit

Before pushing bot-related fixes, scan the changed files for:

- `async` methods without `await`
- bare promise calls
- `any`
- all-caps UI labels like `WIP`
- `element.style.` writes

If any appear, treat them as likely bot findings and fix them before push.

## Product Ideas On Hold

### Obsidian-Embedded Codex Terminal

This is a future idea, not an active implementation target.

The idea is to let users launch Codex from within Obsidian and possibly interact with it in a conversational terminal-like workflow.

Current decision:

- Keep this as a concept only.
- Do not spend implementation time on it unless explicitly revived.
- Do not let this idea distort current plugin architecture.

If revisited later, the preferred order is:

1. Start with launching an external terminal in the project directory.
2. Only consider an in-Obsidian terminal pane if the simple flow proves insufficient.
3. Treat a fully embedded Codex chat experience as a separate, higher-cost product surface.
