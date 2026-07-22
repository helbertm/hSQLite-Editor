import { closeTabConfirmModal, closeTabConfirmText, closeTabPreview, sqlEditorTitle } from "./03-dom-editor-results.js";
import { t } from "./03-localization.js";
import { modalController } from "./05-modal-controller.js";
import { activateResultSet, setResultControlsEnabled } from "./05a-result-state-controller.js";
import { setStatus } from "./12-shell-status.js";
import { loadSqlTabsFromStorage, saveSqlTabsToStorage } from "./22-sql-tabs-storage.js";
import { getCurrentTabNamePool, shuffleList } from "./22a-sql-tab-presets.js";
import { createEmptyTab } from "./22b-sql-tab-factory.js";
import { saveCurrentTabState } from "./22c-active-tab-sync.js";
import { renderSqlTabs } from "./24-sql-tabs-render.js";
import { getEditorValue, setEditorValue } from "./32a-editor-api.js";
import { MAX_SQL_TABS } from "../core/03-app-limits.js";
import { findSqlTabById, getActiveSqlTabId, getNextSqlTabNameIndex, getNextSqlTabNumber, getPendingCloseSqlTabId, getSqlTabNameBag, getSqlTabsItems, isSqlTabSwitching, replaceSqlTabsItems, setSqlTabsState, updateTabState } from "../core/11-state-tabs.js";
import { getGridActiveResultIndex, getGridColumns, getGridResultSets, normalizeResultSetState, persistGridStateIntoResultSet, resetGridStateToEmpty, setGridState } from "../core/12-state-grid-results.js";
import { getFilterValue, setFilterValue } from "../ui/20-results-state.js";
import { renderToolbars, tableRenderController, updateToolbars } from "../ui/21-results-toolbar.js";
import { renderSleepEmptyState } from "../ui/22-results-table.js";

export function loadTabState(tab) {
  setSqlTabsState({ isSwitching: true });
  setEditorValue(tab.sql || "");
  setGridState({
    resultSets: Array.isArray(tab.resultSets) ? tab.resultSets.map(normalizeResultSetState) : [],
    activeResultIndex: Number(tab.activeResultIndex || 0)
  });
  const resultSets = getGridResultSets();
  if (resultSets.length) {
    const activeResultIndex = getGridActiveResultIndex();
    const nextActiveIndex = Math.min(activeResultIndex, resultSets.length - 1);
    activateResultSet(nextActiveIndex);
  } else {
    resetGridStateToEmpty();
  }
  if (getGridColumns().length) {
    tableRenderController.renderCurrent();
    setResultControlsEnabled(true);
  } else {
    renderSleepEmptyState();
    setResultControlsEnabled(false);
  }
  renderToolbars();
  setFilterValue(tab.filterValue || "");
  updateToolbars();
  renderSqlTabs();
  if (sqlEditorTitle) sqlEditorTitle.textContent = t("tabs.defaultTitle");
  setSqlTabsState({ isSwitching: false });
  saveSqlTabsToStorage();
}

