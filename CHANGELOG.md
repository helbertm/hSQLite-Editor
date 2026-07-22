# Changelog

## [0.3.143](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.142...hsqlite-editor-v0.3.143) (2026-06-12)

### Initial Open-Source Release

* ship the local-first SQLite workspace as a standalone, offline-capable HTML application with no application backend
* provide complete interface translations in English, Brazilian Portuguese, and Spanish, targeting WCAG 2.2 AA accessibility
* establish reproducible, verifiable releases with pinned runtime component sources, an SPDX software bill of materials (SBOM), checksums, and build attestations

### Features

* replace the query-history load label with an icon-only action button while preserving hover hint and accessibility labeling

## [0.3.142](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.141...hsqlite-editor-v0.3.142) (2026-06-12)

### Features

* compact the query-history favorite/load actions into a horizontal layout with a dedicated square favorite control

## [0.3.141](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.140...hsqlite-editor-v0.3.141) (2026-06-12)

### Features

* expand SQL Map natural-FK drag suggestions to accepted naming families such as id, uuid, *_id, *_uuid, cod*, and codigo*

## [0.3.140](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.139...hsqlite-editor-v0.3.140) (2026-06-12)

### Features

* highlight natural virtual-FK destination suggestions during SQL Map field drag when other tables expose the same field name and type class

## [0.3.139](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.138...hsqlite-editor-v0.3.139) (2026-06-12)

### Features

* change SQL Map virtual-FK drag affordance so the source field itself floats with the pointer instead of rendering a provisional line

## [0.3.138](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.137...hsqlite-editor-v0.3.138) (2026-06-12)

### Features

* block virtual FK creation on SQL Map orphaned data with diagnostic SQL, and add a provisional drag edge with explicit allowed/caution/blocked target feedback

## [0.3.137](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.136...hsqlite-editor-v0.3.137) (2026-06-12)

### Features

* record direct native Safari `file://` verification evidence in the completion audits and close the final offline-contract review gap

## [0.3.136](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.135...hsqlite-editor-v0.3.136) (2026-06-12)

### Features

* document a repo-owned native `file://` verification checklist so the remaining offline-proof gap is explicit and operationally bounded

## [0.3.135](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.134...hsqlite-editor-v0.3.135) (2026-06-11)

### Features

* remove the extra `src/app` layer by consolidating orchestration and feature modules under `src/capabilities`, aligning the source tree to the four-layer architecture contract

## [0.3.134](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.133...hsqlite-editor-v0.3.134) (2026-06-11)

### Features

* record stronger browser-level approval evidence for the generated artifact and document the current browser-runtime CodeMirror typing limitation as harness scope, not product behavior

## [0.3.133](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.132...hsqlite-editor-v0.3.133) (2026-06-11)

### Features

* move SQL tab shuffled-name allocation into the explicit tab state contract instead of leaving it in a hidden module-local runtime variable

## [0.3.132](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.131...hsqlite-editor-v0.3.132) (2026-06-11)

### Features

* move embedded runtime config, live SQLite runtime cache, and SQL Map drag-hover runtime out of `src/core/10-state.js`, further shrinking the remaining core state surface

## [0.3.131](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.130...hsqlite-editor-v0.3.131) (2026-06-11)

### Features

* add a repo-owned approval-gate validator, wire it into the release flow, and tighten docs/audit drift around the open-source approval contract

## [0.3.130](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.129...hsqlite-editor-v0.3.130) (2026-06-11)

### Features

* move tab-name presets and several domain constant catalogs out of `src/core/10-state.js` into feature-scoped source files, reducing the remaining core god-file surface

## [0.3.129](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.128...hsqlite-editor-v0.3.129) (2026-06-11)

### Features

* split the large UI binding block into feature-scoped modules so `src/ui/80-bindings.js` remains a thin post-boot composition entrypoint

## [0.3.128](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.127...hsqlite-editor-v0.3.128) (2026-06-11)

### Features

* move browser file-picker and persisted file-handle adapters into `src/ports/30-file-access.js`, removing raw `showOpenFilePicker()` and IndexedDB handle-store code from DB session modules

## [0.3.127](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.126...hsqlite-editor-v0.3.127) (2026-06-11)

### Features

* move visible SQL execution/export runtime state into `appState.runtime` and relocate non-serializable worker/timer handles into an explicit app runtime helper instead of leaving them in the core state module

## [0.3.126](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.125...hsqlite-editor-v0.3.126) (2026-06-11)

