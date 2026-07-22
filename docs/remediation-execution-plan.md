# Open-Source Remediation Execution Plan

## Objective

Bring hSQLite Editor to a defensible state-of-the-art open-source publication baseline while preserving one local-first browser application and one offline standalone HTML artifact.

This plan is sequential. An item cannot start until the previous item has three independent checks recorded in the evidence report identified by the master formal review.

## Source Reports

- BurleMarx formal review: `8159e6e7-c6bb-4477-8968-06455c0f5f66`
- Da Vinci formal review: `74E3C753-B97F-466C-B9A5-2E17C8969128`
- Angela Jobson formal review: `8dcad054-e431-4029-9e9d-407fa41a374b`
- Linus Swartz formal review: `e4652b54-2459-4417-adef-6282046b90ea`
- Consolidated master review: `5EC55094-5711-47C5-BADE-A5C8C3A40748`

## Transition Protocol

Before item N starts, item N-1 must pass:

1. **Structural check** — source ownership, schema, diff, inventory, or static policy.
2. **Executable contract check** — focused repo-owned deterministic validation.
3. **Independent integration check** — artifact runtime, browser, host-native, security runtime, or post-run cleanliness.

The evidence record must include timestamp, exact command or inspection, exit status, target, interpretation, and trust limits. Repeating one test three times is not a triple check.

## Gate 0 — Formal Review Package

### Deliverables

- Four fresh UUID-based individual reports.
- One UUID-based consolidated report.
- This execution plan.
- One append-only remediation evidence report.

### Exit Criteria

- Every specialist identity, version, mantra, language, artifact folder, and review-only boundary was confirmed before review.
- Every report contains severity, file/line evidence, required actions, and triple-check acceptance criteria.
- The master report references every report UUID and preserves specialist-owned decisions.

## Item 1 — Repository Baseline and Artifact Policy

### Scope

- Define the intended public tracked-file surface.
- Keep `agent-state/`, machine-local `.codex` configuration, caches, dependencies, and generated release history out of public tracking.
- Keep readable `index.html` as tracked generated evidence.
- Keep versioned `dist/` HTML and release checksums as generated release outputs, not source-controlled history.
- Make clean-worktree validation inspect the complete intended delivery surface.
- Align `.gitignore`, build scripts, CI workflows, and release documentation.

### Exit Criteria

- No intended source, workflow, dependency manifest, vendor asset, governance file, or public document is omitted from the tracked baseline.
- `validate:full:ci` has one unambiguous clean-worktree contract.
- A full clean preflight does not leave new tracked or untracked product output.

## Item 2 — Settings Import Integrity

### Scope

- Enforce selected import scopes.
- Validate payload version, allowed keys, object/array types, string sizes, collection sizes, locale/theme values, and tab/session shapes.
- Reject unknown or oversized payloads.
- Apply imports atomically after complete validation.
- Add focused contract tests for scope isolation and failure preservation.

### Exit Criteria

- Import changes only selected scopes.
- Invalid payloads cannot partially mutate storage or runtime state.
- Focused tests cover valid, malformed, oversized, unknown-key, and atomic-failure cases.

## Item 3 — Localization Source of Truth

### Scope

- Make stable keys the only source for user-facing application copy.
- Replace Portuguese source-text translation and `STATIC_SOURCE_KEYS`.
- Add explicit template localization attributes or keyed rendering.
- Return stable worker error/status codes plus interpolation variables.
- Localize boot, status, toast, history, favorites, export, SQL Map, table population, settings, and error-assistance flows.
- Keep user data, SQL identifiers, and SQL text unchanged.

### Exit Criteria

- No release-visible copy depends on Portuguese source fallback.
- All catalog keys and interpolation variables match across `en-US`, `pt-BR`, and `es-ES`.
- Worker-originated errors and advanced flows render in the selected locale.

## Item 4 — SQL Map Accessibility and Help

### Scope

- Give every table and field checkbox a programmatic name tied to visible content.
- Verify focus order, keyboard operation, relation creation, blocked states, and announcements.
- Provide locale-appropriate or language-neutral FK-direction help.

### Exit Criteria

- Accessible names are asserted against a sample database.
- SQL Map has zero serious/critical axe violations when open and populated.
- Keyboard and assistive-technology spot checks announce unambiguous table and field names.

