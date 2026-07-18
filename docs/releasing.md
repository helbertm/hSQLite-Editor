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
10. Merge the release PR only after all required GitHub checks pass.
11. Verify the GitHub release attachment and Pages deployment match the `hsqlite-editor-v<version>` tag.
12. Verify `SHA256SUMS` and `sbom.spdx.json` are attached to the release, and verify both the provenance and SPDX SBOM attestations for the exact HTML artifact.

The exact order and ownership of static, contract, artifact/runtime, browser, security, and host-native checks is defined in [validation.md](validation.md). Do not replace a failed focused layer with a passing broader layer.

`index.html` and `sbom.spdx.json` are tracked, reproducible release evidence. Versioned `dist/` artifacts, `SHA256SUMS`, and the temporary Pages `_site/` tree are generated outputs and must not be committed as release history.

Generate and verify the portable checksum file with `npm run generate:release-checksums` and `npm run validate:release-assets`. After publication, verify provenance with `gh attestation verify dist/hSQLite-Editor-v<version>.html --repo <owner>/<repository>`. Verify the associated SPDX predicate by adding `--predicate-type https://spdx.dev/Document/v2.3`.

The SBOM generator derives `creationInfo.created` from the current version's release date in `CHANGELOG.md`, normalized to `00:00:00Z`. This is an intentional canonical source-release timestamp, not the wall-clock time of a generator process. It is reproducible and must exist before the release gate passes. The SBOM inventories both vendored runtime assets and every locked development/release package.

Repository automation cannot enforce GitHub rulesets, required checks, private vulnerability reporting, environment protection, or trusted publishing. Maintainers must configure and periodically audit those settings in GitHub.

The default-branch ruleset should require pull requests and the repository-owned `Quality Gate / validate`, `Linux Package / validate`, `Browser Quality / locale-accessibility`, `CodeQL / Analyze JavaScript`, `Commit Convention Check / conventional-commits`, and `Dependency Review / dependency-review` checks. Require code-owner review when at least one independent eligible reviewer exists; do not create an unsatisfiable review policy for a single-maintainer repository. Restrict the `github-pages` environment to `master`, disable administrator bypass when governance permits it, enable Private Vulnerability Reporting, and keep the default `GITHUB_TOKEN` read-only unless a job declares narrower write permissions.