### Features

* move editor quick-history selection and SQL find/replace state into `appState.editor`, reducing more of the old monolithic runtime authority outside the central state container

## [0.3.125](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.124...hsqlite-editor-v0.3.125) (2026-06-11)

### Features

* move SQL tab control flags and deferred SQL-file execution intent into `appState`, reducing remaining UI/runtime authority outside the central state model

## [0.3.124](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.123...hsqlite-editor-v0.3.124) (2026-06-11)

### Features

* move embedded SQL worker creation/disposal into `src/ports/20-sql-worker.js`, so SQL execution orchestration no longer owns browser worker adapter construction inline

## [0.3.123](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.122...hsqlite-editor-v0.3.123) (2026-06-11)

### Features

* move browser persistence keys, migrations, and helper storages out of the core state module into `src/ports/05-storage.js`, keeping the single-file offline artifact contract intact

## [0.3.122](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.121...hsqlite-editor-v0.3.122) (2026-06-11)

### Features

* move persisted session/tab-preset/schema preference ownership into `appState.preferences` instead of leaving those values in free-floating globals

## [0.3.121](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.120...hsqlite-editor-v0.3.121) (2026-06-11)

### Features

* formalize the active SQLite connection as an explicit runtime cache and move canonical SQL Map state into `appState`, leaving only drag/hover interaction data outside the central state container

## [0.3.120](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.119...hsqlite-editor-v0.3.120) (2026-06-11)

### Features

* move loaded schema ownership into `appState` and remove schema globals from the core runtime contract

## [0.3.119](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.118...hsqlite-editor-v0.3.119) (2026-06-11)

### Features

* preserve the active session when direct file-input DB selection fails, cover that path in runtime smoke, and formalize accepted deferred work in a repo backlog

## [0.3.118](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.117...hsqlite-editor-v0.3.118) (2026-06-11)

### Features

* remove the tab-action button backgrounds and harden runtime smoke coverage for generated empty-database execution

## [0.3.117](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.116...hsqlite-editor-v0.3.117) (2026-06-11)

### Features

* extend runtime smoke so the visible `Novo` flow is proven through SQL execution, schema refresh, result rendering, and export enablement inside the generated empty database

## [0.3.116](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.115...hsqlite-editor-v0.3.116) (2026-06-11)

### Features

* harden source validation so the empty generated-database exception cannot leak into normal SQLite file-validation paths

## [0.3.115](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.114...hsqlite-editor-v0.3.115) (2026-06-11)

### Features

* make mixed multi-statement execution activate the first tabular result set by default so export actions stay enabled when the final visible result is a table

## [0.3.114](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.113...hsqlite-editor-v0.3.114) (2026-06-11)

### Features

* record real-browser proof that the generated empty-database flow can execute SQL, update schema, and render query results on the served artifact

## [0.3.113](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.112...hsqlite-editor-v0.3.113) (2026-06-11)

### Features

* fix the visible “Novo banco” flow so editor-generated empty databases are accepted, and add repo-owned smoke coverage for that path

## [0.3.112](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.111...hsqlite-editor-v0.3.112) (2026-06-11)

### Features

* add a repo-owned loopback artifact server for real-browser verification and document that review path as part of the approval workflow

## [0.3.111](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.110...hsqlite-editor-v0.3.111) (2026-06-11)

### Features

* record first real-browser loopback verification of the generated artifact and fold that evidence into the open-source approval audit

## [0.3.110](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.109...hsqlite-editor-v0.3.110) (2026-06-11)

### Features

* harden source, artifact, and runtime validation so SQL tab rename and close actions cannot regress to inherited generic button styling

## [0.3.109](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.108...hsqlite-editor-v0.3.109) (2026-06-11)

### Features

* remove the residual button-style background from SQL tab rename and close actions so both controls render as clean inline icons inside the tab

## [0.3.108](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.107...hsqlite-editor-v0.3.108) (2026-06-11)

### Features

* extend runtime smoke evidence to cover recent-database UI reopen, validating that clicking the rendered `Abrir` action reopens a handle-backed session through the visible list path

## [0.3.107](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.106...hsqlite-editor-v0.3.107) (2026-06-11)

### Features

* extend runtime smoke evidence to cover SQL Map PNG export, validating that the real export path emits a downloadable `mapa-sql-der-*.png` artifact

## [0.3.106](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.105...hsqlite-editor-v0.3.106) (2026-06-11)

