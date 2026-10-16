# SQLite support investigations

## Many files and queries

Open one database at a time. The header identifies the active database. **Recent databases** retains up to 30 entries and searches by filename or browser-provided relative path. Reopening a file handle depends on browser support and permission; otherwise select the file again.

Use **Open SQL** or drop multiple SQL/text files into the editor to open each in its own named tab. Existing drafts remain intact. The workspace supports 20 tabs; a selection exceeding the available capacity is rejected before any file is imported. Each SQL file is limited to 5 MiB. **Open and run** accepts one file so a multiple selection cannot unexpectedly execute a batch of scripts.

History keeps 200 entries and includes the database filename. Search by SQL, filename, error text, or status. Favorites also retain up to 200 queries. These limits are upper bounds: browser storage quotas still apply. Export important SQL files and settings regularly; local browser storage is not a backup. Settings export captures the current in-memory tabs and validates that the file can be imported. The JSON backup limit is 33,554,432 characters; if exceeded, select fewer scopes or save queries individually.

## Protecting an investigation

- Work on a consistent copy of the database. For a live WAL database, create a SQLite backup or a consistent snapshot; copying only the main `.db` can omit changes still in its WAL. This editor opens a single database file and does not import WAL sidecars.
- Writes change the in-memory database. **Save .db** downloads a copy; it does not overwrite the source file automatically. Confirm that the browser completed the download.
- Switching databases asks before discarding unsaved changes. Cancel keeps the current database and results. Leaving the page also requests the browser's warning when changes or an execution are pending; browser and operating-system shutdown can bypass that warning.
- A malformed catalog or a superseded asynchronous file read cannot replace the current database. Opening another database during execution is rejected.
- SQL failure, cancellation, and result-budget failure preserve the database from before the execution. Earlier successful statements in that same failed execution are not adopted.
- Put `BEGIN` and `COMMIT`/`ROLLBACK` in the same execution. An unfinished transaction is rejected with an explanation. Each execution uses a fresh worker connection, so temporary tables, attachments and connection-level PRAGMAs do not persist between runs.

## Large result sets

SQLite runs in a worker; the grid renders one page at a time. Each execution has an aggregate result budget of 100,000 rows, 1,000,000 cells and approximately 32 MiB of value payload across all statements. Exceeding any budget fails the execution with guidance instead of returning a silently truncated result. The previous results remain available.

Filter and aggregate in SQL before exporting. Prefer explicit columns over `SELECT *`. For repeatable navigation, order by a unique key and use keyset pagination:

```sql
SELECT id, created_at, status
FROM tickets
WHERE id > 120000
ORDER BY id
LIMIT 1000;
```

Use `EXPLAIN QUERY PLAN` to investigate scans and missing indexes. The limits above bound collected output, not SQLite's internal sort/join memory or the size of a single value. Database loading still holds in-memory copies; available browser memory determines practical database size. For databases exceeding those constraints, use a native SQLite tool against a safe copy.

## Accurate results and exports

- Duplicate column names receive distinct labels such as `id`, `id (2)`. Explicit SQL aliases are preferable for stable downstream schemas. Reserved internal names are also disambiguated.
- SQLite integers outside JavaScript's safe integer range are shown and exported as decimal strings, preserving all digits. Smaller integers remain numbers. Floating-point values retain SQLite/JavaScript floating-point semantics.
- Empty queries preserve column headers. Triggers and quoted identifiers use SQLite's native parser.
- CSV is intended for spreadsheet viewing: fields are quoted, formula-like text receives an apostrophe prefix, and BLOBs use hexadecimal `X'...'` notation. This changes the serialized representation of affected strings. Spreadsheet programs may remove escaping when files are edited and saved again; do not treat CSV escaping as a universal security boundary.
- JSON preserves the original text without CSV formula prefixes. Large integer strings preserve precision. Review exports before sharing because queries, filenames, identifiers and results can contain sensitive support data.

See [privacy and local data](privacy.md), [validation](validation.md), and [support channels](../SUPPORT.md).
