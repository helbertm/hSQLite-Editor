# Release Process

1. Confirm the release PR contains the intended version and changelog.
2. Run `npm run generate:linux-metadata` and require `npm run validate:linux-metadata` to pass so AppStream version/date metadata matches the release PR.
3. Run `npm run validate:full:ci` from a clean worktree. The command validates the complete tracked and untracked repository surface before and after the release gate.
4. Run `npm run validate:dependencies`, `npm run quality:docker`, and `npm run quality:security:docker`. The first two validate repo-owned and offline-valid controls; the last command intentionally uses update mode for current npm and OSV advisory data.
5. Inspect both readable `index.html` and minified `dist/hSQLite-Editor-v<version>.html` artifacts.
6. Run the browser locale/accessibility matrix on the generated artifact.
7. Run `npm run validate:native:chromium`, then open the final artifact directly with `file://` in current Safari and complete changed assistive-technology spot checks.
8. Confirm no runtime network request is required and no machine-local path is present.
9. Run `npm run validate:linux`; when publishing a distribution-specific Linux package, complete the host-native installation and desktop-session check defined in [linux-packaging.md](linux-packaging.md).
10. Merge the release PR only after all required GitHub checks pass. Release Please must create the exact tag and a draft release, never a public incomplete release.
11. The publication job rebuilds the created tag, validates the release, creates both attestations, uploads the exact HTML, `sbom.spdx.json`, and `SHA256SUMS` without overwrite semantics, then publishes the draft release last. Any earlier failure must leave the release unpublished as a draft.
12. Verify the GitHub release attachment and Pages deployment match the `hsqlite-editor-v<version>` tag.
13. Run `GH_TOKEN=<read-only-token> npm run validate:github-controls -- --confirm-pages-admin-bypass-disabled` and require exit code `0`.
14. Verify both the provenance and SPDX SBOM attestations cryptographically for the exact HTML artifact.

The exact order and ownership of static, contract, artifact/runtime, browser, security, and host-native checks is defined in [validation.md](validation.md). Do not replace a failed focused layer with a passing broader layer.

`index.html` and `sbom.spdx.json` are tracked, reproducible release evidence. Versioned `dist/` artifacts, `SHA256SUMS`, and the temporary Pages `_site/` tree are generated outputs and must not be committed as release history.

Generate and verify the portable checksum file with `npm run generate:release-checksums` and `npm run validate:release-assets`. After publication, verify provenance with `gh attestation verify dist/hSQLite-Editor-v<version>.html --repo <owner>/<repository>`. Verify the associated SPDX predicate by adding `--predicate-type https://spdx.dev/Document/v2.3`.

Immutable release publication is atomic: create the exact tag and draft, build from that tag, validate, attest, upload the complete asset bundle, then publish. The workflow forbids `--clobber`. If upload is partial or an asset-name conflict occurs, delete and recreate the unpublished draft after diagnosing the cause; never repair a release by overwriting an asset.

The SBOM generator derives `creationInfo.created` from the current version's release date in `CHANGELOG.md`, normalized to `00:00:00Z`. This is an intentional canonical source-release timestamp, not the wall-clock time of a generator process. It is reproducible and must exist before the release gate passes. The SBOM inventories both vendored runtime assets and every locked development/release package.

Repository automation cannot enforce GitHub rulesets, required checks, private vulnerability reporting, environment protection, or trusted publishing. Maintainers must configure and periodically audit those settings in GitHub.

`npm run validate:github-controls` is the read-only operator audit for that hosted state. It uses unauthenticated public reads where GitHub permits them and uses `GH_TOKEN` first, then `GITHUB_TOKEN`, when authenticated reads are required. A full audit token should be fine-grained and read-only for Administration, Actions, Contents, Metadata, and Attestations. The command never mutates GitHub or prints tokens, headers, or raw response bodies. Exit codes are `0` for a complete pass, `1` for a verified policy mismatch, `2` for missing authentication or required operator confirmation, and `3` for transport/runtime failure. The Pages administrator-bypass flag records an operator confirmation and is accepted only when the API also reports bypass disabled.

The default-branch ruleset should require pull requests and seven exact checks: `Quality Gate`, `Linux Package`, `Browser Quality`, `CodeQL Analysis`, the aggregate GitHub Advanced Security `CodeQL` result, `Commit Convention`, and `Dependency Review`. Requiring both CodeQL results ensures that successful analysis upload and the absence of newly detected alerts are independently enforced. Require code-owner review when at least one independent eligible reviewer exists; do not create an unsatisfiable review policy for a single-maintainer repository. Restrict the `github-pages` environment to `master`, disable administrator bypass when governance permits it, enable Private Vulnerability Reporting, and keep the default `GITHUB_TOKEN` read-only unless a job declares narrower write permissions.

The repository setting that permits GitHub Actions to create or approve pull requests must remain enabled while Release Please uses `github.token` to create the release PR. This exception does not grant repository-wide write access: the default token remains read-only, and only the pinned Release Please job declares `contents: write` and `pull-requests: write`. Replacing that exception requires migrating release automation to a separately governed GitHub App or to a manual release-PR process first.
