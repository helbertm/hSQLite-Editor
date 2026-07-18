# Linux Packaging

hSQLite Editor remains a browser application distributed as one standalone HTML file. The Linux integration is a packaging satellite: it adds a launcher, desktop entry, AppStream metadata, and icon without creating a second application runtime.

## Contract

- `npm run stage:linux` builds the exact versioned release HTML and creates `dist/linux/hsqlite-editor-<version>/`.
- The staged launcher accepts no file or URL arguments. It resolves the packaged HTML relative to its installed prefix and passes that one path to `xdg-open` as a single argument.
- Launcher diagnostics follow `LC_ALL`, `LC_MESSAGES`, or `LANG` for `pt_BR` and `es_ES`, with English as the fallback.
- The desktop entry declares no MIME type, URL scheme, D-Bus activation, updater, telemetry, file association, `StartupNotify`, or `StartupWMClass`. The launcher delegates to the default browser and therefore must not claim ownership of that browser window or its startup-notification protocol.
- The staged HTML, desktop entry, AppStream metadata, and icon use mode `0644`; only `usr/bin/hsqlite-editor` uses mode `0755`.
- `SHA256SUMS` inside the stage root covers every staged installable file. Timestamps derive from the matching `CHANGELOG.md` release date, not wall-clock time.
- Packaging sources and generated metadata use MIT, the project license authorized for this repository.
- The AppStream release version and date derive from `package.json` and the matching `CHANGELOG.md` heading. `npm run bump:patch` synchronizes them locally; release PRs must pass `npm run validate:linux-metadata`, and `npm run generate:linux-metadata` is the only supported repair command after automated changelog/version updates.

The installed layout is:

```text
usr/bin/hsqlite-editor
usr/share/hsqlite-editor/hsqlite-editor.html
usr/share/applications/io.github.helbertm.hsqlite-editor.desktop
usr/share/doc/hsqlite-editor/LICENSE
usr/share/doc/hsqlite-editor/THIRD_PARTY_NOTICES.md
usr/share/metainfo/io.github.helbertm.hsqlite-editor.metainfo.xml
usr/share/icons/hicolor/scalable/apps/io.github.helbertm.hsqlite-editor.svg
```

Run `npm run validate:linux` before handing the stage tree to a distribution-specific package builder. The command validates a repeated deterministic stage, exact file set, permissions, checksum coverage, launcher argument isolation, desktop-entry invariants, XML structure, localized metadata, and path leakage. On Linux, it also consumes `desktop-file-validate` and `appstreamcli` when those system validators are installed.

`npm run validate:linux:system` is the strict distribution-host gate. It fails when `appstreamcli`, `desktop-file-validate`, or `xdg-open` is absent and rejects pedantic AppStream findings. CI runs it on Ubuntu 24.04 through the `Linux Package / validate` check.

The source metadata follows the freedesktop.org [Desktop Entry](https://specifications.freedesktop.org/desktop-entry/latest-single/), [Icon Theme](https://specifications.freedesktop.org/icon-theme/latest/), and [menu category](https://specifications.freedesktop.org/menu/latest/category-registry.html) specifications. AppStream claims remain intentionally narrower than the browser application's feature set so package catalogs do not imply native integrations that are absent.

## Trust Limits

The repository does not publish a `.deb`, `.rpm`, Flatpak, AppImage, or archive merely by creating the stage tree. Any future binary package is a new release subject and must be added to release checksums, provenance attestations, and SBOM/release-asset verification before publication.

Actual desktop integration remains a host-native Linux gate. A release reviewer must install through the intended package manager, confirm that the launcher opens only the packaged local HTML through the system browser, and record the distribution, desktop environment, browser, package digest, and result. Container validation cannot prove desktop-session behavior.
