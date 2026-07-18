# Architecture

## Product boundary

hSQLite Editor is one browser application distributed as one offline-capable HTML file. SQLite execution, persistence, import/export, and UI behavior run locally in the browser. There is no application backend and no remote data service.

## Source ownership

- `src/core/`: domain contracts, pure helpers, runtime configuration, and authoritative application state.
- `src/ports/`: browser storage, file access, clipboard/download, and SQL worker adapters.
- `src/capabilities/`: user workflows and application orchestration.
- `src/ui/`: rendering, feature composition, and event binding.
- `src/styles/`: design tokens, components, feature layouts, and responsive behavior.
- `src/editor/`: the only adapter allowed to import editor-runtime packages.
- `scripts/`: deterministic build, release, and verification tooling.
- `packaging/linux/`: declarative Linux desktop-integration inputs for the standalone artifact.
- `vendor/`: pinned binary/runtime assets with SHA-256 provenance in `vendor/manifest.json`.

## Runtime invariants

1. `appState` is authoritative for durable in-memory product state.
2. Browser storage is an adapter, not the source of truth while the application is running.
3. SQL execution occurs in a worker and adopts changed database bytes only after successful completion.
4. The generated artifact performs no required network request.
5. `src/app.mjs` is the sole production entry point. Every cross-file dependency is an ESM import/export, and module cycles are blocking failures.
6. User-facing copy and locale formatting are owned by the localization capability.
7. Generated `index.html` and `dist/` files are outputs, not hand-maintained source.

## Build composition

`scripts/app-bundle.mjs` links the source graph with the pinned esbuild version and emits one browser IIFE. `scripts/build.mjs` inlines that IIFE, the CodeMirror adapter, vendored SQL.js, boot metadata, and the numerically ordered CSS ownership files into the standalone HTML artifact. Browsers never resolve source modules or fetch runtime dependencies.

The application keeps one authoritative `appState` in `src/core/10-state-root.js`. Narrow state modules expose domain accessors over that same object; they do not create mirrors. Feature-owned transient values such as editor handles, active workers, drag state, timers, and render caches remain outside durable application state.

DOM registries and styles are split by owned surface. Numeric filenames define deterministic CSS cascade order only; release chronology is recorded in `CHANGELOG.md`.

The Linux filesystem stage is a packaging satellite over the same versioned HTML artifact. It adds no second runtime, service, persistence layer, file association, or protocol handler. Its launcher resolves the packaged HTML relative to the installed prefix and delegates that one local path to `xdg-open`; [linux-packaging.md](linux-packaging.md) defines the complete boundary.

## Architectural change policy

Preserve the modular monolith and standalone distribution unless evidence shows they no longer serve the product. The CodeMirror 6 decision is recorded in `docs/adr/0001-codemirror-6-editor-runtime.md`; the ESM graph and standalone linker decision is recorded in `docs/adr/0002-esm-application-module-graph.md`.

SQL.js runtime files are vendored and hash-verified. The CodeMirror 6 editor is bundled at build time from the exact lockfile behind `src/editor/codemirror6-adapter.mjs`; `runtime-components.json` records every package included in that shipped bundle.

CodeMirror and Lezer remain development dependencies because browsers receive their compiled inline bundle, not npm packages. `runtime-components.json` and `sbom.spdx.json` are the authoritative provenance records for those shipped runtime components; generation fails if esbuild inputs and the lockfile dependency closure disagree.
