import { SUPPORTED_LOCALES } from "./02-locales.js";
import { MAX_SQL_TABS, QUERY_HISTORY_LIMIT } from "./03-app-limits.js";
import { SQL_TAB_NAME_PRESETS } from "./04-tab-name-presets.js";

export const SETTINGS_TRANSFER_VERSION = 1;

export const SETTINGS_TRANSFER_MAX_FILE_CHARS = 2_000_000;

export const SETTINGS_TRANSFER_MAX_SQL_CHARS = 250_000;

export const SETTINGS_TRANSFER_SCOPES = Object.freeze([
  "favorites",
  "queryHistory",
  "theme",
  "locale",
  "session",
  "tabPreset"
]);

export const SETTINGS_TRANSFER_DATA_KEYS = Object.freeze(new Set(SETTINGS_TRANSFER_SCOPES));

export function isPlainSettingsObject(value) {
  return Boolean(value)
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.prototype.toString.call(value) === "[object Object]";
}

export function assertSettingsKeys(value, allowedKeys, label) {
  const unknownKeys = Object.keys(value).filter(key => !allowedKeys.includes(key));
  if (unknownKeys.length) {
    throw new Error(`${label} contains unsupported keys: ${unknownKeys.join(", ")}.`);
  }
}

export function normalizeSettingsString(value, label, maxLength, { required = false } = {}) {
  if (typeof value !== "string") throw new Error(`${label} must be a string.`);
  const normalized = value.trim();
  if (required && !normalized) throw new Error(`${label} cannot be empty.`);
  if (normalized.length > maxLength) throw new Error(`${label} exceeds ${maxLength} characters.`);
  return normalized;
}

export function normalizeSettingsTimelineItems(items, scope) {
  if (!Array.isArray(items)) throw new Error(`${scope} must be an array.`);
  if (items.length > QUERY_HISTORY_LIMIT) {
    throw new Error(`${scope} exceeds the ${QUERY_HISTORY_LIMIT}-item limit.`);
  }
  return items.map((item, index) => {
    if (!isPlainSettingsObject(item)) throw new Error(`${scope}[${index}] must be an object.`);
    const isFavorite = scope === "favorites";
    const allowedKeys = isFavorite
      ? ["id", "sql", "createdAt"]
      : ["id", "sql", "status", "errorMessage", "executedAt", "createdAt"];
    assertSettingsKeys(item, allowedKeys, `${scope}[${index}]`);
    const normalized = {
      id: normalizeSettingsString(item.id, `${scope}[${index}].id`, 128, { required: true }),
      sql: normalizeSettingsString(item.sql, `${scope}[${index}].sql`, SETTINGS_TRANSFER_MAX_SQL_CHARS, { required: true })
    };
    if (isFavorite) {
      normalized.createdAt = normalizeSettingsString(item.createdAt || "", `${scope}[${index}].createdAt`, 64);
    } else {
      normalized.executedAt = normalizeSettingsString(
        item.executedAt || item.createdAt || "",
        `${scope}[${index}].executedAt`,
        64
      );
      normalized.status = item.status === "success" ? "success" : "error";
      normalized.errorMessage = normalizeSettingsString(
        item.errorMessage || "",
        `${scope}[${index}].errorMessage`,
        8_000
      );
    }
    return normalized;
  });
}

