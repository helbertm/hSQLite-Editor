import { appState } from "./10-state-root.js";

export function getPreferencesState() {
    return appState.preferences;
  }

export function getShouldPersistSession() {
    return appState.preferences.shouldPersistSession;
  }

export function getSelectedLocale() {
    return appState.preferences.locale;
  }

export function getSelectedTabNamePreset() {
    return appState.preferences.tabNamePreset;
  }

export function isSchemaPanelCollapsed() {
    return appState.preferences.schemaCollapsed;
  }

export function getSchemaFilterState() {
    return appState.preferences.schemaFilters;
  }

export function normalizeSchemaFilterPreference(nextState = {}) {
    const selectedTypes = new Set(
      Array.from(nextState.selectedTypes || [])
        .map((type) => String(type || "").trim().toLowerCase().replace(/\s+/g, "_"))
        .filter(Boolean)
    );
    if (!selectedTypes.size) {
      selectedTypes.add("table");
      selectedTypes.add("view");
    }
    return {
      all: Boolean(nextState.all),
      selectedTypes
    };
  }

export function setPreferencesState(patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "shouldPersistSession")) {
      appState.preferences.shouldPersistSession = Boolean(patch.shouldPersistSession);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "locale")) {
      const locale = String(patch.locale || "").trim();
      appState.preferences.locale = ["en-US", "pt-BR", "es-ES"].includes(locale) ? locale : "en-US";
    }
    if (Object.prototype.hasOwnProperty.call(patch, "tabNamePreset")) {
      const nextPreset = String(patch.tabNamePreset || "").trim();
      appState.preferences.tabNamePreset = nextPreset || "tlor";
    }
    if (Object.prototype.hasOwnProperty.call(patch, "schemaCollapsed")) {
      appState.preferences.schemaCollapsed = Boolean(patch.schemaCollapsed);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "schemaFilters")) {
      appState.preferences.schemaFilters = normalizeSchemaFilterPreference(patch.schemaFilters || {});
    }
  }
