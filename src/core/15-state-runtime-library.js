import { appState } from "./10-state-root.js";

export function getAppVersion() {
    return appState.release.version;
  }

export function getReleaseNotesByVersion() {
    return appState.release.notesByVersion;
  }

export function getReleaseVersions() {
    return appState.release.versions;
  }

export function getQueryHistoryState() {
    return appState.history.queryHistory;
  }

export function getFavoriteQueriesState() {
    return appState.history.favoriteQueries;
  }

export function getQuickHistoryActiveIndex() {
    return appState.editor.quickHistoryActiveIndex;
  }

export function getSqlFindState() {
    return appState.editor.sqlFind;
  }

export function getRuntimeState() {
    return appState.runtime;
  }

export function isSqlExecutionRunning() {
    return appState.runtime.isSqlRunning;
  }

export function getPendingExportType() {
    return appState.runtime.pendingExportType;
  }

export function setQueryHistoryState(items) {
    appState.history.queryHistory = Array.isArray(items) ? items : [];
  }

export function setFavoriteQueriesState(items) {
    appState.history.favoriteQueries = Array.isArray(items) ? items : [];
  }

export function setEditorState(patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "executeSqlAfterFileOpen")) {
      appState.editor.executeSqlAfterFileOpen = Boolean(patch.executeSqlAfterFileOpen);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "quickHistoryActiveIndex")) {
      appState.editor.quickHistoryActiveIndex = Number(patch.quickHistoryActiveIndex || 0);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "sqlFind")) {
      const nextSqlFind = patch.sqlFind && typeof patch.sqlFind === "object" ? patch.sqlFind : {};
      appState.editor.sqlFind = {
        query: String(nextSqlFind.query || ""),
        matches: Array.isArray(nextSqlFind.matches) ? nextSqlFind.matches : [],
        index: Number.isFinite(Number(nextSqlFind.index)) ? Number(nextSqlFind.index) : -1,
        replacing: Boolean(nextSqlFind.replacing)
      };
    }
  }

export function setRuntimeState(patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "isSqlRunning")) {
      appState.runtime.isSqlRunning = Boolean(patch.isSqlRunning);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "pendingExportType")) {
      appState.runtime.pendingExportType = patch.pendingExportType
        ? String(patch.pendingExportType)
        : null;
    }
  }

export function setReleaseState(patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "version")) {
      appState.release.version = String(patch.version || "").trim() || appState.release.version;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "notesByVersion")) {
      appState.release.notesByVersion = patch.notesByVersion && typeof patch.notesByVersion === "object"
        ? patch.notesByVersion
        : appState.release.notesByVersion;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "versions")) {
      appState.release.versions = Array.isArray(patch.versions) ? patch.versions : appState.release.versions;
    }
  }
