#!/usr/bin/env bash
set -euo pipefail

: "${CODEX_QUALITY_ROOT:?Set CODEX_QUALITY_ROOT to the standalone codex-quality directory.}"

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
MODE="${1:-verify}"

case "${MODE}" in
  verify)
    exec "${CODEX_QUALITY_ROOT}/bin/run-verify" "${REPOSITORY_ROOT}" -- bash scripts/validate-quality-offline.sh
    ;;
  security)
    exec "${CODEX_QUALITY_ROOT}/bin/run-update" "${REPOSITORY_ROOT}" -- bash scripts/validate-security-update.sh
    ;;
  bootstrap)
    exec "${CODEX_QUALITY_ROOT}/bin/run-update" "${REPOSITORY_ROOT}" -- bash scripts/validate-quality-offline.sh
    ;;
  *)
    printf 'Usage: %s [verify|security|bootstrap]\n' "$0" >&2
    exit 64
    ;;
esac
