import { QUERY_HISTORY_LIMIT } from "../core/03-app-limits.js";

export const STORAGE_KEYS = {
  STORAGE_SCHEMA_VERSION: "hSQLiteEditorStorageSchemaVersion",
  SQL_TABS: "hSQLiteEditorSqlTabsV1",
  SESSION_PERSISTENCE: "hSQLiteEditorSessionPersistenceV1",
  FIRST_RUN_DONE: "hSQLiteEditorFirstRunDoneV1",
  QUERY_HISTORY: "hSQLiteEditorQueryHistoryV1",
  FAVORITES: "hSQLiteEditorFavoritesV1",
  THEME: "hSQLiteEditorThemeV1",
  TAB_NAME_PRESET: "hSQLiteEditorTabNamePresetV1",
  SCHEMA_COLLAPSED: "hSQLiteEditorSchemaCollapsedV1",
  SCHEMA_FILTERS: "hSQLiteEditorSchemaFiltersV1",
  RECENT_DBS: "hSQLiteEditorRecentDbsV1",
  FILE_HANDLES_STORE: "hSQLiteEditorFileHandlesV1",
  LAST_SETTINGS_EXPORT_AT: "hSQLiteEditorLastSettingsExportAtV1",
  LAST_SEEN_RELEASE_VERSION: "hSQLiteEditorLastSeenReleaseVersionV1",
  LOCALE: "hSQLiteEditorLocaleV1"
};

export const CURRENT_STORAGE_SCHEMA_VERSION = 3;
// ports/storage: browser persistence adapter
export const storage = {
  get(key, fallback = null) {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  },
  set(key, value) {
    localStorage.setItem(key, value);
  },
  remove(key) {
    localStorage.removeItem(key);
  },
  getJSON(key, fallback) {
    const raw = this.get(key, null);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  setJSON(key, value) {
    this.set(key, JSON.stringify(value));
  },
  getNumber(key, fallback = 0) {
    const raw = this.get(key, null);
    if (raw === null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }
};

export const storageMigrationController = {
  migrateV0ToV1() {
    // Ensure schema filters always follow the newer object contract.
    const fallback = { all: false, selectedTypes: ["table", "view"] };
    const raw = storage.getJSON(STORAGE_KEYS.SCHEMA_FILTERS, fallback);
    let migrated = fallback;

    if (typeof raw === "string") {
      const legacyType = String(raw || "").trim().toLowerCase();
      if (legacyType === "all") migrated = { all: true, selectedTypes: ["table", "view"] };
      else if (legacyType) migrated = { all: false, selectedTypes: [legacyType] };
    } else if (raw && typeof raw === "object") {
      const selected = Array.isArray(raw.selectedTypes) ? raw.selectedTypes : fallback.selectedTypes;
      migrated = { all: Boolean(raw.all), selectedTypes: selected };
    }

    storage.setJSON(STORAGE_KEYS.SCHEMA_FILTERS, migrated);
  },
  migrateV1ToV2() {
    // Normalize persisted SQL tabs for inline rename limits and safe defaults.
    const raw = storage.getJSON(STORAGE_KEYS.SQL_TABS, null);
    if (!raw || typeof raw !== "object") return;
    if (!Array.isArray(raw.tabs)) return;

    raw.tabs = raw.tabs.map((tab, index) => {
      const id = String(tab && tab.id ? tab.id : `tab_migrated_${index}`);
      const title = String(tab && tab.title ? tab.title : "").trim().slice(0, 50) || `SQL ${index + 1}`;
      const sql = String(tab && tab.sql ? tab.sql : "select *\nfrom \nwhere\norder by");
      return { id, title, sql };
    });
    storage.setJSON(STORAGE_KEYS.SQL_TABS, raw);
  },
  run() {
    const current = storage.getNumber(STORAGE_KEYS.STORAGE_SCHEMA_VERSION, 0);
    let version = current;
    try {
      if (version < 1) {
        this.migrateV0ToV1();
        version = 1;
      }
      if (version < 2) {
        this.migrateV1ToV2();
        version = 2;
      }
      if (version < 3) {
        const storedLocale = storage.get(STORAGE_KEYS.LOCALE, "");
        if (storedLocale && !["en-US", "pt-BR", "es-ES"].includes(storedLocale)) {
          storage.remove(STORAGE_KEYS.LOCALE);
        }
        version = 3;
      }
    } catch (err) {
      console.warn("storage-migration-fallback", err);
    } finally {
      storage.set(STORAGE_KEYS.STORAGE_SCHEMA_VERSION, String(Math.max(version, CURRENT_STORAGE_SCHEMA_VERSION)));
    }
  }
};

export const sqlTabsStorage = {
  save(payload) {
    storage.setJSON(STORAGE_KEYS.SQL_TABS, payload);
  },
  load() {
    return storage.getJSON(STORAGE_KEYS.SQL_TABS, null);
  },
  clear() {
    storage.remove(STORAGE_KEYS.SQL_TABS);
  }
};

export const queryHistoryStorage = {
  load() {
    return storage.getJSON(STORAGE_KEYS.QUERY_HISTORY, []);
  },
  save(items) {
    storage.setJSON(STORAGE_KEYS.QUERY_HISTORY, items.slice(0, QUERY_HISTORY_LIMIT));
  }
};

export const favoritesStorage = {
  load() {
    return storage.getJSON(STORAGE_KEYS.FAVORITES, []);
  },
  save(items) {
    storage.setJSON(STORAGE_KEYS.FAVORITES, items.slice(0, QUERY_HISTORY_LIMIT));
  }
};
