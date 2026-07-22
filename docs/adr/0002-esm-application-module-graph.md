# ADR 0002: ESM Application Module Graph

- Status: Accepted
- Date: 2026-07-18
- Decision owners: BurleMarx architecture gate and project maintainers

## Context

hSQLite Editor currently builds its application by concatenating 59 classic-script fragments in a manually maintained order. Those fragments share one broad lexical scope, so dependencies are implicit, cycles are hidden, and moving a file can change runtime behavior without an import or export contract.

The application must continue to ship as one offline-capable HTML file that opens through `file://`. A source-level module graph therefore cannot become a runtime module loader, import map, network dependency, or multi-file distribution.

## Decision

Use native ECMAScript modules as the application source format and esbuild as the build-time linker. `src/app.mjs` is the sole application entry point. The build emits one browser IIFE and inlines it into the existing standalone HTML artifact after the vendored SQLite runtime, the editor adapter, and boot metadata.

Every durable dependency crosses a file boundary through an explicit import and export. The target ownership direction is:

`application entry/kernel -> UI surfaces -> capabilities -> core contracts -> browser ports`

Cycles must be removed through narrower contracts or dependency inversion. A shared event bus, service locator, framework migration, API layer, or second distribution artifact is not part of this decision.

`appState` remains the sole authoritative application state. Domain state accessors may be split into narrower modules, but they must operate on that same object. Browser-specific effects remain in ports. DOM references are exported from surface-owned registries. Ephemeral editor, worker, pointer, and rendering caches remain feature-owned runtime data rather than competing state.

## Build And Test Boundary

The production artifact does not expose module internals as ambient globals. Deterministic tests import pure contracts directly. Artifact runtime tests use an explicit opt-in test bridge that is unavailable unless the harness sets the test flag before application startup.

CSS remains build-time concatenated because CSS modules do not improve the standalone runtime contract. Cascade order is explicit through numeric filenames, and each file owns tokens, base rules, layout, components, or one feature family. Release chronology belongs in `CHANGELOG.md`, not stylesheet comments.

## Consequences

- Source composition is validated from the ESM graph instead of a manually ordered classic-script manifest.
- Builds require esbuild, already pinned for the editor adapter.
- Module cycles and undeclared cross-file dependencies are blocking validation failures.
- Runtime smoke must stop depending on arbitrary VM ambient bindings.
- The standalone artifact, offline behavior, public UI, IDs, selectors, ARIA contracts, locales, and keyboard behavior remain unchanged.
- `design_system.md` must describe the actual typography and breakpoint ranges before Item 9 closes.

## Rejected Alternatives

- Keeping ordered classic-script concatenation as the final architecture.
- Generating one synthetic source module by concatenating the same fragments.
- Shipping native modules, import maps, or adjacent JavaScript files at runtime.
- Introducing a broad mutable application context to simulate globals.
- Adding a framework, event bus, service split, or API-first boundary without a product requirement.
- Changing visible behavior during the ownership refactor without independent defect evidence.

## Verification

- Static validation parses every application source as a module, rejects undeclared source files, and rejects module cycles.
- The build produces one inline application IIFE with no external imports, source maps, `eval`, or dynamic code construction.
- Deterministic contracts import source modules directly.
- Readable and release runtime suites pass against the generated artifacts.
- The three-locale desktop/mobile browser matrix passes with zero Axe violations.
- Visual comparison covers the shell, file actions, editor actions, history, settings, SQL Map, export, and populated results before and after the refactor.
