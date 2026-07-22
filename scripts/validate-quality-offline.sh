#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${CODEX_QUALITY_WORKDIR:-}" ]]; then
  source_root="${CODEX_QUALITY_WORKDIR}"
  validation_root="$(mktemp -d "${CODEX_QUALITY_REPORTS_DIR:-/reports}/hsqlite-editor-validation.XXXXXX")"
  trap 'rm -rf "${validation_root}"' EXIT
  tar -C "${source_root}" \
    --exclude='./.git' \
    --exclude='./agent-state' \
    --exclude='./dist' \
    --exclude='./node_modules' \
    -cf - . | tar -C "${validation_root}" -xf -
  cd "${validation_root}"
  if [[ "${CODEX_QUALITY_NETWORK_MODE:-offline}" == "offline" ]]; then
    npm ci --offline --cache /cache/npm
  else
    npm ci --cache /cache/npm
  fi
fi

npm run validate:quality:offline
actionlint .github/workflows/*.yml

for target in .github docs packaging portable scripts src CHANGELOG.md CODE_OF_CONDUCT.md CONTRIBUTING.md GOVERNANCE.md LICENSE README.md SECURITY.md SUPPORT.md THIRD_PARTY_NOTICES.md design_system.md index.html package.json package-lock.json runtime-components.json sbom.spdx.json security_posture.md vendor/manifest.json; do
  gitleaks dir "${target}" --no-banner --no-color --redact
done
