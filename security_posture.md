# Security Posture

## Scope

hSQLite Editor is a static, local-first browser application. It parses user-selected SQLite and SQL files, executes SQLite through an embedded WebAssembly runtime, stores optional preferences/session data in browser storage, and exports files selected by the user.

## Current controls

- No application backend or required telemetry endpoint.
- No required runtime network requests in the standalone artifact.
- SQL work is isolated in a Web Worker and uses request-scoped messages.
- Mutating worker operations adopt database bytes only after success.
- Vendored runtime assets are pinned and verified with SHA-256 digests.
- Vendor updates are copied from exact npm dependencies verified by `package-lock.json`; the updater performs no direct CDN download.
- Release validation checks source composition, artifact integrity, runtime behavior, and readable/minified parity.
- External links use `noopener noreferrer` where a new browsing context is opened.
- `SECURITY.md` defines GitHub Private Vulnerability Reporting as the disclosure channel; GitHub-side enablement is a separate release gate.
- `npm run validate:dependencies` blocks high or critical advisories across the complete lockfile; `npm run quality:security:docker` adds an independent OSV scan in the update-capable `codex-quality` runtime.
- Public persistence and removal behavior is documented in `docs/privacy.md` and protected by `npm run validate:privacy`.
- Linux desktop integration is a deterministic packaging satellite: its launcher accepts no arguments, invokes `xdg-open` without shell evaluation, and is covered by `npm run validate:linux` inside the release-quality runtime.

## Trust limits

- A malicious or compromised browser, extension, operating system, or downloaded artifact can access data outside this project's control.
- Browser storage is local to the browser profile but is not an encrypted secrets vault.
- Users must not assume a database is harmless because it opens successfully.
- GitHub rulesets, required checks, private reporting, Pages settings, and release permissions are repository-host controls and must be audited separately.
- Native Safari `file://` behavior cannot be reproduced inside Docker.

## Release verification

`codex-quality` is required for reproducibility-sensitive security and release review. Resolve it through `CODEX_QUALITY_ROOT`; do not hard-code a host path. `npm run quality:docker` uses the offline/read-only profile for deterministic source, workflow, secret, privacy, and release-policy checks. `npm run quality:security:docker` uses update mode only for current npm and OSV advisory data. Native Safari remains a host-only manual gate.

For deterministic tracked evidence, the SPDX `creationInfo.created` field intentionally records the canonical source-release timestamp: the UTC start of the release date in `CHANGELOG.md`. It is not the wall-clock time at which a particular generator process ran. This explicit policy makes byte-for-byte regeneration possible while preserving the release date that the SBOM describes. The SBOM covers vendored runtime components plus all packages in `package-lock.json`.

## Open hardening work

- Keep release checksums, exact-artifact build-provenance attestations, and SPDX SBOM attestations current.
- Keep the accepted CodeMirror 6 adapter boundary, runtime-component provenance, and exact locked bundle dependencies current.