### Features

* extend runtime smoke evidence to cover SQL Map copy behavior through the real action button, including clipboard writes and explicit status feedback

## [0.3.105](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.104...hsqlite-editor-v0.3.105) (2026-06-11)

### Features

* fix the SQL Map paste delegation bug and extend runtime smoke evidence to cover normal paste plus clear-and-paste replacement into the active editor tab

## [0.3.104](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.103...hsqlite-editor-v0.3.104) (2026-06-11)

### Features

* extend runtime smoke evidence to cover result-grid column resizing through the real resize handle, including persisted width updates and transient resize affordances

## [0.3.103](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.102...hsqlite-editor-v0.3.103) (2026-06-11)

### Features

* extend runtime smoke evidence to cover query-history search and replay behavior, including filtered empty states and loading stored SQL back into the active tab

## [0.3.102](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.101...hsqlite-editor-v0.3.102) (2026-06-11)

### Features

* extend runtime smoke evidence to cover SQL-tab lifecycle behavior, including new-tab activation and close confirmation with preview when a tab still contains SQL content

## [0.3.101](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.100...hsqlite-editor-v0.3.101) (2026-06-11)

### Features

* extend runtime smoke evidence to cover schema-to-editor insertion, including field click insertion of `table.column` and Ctrl/Cmd+click insertion of the object name

## [0.3.100](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.99...hsqlite-editor-v0.3.100) (2026-06-11)

### Features

* extend runtime smoke evidence to cover SQL Map field drag/drop relation creation, including source/target affordances and virtual-relationship creation through the UI interaction path

## [0.3.99](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.98...hsqlite-editor-v0.3.99) (2026-06-11)

### Features

* extend runtime smoke evidence to cover result-grid column drag/drop reorder behavior, including persistence back into the active result set and real status feedback

## [0.3.98](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.97...hsqlite-editor-v0.3.98) (2026-06-11)

### Features

* extend runtime smoke evidence to cover SQL-tab drag/drop reorder behavior and strengthen the fake DOM event/query surface needed to prove dynamic shell interactions

## [0.3.97](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.96...hsqlite-editor-v0.3.97) (2026-06-11)

### Features

* extend runtime smoke evidence to cover local picker opening plus recent-handle reopen flows, including granted permission reset behavior and denied permission preservation/warning behavior

## [0.3.96](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.95...hsqlite-editor-v0.3.96) (2026-06-11)

### Features

* remove the remaining inherited hover, focus, and active background styling from SQL tab rename and close controls so the actions render as clean inline icons

## [0.3.95](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.94...hsqlite-editor-v0.3.95) (2026-06-11)

### Features

* harden SQL execution cancellation so interrupting the worker resolves cleanly without hanging the execution flow, then prove cancellation behavior in the runtime smoke and sync the maintainer docs/audit

## [0.3.94](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.93...hsqlite-editor-v0.3.94) (2026-06-11)

### Features

* extend runtime smoke evidence to cover schema render/filter/reset behavior and multi-statement execution result-set handling, then sync the maintainer docs and approval audit to that stronger proof surface

## [0.3.93](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.92...hsqlite-editor-v0.3.93) (2026-06-11)

### Features

* reconcile the operating context and approval audit with the stronger runtime-smoke evidence now in place, while explicitly preserving browser-level verification as the remaining major approval gap

## [0.3.92](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.91...hsqlite-editor-v0.3.92) (2026-06-11)

### Features

* extend runtime smoke evidence to cover recent-database render/clear behavior and multi-version release-history badge expansion, and sync the maintainer docs/audit to that stronger proof surface

## [0.3.91](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.90...hsqlite-editor-v0.3.91) (2026-06-10)

### Features

* remove the hover/focus background fill from SQL tab rename and close controls so the inline tab actions read as icon affordances instead of mini buttons

## [0.3.90](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.89...hsqlite-editor-v0.3.90) (2026-06-10)

### Features

* register a backlog item for a QA-oriented synthetic data seeding workflow with per-column generation rules and bulk row-count control for performance testing

## [0.3.89](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.88...hsqlite-editor-v0.3.89) (2026-06-10)

### Features

* keep the portable inline badge generic while documenting and shipping a `compact notification count` variant for tighter header-style notification badges

## [0.3.88](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.87...hsqlite-editor-v0.3.88) (2026-06-10)

### Features

