# hSQLite Editor

[![Deploy GitHub Pages](https://github.com/helbertm/hSQLite-Editor/actions/workflows/pages.yml/badge.svg)](https://github.com/helbertm/hSQLite-Editor/actions/workflows/pages.yml)
[![Quality Gate](https://github.com/helbertm/hSQLite-Editor/actions/workflows/quality.yml/badge.svg)](https://github.com/helbertm/hSQLite-Editor/actions/workflows/quality.yml)
[![Browser Quality](https://github.com/helbertm/hSQLite-Editor/actions/workflows/browser-quality.yml/badge.svg)](https://github.com/helbertm/hSQLite-Editor/actions/workflows/browser-quality.yml)
[![CodeQL](https://github.com/helbertm/hSQLite-Editor/actions/workflows/codeql.yml/badge.svg)](https://github.com/helbertm/hSQLite-Editor/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

hSQLite Editor is a local-first SQLite workspace that runs entirely in the browser. Open a database, write and execute SQL, inspect the schema, explore relationships, edit multiple query tabs, and export results without sending database contents to an application server.

The product is distributed as one standalone `index.html` artifact and is offline-capable in `file://` mode. Runtime dependencies, SQLite WebAssembly, styles, and application code are embedded in that file.

## Try it

- [Open hSQLite Editor](https://helbertm.github.io/hSQLite-Editor/)
- Download the versioned standalone HTML file from the latest [GitHub release](https://github.com/helbertm/hSQLite-Editor/releases/latest) for direct offline use.

## Capabilities

- Open, create, inspect, modify, and save SQLite databases locally.
- Execute multiple SQL statements in an isolated Web Worker with cancellation and elapsed-time feedback.
- Use independent SQL tabs, query history, favorites, file import/export, and keyboard shortcuts.
- Inspect schema objects and insert table or column identifiers into the editor.
- Sort, filter, paginate, select, freeze, move, resize, and export result columns.
- Build SQL visually from declared and session-only virtual relationships in SQL Map.
- Validate virtual-relationship orphan data before accepting a relationship.
- Generate synthetic table data for local QA with transaction rollback and cancellation safety.
- Persist optional session data in browser storage and transfer selected settings as JSON.
- Switch among `en-US`, `pt-BR`, and `es-ES` interface locales.
- Use primary workflows with a keyboard and visible focus under the WCAG 2.2 AA accessibility target.

## Privacy and trust boundary

hSQLite Editor has no application backend and does not intentionally upload databases, queries, history, or settings. Files and browser storage remain on the device unless the user explicitly exports or shares them.

The browser, browser extensions, operating system, downloaded artifact, and files selected by the user remain outside the project's trust boundary. Browser storage is not an encrypted secrets vault. The complete localStorage, IndexedDB, recent-file metadata, clearing, and permission-revocation inventory is in [docs/privacy.md](docs/privacy.md). See [SECURITY.md](SECURITY.md) and [security_posture.md](security_posture.md).

## Browser support

Automated browser validation targets current Chromium releases. The release checklist also requires host-native Chromium and Safari smoke tests against the final standalone artifact through `file://`. Browser-managed file handles and clipboard behavior vary by browser and security context; fallback file inputs and explicit export flows remain available.

## Development

Requirements:

- Node.js 20 or newer
- A current browser

Clone the repository and run:

```sh
npm run validate:full
```

This command runs the static-policy, deterministic contract, artifact/runtime, and approval layers in sequence against both readable and minified artifacts. Browser, security-update, and host-native layers stay explicit because they require different runtimes. See [docs/validation.md](docs/validation.md) for the complete command matrix.

Useful focused commands:

```sh
npm run build
npm run stage:linux
npm run serve:artifact
npm run validate:static
npm run test:contract
npm run validate:source
npm run validate:i18n
npm run validate:accessibility
npm run validate:privacy
npm run validate:artifact
npm run validate:artifact:structure
npm run validate:runtime
npm run validate:runtime:features
npm run validate:release
npm run validate:linux
npm run validate:native:chromium
npm run validate:approval
npm run validate:dependencies
npm run quality:docker
npm run quality:security:docker
```

Do not edit generated `index.html` or `dist/` artifacts manually. Change source under `src/`, then rebuild.

## Architecture

The project is a modular browser monolith:

- `src/core/` owns domain contracts, pure helpers, runtime configuration, and authoritative application state.
- `src/ports/` isolates browser storage, file, clipboard/download, and SQL worker adapters.
- `src/capabilities/` implements product workflows.
- `src/ui/` renders state and binds interaction.
- `src/styles/` contains the design system and responsive feature layouts.
- `scripts/` provides deterministic build, release, and verification commands.
- `vendor/` contains pinned runtime assets with SHA-256 provenance.

The build combines these sources into the standalone artifact without requiring runtime network access. See [docs/architecture.md](docs/architecture.md) for invariants and change policy.

## Localization and accessibility

`en-US` is the fallback locale; the workspace and advanced flows are available in `en-US`, `pt-BR`, and `es-ES`. User-facing text belongs in the central catalogs, and locale-sensitive formatting uses shared `Intl` helpers. See [docs/localization.md](docs/localization.md).

The project targets WCAG 2.2 Level AA. Changes to visible behavior must preserve programmatic names, keyboard operation, focus management, contrast, zoom/reflow behavior, and announcements. See [docs/accessibility.md](docs/accessibility.md).

## Dependencies and releases

SQL.js runtime files are vendored with exact upstream URLs, versions, licenses, and SHA-256 hashes in `vendor/manifest.json`. The CodeMirror 6 editor is built from exact locked npm development dependencies because browsers receive the compiled inline bundle rather than npm packages. Every package in that shipped bundle is recorded in `runtime-components.json`; generation requires the esbuild input graph and lockfile dependency closure to agree. The SPDX SBOM marks both forms as shipped runtime components and also inventories development/release dependencies. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) identifies included software.

Readable and minified artifacts are validated independently. Release automation uses Conventional Commits and release-please. Maintainer steps and GitHub-side controls are documented in [docs/releasing.md](docs/releasing.md).

Linux distributors can consume a deterministic filesystem stage without introducing a second runtime or file-association contract. See [docs/linux-packaging.md](docs/linux-packaging.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [GOVERNANCE.md](GOVERNANCE.md) before contributing. Use [GitHub Discussions](https://github.com/helbertm/hSQLite-Editor/discussions) for usage questions or broad design proposals and the issue forms for reproducible defects and scoped feature requests.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

hSQLite Editor is available under the [MIT License](LICENSE).
