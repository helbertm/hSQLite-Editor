import { closeActiveSqlTabBtn, newSqlTabBtn, renameActiveSqlTabBtn, sqlEditorTitle, sqlTabsEl, sqlTabsOverflowList, sqlTabsOverflowMenu } from "./03-dom-editor-results.js";
import { t } from "./03-localization.js";
import { setStatus } from "./12-shell-status.js";
import { saveSqlTabsToStorage } from "./22-sql-tabs-storage.js";
import { MAX_SQL_TABS } from "../core/03-app-limits.js";
import { findSqlTabById, getActiveSqlTabId, getEditingSqlTabId, getSqlTabsItems, replaceSqlTabsItems, setSqlTabsState, updateTabState } from "../core/11-state-tabs.js";
import { escapeHtml } from "../ui/00-helpers.js";
import { cssEscape } from "../ui/22-results-table.js";

let switchSqlTab = () => {};
let requestCloseSqlTab = () => {};
let headerActionsBound = false;

export function configureSqlTabActions(actions) {
  switchSqlTab = actions.switchSqlTab;
  requestCloseSqlTab = actions.requestCloseSqlTab;
  if (headerActionsBound) return;
  renameActiveSqlTabBtn?.addEventListener("click", () => {
    const activeTabId = getActiveSqlTabId();
    if (activeTabId) startInlineTabRename(activeTabId);
  });
  closeActiveSqlTabBtn?.addEventListener("click", () => {
    const activeTabId = getActiveSqlTabId();
    if (activeTabId) requestCloseSqlTab(activeTabId);
  });
  headerActionsBound = true;
}

export function startInlineTabRename(tabId) {
  const tab = findSqlTabById(tabId);
  if (!tab) return;
  setSqlTabsState({ editingTabId: tabId });
  renderSqlTabs();
  setTimeout(() => {
    const input = sqlTabsEl.querySelector(`.sql-tab-title-input[data-tab-input-id="${cssEscape(tabId)}"]`);
    if (!input) return;
    input.focus();
    input.select();
  }, 0);
}

export function finishInlineTabRename(tabId, nextName) {
  if (getEditingSqlTabId() !== tabId) return;
  const tab = findSqlTabById(tabId);
  if (!tab) return;
  const cleanName = String(nextName || "").trim();
  if (!cleanName) {
    setStatus(t("tabs.nameRequired"), "warn");
    setSqlTabsState({ editingTabId: null });
    renderSqlTabs();
    requestAnimationFrame(() => {
      const tabButton = sqlTabsEl.querySelector(`#sql-tab-${cssEscape(tabId)}`);
      if (tabButton && typeof tabButton.focus === "function") tabButton.focus();
    });
    return;
  }

  const renamedTab = updateTabState(tabId, { title: cleanName.slice(0, 50) });
  setSqlTabsState({ editingTabId: null });
  renderSqlTabs();
  requestAnimationFrame(() => {
    const tabButton = sqlTabsEl.querySelector(`#sql-tab-${cssEscape(tabId)}`);
    if (tabButton && typeof tabButton.focus === "function") tabButton.focus();
  });

  if (tab.id === getActiveSqlTabId() && sqlEditorTitle) {
    sqlEditorTitle.textContent = t("tabs.defaultTitle");
  }

  saveSqlTabsToStorage();
  setStatus(t("tabs.renamed", { title: (renamedTab || tab).title }), "ok");
}

export function cancelInlineTabRename() {
  const tabId = getEditingSqlTabId();
  if (!tabId) return;
  setSqlTabsState({ editingTabId: null });
  renderSqlTabs();
  requestAnimationFrame(() => {
    const tabButton = sqlTabsEl.querySelector(`#sql-tab-${cssEscape(tabId)}`);
    if (tabButton && typeof tabButton.focus === "function") tabButton.focus();
  });
}

export function closeSqlTabsOverflowMenu() {
  if (sqlTabsOverflowMenu && sqlTabsOverflowMenu.open) sqlTabsOverflowMenu.open = false;
}

