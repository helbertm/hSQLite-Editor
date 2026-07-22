# Security Policy

## Supported versions

Security fixes are provided for the latest published release. Older standalone artifacts should be replaced with the current release.

## Reporting a vulnerability

Do not disclose suspected vulnerabilities in public issues, pull requests, or discussions.

Use [GitHub Private Vulnerability Reporting](https://github.com/helbertm/hSQLite-Editor/security/advisories/new). Include affected versions, reproduction steps, impact, and any proposed remediation. Remove personal, confidential, or production database content from reports.

You should receive an acknowledgement within seven days. The maintainers will assess severity, coordinate remediation, and publish an advisory when affected users need to act. Disclosure timing will be agreed with the reporter when practical.

## Security model

hSQLite Editor is a client-side, local-first application. It does not require a backend and does not intentionally upload database contents. Browser APIs, extensions, the host operating system, and files opened by the user remain outside the project's trust boundary.

The standalone artifact embeds its runtime dependencies. Releases are accepted only after source, artifact, vendor-integrity, dependency-advisory, and runtime validation. See [security_posture.md](security_posture.md) for current controls and limits, and [docs/privacy.md](docs/privacy.md) for the exact local data inventory and removal steps.
