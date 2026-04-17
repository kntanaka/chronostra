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
