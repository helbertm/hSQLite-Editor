import { createDbSession } from "./00-contracts.js";
import { getInitialReleaseMetadata } from "./08-runtime-config.js";

export const appState = {
    tabs: {
      items: [],
      activeTabId: null,
      nextSqlTabNameIndex: 0,
      nextSqlTabNumber: 1,
      isSwitching: false,
      pendingCloseTabId: null,
      editingTabId: null,
      tabNameBag: []
    },
    grid: {
      allRows: [],
      columns: [],
      filteredRows: [],
      resultSets: [],
      activeResultIndex: 0,
      currentPage: 1,
      pageSize: 50,
      sortStates: [],
      columnMetadata: {},
      columnWidths: {},
      columnOrder: [],
      frozenColumnCount: 0,
      selectedKeys: new Set(),
      currentRowKey: null
    },
    dbSession: {
      current: createDbSession(),
      currentId: "no-database",
      currentFileName: "",
      currentBytes: null,
      isDirty: false
    },
    schema: {
      objects: {},
      availableTypes: []
    },
    sqlMap: {
      open: false,
      tables: {},
      declaredFks: [],
      virtualFks: [],
      selectedTables: new Set(),
      selectedFields: new Map(),
      positions: {},
      generatedSql: "",
      pendingRelationDraft: null
    },
    preferences: {
      shouldPersistSession: true,
      locale: "en-US",
      tabNamePreset: "tlor",
      schemaCollapsed: false,
      schemaFilters: {
        all: false,
        selectedTypes: new Set(["table", "view"])
      }
    },
    release: {
      version: getInitialReleaseMetadata().version,
      notesByVersion: { ...getInitialReleaseMetadata().notesByVersion },
      versions: [...getInitialReleaseMetadata().versions]
    },
    history: {
      queryHistory: [],
      favoriteQueries: []
    },
    editor: {
      executeSqlAfterFileOpen: false,
      quickHistoryActiveIndex: 0,
      sqlFind: {
        query: "",
        matches: [],
        index: -1,
        replacing: false
      }
    },
    runtime: {
      isSqlRunning: false,
      pendingExportType: null
    }
  };
