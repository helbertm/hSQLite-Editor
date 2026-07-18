# Contributing to hSQLite Editor

Thank you for improving hSQLite Editor. Contributions are reviewed for product value, maintainability, accessibility, privacy, and preservation of the standalone offline artifact.

## Before you start

- Use GitHub Discussions or an issue for broad design changes before investing in implementation.
- Use the security reporting process in [SECURITY.md](SECURITY.md) for vulnerabilities. Do not open a public security issue.
- Keep changes focused. Unrelated refactors make review and regression analysis harder.
- Do not edit generated `index.html` or `dist/` artifacts by hand.

## Development setup

Requirements:

- Node.js 20 or newer
- A current Chromium-based browser for automated browser checks
- Safari on macOS for the native `file://` release smoke test

Run the repository-owned checks:

```sh
npm run validate:source
npm run test:contract
npm run build
npm run validate:artifact
npm run validate:full
```

Use `npm run serve:artifact` to inspect the generated application over loopback. The production contract remains direct `file://` use of the standalone HTML artifact.
The validation layers and their runtime boundaries are documented in [docs/validation.md](docs/validation.md).

## Change requirements

- Add or update tests for changed behavior.
- Keep user-facing copy in the locale catalogs. Do not introduce hard-coded interface strings.
- Preserve keyboard operation and visible focus for every interactive workflow.
- Meet WCAG 2.2 Level AA for changed UI.
- Update `docs/architecture.md` when ownership or runtime boundaries change.
- Update `design_system.md` when a visible pattern or token changes.
- Update `security_posture.md` when security assumptions or controls change.
- Add a `CHANGELOG.md` entry through the release-please workflow; do not manually invent release versions.

## Commit and pull request conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add locale-aware result formatting
fix(grid): preserve focus after sorting
docs: clarify offline release verification
```

Pull requests must explain the problem, the chosen approach, verification performed, accessibility impact, localization impact, and any residual risk. Maintainers may request a smaller change when a proposal combines independent concerns.

## Review standard

Passing automation is necessary but not sufficient. Review also considers data integrity, browser compatibility, error recovery, local-first privacy, performance on large SQLite files, and whether the change keeps the one-file release reproducible.

By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