* register backlog items for virtual-FK orphan-data validation with diagnostic SQL output and for richer drag feedback while creating virtual relationships in the SQL Map

## [0.3.87](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.86...hsqlite-editor-v0.3.87) (2026-06-10)

### Features

* reduce the Novidades count badge footprint and lift it slightly so the notification count reads more like a classic badge

## [0.3.86](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.85...hsqlite-editor-v0.3.86) (2026-06-10)

### Features

* publish a detached portable inline-badge component folder with standalone CSS, JS, example HTML, and full markdown documentation for reuse in other projects

## [0.3.85](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.84...hsqlite-editor-v0.3.85) (2026-06-10)

### Features

* extract a reusable inline badge component with `dot` and `count` modes plus configurable tones, and migrate the Novidades button to the numeric release-count variant

## [0.3.84](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.83...hsqlite-editor-v0.3.84) (2026-06-10)

### Features

* bring the Novidades notification dot slightly closer to the label and enlarge it again for final visual evaluation

## [0.3.83](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.82...hsqlite-editor-v0.3.83) (2026-06-10)

### Features

* slightly enlarge the Novidades notification dot now that the generic 16x16 override no longer distorts its real rendered size

## [0.3.82](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.81...hsqlite-editor-v0.3.82) (2026-06-10)

### Features

* stop the generic hidden-icon button rule from forcing the Novidades badge back to 16x16 so the release indicator can finally render at its intended fixed size

## [0.3.81](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.80...hsqlite-editor-v0.3.81) (2026-06-10)

### Features

* fix the Novidades badge sizing contract by rendering the indicator as a true fixed-size box instead of an inline text-sized span

## [0.3.80](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.79...hsqlite-editor-v0.3.80) (2026-06-10)

### Features

* simplify the Novidades indicator into a static low-noise notification dot with dedicated spacing so the label remains visually dominant

## [0.3.79](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.78...hsqlite-editor-v0.3.79) (2026-06-10)

### Features

* reduce the visual weight of the Novidades update badge so it reads as a subtle notification dot instead of a competing action chip

## [0.3.78](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.77...hsqlite-editor-v0.3.78) (2026-06-10)

### Features

* remove the release badge overlay from the Novidades label and keep header actions from shrinking so the update indicator occupies its own layout space
## [0.3.77](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.76...hsqlite-editor-v0.3.77) (2026-06-10)

### Features

* reserve dedicated space for the release badge inside the Novidades button so the indicator no longer overlaps the label
## [0.3.76](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.75...hsqlite-editor-v0.3.76) (2026-06-10)

### Features

* move the release-update badge out of the label area and soften its pulse so the header indicator reads as a corner notification instead of competing with the Novidades text

## [0.3.75](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.74...hsqlite-editor-v0.3.75) (2026-06-10)

### Features

* refine header-action visual hierarchy with a smaller animated release badge, normalized icon spacing, and move the recent-database clear action into the contextual recent-files modal
## [0.3.74](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.73...hsqlite-editor-v0.3.74) (2026-06-10)

### Features

* extend the runtime smoke harness to prove mutating SQL execution updates in-memory bytes and dirty-state signals, and update the maintainer guide plus approval audit to reflect that stronger mutation-flow evidence

## [0.3.73](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.72...hsqlite-editor-v0.3.73) (2026-06-10)

### Features

* extend the runtime smoke harness to prove critical grid-state transitions after the refactor, and update the maintainer guide plus approval audit to reflect that stronger result-grid evidence

## [0.3.72](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.71...hsqlite-editor-v0.3.72) (2026-06-10)

### Features

* extend the runtime smoke harness to prove settings-transfer export/import behavior, and update the maintainer guide plus approval audit to reflect that stronger configuration-portability evidence

## [0.3.71](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.70...hsqlite-editor-v0.3.71) (2026-06-10)

### Features

* extend the runtime smoke harness to prove SQL Map join generation through declared and virtual relationships, and update the maintainer guide plus approval audit to reflect that stronger SQL Map evidence

## [0.3.70](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.69...hsqlite-editor-v0.3.70) (2026-06-10)

### Features

* harden artifact validation so embedded release metadata, versioned offline help, and current release notes must stay synchronized across readable and minified standalone artifacts

## [0.3.69](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.68...hsqlite-editor-v0.3.69) (2026-06-10)

### Features

* extend the runtime smoke harness to prove favorites persistence/render/clear behavior, and update the maintainer guide plus approval audit to reflect that stronger favorites-state evidence

