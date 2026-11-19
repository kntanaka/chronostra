## Chronostra 0.1.12

- Mobile planning centered on Commitments and quick capture, with dedicated detail screens and English/Japanese UI.
- Monthly, weekly and daily planning, including a desktop Gantt timeline with drag-to-reschedule and resizable date ranges.
- Complete scheduled steps directly from mobile details; completed steps stay collapsed until needed.
- Improved keyboard focus, field-specific validation, save notifications, and layouts for enlarged text.
- Protect existing plan data when loading fails, saves fail, or external edits conflict. Preserve multiline notes and literal text during Markdown saves.
- Added storage, conflict handling, installer and browser interaction regression tests.

### Known limitations

- Editing multiple `future-data` blocks in a single note is not supported; ambiguous notes are rejected to protect their contents.
- Conflicting external edits require manual reconciliation; changes are not automatically merged.
- VoiceOver verification remains deferred. Actual iPhone Obsidian and iOS Dynamic Type have not received final verification for this release.