export function renderSqlTabsOverflowMenu() {
  if (!sqlTabsOverflowList) return;
  const sqlTabs = getSqlTabsItems();
  const activeTabId = getActiveSqlTabId();
  sqlTabsOverflowList.innerHTML = sqlTabs.map((tab) => `
    <button class="ui-button ui-button-secondary ui-button-sm sql-tabs-overflow-item ${tab.id === activeTabId ? "active" : ""}" type="button" data-overflow-tab-id="${escapeHtml(tab.id)}">
      <span class="sql-tab-status-dot" aria-hidden="true"></span>
      <span class="sql-tabs-overflow-item-title">${escapeHtml(tab.title)}</span>
    </button>
  `).join("");
  sqlTabsOverflowList.querySelectorAll("[data-overflow-tab-id]").forEach((button) => {
    button.addEventListener("click", () => {
      closeSqlTabsOverflowMenu();
      switchSqlTab(button.dataset.overflowTabId);
    });
  });
}

export function renderSqlTabs() {
  const sqlTabs = getSqlTabsItems();
  const activeTabId = getActiveSqlTabId();
  sqlTabsEl.innerHTML = "";
  for (let tabIndex = 0; tabIndex < sqlTabs.length; tabIndex += 1) {
    const tab = sqlTabs[tabIndex];
    const hasResult = tab.resultSets && tab.resultSets.some(rs => rs.columns && rs.columns.length);
    const isActive = tab.id === activeTabId;
    const isEditing = getEditingSqlTabId() === tab.id;
    const tabElementId = `sql-tab-${tab.id}`;
    const item = document.createElement("div");
    item.className = `sql-tab-item ${isActive ? "active" : ""} ${hasResult ? "has-result" : ""} ${isEditing ? "is-editing" : ""}`;
    item.setAttribute("role", "presentation");
    item.dataset.tabId = tab.id;
    item.dataset.tabIndex = String(tabIndex);

    const button = document.createElement("button");
    button.draggable = true;
    button.id = tabElementId;
    button.className = `sql-tab ${isActive ? "active" : ""} ${hasResult ? "has-result" : ""}`;
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", isActive ? "true" : "false");
    button.setAttribute("aria-controls", "sqlTabPanel");
    button.setAttribute("tabindex", isActive ? "0" : "-1");
    button.dataset.tabId = tab.id;
    button.dataset.tabIndex = String(tabIndex);
    button.title = tab.title;
    button.hidden = isEditing;
    button.innerHTML = `
      <span class="sql-tab-status-dot" aria-hidden="true"></span>
      <span class="sql-tab-title">${escapeHtml(tab.title)}</span>
    `;
    button.addEventListener("click", (event) => {
      switchSqlTab(tab.id);
    });
    button.addEventListener("dblclick", (event) => {
      event.preventDefault();
      startInlineTabRename(tab.id);
    });
    button.addEventListener("keydown", (event) => {
      const currentIndex = Number(button.dataset.tabIndex || 0);
      const moveToTab = (nextIndex) => {
        const normalizedIndex = (nextIndex + sqlTabs.length) % sqlTabs.length;
        const nextTab = sqlTabs[normalizedIndex];
        if (!nextTab) return;
        event.preventDefault();
        switchSqlTab(nextTab.id);
        requestAnimationFrame(() => {
          const nextButton = sqlTabsEl.querySelector(`[data-tab-id="${cssEscape(nextTab.id)}"]`);
          if (nextButton) nextButton.focus();
        });
      };

      if (event.key === "ArrowRight") {
        moveToTab(currentIndex + 1);
      } else if (event.key === "ArrowLeft") {
        moveToTab(currentIndex - 1);
      } else if (event.key === "Home") {
        moveToTab(0);
      } else if (event.key === "End") {
        moveToTab(sqlTabs.length - 1);
      } else if (event.key === "Delete" && sqlTabs.length > 1) {
        event.preventDefault();
        requestCloseSqlTab(tab.id);
      } else if (event.key === "F2") {
        event.preventDefault();
        startInlineTabRename(tab.id);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        switchSqlTab(tab.id);
      }
    });
    button.addEventListener("dragstart", (event) => {
      button.classList.add("dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", tab.id);
      }
    });
    button.addEventListener("dragend", () => {
      button.classList.remove("dragging");
      item.classList.remove("dragging");
      sqlTabsEl.querySelectorAll(".sql-tab-item.drag-over").forEach(el => el.classList.remove("drag-over"));
    });
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      item.classList.add("drag-over");
    });
    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over");
    });
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      item.classList.remove("drag-over");
      const sourceId = event.dataTransfer?.getData("text/plain");
      const targetId = tab.id;
      if (!sourceId || sourceId === targetId) return;
      moveSqlTabOrder(sourceId, targetId);
    });
    let renameField = null;
    if (isEditing) {
      renameField = document.createElement("div");
      renameField.className = "sql-tab-rename-field";
      renameField.innerHTML = `
        <span class="sql-tab-status-dot" aria-hidden="true"></span>
        <input class="sql-tab-title-input" data-tab-input-id="${escapeHtml(tab.id)}" maxlength="50" value="${escapeHtml(tab.title)}" aria-label="${escapeHtml(t("tabs.renameNamedLabel", { title: tab.title }))}">
      `;
    }

    const input = renameField?.querySelector(".sql-tab-title-input");
    if (input) {
      input.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          finishInlineTabRename(tab.id, input.value);
        } else if (event.key === "Escape") {
          event.preventDefault();
          cancelInlineTabRename();
        }
      });
      input.addEventListener("blur", () => {
        finishInlineTabRename(tab.id, input.value);
      });
    }
    item.appendChild(button);
    if (renameField) item.appendChild(renameField);
    sqlTabsEl.appendChild(item);
  }
  renderSqlTabsOverflowMenu();
  const activeTab = findSqlTabById(activeTabId);
  const isRenamingActiveTab = getEditingSqlTabId() === activeTabId;
  if (renameActiveSqlTabBtn) {
    renameActiveSqlTabBtn.disabled = !activeTab || isRenamingActiveTab;
    renameActiveSqlTabBtn.title = t("tabs.renameLabel");
    renameActiveSqlTabBtn.setAttribute("aria-label", t("tabs.renameNamedLabel", { title: activeTab?.title || t("tabs.defaultTitle") }));
  }
  if (closeActiveSqlTabBtn) {
    closeActiveSqlTabBtn.disabled = sqlTabs.length <= 1 || isRenamingActiveTab;
    closeActiveSqlTabBtn.title = t("tabs.closeLabel");
    closeActiveSqlTabBtn.setAttribute("aria-label", t("tabs.closeNamedLabel", { title: activeTab?.title || t("tabs.defaultTitle") }));
  }
  newSqlTabBtn.disabled = sqlTabs.length >= MAX_SQL_TABS;
  newSqlTabBtn.title = sqlTabs.length >= MAX_SQL_TABS
    ? t("tabs.limitReached", { count: MAX_SQL_TABS })
    : t("tabs.newTitle");
  const panel = document.getElementById("sqlTabPanel");
  if (panel) {
    if (getEditingSqlTabId() === activeTabId) {
      panel.removeAttribute("aria-labelledby");
      panel.setAttribute("aria-label", activeTab?.title || t("tabs.defaultTitle"));
    } else {
      panel.removeAttribute("aria-label");
      panel.setAttribute("aria-labelledby", `sql-tab-${activeTabId}`);
    }
  }
  updateSqlTabsOverflow();
  requestAnimationFrame(() => {
    const activeTab = sqlTabsEl.querySelector(".sql-tab.active");
    if (activeTab) activeTab.scrollIntoView({ inline: "nearest", block: "nearest" });
    updateSqlTabsOverflow();
  });
}