## [0.3.68](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.67...hsqlite-editor-v0.3.68) (2026-06-10)

### Features

* extend the runtime smoke harness to prove CSV/JSON result export behavior and update the maintainer guide plus approval audit to reflect that stronger export-flow evidence

## [0.3.67](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.66...hsqlite-editor-v0.3.67) (2026-06-10)

### Features

* extend the runtime smoke harness to prove query-history persistence/render/clear behavior, and update the maintainer guide plus approval audit to reflect that stronger history-state evidence

## [0.3.66](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.65...hsqlite-editor-v0.3.66) (2026-06-10)

### Features

* extend the runtime smoke harness to prove per-tab SQL/result isolation across tab switches, and update the maintainer guide plus approval audit to reflect that stronger tab state evidence

## [0.3.65](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.64...hsqlite-editor-v0.3.65) (2026-06-10)

### Features

* remove leftover dead helpers from the migration path, including unused runtime changelog parsers and an obsolete SQLite file-validation wrapper, and make source validation reject those stale patterns if they reappear

## [0.3.64](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.63...hsqlite-editor-v0.3.64) (2026-06-10)

### Features

* extend the runtime smoke harness to prove offline release metadata rendering from embedded bootstrap data, and update the maintainer guide plus approval audit to reflect that stronger release-trust evidence

## [0.3.63](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.62...hsqlite-editor-v0.3.63) (2026-06-10)

### Features

* extend the runtime smoke harness to prove tab/grid state resets on valid DB replacement and state preservation on invalid replacement, and update the maintainer-facing audit/docs to reflect that stronger DB-switch evidence

## [0.3.62](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.61...hsqlite-editor-v0.3.62) (2026-06-10)

### Features

* strengthen the repo-owned runtime smoke harness so it now verifies post-boot theme/session flows plus valid and invalid in-memory DB switching invariants, and document that stronger executable evidence in the maintainer guide and approval audit

## [0.3.61](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.60...hsqlite-editor-v0.3.61) (2026-06-10)

### Features

* refresh the operating-context and approval-audit records to match the implemented standalone build/release pipeline, and fail source validation if repo-adjacent project thinking drifts back to stale migration-era assumptions or leaks machine-local paths

## [0.3.60](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.59...hsqlite-editor-v0.3.60) (2026-06-10)

### Features

* enforce the post-boot shell-binding contract in source validation so future refactors cannot silently reintroduce early shortcut/theme/session wiring before `bootApp()` completes

## [0.3.59](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.58...hsqlite-editor-v0.3.59) (2026-06-10)

### Features

* delay interactive shell bindings until `bootApp()` finishes so theme/session/shortcut controls cannot fire against partially initialized controllers during standalone artifact startup

## [0.3.58](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.57...hsqlite-editor-v0.3.58) (2026-06-10)

### Features

* unify SQLite payload validation and runtime database creation for both file-based and generated-byte flows, so invalid candidates are rejected before any visible session reset and internal database creation follows one shared contract

## [0.3.57](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.56...hsqlite-editor-v0.3.57) (2026-06-10)

### Features

* add repo-owned full release-gate commands for local and CI use, wire GitHub workflows to the CI variant, and document the difference between normal full validation and the stricter committed-artifact verification path

## [0.3.56](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.55...hsqlite-editor-v0.3.56) (2026-06-10)

### Features

* document `appState` as the canonical runtime contract in the maintainer guide and harden source validation so legacy mirror-state globals or old sync-back patterns cannot silently re-enter the core state module

## [0.3.55](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.54...hsqlite-editor-v0.3.55) (2026-06-10)

### Features

* move result-grid ownership under `appState.grid`, replace direct reads of mirrored grid globals across filtering, sorting, pagination, selection, resizing, export, SQL execution, and tab/result synchronization, and keep the generated standalone artifact passing runtime smoke after the state-contract shift

## [0.3.54](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.53...hsqlite-editor-v0.3.54) (2026-06-10)

### Features

* move SQL tab ownership under `appState.tabs`, replace remaining direct reads of mirrored tab globals in tab lifecycle/render/storage flows, and route first-run rename, DB-session reset, and editor-change persistence through the centralized tabs contract

## [0.3.53](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.52...hsqlite-editor-v0.3.53) (2026-06-10)

### Features

* move database session ownership under `appState`, replace remaining free-floating db-session globals with explicit selectors, and route SQL execution, dirty-state UI, SQL Map storage, and database export flows through the centralized session contract