export function normalizeSettingsSession(session) {
  if (!isPlainSettingsObject(session)) throw new Error("session must be an object.");
  assertSettingsKeys(session, ["shouldPersistSession", "sqlTabs"], "session");
  if (typeof session.shouldPersistSession !== "boolean") {
    throw new Error("session.shouldPersistSession must be a boolean.");
  }
  if (session.sqlTabs === null || session.sqlTabs === undefined) {
    return { shouldPersistSession: session.shouldPersistSession, sqlTabs: null };
  }
  if (!isPlainSettingsObject(session.sqlTabs)) throw new Error("session.sqlTabs must be an object or null.");
  assertSettingsKeys(
    session.sqlTabs,
    ["version", "activeTabId", "nextSqlTabNumber", "nextSqlTabNameIndex", "tabs"],
    "session.sqlTabs"
  );
  if (session.sqlTabs.version !== 1) throw new Error("session.sqlTabs.version must be 1.");
  if (!Array.isArray(session.sqlTabs.tabs) || session.sqlTabs.tabs.length > MAX_SQL_TABS) {
    throw new Error(`session.sqlTabs.tabs must contain at most ${MAX_SQL_TABS} items.`);
  }
  const tabs = session.sqlTabs.tabs.map((tab, index) => {
    if (!isPlainSettingsObject(tab)) throw new Error(`session.sqlTabs.tabs[${index}] must be an object.`);
    assertSettingsKeys(tab, ["id", "title", "sql"], `session.sqlTabs.tabs[${index}]`);
    return {
      id: normalizeSettingsString(tab.id, `session.sqlTabs.tabs[${index}].id`, 128, { required: true }),
      title: normalizeSettingsString(tab.title, `session.sqlTabs.tabs[${index}].title`, 50, { required: true }),
      sql: normalizeSettingsString(tab.sql || "", `session.sqlTabs.tabs[${index}].sql`, SETTINGS_TRANSFER_MAX_SQL_CHARS)
    };
  });
  const activeTabId = normalizeSettingsString(session.sqlTabs.activeTabId || "", "session.sqlTabs.activeTabId", 128);
  if (activeTabId && !tabs.some(tab => tab.id === activeTabId)) {
    throw new Error("session.sqlTabs.activeTabId must reference an imported tab.");
  }
  const nextSqlTabNumber = Number(session.sqlTabs.nextSqlTabNumber);
  const nextSqlTabNameIndex = Number(session.sqlTabs.nextSqlTabNameIndex);
  if (!Number.isInteger(nextSqlTabNumber) || nextSqlTabNumber < 1 || nextSqlTabNumber > 10_000) {
    throw new Error("session.sqlTabs.nextSqlTabNumber is out of range.");
  }
  if (!Number.isInteger(nextSqlTabNameIndex) || nextSqlTabNameIndex < 0 || nextSqlTabNameIndex > 10_000) {
    throw new Error("session.sqlTabs.nextSqlTabNameIndex is out of range.");
  }
  return {
    shouldPersistSession: session.shouldPersistSession,
    sqlTabs: {
      version: 1,
      activeTabId: activeTabId || tabs[0]?.id || "",
      nextSqlTabNumber,
      nextSqlTabNameIndex,
      tabs
    }
  };
}

export function validateSettingsImportPayload(parsed, selectedScopes) {
  if (!isPlainSettingsObject(parsed)) throw new Error("Settings payload must be an object.");
  assertSettingsKeys(parsed, ["version", "exportedAt", "scopes", "data"], "Settings payload");
  if (parsed.version !== SETTINGS_TRANSFER_VERSION) {
    throw new Error(`Unsupported settings version: ${String(parsed.version)}.`);
  }
  if (!Array.isArray(parsed.scopes) || !parsed.scopes.every(scope => SETTINGS_TRANSFER_SCOPES.includes(scope))) {
    throw new Error("Settings payload contains invalid scopes.");
  }
  if (new Set(parsed.scopes).size !== parsed.scopes.length) {
    throw new Error("Settings payload contains duplicate scopes.");
  }
  if (!isPlainSettingsObject(parsed.data)) throw new Error("Settings payload data must be an object.");
  assertSettingsKeys(parsed.data, [...SETTINGS_TRANSFER_DATA_KEYS], "Settings payload data");

  const requestedScopes = new Set(selectedScopes);
  if (!requestedScopes.size || ![...requestedScopes].every(scope => SETTINGS_TRANSFER_SCOPES.includes(scope))) {
    throw new Error("Select at least one valid settings scope.");
  }

  const plan = {};
  for (const scope of requestedScopes) {
    if (!parsed.scopes.includes(scope) || !Object.prototype.hasOwnProperty.call(parsed.data, scope)) continue;
    if (scope === "favorites" || scope === "queryHistory") {
      plan[scope] = normalizeSettingsTimelineItems(parsed.data[scope], scope);
    } else if (scope === "theme") {
      if (!["dark", "light"].includes(parsed.data.theme)) throw new Error("theme must be dark or light.");
      plan.theme = parsed.data.theme;
    } else if (scope === "locale") {
      if (!SUPPORTED_LOCALES.includes(parsed.data.locale)) throw new Error("locale is not supported.");
      plan.locale = parsed.data.locale;
    } else if (scope === "session") {
      plan.session = normalizeSettingsSession(parsed.data.session);
    } else if (scope === "tabPreset") {
      if (!Object.prototype.hasOwnProperty.call(SQL_TAB_NAME_PRESETS, parsed.data.tabPreset)) {
        throw new Error("tabPreset is not supported.");
      }
      plan.tabPreset = parsed.data.tabPreset;
    }
  }
  return plan;
}
