# ADR 0001: CodeMirror 6 Editor Runtime

- Status: Accepted
- Date: 2026-07-18
- Decision owners: BurleMarx architecture gate and project maintainers

## Context

hSQLite Editor must ship as one offline-capable HTML file that opens through `file://`. The existing SQL editor uses the legacy CodeMirror 5 global API, vendored scripts, vendored themes, and direct API calls spread across editor, search, autocomplete, shortcut, preference, and test code.

CodeMirror 6 is distributed as ECMAScript modules and requires a build step. Loading modules, import maps, CDN assets, or additional local files at runtime would violate the standalone artifact contract.

## Decision

Use pinned CodeMirror 6 packages and SQL language support at build time. Bundle one repo-owned editor adapter as an IIFE and inline it before the application scripts in both readable and release artifacts.

Only `src/editor/codemirror6-adapter.mjs` may import CodeMirror or Lezer packages. Application capabilities depend on the adapter contract for creation, value, selection, cursor, replacement, search highlighting, theme, accessibility attributes, focus, geometry, and keyboard/event integration.

The editor view is a runtime projection. `appState` and SQL-tab state remain authoritative application data.

## Consequences

- Builds require the pinned npm dependency tree and esbuild.
- The exact npm packages included in the editor bundle are recorded in `runtime-components.json` and marked as shipped runtime dependencies in the SPDX SBOM.
- The final artifact remains one HTML file with no runtime network or module loading.
- CodeMirror 5 assets, package metadata, selectors, test doubles, and compatibility branches are removed in the same migration.
- The broader application module-graph migration remains Item 9 and is not part of this decision.

## Rejected Alternatives

- Shipping CodeMirror 5 and 6 together.
- Loading CodeMirror from a CDN, dynamic import, import map, or adjacent runtime files.
- Importing CodeMirror directly from feature modules.
- Preserving a general CodeMirror 5 compatibility facade.
- Creating a second distribution artifact.

## Verification

- Unit contracts cover adapter value, selection, replacement, search, and event behavior.
- Artifact validation rejects CodeMirror 5 residue, external runtime URLs, source maps, `eval`, and dynamic code construction.
- Browser validation covers localized editor naming, keyboard input, selection, find/replace, autocomplete, quick history, themes, reduced motion, mobile layout, and 200% equivalent reflow.
- Release validation confirms the exact artifact is offline under Chromium and native Safari checks.
