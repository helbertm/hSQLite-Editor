import { formatDateTime, getLocale, setLocale, t } from "./03-localization.js";
import { exportSettingsBtn, importSettingsInput, lastSettingsExportInfo, settingsTransferModal } from "./05-dom-library-settings.js";
import { modalController } from "./05-modal-controller.js";
import { setStatus } from "./12-shell-status.js";
import { setSessionPersistence, setTheme } from "./15-preferences.js";
import { saveQueryHistoryToStorage } from "./20-history-query.js";
import { favoritesController } from "./21-history-favorites.js";
import { setTabNamePresetPreference } from "./22a-sql-tab-presets.js";
import { SETTINGS_TRANSFER_MAX_FILE_CHARS, validateSettingsImportPayload } from "../core/05-settings-import-contract.js";
import { getSelectedTabNamePreset, getShouldPersistSession } from "../core/13-state-preferences.js";
import { getFavoriteQueriesState, getQueryHistoryState, setFavoriteQueriesState, setQueryHistoryState } from "../core/15-state-runtime-library.js";
import { STORAGE_KEYS, sqlTabsStorage, storage } from "../ports/05-storage.js";
import { downloadText } from "../ports/10-browser-io.js";

export function getSelectedConfigScopes() {
  return Array.from(settingsTransferModal.querySelectorAll(".cfg-scope:checked")).map(el => el.value);
}

export function hasAnyConfigScopeSelected() {
  return getSelectedConfigScopes().length > 0;
}

