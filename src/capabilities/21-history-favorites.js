import { t } from "./03-localization.js";
import { favoritesList, favoritesModal } from "./05-dom-library-settings.js";
import { modalController } from "./05-modal-controller.js";
import { setStatus } from "./12-shell-status.js";
import { formatQueryHistoryDate } from "./19-history-formatting.js";
import { saveCurrentTabState } from "./22c-active-tab-sync.js";
import { setEditorValue } from "./32a-editor-api.js";
import { getFavoriteQueriesState, setFavoriteQueriesState } from "../core/15-state-runtime-library.js";
import { favoritesStorage } from "../ports/05-storage.js";
import { escapeHtml } from "../ui/00-helpers.js";

export const favoritesController = {
  load() {
    try {
      setFavoriteQueriesState(Array.isArray(favoritesStorage.load()) ? favoritesStorage.load() : []);
    } catch {
      setFavoriteQueriesState([]);
    }
  },
  save() {
    favoritesStorage.save(getFavoriteQueriesState());
  },
  toggle(sqlText) {
    const sql = String(sqlText || "").trim();
    if (!sql) return;
    const favoriteQueries = getFavoriteQueriesState();
    const idx = favoriteQueries.findIndex(item => item.sql === sql);
    if (idx >= 0) {
      const nextFavorites = [...favoriteQueries];
      nextFavorites.splice(idx, 1);
      setFavoriteQueriesState(nextFavorites);
    } else {
      setFavoriteQueriesState([{
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        sql,
        createdAt: new Date().toISOString()
      }, ...favoriteQueries]);
    }
    this.save();
  },
  clear() {
    setFavoriteQueriesState([]);
    this.save();
    this.render();
  },
  render() {
    const favoriteQueries = getFavoriteQueriesState();
    if (!favoriteQueries.length) {
      favoritesList.innerHTML = `<div class="query-history-empty">${escapeHtml(t("favorites.empty"))}</div>`;
      return;
    }
    favoritesList.innerHTML = favoriteQueries.map(item => `
      <div class="query-history-item">
        <span class="query-history-status-icon" aria-hidden="true">★</span>
        <div>
          <div class="query-history-meta"><span>${escapeHtml(t("favorites.item"))}</span><span>·</span><span>${escapeHtml(formatQueryHistoryDate(item.createdAt))}</span></div>
          <pre class="query-history-sql">${escapeHtml(item.sql)}</pre>
        </div>
        <div class="query-history-inline-actions">
          <button class="ui-button ui-button-secondary ui-button-sm query-history-load-btn" type="button" data-favorite-remove="${escapeHtml(item.id)}">${escapeHtml(t("favorites.remove"))}</button>
          <button class="ui-button ui-button-secondary ui-button-sm query-history-load-btn" type="button" data-favorite-load="${escapeHtml(item.id)}">${escapeHtml(t("favorites.load"))}</button>
        </div>
      </div>
    `).join("");
    favoritesList.querySelectorAll("[data-favorite-load]").forEach(button => {
      button.addEventListener("click", () => {
        const favoriteQueries = getFavoriteQueriesState();
        const item = favoriteQueries.find(entry => entry.id === button.dataset.favoriteLoad);
        if (!item) return;
        setEditorValue(item.sql);
        saveCurrentTabState();
        modalController.close(favoritesModal);
        setStatus(t("status.favoriteLoaded"), "ok");
      });
    });
    favoritesList.querySelectorAll("[data-favorite-remove]").forEach(button => {
      button.addEventListener("click", () => {
        const favoriteQueries = getFavoriteQueriesState();
        setFavoriteQueriesState(favoriteQueries.filter(entry => entry.id !== button.dataset.favoriteRemove));
        this.save();
        this.render();
      });
    });
  },
  openModal() {
    this.render();
    modalController.open(favoritesModal);
  }
};
