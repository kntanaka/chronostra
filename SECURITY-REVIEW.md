# Release security review — 2026-11-01

## Storage regression

Both the dedicated view and Markdown renderer now use `replaceFutureDataBlock`.
The replacement callback inserts JSON literally, preserving `$&`, `$$`, dollar-backtick,
and dollar-apostrophe instead of interpreting JavaScript replacement tokens.
`npm test` checks round trips for these tokens, Japanese text, multiline notes, embedded
fences, repeat saves, and preservation of surrounding Markdown. The test fails against
the previous replacement-string implementation.

Also reloaded the updated build in an isolated local vault in Obsidian 1.14.5.
Saved all four replacement tokens in a three-line note through the mobile preview,
then parsed the actual Markdown file and verified exact text and completion state.
A clean `npm ci --ignore-scripts --no-audit`, build, lint, TypeScript checks and
regression tests passed.

## Dependency review

Updated the lockfile within compatible dependency ranges, with Svelte >=5.57.3 and
Obsidian SDK >=1.14.4. A Moment override >=2.31.0 also fixes the older version pinned by
the Obsidian lint plugin. The SDK remains external to the distributed plugin.

Final npm audit: 0 critical, 0 high, 20 moderate affected-package entries. All remaining
entries originate from one advisory:
https://github.com/advisories/GHSA-g3hv-75wg-m249 (minimatch globparts amplification).
These are development-only ESLint dependencies; the distributed bundle does not
contain minimatch. Lint runs on this repository's fixed source glob, not user notes or
user-supplied glob patterns. Do not expose the lint toolchain as an untrusted-input service.

Upstream toolchains still require older minimatch APIs. Do not force a cross-major
minimatch override merely to suppress the audit: old consumers use its callable export.
Revisit the dependency tree when upstream compatible fixes become available.
The release workflow blocks high/critical advisories and runs lint, TypeScript checks,
storage/planning regression tests, and the build.

## Publication scope

The personal absolute path was removed from the vault-link script alias. The alias
now respects `OBSIDIAN_VAULT`, as does `link:vault`. Historical commits are unchanged.
The preview is sample-only and binds to 127.0.0.1; dev/test files are not release assets.
This review does not certify all possible vulnerabilities or third-party host behavior.
No release or tag was created as part of this work.
