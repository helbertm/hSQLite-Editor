import assert from "node:assert/strict";
import test from "node:test";
import {
  createDbSession,
  createReleaseMetadata,
  createTabState
} from "../../src/core/00-contracts.js";

globalThis.window = {
  __HSQLITE_BOOT__: {
    release: {
      version: "9.8.7",
      versions: ["9.8.7"],
      notesByVersion: { "9.8.7": ["Contract fixture"] }
    }
  }
};

const state = {
  ...await import("../../src/core/10-state-root.js"),
  ...await import("../../src/core/11-state-tabs.js"),
  ...await import("../../src/core/12-state-grid-results.js"),
  ...await import("../../src/core/13-state-preferences.js")
};
const initialAppState = structuredClone(state.appState);

function resetAppState() {
  for (const key of Object.keys(state.appState)) delete state.appState[key];
  Object.assign(state.appState, structuredClone(initialAppState));
}

test("normalizes release, database, and tab contracts", () => {
  const release = createReleaseMetadata({
    version: " 1.2.3 ",
    versions: ["1.2.3", ""],
    notesByVersion: { "1.2.3": [" note ", ""] }
  });
  const database = createDbSession({ id: 42, source: "file", name: "main.db", sizeBytes: "512" });
  const tab = createTabState({ id: 7, title: "  ", sql: "select 1", activeResultIndex: "2" });

  assert.deepEqual(release, {
    version: "1.2.3",
    versions: ["1.2.3"],
    notesByVersion: { "1.2.3": ["note"] }
  });
  assert.deepEqual(database, {
    id: "42",
    source: "file",
    name: "main.db",
    sizeBytes: 512,
    lastModified: 0,
    originLabel: ""
  });
  assert.equal(tab.id, "7");
  assert.equal(tab.title, "SQL");
  assert.equal(tab.activeResultIndex, 2);
});

test("state patch functions change only the requested authoritative slices", () => {
  resetAppState();
  const original = structuredClone(state.appState);

  state.setSqlTabsState({ activeTabId: "tab-2", isSwitching: true });
  state.setGridState({ currentPage: 4, columns: ["id", "name"] });
  state.setPreferencesState({ locale: "es-ES", schemaCollapsed: true });

  assert.equal(state.appState.tabs.activeTabId, "tab-2");
  assert.equal(state.appState.tabs.isSwitching, true);
  assert.equal(state.appState.tabs.nextSqlTabNumber, original.tabs.nextSqlTabNumber);
  assert.deepEqual(state.appState.grid.columns, ["id", "name"]);
  assert.equal(state.appState.grid.currentPage, 4);
  assert.deepEqual(state.appState.grid.sortStates, original.grid.sortStates);
  assert.equal(state.appState.preferences.locale, "es-ES");
  assert.equal(state.appState.preferences.schemaCollapsed, true);
  assert.deepEqual(state.appState.dbSession, original.dbSession);
  assert.deepEqual(state.appState.sqlMap, original.sqlMap);
});

test("result-set normalization supplies isolated deterministic defaults", () => {
  resetAppState();
  const first = state.createResultSetState({ columns: ["id"], allRows: [{ id: 1 }] });
  const second = state.createResultSetState();

  first.sortStates.push({ column: "id", direction: "asc" });
  assert.equal(second.sortStates.length, 0);
  assert.deepEqual(first.columnOrder, ["id"]);
  assert.equal(first.filteredRows.length, 1);
  assert.equal(first.pageSize, 50);
});
