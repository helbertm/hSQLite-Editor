import { t } from "./03-localization.js";
import { clearQueryHistorySearchBtn, queryHistoryList, queryHistoryModal, queryHistorySearch } from "./05-dom-library-settings.js";
import { modalController } from "./05-modal-controller.js";
import { setStatus } from "./12-shell-status.js";
import { formatQueryHistoryDate, getHistoryLoadIcon, getHistoryStatusIcon } from "./19-history-formatting.js";
import { favoritesController } from "./21-history-favorites.js";
import { saveCurrentTabState } from "./22c-active-tab-sync.js";
import { setEditorValue } from "./32a-editor-api.js";
import { QUERY_HISTORY_LIMIT } from "../core/03-app-limits.js";
import { getFavoriteQueriesState, getQueryHistoryState, setQueryHistoryState } from "../core/15-state-runtime-library.js";
import { queryHistoryStorage } from "../ports/05-storage.js";
import { escapeHtml, escapeRegExp } from "../ui/00-helpers.js";

export const queryHistoryController = {
  load() {
    try {
      const raw = queryHistoryStorage.load();
      setQueryHistoryState(Array.isArray(raw) ? raw.slice(0, QUERY_HISTORY_LIMIT) : []);
    } catch {
      setQueryHistoryState([]);
    }
  },
  save() {
    queryHistoryStorage.save(getQueryHistoryState());
  },
  add(sql, status, errorMessage = "") {
    const normalizedSql = String(sql || "").trim();
    if (!normalizedSql) return;
    const queryHistory = getQueryHistoryState();
    setQueryHistoryState([{
      id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      executedAt: new Date().toISOString(),
      status: status === "success" ? "success" : "error",
      sql: normalizedSql,
      errorMessage: String(errorMessage || "").trim()
    }, ...queryHistory].slice(0, QUERY_HISTORY_LIMIT));
    this.save();
  },
  clear() {
    setQueryHistoryState([]);
    this.save();
  },
  getFiltered(filterRaw) {
    const filter = String(filterRaw || "").trim().toLowerCase();
    const queryHistory = getQueryHistoryState();
    if (!filter) return queryHistory;
    return queryHistory.filter(item =>
      String(item.sql || "").toLowerCase().includes(filter)
        || String(item.errorMessage || "").toLowerCase().includes(filter)
        || String(item.status || "").toLowerCase().includes(filter)
    );
  },
  getQuickItems() {
    return getQueryHistoryState().slice(0, QUERY_HISTORY_LIMIT);
  },
  render() {
    const queryHistory = getQueryHistoryState();
    const favoriteQueries = getFavoriteQueriesState();
    const items = this.getFiltered(queryHistorySearch.value);
    clearQueryHistorySearchBtn.style.display = queryHistorySearch.value ? "inline-flex" : "none";
    if (!items.length) {
      queryHistoryList.innerHTML = `<div class="query-history-empty">${escapeHtml(t(queryHistory.length ? "history.noFilterResults" : "history.empty"))}</div>`;
      return;
    }
    const filter = queryHistorySearch.value.trim();
    queryHistoryList.innerHTML = items.map(item => {
      const statusLabel = t(item.status === "success" ? "history.success" : "history.error");
      const errorBlock = item.status === "error" && item.errorMessage ? `<div class="query-history-error">${highlightHistoryMatch(item.errorMessage, filter)}</div>` : "";
      const isFav = favoriteQueries.some(f => f.sql === item.sql);
      return `
        <div class="query-history-item">
          <span class="query-history-status-icon" title="${statusLabel}" aria-hidden="true">${getHistoryStatusIcon(item.status)}</span>
          <div>
            <div class="query-history-meta"><span class="query-history-status-label">${statusLabel}</span><span>·</span><span>${escapeHtml(formatQueryHistoryDate(item.executedAt))}</span></div>
            <pre class="query-history-sql">${highlightHistoryMatch(item.sql, filter)}</pre>
            ${errorBlock}
          </div>
          <div class="query-history-item-actions">
            ${item.status === "success"
              ? `<button class="ui-button ui-button-secondary ui-button-sm query-history-load-btn query-history-favorite-btn" type="button" data-history-fav="${escapeHtml(item.id)}" title="${escapeHtml(t(isFav ? "favorites.remove" : "favorites.save"))}" aria-label="${escapeHtml(t(isFav ? "favorites.remove" : "favorites.save"))}">${isFav ? "★" : "☆"}</button>`
              : `<span class="query-history-action-placeholder" aria-hidden="true"></span>`
            }
            <button class="ui-button ui-button-secondary ui-button-sm query-history-load-btn query-history-icon-btn" type="button" data-history-load="${escapeHtml(item.id)}" title="${escapeHtml(t("history.load"))}" aria-label="${escapeHtml(t("history.load"))}">${getHistoryLoadIcon()}</button>
          </div>
        </div>
      `;
    }).join("");
    queryHistoryList.querySelectorAll("[data-history-fav]").forEach(button => {
      button.addEventListener("click", () => {
        const queryHistory = getQueryHistoryState();
        const item = queryHistory.find(entry => entry.id === button.dataset.historyFav);
        if (!item) return;
        if (item.status !== "success") {
          setStatus(t("status.favoriteRequiresSuccess"), "warn");
          return;
        }
        favoritesController.toggle(item.sql);
        this.render();
      });
    });
    queryHistoryList.querySelectorAll("[data-history-load]").forEach(button => {
      button.addEventListener("click", () => {
        const queryHistory = getQueryHistoryState();
        const item = queryHistory.find(entry => entry.id === button.dataset.historyLoad);
        if (!item) return;
        setEditorValue(item.sql);
        saveCurrentTabState();
        this.closeModal();
        setStatus(t("status.historyLoaded"), "ok");
      });
    });
  },
  openModal() {
    this.render();
    modalController.open(queryHistoryModal);
    setTimeout(() => queryHistorySearch.focus(), 0);
  },
  closeModal() {
    modalController.close(queryHistoryModal);
  }
};

export function loadQueryHistoryFromStorage() {
  queryHistoryController.load();
}

export function saveQueryHistoryToStorage() {
  queryHistoryController.save();
}

export function addQueryHistoryEntry(sql, status, errorMessage = "") {
  queryHistoryController.add(sql, status, errorMessage);
}

export function highlightHistoryMatch(value, filter) {
  const text = String(value || "");
  const needle = String(filter || "").trim();
  if (!needle) return escapeHtml(text);
  const regex = new RegExp(`(${escapeRegExp(needle)})`, "ig");
  return escapeHtml(text).replace(regex, '<mark class="query-history-highlight">$1</mark>');
}

export function renderQueryHistory() {
  queryHistoryController.render();
}

export function openQueryHistoryModal() {
  queryHistoryController.openModal();
}

export function closeQueryHistoryModal() {
  queryHistoryController.closeModal();
}

export function clearQueryHistory() {
  queryHistoryController.clear();
  renderQueryHistory();
  setStatus(t("status.historyCleared"), "ok");
}

export function getQuickHistoryItems() {
  return queryHistoryController.getQuickItems();
}