## [0.3.52](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.51...hsqlite-editor-v0.3.52) (2026-06-10)

### Features

* move release metadata, query history, and favorites under appState-backed ownership so these surfaces no longer depend on free-floating mirror variables, tightening source-of-truth integrity without a high-risk full-state rewrite

## [0.3.51](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.50...hsqlite-editor-v0.3.51) (2026-06-10)

### Features

* add a repo-owned runtime smoke validator that executes the embedded boot payload and app code for both the readable and minified standalone artifacts, turning bootstrap readiness into a real release gate instead of a static-only assumption

## [0.3.50](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.49...hsqlite-editor-v0.3.50) (2026-06-10)

### Features

* fail source and artifact validation when public docs or generated releases leak machine-local absolute paths, reinforcing open-source release hygiene as a hard gate instead of a reviewer-only warning

## [0.3.49](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.48...hsqlite-editor-v0.3.49) (2026-06-10)

### Features

* add an explicit bootstrap surface with retry/failure locking, remove leaked machine-local paths from public docs, and make Pages/release workflows enforce the repo-owned validation and build pipeline before publish

## [0.3.48](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.47...hsqlite-editor-v0.3.48) (2026-06-10)

### Features

* make source build ordering explicit through a repo-owned manifest and move remaining startup-side-effect bindings behind explicit init/bind functions so bootstrap discipline no longer depends on incidental file evaluation

## [0.3.47](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.46...hsqlite-editor-v0.3.47) (2026-06-10)

### Features

* harden bootstrap sequencing so editor startup awaits runtime initialization and boot failures enter one explicit degraded state instead of leaving the shell partially initialized

## [0.3.46](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.45...hsqlite-editor-v0.3.46) (2026-06-10)

### Features

* split query history, favorites, and settings-transfer behavior into focused modules so history and configuration workflows are reviewable without one mixed-responsibility file

## [0.3.45](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.44...hsqlite-editor-v0.3.45) (2026-06-10)

### Features

* split the SQL Map subsystem into focused core, graph/layout, render, and interaction modules so the schema-map feature is reviewable without one giant mixed-responsibility file

## [0.3.44](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.43...hsqlite-editor-v0.3.44) (2026-06-10)

### Features

* split the editor workflow into dedicated quick-history, file/drop workflow, and editor-action modules so editor behavior is reviewable without one mixed-responsibility file

## [0.3.43](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.42...hsqlite-editor-v0.3.43) (2026-06-10)

### Features

* split the database session flow into dedicated recent-storage, session-runtime, and file-validation modules so database switching and file-opening responsibilities are reviewable in isolation

## [0.3.42](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.41...hsqlite-editor-v0.3.42) (2026-06-10)

### Features

* split the SQL tab subsystem into dedicated storage, state/lifecycle, and render/interaction modules so tab behavior is reviewable without one mixed-responsibility source file

## [0.3.41](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.40...hsqlite-editor-v0.3.41) (2026-06-10)

### Features

* split the oversized results UI into focused source modules for state/filtering, toolbar rendering, table interactions, and export flows while preserving the standalone offline artifact contract

## [0.3.40](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.39...hsqlite-editor-v0.3.40) (2026-06-10)

### Features

* move shell bootstrap execution to the end of startup to stop temporal-dead-zone regressions, and replace runtime SQL splitter serialization with build-embedded shared worker source

## [0.3.39](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.38...hsqlite-editor-v0.3.39) (2026-06-10)

### Features

* remove remaining in-place grid state mutations from the results UI and extend source validation so selection, sorting, and column-width state must keep flowing through immutable updates

## [0.3.38](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.37...hsqlite-editor-v0.3.38) (2026-06-10)

### Features

* group UI event wiring by feature area so startup bindings are reviewable by domain instead of one long top-level block

## [0.3.37](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.36...hsqlite-editor-v0.3.37) (2026-06-10)

### Features

* enforce a source-level guardrail against direct mutation of critical runtime state outside the core state module and route dirty-session updates through the central db-session setter

## [0.3.36](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.35...hsqlite-editor-v0.3.36) (2026-06-10)

### Features

* turn inline JavaScript syntax validation into a built-in artifact gate so readable and minified standalone releases fail before shipping malformed embedded scripts

## [0.3.35](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.34...hsqlite-editor-v0.3.35) (2026-06-10)

### Features

