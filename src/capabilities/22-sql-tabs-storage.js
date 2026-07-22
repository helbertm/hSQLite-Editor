import { getCurrentTabNamePool } from "./22a-sql-tab-presets.js";
import { createEmptyTab } from "./22b-sql-tab-factory.js";
import { createTabState } from "../core/00-contracts.js";
import { MAX_SQL_TABS } from "../core/03-app-limits.js";
import { getActiveSqlTabId, getNextSqlTabNameIndex, getNextSqlTabNumber, getSqlTabsItems, isSqlTabSwitching } from "../core/11-state-tabs.js";
import { getShouldPersistSession } from "../core/13-state-preferences.js";
import { sqlTabsStorage } from "../ports/05-storage.js";

export function serializeSqlTabs() {
  const sqlTabs = getSqlTabsItems();
  return {
    version: 1,
    activeTabId: getActiveSqlTabId(),
    nextSqlTabNumber: getNextSqlTabNumber(),
    nextSqlTabNameIndex: getNextSqlTabNameIndex(),
    tabs: sqlTabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      sql: tab.sql || ""
    }))
  };
}

export function saveSqlTabsToStorage(force = false) {
  if (isSqlTabSwitching()) return;
  if (!getShouldPersistSession() && !force) return;

  try {
    if (!getShouldPersistSession() && force) {
      sqlTabsStorage.clear();
      return;
    }

    sqlTabsStorage.save(serializeSqlTabs());
  } catch (err) {
    console.warn("sql-tabs-save-failed", err);
  }
}

export function loadSqlTabsFromStorage() {
  if (!getShouldPersistSession()) return null;

  try {
    const raw = sqlTabsStorage.load();
    if (!raw || !Array.isArray(raw.tabs) || !raw.tabs.length) return null;

    const restoredTabs = raw.tabs.slice(0, MAX_SQL_TABS).map((item, index) => {
      return createTabState({
        ...createEmptyTab(item.title || `SQL ${index + 1}`, item.sql || ""),
        id: item.id || `tab_restored_${index}`,
        filterValue: String(item.filterValue || "")
      });
    });

    return {
      tabs: restoredTabs,
      activeTabId: restoredTabs.some(tab => tab.id === raw.activeTabId)
        ? raw.activeTabId
        : restoredTabs[0].id,
      nextSqlTabNumber: Number(raw.nextSqlTabNumber || restoredTabs.length + 1),
      nextSqlTabNameIndex: Number.isFinite(Number(raw.nextSqlTabNameIndex))
        ? Number(raw.nextSqlTabNameIndex)
        : restoredTabs.length % Math.max(1, getCurrentTabNamePool().length)
    };
  } catch (err) {
    console.warn("sql-tabs-restore-failed", err);
    return null;
  }
}