export const sqlTabsController = {
  init() {
    const restored = loadSqlTabsFromStorage();

    if (restored) {
      setSqlTabsState({
        items: restored.tabs,
        activeTabId: restored.activeTabId,
        nextSqlTabNumber: restored.nextSqlTabNumber,
        nextSqlTabNameIndex: restored.nextSqlTabNameIndex % Math.max(1, getCurrentTabNamePool().length)
      });
      const tabs = getSqlTabsItems();
      const active = findSqlTabById(getActiveSqlTabId()) || tabs[0];
      setSqlTabsState({ activeTabId: active.id });
      loadTabState(active);
      renderSqlTabs();
      if (sqlEditorTitle) sqlEditorTitle.textContent = t("tabs.defaultTitle");
      return;
    }

    const firstTab = createEmptyTab(null, getEditorValue());
    setSqlTabsState({ items: [firstTab], activeTabId: firstTab.id });
    saveCurrentTabState();
    renderSqlTabs();
    if (sqlEditorTitle) sqlEditorTitle.textContent = t("tabs.defaultTitle");
    saveSqlTabsToStorage();
  },
  switch(tabId) {
    if (tabId === getActiveSqlTabId()) return;
    const tab = findSqlTabById(tabId);
    if (!tab) return;
    saveCurrentTabState();
    setSqlTabsState({ activeTabId: tabId });
    loadTabState(tab);
  },
  add() {
    const sqlTabs = getSqlTabsItems();
    if (sqlTabs.length >= MAX_SQL_TABS) {
      setStatus(t("tabs.limitReached", { count: MAX_SQL_TABS }), "warn");
      return;
    }
    saveCurrentTabState();
    const tab = createEmptyTab();
    replaceSqlTabsItems([...sqlTabs, tab]);
    setSqlTabsState({ activeTabId: tab.id });
    loadTabState(tab);
    setStatus(t("tabs.created", { title: tab.title }), "ok");
    saveSqlTabsToStorage();
  },
  requestClose(tabId) {
    if (getSqlTabsItems().length <= 1) {
      setStatus(t("tabs.keepOne"), "warn");
      return;
    }

    const content = getSqlTabContent(tabId);
    if (!content) {
      this.close(tabId, true);
      return;
    }

    const tab = findSqlTabById(tabId);
    const tabTitle = tab ? tab.title : "selecionada";

    setSqlTabsState({ pendingCloseTabId: tabId });
    closeTabConfirmText.textContent = t("tabs.unsavedClose", { tab: tabTitle });
    closeTabPreview.textContent = content.length > 600 ? content.slice(0, 600) + "\n..." : content;
    closeTabPreview.style.display = content ? "block" : "none";
    modalController.open(closeTabConfirmModal);
  },
  cancelClose() {
    setSqlTabsState({ pendingCloseTabId: null });
    modalController.close(closeTabConfirmModal);
  },
  confirmClose() {
    const tabId = getPendingCloseSqlTabId();
    if (!tabId) return;
    setSqlTabsState({ pendingCloseTabId: null });
    modalController.close(closeTabConfirmModal);
    this.close(tabId, true);
  },
  close(tabId, confirmed = false) {
    const sqlTabs = getSqlTabsItems();
    if (sqlTabs.length <= 1) {
      setStatus(t("tabs.keepOne"), "warn");
      return;
    }

    if (!confirmed && getSqlTabContent(tabId)) {
      this.requestClose(tabId);
      return;
    }

    const index = sqlTabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const closingActive = getActiveSqlTabId() === tabId;
    const nextTabs = [...sqlTabs];
    nextTabs.splice(index, 1);
    replaceSqlTabsItems(nextTabs);

    if (closingActive) {
      const next = nextTabs[Math.max(0, index - 1)] || nextTabs[0];
      setSqlTabsState({ activeTabId: next.id });
      loadTabState(next);
    } else {
      renderSqlTabs();
      saveSqlTabsToStorage();
    }

    setStatus(t("tabs.closed"), "ok");
  },
  closeAll() {
    const freshTab = createEmptyTab();
    setSqlTabsState({
      items: [freshTab],
      activeTabId: freshTab.id
    });
    loadTabState(freshTab);
    setStatus(t("tabs.allClosed"), "ok");
    saveSqlTabsToStorage();
  }
};

export function switchSqlTab(tabId) {
  sqlTabsController.switch(tabId);
}

export function addSqlTab() {
  sqlTabsController.add();
}

export function getSqlTabContent(tabId) {
  if (tabId === getActiveSqlTabId()) {
    return getEditorValue().trim();
  }

  const tab = findSqlTabById(tabId);
  return String((tab && tab.sql) || "").trim();
}

export function requestCloseSqlTab(tabId) {
  sqlTabsController.requestClose(tabId);
}

export function cancelCloseSqlTab() {
  sqlTabsController.cancelClose();
}

export function confirmCloseSqlTab() {
  sqlTabsController.confirmClose();
}

export function closeAllSqlTabs() {
  sqlTabsController.closeAll();
}

export function initSqlTabs() {
  sqlTabsController.init();
}
