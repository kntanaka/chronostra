# Accessibility verification — 2026-11-01

Local changes only; no push or release.

## Changes

- Capture uses a named native modal dialog, initial textarea focus and explicit return focus; background content is inert while open.
- Schedule editing returns focus on save/cancel/delete. Completing a step moves focus to another available completion button, with an add-button fallback. Timeline resize keeps keyboard focus on its handle.
- Save success is announced after persistence resolves. The mobile detail dialog has its own live region because background content is inert.
- Resize targets are 24 × 24 CSS pixels, separated vertically so short bars do not overlap their start/end targets. Focus outlines stay inside the target.
- Validation associates specific bilingual messages with invalid fields and focuses the first invalid field. Both range endpoints are required when using a range.

## Verified manually

Mac Chrome, local sample preview, mobile width 320, browser zoom 200%:

- Entered multiline notes; Tab brought Save into view, then saved.
- Save returned focus to Add a planned step.
- Completed the new step; focus moved to another available completion button.
- Reloaded and reopened Completed: status and all three note lines persisted.
- Cancel restored focus to the edited step.

Local preview DOM/keyboard checks:

- Capture opens with textarea focus; closing restores Add focus (retested after repair).
- Invalid end date focuses the end-date field, sets aria-invalid and aria-describedby, and shows the specific range-order message.
- Resize handles measure 24 × 24 CSS pixels; ArrowLeft changes the end date in the detail field while keeping focus on the resize handle (retested after repair).

Build, TypeScript check, Obsidian lint, existing planning/storage/provider/installer regression suites passed. These do not replace assistive-technology testing.

## Not verified

VoiceOver end-to-end reading remains blocked in this environment. Command-F5 and the System Settings switch both enabled the setting, but no cursor navigation or caption output could be observed; the VoiceOver app state request timed out. Retoggling the setting did not resolve this. The setting was turned off after the attempt. Do not interpret browser accessibility-tree inspection as a VoiceOver pass.

iOS VoiceOver, OS text-size/Dynamic Type, browser-native text-only zoom, high contrast and arbitrary Obsidian themes were not tested in this pass. The 200% result refers to browser page zoom. The preview uses sample localStorage persistence, not an actual Obsidian vault.


## Text enlargement and automated UI regressions

The preview now offers Text 100%, 150%, and 200%. This changes root font size only; the 320px preview width and fixed spacing remain unchanged. Mobile/planning component font sizes use rem. This is controlled CSS text enlargement, not an iOS Dynamic Type or browser-native text-zoom certification.

At large text sizes the section navigation stacks vertically, back/capture headings wrap, date ranges reflow, and milestone year inputs use a full-width row. English and Japanese 200% flows pass at 320px. A Mac Chrome screenshot was also inspected.

Run `npm run test:ui` for five Playwright browser tests (independent from `npm test`). Mac uses installed Google Chrome. Other platforms use Chromium installed with `npx playwright install chromium`. The suite builds a fresh sample preview on loopback port 5199, uses isolated browser contexts/localStorage, and does not touch Obsidian vaults. Port 5198 remains available for manual preview.

Coverage: capture initial focus/modal/close/Escape/submission; required-title and date-order errors including accessible descriptions; save/cancel/delete focus restoration; multiline notes after reload; completion through the last remaining step and undo; English/Japanese 200% text scaling, fixed width, capture/range-entry/save/completion and horizontal overflow. Regression checks first reproduced the enlarged English tab overflow before the layout repair. Browser-test output is gitignored.

Validation: 5 browser tests passed, plus existing planning/storage/provider/installer suites, build, typecheck and Obsidian lint. VoiceOver remains deferred by user request.