export function cloneSettingsValue(value) {
  return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export function captureSettingsImportSnapshot() {
  return {
    favorites: cloneSettingsValue(getFavoriteQueriesState()),
    queryHistory: cloneSettingsValue(getQueryHistoryState()),
    theme: document.documentElement.dataset.theme || "dark",
    locale: getLocale(),
    shouldPersistSession: getShouldPersistSession(),
    sqlTabs: cloneSettingsValue(sqlTabsStorage.load()),
    tabPreset: getSelectedTabNamePreset()
  };
}

export function restoreSettingsImportSnapshot(snapshot) {
  setFavoriteQueriesState(snapshot.favorites);
  favoritesController.save();
  setQueryHistoryState(snapshot.queryHistory);
  saveQueryHistoryToStorage();
  setTheme(snapshot.theme);
  setLocale(snapshot.locale);
  setSessionPersistence(snapshot.shouldPersistSession);
  if (snapshot.shouldPersistSession && snapshot.sqlTabs) sqlTabsStorage.save(snapshot.sqlTabs);
  if (!snapshot.shouldPersistSession) sqlTabsStorage.clear();
  setTabNamePresetPreference(snapshot.tabPreset);
}

export function applySettingsImportPlan(plan) {
  if (Object.prototype.hasOwnProperty.call(plan, "favorites")) {
    setFavoriteQueriesState(plan.favorites);
    favoritesController.save();
  }
  if (Object.prototype.hasOwnProperty.call(plan, "queryHistory")) {
    setQueryHistoryState(plan.queryHistory);
    saveQueryHistoryToStorage();
  }
  if (Object.prototype.hasOwnProperty.call(plan, "theme")) setTheme(plan.theme);
  if (Object.prototype.hasOwnProperty.call(plan, "locale")) setLocale(plan.locale);
  if (Object.prototype.hasOwnProperty.call(plan, "session")) {
    setSessionPersistence(plan.session.shouldPersistSession);
    if (plan.session.shouldPersistSession && plan.session.sqlTabs) {
      sqlTabsStorage.save(plan.session.sqlTabs);
    }
  }
  if (Object.prototype.hasOwnProperty.call(plan, "tabPreset")) {
    setTabNamePresetPreference(plan.tabPreset);
  }
}

export function updateSettingsTransferActionsState() {
  const hasAny = hasAnyConfigScopeSelected();
  if (exportSettingsBtn) exportSettingsBtn.disabled = !hasAny;
  if (importSettingsInput) importSettingsInput.disabled = !hasAny;
}

export function formatLastSettingsExportDate(isoValue) {
  if (!isoValue) return "";
  try {
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return "";
    return formatDateTime(date);
  } catch {
    return "";
  }
}

export function formatRelativeTimeFromNow(isoValue) {
  if (!isoValue) return "";
  try {
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return "";
    const diffMs = date.getTime() - Date.now();
    const absMs = Math.abs(diffMs);
    if (absMs < 60000) return t("settings.justNow");
    const rtf = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });
    const steps = [
      { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
      { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
      { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
      { unit: "day", ms: 24 * 60 * 60 * 1000 },
      { unit: "hour", ms: 60 * 60 * 1000 },
      { unit: "minute", ms: 60 * 1000 }
    ];
    for (const step of steps) {
      const value = Math.round(diffMs / step.ms);
      if (Math.abs(value) >= 1) return rtf.format(value, step.unit);
    }
    return t("settings.justNow");
  } catch {
    return "";
  }
}

export function renderLastSettingsExportInfo() {
  if (!lastSettingsExportInfo) return;
  const lastExportAt = storage.get(STORAGE_KEYS.LAST_SETTINGS_EXPORT_AT, "");
  const fullDate = formatLastSettingsExportDate(lastExportAt);
  if (!fullDate) {
    lastSettingsExportInfo.textContent = t("settings.exportNever");
    return;
  }
  const relative = formatRelativeTimeFromNow(lastExportAt);
  lastSettingsExportInfo.textContent = relative
    ? t("settings.exportAtRelative", { date: fullDate, relative })
    : t("settings.exportAt", { date: fullDate });
}

export function exportSettingsConfig() {
  if (!hasAnyConfigScopeSelected()) {
    setStatus(t("settings.scopeRequiredExport"), "warn");
    return;
  }
  const scopes = new Set(getSelectedConfigScopes());
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    scopes: Array.from(scopes),
    data: {}
  };
  if (scopes.has("favorites")) payload.data.favorites = getFavoriteQueriesState();
  if (scopes.has("queryHistory")) payload.data.queryHistory = getQueryHistoryState();
  if (scopes.has("theme")) payload.data.theme = document.documentElement.dataset.theme || "dark";
  if (scopes.has("locale")) payload.data.locale = getLocale();
  if (scopes.has("session")) payload.data.session = {
    shouldPersistSession: getShouldPersistSession(),
    sqlTabs: sqlTabsStorage.load()
  };
  if (scopes.has("tabPreset")) payload.data.tabPreset = getSelectedTabNamePreset();

  downloadText(
    `hsqlite-config-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.json`,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8"
  );
  storage.set(STORAGE_KEYS.LAST_SETTINGS_EXPORT_AT, payload.exportedAt);
  renderLastSettingsExportInfo();
  setStatus(t("settings.exported"), "ok");
}

export async function importSettingsConfig(file) {
  if (!file) return;
  if (!hasAnyConfigScopeSelected()) {
    setStatus(t("settings.scopeRequiredImport"), "warn");
    importSettingsInput.value = "";
    return;
  }
  try {
    const raw = await file.text();
    if (raw.length > SETTINGS_TRANSFER_MAX_FILE_CHARS) {
      throw new Error(`Settings file exceeds ${SETTINGS_TRANSFER_MAX_FILE_CHARS} characters.`);
    }
    const parsed = JSON.parse(raw);
    const plan = validateSettingsImportPayload(parsed, getSelectedConfigScopes());
    const snapshot = captureSettingsImportSnapshot();
    try {
      applySettingsImportPlan(plan);
    } catch (error) {
      restoreSettingsImportSnapshot(snapshot);
      throw error;
    }

    setStatus(t("settings.imported"), "ok");
    modalController.close(settingsTransferModal);
  } catch (err) {
    console.warn("Settings import rejected.", err);
    setStatus(t("settings.importFailed"), "error");
  } finally {
    importSettingsInput.value = "";
  }
}
