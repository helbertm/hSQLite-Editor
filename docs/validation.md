# Validation Layers

hSQLite Editor separates checks by failure ownership. A passing broader layer never overrides a failed focused layer.

## Static policy

Run `npm run validate:static` for source composition, localization ownership, accessibility contracts, privacy documentation, SPDX reproducibility, and workflow syntax. These checks inspect owned files without starting the application.

## Deterministic unit and contract tests

Run `npm run test:contract`. It executes `npm run test:unit` for pure SQL parsing, SQLite type classification, file validation, and authoritative state transitions, then runs the focused settings-import transaction contract. This layer does not build or boot an HTML artifact.

## Artifact and runtime

Run `npm run validate:artifact:structure` to inspect readable artifact composition and embedded dependency integrity. Run `npm run validate:runtime` for the narrow cross-surface contract: boot, database open, one mixed SQL path, and state-preserving database replacement.

Feature-owned VM regressions have separate commands and fresh harness contexts: `npm run validate:runtime:database`, `npm run validate:runtime:library`, `npm run validate:runtime:execution-grid`, and `npm run validate:runtime:sql-map`. `npm run validate:runtime:features` runs those four commands; `npm run validate:runtime:all` runs the cross-surface and feature-owned suites in one command while retaining isolated contexts and suite-attributed output.

After `npm run build:release`, run `npm run validate:release:structure` for minified artifact structure and size, then `npm run validate:release:runtime` for all isolated runtime suites on the exact versioned release file. `npm run validate:artifact` and `npm run validate:release` remain convenience aggregates; evidence should name the focused command and suite that failed or passed.

Run `npm run validate:linux` after the release build to reproduce the Linux filesystem stage twice and verify its exact file set, permissions, checksums, desktop metadata, AppStream metadata, and isolated launcher argument. Actual desktop-session behavior remains a host-native Linux check.

On Ubuntu or another supported Linux build host with `appstreamcli`, `desktop-file-validate`, and `xdg-open`, run `npm run validate:linux:system`. It requires those tools, reruns the deterministic stage, rejects any pedantic AppStream finding, and validates the desktop entry with the distribution tooling. The `Linux Package / validate` workflow owns this gate on Ubuntu 24.04.

## Browser

Run `npm run validate:browser:quality` against the exact served release URL. The matrix owns real Chromium rendering, interaction, responsive reflow, locale behavior, accessible names, downloads, and axe results. `npm run validate:browser:backlog` is a focused real-worker regression command and is not a replacement for the quality matrix.

## Security and reproducibility

Run `npm run validate:dependencies` for blocking current npm advisory status. Run `npm run quality:docker` for the offline/read-only `codex-quality` surface and `npm run quality:security:docker` for update-capable npm and OSV analysis. On a new machine, run `npm run quality:docker:update` once to populate the container cache from the lockfile, then require `npm run quality:docker` to pass with networking disabled. Network or scanner failure blocks an update-capable command.

## Host-native release checks

Native Chromium and Safari checks open the exact versioned artifact through `file://`. They own host browser launch, direct-file boot, zero required network resources, locale selection, overflow, keyboard behavior, and changed assistive-technology spot checks. They are intentionally outside `npm run validate:full` and Docker; release evidence must record the browser version, artifact SHA-256, timestamp, and observed result.

`npm run validate:native:chromium` automates the direct-file boot, remote-request, locale-selector, and horizontal-overflow subset against the installed Chrome channel. Set `HSQLITE_NATIVE_CHROMIUM_CHANNEL` only to select another locally installed Playwright Chromium channel. Native Safari and changed assistive-technology checks remain separate because they require host facilities that the Node dependency graph does not provide.

## Hosted GitHub controls

Run `npm run validate:github-controls` as a separate read-only operator audit. It compares the live repository against `github-controls-policy.json`: active default-branch rules, required checks, Private Vulnerability Reporting, Pages branch and bypass posture, Actions enablement/SHA pinning/default token permissions, repository-level immutable-release enablement, the exact immutable release asset bundle, and attestations whose signed statements match the exact HTML digest and required SLSA provenance/SPDX predicate types. Use a fine-grained read-only `GH_TOKEN` for complete coverage and add `--confirm-pages-admin-bypass-disabled` only after checking the administrator setting in GitHub.

This command is intentionally outside `validate:full`, `validate:full:ci`, and normal pull-request CI. Hosted state is networked, permission-sensitive, and non-deterministic. A missing token or manual confirmation is `UNVERIFIED`, never a pass; verified drift and transport failures use different exit codes so operators do not misclassify access failures as product defects.

## Orchestration

`npm run validate:full` runs static policy, deterministic contracts, readable structure, cross-surface runtime, feature-owned runtime, release structure/runtime, deterministic Linux staging, and approval gates in that order. `npm run validate:full:ci` adds clean-repository checks before and after the same sequence. Browser, security-update, host-native, and hosted GitHub checks remain separate because their environments and failure modes are independent.

Repository-state validation also rejects legacy CodeMirror 5 paths from the Git index. This protects release candidates from staged content that differs from the clean worktree and artifact scans.
