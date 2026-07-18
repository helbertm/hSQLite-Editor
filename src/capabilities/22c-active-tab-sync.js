import { saveSqlTabsToStorage } from "./22-sql-tabs-storage.js";
import { getEditorValue } from "./32a-editor-api.js";
import { findSqlTabById, getActiveSqlTabId, isSqlTabSwitching, updateTabState } from "../core/11-state-tabs.js";
import { getGridActiveResultIndex, getGridResultSets, persistGridStateIntoResultSet } from "../core/12-state-grid-results.js";

let getActiveResultFilterValue = () => "";

export function configureActiveTabSync(effects) {
  getActiveResultFilterValue = effects.getActiveResultFilterValue;
}

export function syncActiveResultToTab() {
  const tab = findSqlTabById(getActiveSqlTabId());
  if (!tab || isSqlTabSwitching()) return;
  updateTabState(tab.id, {
    sql: getEditorValue(),
    resultSets: getGridResultSets(),
    activeResultIndex: getGridActiveResultIndex(),
    filterValue: getActiveResultFilterValue()
  });
  saveSqlTabsToStorage();
}

export function saveCurrentTabState() {
  if (!getActiveSqlTabId() || isSqlTabSwitching()) return;
  const resultSets = getGridResultSets();
  const activeResultIndex = getGridActiveResultIndex();
  if (resultSets.length && activeResultIndex >= 0 && activeResultIndex < resultSets.length) {
    persistGridStateIntoResultSet(resultSets[activeResultIndex]);
  }
  syncActiveResultToTab();
}