export function updateSqlTabsOverflow() {
  if (!sqlTabsEl) return;
  const header = sqlTabsEl.closest(".sql-tabs-header");
  const hasOverflow = sqlTabsEl.scrollWidth > sqlTabsEl.clientWidth + 1;
  sqlTabsEl.classList.toggle("is-overflowing", hasOverflow);
  if (sqlTabsOverflowMenu) {
    sqlTabsOverflowMenu.hidden = !hasOverflow;
    if (!hasOverflow) closeSqlTabsOverflowMenu();
  }
  if (!header) return;
  const canScrollLeft = hasOverflow && sqlTabsEl.scrollLeft > 1;
  const canScrollRight = hasOverflow && sqlTabsEl.scrollLeft + sqlTabsEl.clientWidth < sqlTabsEl.scrollWidth - 1;
  header.classList.toggle("can-scroll-left", canScrollLeft);
  header.classList.toggle("can-scroll-right", canScrollRight);
}

export function moveSqlTabOrder(sourceId, targetId) {
  const sqlTabs = getSqlTabsItems();
  const fromIndex = sqlTabs.findIndex(tab => tab.id === sourceId);
  const toIndex = sqlTabs.findIndex(tab => tab.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
  const nextTabs = [...sqlTabs];
  const [moved] = nextTabs.splice(fromIndex, 1);
  nextTabs.splice(toIndex, 0, moved);
  replaceSqlTabsItems(nextTabs);
  renderSqlTabs();
  saveSqlTabsToStorage();
  setStatus(t("tabs.moved", { title: moved.title }), "ok");
}