## Item 5 — Localization and Browser Evidence Gates

### Scope

- Make the i18n validator reject direct user-facing strings outside approved catalog files.
- Expand browser tests to close-tab, export, history/favorites, SQL Map, table population, worker errors, and populated results.
- Cover all three locales at desktop and mobile dimensions.
- Cover keyboard paths, zoom/reflow, overflow, accessible names, and locale-specific help destinations.

### Exit Criteria

- Introducing a direct visible string causes `validate:i18n` to fail.
- CI exercises advanced flows rather than shell text only.
- Chromium and host-native Safari evidence references the exact release artifact.

## Item 6 — Security, SBOM, SCA, and Privacy

### Scope

- Use truthful SBOM creation metadata with a documented reproducibility rule.
- Add a blocking repo-owned dependency vulnerability command.
- Integrate offline-valid checks with `codex-quality` and use an update-capable advisory fetch only where required.
- Keep scanner scope limited to owned files.
- Document localStorage, IndexedDB, recent metadata, file handles, and clearing/revocation steps.

### Exit Criteria

- SBOM timestamp policy is truthful, documented, and validated.
- Dependency vulnerability status is a blocking release signal.
- Public privacy/security docs enumerate exact persistence categories and removal controls.

## Item 7 — Validation Stratification

### Scope

- Add a narrow deterministic contract/unit layer for pure logic and state transitions.
- Split the monolithic runtime smoke harness by ownership or reduce it to cross-surface scenarios.
- Keep static, unit/contract, artifact/runtime, browser, security, and host-only checks distinct.
- Give each layer stable repo-owned commands.

### Exit Criteria

- Triple checks use independent layers rather than repeated broad smoke tests.
- Failures identify the responsible layer.
- Full validation remains deterministic and documented.

## Item 8 — Maintained Editor Runtime

### Scope

- Record an ADR for editor-runtime migration under the offline single-file constraint.
- Replace archived CodeMirror 5 with a maintained editor runtime.
- Preserve SQL syntax support, shortcuts, find/replace, selection, accessibility naming, themes, and artifact embedding.
- Remove obsolete vendored files and compatibility branches.

### Exit Criteria

- No archived CodeMirror 5 runtime ships in package metadata, vendor manifest, or generated artifact.
- Editor contract tests and browser keyboard tests pass.
- One-file offline behavior remains unchanged.

## Item 9 — Legacy Seam Reduction

### Scope

- Replace ordered global composition with a build-time module graph while preserving one artifact.
- Split the root DOM registry by surface.
- Split core state contracts by domain without creating competing sources of truth.
- Split CSS by tokens/components/features and remove chronological beta-fix narration.
- Keep runtime smoke and source validation aligned with the new module boundaries.

### Exit Criteria

- Source composition no longer relies on broad implicit globals.
- Ownership is narrower and documented.
- Build, artifact, runtime, browser, and security gates remain green.

## Item 10 — External Release Controls

### Scope

- Audit GitHub branch protection/rulesets, required checks, code-owner review, Private Vulnerability Reporting, Pages environment protection, Actions permissions, and release attestation behavior.
- Run native Chromium and Safari `file://` release smoke.
- Record checksums, SPDX SBOM, and provenance attestation for the exact artifact.

### Exit Criteria

- GitHub-side settings are recorded as verified or explicitly blocked with owner and evidence.
- Final standalone HTML opens without network requirements in Chromium and Safari.
- Release assets and attestations match the tagged version.

## Final Double-Check

### Pass 1 — Code and Product Quality

- Inspect all touched code for duplication, dead compatibility code, naming drift, accessibility regressions, localization drift, oversized growth, and documentation mismatch.
- Implement every bounded improvement that is justified by evidence.
- Reopen and triple-check any affected item.

### Pass 2 — Release and Trust

- Run the clean-worktree full gate.
- Run `codex-quality`, blocking SCA, artifact/runtime validation, the three-locale browser matrix, and host-native file checks.
- Confirm the repository remains clean and the evidence report is complete.

## Stop Conditions

- Do not claim completion while a previous item lacks three independent checks.
- Do not classify GitHub configuration absence as a source-code defect.
- Do not classify browser harness instability as a product defect without independent reproduction.
- Do not preserve compatibility code merely because it is old; preserve it only when a current contract requires it.
