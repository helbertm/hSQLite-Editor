/**
 * @typedef {Object<string, string[]>} ReleaseNotesByVersion
 */

/**
 * @typedef {Object} ReleaseMetadata
 * @property {string} version
 * @property {string[]} versions
 * @property {ReleaseNotesByVersion} notesByVersion
 */

/**
 * @typedef {Object} DbSession
 * @property {string} id
 * @property {string} source
 * @property {string} name
 * @property {number} sizeBytes
 * @property {number} lastModified
 * @property {string} originLabel
 */

/**
 * @typedef {Object} SqlExecutionResult
 * @property {string} statement
 * @property {number} statementIndex
 * @property {string[]} columns
 * @property {Array<Array<unknown>>} values
 * @property {string} message
 */

/**
 * @typedef {Object} GridState
 * @property {Array<Object<string, unknown>>} allRows
 * @property {string[]} columns
 * @property {Array<Object<string, unknown>>} filteredRows
 * @property {number} currentPage
 * @property {number} pageSize
 * @property {Array<{column: string, direction: string}>} sortStates
 * @property {Set<string>} selectedKeys
 * @property {string|null} currentRowKey
 * @property {Object<string, {table: string, field: Object}>} columnMetadata
 * @property {Object<string, number>} columnWidths
 * @property {string[]} columnOrder
 * @property {number} frozenColumnCount
 */

/**
 * @typedef {GridState & {
 *   statement: string,
 *   statementIndex: number,
 *   message: string
 * }} ResultSetState
 */

/**
 * @typedef {Object} TabState
 * @property {string} id
 * @property {string} title
 * @property {string} sql
 * @property {ResultSetState[]} resultSets
 * @property {number} activeResultIndex
 * @property {string} filterValue
 */

/**
 * @typedef {Object} SchemaObjectMeta
 * @property {string} type
 * @property {Array<{ name: string, type: string, notnull: number, defaultValue: unknown, pk: number, hidden: number }>} fields
 */

/**
 * @typedef {Object} SqlMapEdge
 * @property {string} id
 * @property {string} kind
 * @property {string} fromTable
 * @property {string} fromColumn
 * @property {string} toTable
 * @property {string} toColumn
 * @property {string} fromType
 * @property {string} toType
 * @property {string} fromTypeClass
 * @property {string} toTypeClass
 * @property {string} compatibilityLevel
 * @property {string} compatibilityReason
 * @property {string} compatibilityTitle
 * @property {string[]} compatibilityItems
 * @property {string} createdAt
 */

/**
 * @typedef {Object} SqlMapState
 * @property {boolean} open
 * @property {Object<string, { name: string, type: string, fields: Array<{ name: string, type: string, pk: boolean, notnull: boolean }> }>} tables
 * @property {SqlMapEdge[]} declaredFks
 * @property {SqlMapEdge[]} virtualFks
 * @property {Set<string>} selectedTables
 * @property {Map<string, Set<string>>} selectedFields
 * @property {Object<string, { x: number, y: number }>} positions
 * @property {string} generatedSql
 * @property {Object<string, unknown>|null} pendingRelationDraft
 */

/**
 * @typedef {Object} PreferencesState
 * @property {boolean} shouldPersistSession
 * @property {"en-US"|"pt-BR"|"es-ES"} locale
 * @property {string} tabNamePreset
 * @property {boolean} schemaCollapsed
 * @property {{ all: boolean, selectedTypes: Set<string> }} schemaFilters
 */

/**
 * @typedef {Object} EditorState
 * @property {boolean} executeSqlAfterFileOpen
 * @property {number} quickHistoryActiveIndex
 * @property {{ query: string, matches: Array<{ from: number, to: number }>, index: number, replacing: boolean }} sqlFind
 */

/**
 * @typedef {Object} RuntimeState
 * @property {boolean} isSqlRunning
 * @property {string|null} pendingExportType
 */

/**
 * @typedef {Object} AppState
 * @property {{ items: TabState[], activeTabId: string|null, nextSqlTabNameIndex: number, nextSqlTabNumber: number, isSwitching: boolean, pendingCloseTabId: string|null, editingTabId: string|null }} tabs
 * @property {GridState & { resultSets: ResultSetState[], activeResultIndex: number }} grid
 * @property {{ current: DbSession, currentId: string, currentFileName: string, currentBytes: Uint8Array|null, isDirty: boolean }} dbSession
 * @property {{ objects: Object<string, SchemaObjectMeta>, availableTypes: string[] }} schema
 * @property {SqlMapState} sqlMap
 * @property {PreferencesState} preferences
 * @property {ReleaseMetadata} release
 * @property {{ queryHistory: Array<Object<string, unknown>>, favoriteQueries: Array<Object<string, unknown>> }} history
 * @property {EditorState} editor
 * @property {RuntimeState} runtime
 */

export function createReleaseMetadata(raw = {}) {
  const version = String(raw.version || "0.0.0").trim() || "0.0.0";
  const versions = Array.isArray(raw.versions) && raw.versions.length
    ? raw.versions.map((item) => String(item || "").trim()).filter(Boolean)
    : [version];
  const notesByVersion = {};
  for (const [releaseVersion, notes] of Object.entries(raw.notesByVersion || {})) {
    notesByVersion[String(releaseVersion || "").trim()] = Array.isArray(notes)
      ? notes.map((note) => String(note || "").trim()).filter(Boolean)
      : [];
  }
  return { version, versions, notesByVersion };
}

export function createDbSession(raw = {}) {
  return {
    id: String(raw.id || "no-database"),
    source: String(raw.source || "none"),
    name: String(raw.name || ""),
    sizeBytes: Number(raw.sizeBytes || 0),
    lastModified: Number(raw.lastModified || 0),
    originLabel: String(raw.originLabel || "")
  };
}

export function createTabState(raw = {}) {
  return {
    id: String(raw.id || ""),
    title: String(raw.title || "").trim() || "SQL",
    sql: String(raw.sql || "select *\nfrom \nwhere\norder by"),
    resultSets: Array.isArray(raw.resultSets) ? raw.resultSets : [],
    activeResultIndex: Number(raw.activeResultIndex || 0),
    filterValue: String(raw.filterValue || "")
  };
}
