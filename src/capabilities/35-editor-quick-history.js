import { cmEditor, queryHistoryPopover } from "./03-dom-editor-results.js";
import { formatNumber, t } from "./03-localization.js";
import { setStatus } from "./12-shell-status.js";
import { formatQueryHistoryDate, getHistoryStatusIcon } from "./19-history-formatting.js";
import { getQuickHistoryItems, loadQueryHistoryFromStorage } from "./20-history-query.js";
import { saveCurrentTabState } from "./22c-active-tab-sync.js";
import { setEditorValue } from "./32a-editor-api.js";
import { getQuickHistoryActiveIndex, setEditorState } from "../core/15-state-runtime-library.js";
import { escapeHtml } from "../ui/00-helpers.js";
import { hideAutocomplete } from "../ui/30-autocomplete.js";

export function positionQuickHistoryPopover() {
  if (!cmEditor || queryHistoryPopover.style.display !== "block") return;
  const wrapRect = document.querySelector(".editor-wrap").getBoundingClientRect();
  const cursor = cmEditor.getCursorRect("viewport");
  const localLeft = Math.max(12, Math.min(cursor.left - wrapRect.left, wrapRect.width - 260));
  const localTop = Math.max(44, Math.min(cursor.bottom - wrapRect.top + 8, wrapRect.height - 120));
  queryHistoryPopover.style.left = `${localLeft}px`;
  queryHistoryPopover.style.top = `${localTop}px`;
}

export function renderQuickHistoryPopover() {
  const items = getQuickHistoryItems();
  if (!items.length) {
    queryHistoryPopover.innerHTML = `<div class="query-history-popover-empty">${escapeHtml(t("history.empty"))}</div><div class="query-history-popover-help"><span>${escapeHtml(t("history.escapeCloses"))}</span></div>`;
    return;
  }
  const activeIndex = Math.max(0, Math.min(getQuickHistoryActiveIndex(), items.length - 1));
  setEditorState({ quickHistoryActiveIndex: activeIndex });
  queryHistoryPopover.innerHTML = items.map((item, index) => {
    const statusLabel = t(item.status === "success" ? "history.success" : "history.error");
    return `
      <div id="quick-history-option-${index}" class="query-history-popover-item ${index === activeIndex ? "active" : ""}" role="option" aria-selected="${index === activeIndex ? "true" : "false"}" data-quick-history-index="${index}">
        <span class="query-history-popover-status" title="${statusLabel}" aria-hidden="true">${getHistoryStatusIcon(item.status)}</span>
        <div>
          <div class="query-history-popover-meta"><span>${statusLabel}</span><span>·</span><span>${escapeHtml(formatQueryHistoryDate(item.executedAt))}</span></div>
          <pre class="query-history-popover-sql">${escapeHtml(item.sql)}</pre>
        </div>
      </div>
    `;
  }).join("") + `<div class="query-history-popover-help"><span>${escapeHtml(t("history.arrowsNavigate"))}</span><span>${escapeHtml(t("history.enterLoads"))}</span><span>${escapeHtml(t("history.escapeCloses"))}</span></div>`;
  queryHistoryPopover.querySelectorAll("[data-quick-history-index]").forEach(itemEl => {
    itemEl.addEventListener("mouseenter", () => {
      setEditorState({ quickHistoryActiveIndex: Number(itemEl.dataset.quickHistoryIndex) });
      renderQuickHistoryPopover();
    });
    itemEl.addEventListener("mousedown", (event) => {
      event.preventDefault();
      loadQuickHistoryItem(Number(itemEl.dataset.quickHistoryIndex));
    });
  });
  const active = queryHistoryPopover.querySelector(".query-history-popover-item.active");
  if (active) {
    active.scrollIntoView({ block: "nearest" });
    if (cmEditor) cmEditor.setPopupAccessibility({ activeDescendant: active.id });
  }
}

export function openQuickQueryHistory() {
  loadQueryHistoryFromStorage();
  setEditorState({ quickHistoryActiveIndex: 0 });
  hideAutocomplete();
  renderQuickHistoryPopover();
  queryHistoryPopover.style.display = "block";
  positionQuickHistoryPopover();
}

export function closeQuickQueryHistory() {
  queryHistoryPopover.style.display = "none";
  if (cmEditor) cmEditor.setPopupAccessibility();
}

export function isQuickQueryHistoryOpen() {
  return queryHistoryPopover.style.display === "block";
}

export function moveQuickHistorySelection(delta) {
  const items = getQuickHistoryItems();
  if (!items.length) return;
  setEditorState({
    quickHistoryActiveIndex: (getQuickHistoryActiveIndex() + delta + items.length) % items.length
  });
  renderQuickHistoryPopover();
}

export function loadQuickHistoryItem(index = getQuickHistoryActiveIndex()) {
  const item = getQuickHistoryItems()[index];
  if (!item) return;
  setEditorValue(item.sql);
  saveCurrentTabState();
  closeQuickQueryHistory();
  if (cmEditor) cmEditor.focus();
  setStatus(t("status.quickHistoryLoaded"), "ok");
}

export function handleQuickHistoryKey(key) {
  if (!isQuickQueryHistoryOpen()) return false;
  if (key === "ArrowDown") { moveQuickHistorySelection(1); return true; }
  if (key === "ArrowUp") { moveQuickHistorySelection(-1); return true; }
  if (key === "Enter" || key === "Tab") { loadQuickHistoryItem(); return true; }
  if (key === "Escape") { closeQuickQueryHistory(); return true; }
  return false;
}

export function formatRecordCount(count) {
  const value = Number(count || 0);

  if (value <= 0) return t("common.none");
  if (value === 1) return t("results.recordCountOne");

  return t("results.recordCountMany", { count: formatNumber(value) });
}
