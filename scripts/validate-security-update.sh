#!/usr/bin/env bash
set -euo pipefail

npm run validate:dependencies
osv-scanner scan --lockfile=package-lock.json
