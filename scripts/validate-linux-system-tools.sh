#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "${repository_root}"

for tool in appstreamcli desktop-file-validate xdg-open; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    printf 'Required Linux packaging tool is missing: %s\n' "${tool}" >&2
    exit 69
  fi
done

printf 'Node.js: '
node --version
appstreamcli --version
desktop-file-validate --version

node scripts/validate-linux-package.mjs
node scripts/stage-linux-release.mjs

stage_root="dist/linux/hsqlite-editor-$(node -p 'require("./package.json").version')"
desktop_file="${stage_root}/usr/share/applications/io.github.helbertm.hsqlite-editor.desktop"
metainfo_file="${stage_root}/usr/share/metainfo/io.github.helbertm.hsqlite-editor.metainfo.xml"

desktop-file-validate "${desktop_file}"
if ! appstream_report="$(appstreamcli validate --no-net --pedantic --format yaml "${metainfo_file}")"; then
  printf '%s\n' "${appstream_report}" >&2
  exit 1
fi
if [[ -n "${appstream_report}" ]]; then
  printf 'AppStream pedantic validation emitted findings:\n%s\n' "${appstream_report}" >&2
  exit 1
fi

printf 'Linux system-tool validation passed with desktop-file-validate and pedantic AppStream checks.\n'
