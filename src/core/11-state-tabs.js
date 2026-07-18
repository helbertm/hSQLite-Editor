import { appState } from "./10-state-root.js";

export function setSqlTabsState(patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "items")) {
      appState.tabs.items = Array.isArray(patch.items) ? patch.items : [];
    }
    if (Object.prototype.hasOwnProperty.call(patch, "activeTabId")) {
      appState.tabs.activeTabId = patch.activeTabId;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "nextSqlTabNameIndex")) {
      appState.tabs.nextSqlTabNameIndex = Number(patch.nextSqlTabNameIndex || 0);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "nextSqlTabNumber")) {
      appState.tabs.nextSqlTabNumber = Number(patch.nextSqlTabNumber || 1);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "isSwitching")) {
      appState.tabs.isSwitching = Boolean(patch.isSwitching);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "pendingCloseTabId")) {
      appState.tabs.pendingCloseTabId = patch.pendingCloseTabId ? String(patch.pendingCloseTabId) : null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "editingTabId")) {
      appState.tabs.editingTabId = patch.editingTabId ? String(patch.editingTabId) : null;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "tabNameBag")) {
      appState.tabs.tabNameBag = Array.isArray(patch.tabNameBag) ? patch.tabNameBag : [];
    }
  }

export function getSqlTabsState() {
    return appState.tabs;
  }

export function getSqlTabsItems() {
    return appState.tabs.items;
  }

export function getActiveSqlTabId() {
    return appState.tabs.activeTabId;
  }

export function getNextSqlTabNameIndex() {
    return appState.tabs.nextSqlTabNameIndex;
  }

export function getNextSqlTabNumber() {
    return appState.tabs.nextSqlTabNumber;
  }

export function isSqlTabSwitching() {
    return appState.tabs.isSwitching;
  }

export function getPendingCloseSqlTabId() {
    return appState.tabs.pendingCloseTabId;
  }

export function getEditingSqlTabId() {
    return appState.tabs.editingTabId;
  }

export function findSqlTabById(tabId) {
    return appState.tabs.items.find((tab) => tab.id === tabId) || null;
  }

export function getSqlTabNameBag() {
    return appState.tabs.tabNameBag;
  }

export function shouldExecuteSqlAfterFileOpen() {
    return appState.editor.executeSqlAfterFileOpen;
  }

export function updateTabState(tabId, patch) {
    const sqlTabs = getSqlTabsItems();
    const index = sqlTabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return null;
    const nextTab = {
      ...sqlTabs[index],
      ...patch
    };
    const nextItems = [...sqlTabs];
    nextItems[index] = nextTab;
    setSqlTabsState({ items: nextItems });
    return nextTab;
  }

export function replaceSqlTabsItems(nextItems) {
    setSqlTabsState({ items: Array.isArray(nextItems) ? nextItems : [] });
    return getSqlTabsItems();
  }

export function resetAllSqlTabResultStates() {
    const sqlTabs = getSqlTabsItems();
    replaceSqlTabsItems(sqlTabs.map((tab) => ({
      ...tab,
      resultSets: [],
      activeResultIndex: 0,
      filterValue: ""
    })));
  }