* fix invalid embedded SQL error regex literals, harden tab and db-session state updates, and prevent the generated standalone artifact from shipping a broken inline script

## [0.3.34](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.33...hsqlite-editor-v0.3.34) (2026-06-10)

### Features

* centralize active result-set hydration/persistence through shared state helpers and remove stale release literals from the source template and operating context

## [0.3.33](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.32...hsqlite-editor-v0.3.33) (2026-06-10)

### Features

* remove obsolete sample-database style residue and block public release unless source, readable artifact, and minified artifact validations all pass

## [0.3.32](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.31...hsqlite-editor-v0.3.32) (2026-06-10)

### Features

* add repo-owned source-surface validation and remove stale sample-database references from maintainer-facing docs and styles

## [0.3.31](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.30...hsqlite-editor-v0.3.31) (2026-06-10)

### Features

* replace the last runtime monolith with dedicated DOM lookup and runtime bootstrap modules, eliminating src/app/50-runtime.js

## [0.3.30](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.29...hsqlite-editor-v0.3.30) (2026-06-10)

### Features

* extract shared runtime helpers for modal control, result-state ownership, shell dirty-state, and horizontal result scrolling into a dedicated app module

## [0.3.29](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.28...hsqlite-editor-v0.3.29) (2026-06-10)

### Features

* extract the SQL Map subsystem into a dedicated app module, removing schema graph, drag, relation, and export logic from the main runtime

## [0.3.28](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.27...hsqlite-editor-v0.3.28) (2026-06-10)

### Features

* add a repo-owned minified release artifact flow with dedicated build and post-minification validation commands

## [0.3.27](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.26...hsqlite-editor-v0.3.27) (2026-06-10)

### Features

* extract SQL find/replace state, highlighting, navigation, and replacement flows into a dedicated app module

## [0.3.26](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.25...hsqlite-editor-v0.3.26) (2026-06-10)

### Features

* extract editor runtime bootstrap, SQL error guidance, toast feedback, and SQL busy-state handling into a dedicated app module

## [0.3.25](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.24...hsqlite-editor-v0.3.25) (2026-06-10)

### Features

* extract editor-local workflow including quick history, SQL file loading, drag-and-drop, resize, and editor action shortcuts into a dedicated app module

## [0.3.24](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.23...hsqlite-editor-v0.3.24) (2026-06-10)

### Features

* extract database session switching, recent-file tracking, handle persistence, file validation, and picker flows into a dedicated app module

## [0.3.23](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.22...hsqlite-editor-v0.3.23) (2026-06-10)

### Features

* extract SQL tab lifecycle, persistence, rename, overflow, and close flows into a dedicated app module

## [0.3.22](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.21...hsqlite-editor-v0.3.22) (2026-06-10)

### Features

* extract shell offline/schema/status boot helpers into a dedicated app module and lock the release plan around pre- and post-minification validation

## [0.3.21](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.20...hsqlite-editor-v0.3.21) (2026-06-10)

### Features

* extract keyboard shortcuts and shell menu wiring into a dedicated app module to further reduce runtime sprawl

## [0.3.20](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.19...hsqlite-editor-v0.3.20) (2026-06-10)

### Features

* extract theme, session persistence, first-run preferences, and tab-preset entrypoints into a dedicated app preferences module

## [0.3.19](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.18...hsqlite-editor-v0.3.19) (2026-06-10)

### Features

* extract query history, favorites, and settings transfer flows into a dedicated app module to keep the main runtime focused on orchestration

## [0.3.18](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.17...hsqlite-editor-v0.3.18) (2026-06-10)

### Features

* extract release metadata parsing, normalization, badge handling, and release-notes modal preparation into a dedicated app module

## [0.3.17](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.16...hsqlite-editor-v0.3.17) (2026-06-10)

### Features

* formalize core app contracts for release metadata, database sessions, and tab state, and document the layered source architecture for maintainers

## [0.3.16](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.15...hsqlite-editor-v0.3.16) (2026-06-10)

### Features

* replace the last monolithic UI event file with explicit shared helpers and feature-level binding modules

## [0.3.15](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.14...hsqlite-editor-v0.3.15) (2026-06-10)

### Features

* extract database creation, save, and schema-export actions into a dedicated UI module so the remaining event file stays focused on wiring

## [0.3.14](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.13...hsqlite-editor-v0.3.14) (2026-06-10)

### Features

* extract editor autocomplete parsing, suggestion rendering, and keyboard navigation into a dedicated UI module

