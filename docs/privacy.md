# Privacy and Local Data

## Data flow

hSQLite Editor runs in the browser and has no application backend. The downloaded standalone artifact, `file://` use, local development, and nonofficial hosts do not load an analytics service or intentionally upload database bytes, SQL text, history, favorites, settings, file names, or file metadata. Data leaves those surfaces only when the user explicitly downloads, exports, copies, or shares it, or when browser, extension, or operating-system behavior outside the project trust boundary does so.

Browser storage is local to a browser profile and origin. It is not encrypted application storage and must not be treated as a secrets vault. Storage behavior for `file://` pages varies by browser; use the browser's site-data controls for the artifact origin when removing all data.

## GitHub Pages usage statistics

Only the official deployment at `https://helbertm.github.io/hSQLite-Editor/` conditionally loads the reviewed Umami Cloud tracker. The loader checks the exact origin and project path before making a request. It does not run on `file://`, localhost, local IP addresses, copied HTML, or another domain. It also makes no analytics request when the browser enables Do Not Track or Global Privacy Control.

The hosted deployment records automatic pageviews. Umami can use ordinary pageview and browser metadata to report the page path, referring site, browser, operating system, device category, language, screen size, country, date, and time. URL query parameters and fragments are excluded. The current editor version is attached as a tag such as `hsqlite-editor-v0.7.0`, which allows maintainers to compare aggregate use by version.

The integration does not call custom tracking or identification functions and does not enable custom events, performance collection, session replay, or heatmaps. It does not intentionally send SQLite database contents, database bytes, SQL text, queries, file names, history, favorites, settings, recent-file metadata, exported data, or tab content. Umami Cloud is a third-party hosted service; its network processing, retention, and country derivation are governed by the service configuration and terms rather than by the standalone editor.

The deployment fails closed when the public Umami website ID is absent or malformed. The tracker URL and minimization settings are fixed in reviewed repository code rather than mutable GitHub variables. Analytics being blocked or unavailable does not prevent the editor from starting or working.

## localStorage inventory

The application can store these entries:

| Key | Content | Removal |
| --- | --- | --- |
| `hSQLiteEditorStorageSchemaVersion` | Internal storage schema version. | Clear browser site data. |
| `hSQLiteEditorSqlTabsV1` | Up to five tab identifiers, titles, SQL text, and active-tab counters when session persistence is enabled. | Turning session persistence off clears this entry. Clearing browser site data also removes it. |
| `hSQLiteEditorSessionPersistenceV1` | Whether SQL tab restoration is enabled. | Change the setting or clear browser site data. |
| `hSQLiteEditorStarterSqlV1` | Whether newly created SQL tabs start with the built-in starter SQL. | Change the setting or clear browser site data. |
| `hSQLiteEditorFirstRunDoneV1` | Whether first-run preferences were completed. | Clear browser site data. |
| `hSQLiteEditorQueryHistoryV1` | Up to 50 SQL statements with execution time, success/error status, and error text. | Use **Clear history** or clear browser site data. |
| `hSQLiteEditorFavoritesV1` | Up to 50 saved SQL statements with identifiers and creation times. | Use **Clear favorites** or clear browser site data. |
| `hSQLiteEditorThemeV1` | Selected light/dark theme. | Change the setting or clear browser site data. |
| `hSQLiteEditorTabNamePresetV1` | Selected tab-name preset. | Change the setting or clear browser site data. |
| `hSQLiteEditorSchemaCollapsedV1` | Schema-panel collapsed state. | Change the panel state or clear browser site data. |
| `hSQLiteEditorSchemaFiltersV1` | Schema object-type filter preferences. | Use the schema filter reset where applicable or clear browser site data. |
| `hSQLiteEditorRecentDbsV1` | Up to 10 recent-database metadata records. | Use **Clear recent databases** or clear browser site data. |
| `hSQLiteEditorLastSettingsExportAtV1` | Timestamp of the last settings export. | Clear browser site data. |
| `hSQLiteEditorLastSeenReleaseVersionV1` | Last acknowledged application version. | Clear browser site data. |
| `hSQLiteEditorLocaleV1` | Selected `en-US`, `pt-BR`, or `es-ES` locale. | Change the locale or clear browser site data. |

SQL Map positions use dynamic keys beginning with `hSQLiteEditorSqlMapPositionsV1:`. They contain table-node coordinates associated with the current database session identifier. Virtual relationships are session-only and are not persisted. Clear browser site data to remove saved positions.

Turning session persistence off clears only persisted SQL tabs. It does not clear history, favorites, recent-database metadata, file handles, display preferences, release state, or SQL Map positions.

## Recent database metadata

Each recent item can contain `id`, `name`, `path`, `size`, `lastModified`, `lastOpenedAt`, and `hasHandle`. Depending on browser file APIs, `path` is normally the selected file name or a browser-provided relative path, not an unrestricted operating-system path. SQLite database bytes are not persisted in localStorage or IndexedDB by this feature.

## IndexedDB file handles

Browsers that support the File System Access API can store user-selected file handles in the IndexedDB database `hSQLiteEditorFileHandlesV1`. A handle is a browser-managed reference, not a copy of the database. Reopening a recent file checks or requests read permission again before reading it.

**Clear recent databases** removes both the localStorage recent-item list and all handles in `hSQLiteEditorFileHandlesV1`. To revoke a file permission retained by the browser itself, use the browser's file permission or site-permission controls. To remove every application record, clear browser site data for the Pages origin or standalone-file origin. Browser UI and `file://` origin grouping differ by browser.

## Settings transfer and exports

Settings export includes only the scopes selected by the user: favorites, query history, theme, locale, persisted SQL tabs/session preference, tab-name preset, and starter-SQL preference. The JSON file leaves browser storage only through an explicit download. Result exports, saved SQL, SQLite saves, schema exports, and SQL Map PNG files are also explicit downloads.

Before sharing an export, inspect it for SQL text, identifiers, error messages, or metadata that may be confidential. Clearing application storage does not delete files already downloaded or copied elsewhere.