## [0.3.13](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.12...hsqlite-editor-v0.3.13) (2026-06-10)

### Features

* extract result-grid rendering, interactions, and export flow into a dedicated UI module to further break down the monolithic event layer

## [0.3.12](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.11...hsqlite-editor-v0.3.12) (2026-06-10)

### Features

* extract schema loading, filtering, and rendering into a dedicated UI module to keep the standalone build behavior while shrinking the monolithic event file

## [0.3.11](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.10...hsqlite-editor-v0.3.11) (2026-06-10)

### Features

* remove the per-tab submenu pattern and keep SQL tab actions on direct inline rename plus close controls

## [0.3.10](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.9...hsqlite-editor-v0.3.10) (2026-06-10)

### Features

* reduce duplicated grid authority by keeping per-tab result ownership in result sets instead of mirrored active-grid snapshots

## [0.3.9](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.8...hsqlite-editor-v0.3.9) (2026-06-10)

### Features

* simplify SQL tabs with direct rename actions, remove the hidden sample-database surface, and replace string-evaluated SQL splitting with one shared implementation

## [0.3.8](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.7...hsqlite-editor-v0.3.8) (2026-06-10)

### Features

* tone down SQL tab actions so the close control stays primary while the overflow menu appears only on hover or focus

## [0.3.7](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.6...hsqlite-editor-v0.3.7) (2026-06-10)

### Features

* rewrite SQL tabs into a workbench rail with separate utility rail, tab menu, and explicit overflow entrypoint

## [0.3.6](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.5...hsqlite-editor-v0.3.6) (2026-06-10)

### Features

* reduce tab action controls to compact inline icons and remove the oversized protruding action styling

## [0.3.5](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.4...hsqlite-editor-v0.3.5) (2026-06-10)

### Features

* clean release-note links in the in-app modal and wrap long entries without layout overflow

## [0.3.4](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.3...hsqlite-editor-v0.3.4) (2026-06-10)

### Features

* move tab rename and close actions inside each tab pill and reveal them on hover or focus

## [0.3.3](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.2...hsqlite-editor-v0.3.3) (2026-06-09)

### Features

* refactor source into a generated standalone artifact workflow with embedded offline runtimes
* pin vendored dependencies with manifest checksums and repo-owned update automation
* add repo-owned patch version bump command and enforce manifest/package version sync

## [0.3.2](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.1...hsqlite-editor-v0.3.2) (2026-05-27)


### Bug Fixes

* corrigir regex da validação de conventional commits no actions ([8e119a7](https://github.com/helbertm/hSQLite-Editor/commit/8e119a7adc293f26e31ebeb51f640fd3a97ce294))

## [0.3.1](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.3.0...hsqlite-editor-v0.3.1) (2026-05-27)


### Bug Fixes

* publish release metadata files in pages artifact ([df7b96e](https://github.com/helbertm/hSQLite-Editor/commit/df7b96e9996f66381cd241d478f7b336b650bf33))

## [0.3.0](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.2.0...hsqlite-editor-v0.3.0) (2026-05-27)


### Features

* auto-sync app version and release notes from release-please files ([03e15e0](https://github.com/helbertm/hSQLite-Editor/commit/03e15e0a4568da12bf5790fd5b67d11b3e8782a3))

## [0.2.0](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v0.1.0...hsqlite-editor-v0.2.0) (2026-05-27)


### Features

* add release update badge and improve runtime/file validation UX ([8a5e736](https://github.com/helbertm/hSQLite-Editor/commit/8a5e736162de316fa17853f182b7da470cfe5561))
* compact result grid and add mac-only horizontal overflow control ([a75d943](https://github.com/helbertm/hSQLite-Editor/commit/a75d9436819c83ddb3a592cb5445221650e3501a))
* harden runtime loading and setup automated releases ([6930747](https://github.com/helbertm/hSQLite-Editor/commit/6930747b5daa7022c50d0df9f772ae5c7f456657))
* prepare hSQLite Editor for initial public testing ([ecd33d7](https://github.com/helbertm/hSQLite-Editor/commit/ecd33d7194e4a9085f8da849964712328b0789ae))
* refine settings UX and clean dead code paths ([3aa875c](https://github.com/helbertm/hSQLite-Editor/commit/3aa875c4885e713ca3ea90348268201c8a6e44ff))

## Changelog

All notable changes to this project will be documented in this file.
