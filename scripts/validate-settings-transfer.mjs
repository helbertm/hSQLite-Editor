import { validateSettingsImportPayload } from "../src/core/05-settings-import-contract.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectFailure(payload, scopes, expectedMessage) {
  let error = null;
  try {
    validateSettingsImportPayload(payload, scopes);
  } catch (caught) {
    error = caught;
  }
  assert(error, "Expected settings payload validation to fail.");
  assert(
    String(error.message).includes(expectedMessage),
    `Expected error containing "${expectedMessage}", got "${error.message}".`
  );
}

const multiScopePayload = {
  version: 1,
  exportedAt: "2026-07-18T00:00:00.000Z",
  scopes: ["favorites", "queryHistory", "theme", "locale", "session", "tabPreset"],
  data: {
    favorites: [{ id: "fav-1", sql: "select 1", createdAt: "2026-07-18T00:00:00.000Z" }],
    queryHistory: [{
      id: "history-1",
      sql: "select 2",
      status: "success",
      errorMessage: "",
      executedAt: "2026-07-18T00:00:00.000Z"
    }],
    theme: "light",
    locale: "es-ES",
    session: {
      shouldPersistSession: true,
      sqlTabs: {
        version: 1,
        activeTabId: "tab-1",
        nextSqlTabNumber: 2,
        nextSqlTabNameIndex: 1,
        tabs: [{ id: "tab-1", title: "SQL 1", sql: "select 3" }]
      }
    },
    tabPreset: "star_wars"
  }
};

const favoritesOnly = validateSettingsImportPayload(multiScopePayload, ["favorites"]);
assert(Object.keys(favoritesOnly).join(",") === "favorites", "Selected scope isolation failed.");
assert(favoritesOnly.favorites[0].sql === "select 1", "Favorite normalization failed.");

expectFailure(
  { ...multiScopePayload, version: 2 },
  ["favorites"],
  "Unsupported settings version"
);
expectFailure(
  { ...multiScopePayload, data: { ...multiScopePayload.data, unknown: true } },
  ["favorites"],
  "unsupported keys"
);
expectFailure(
  { ...multiScopePayload, data: { ...multiScopePayload.data, theme: "system" } },
  ["theme"],
  "theme must be dark or light"
);
expectFailure(
  {
    ...multiScopePayload,
    data: {
      ...multiScopePayload.data,
      session: {
        shouldPersistSession: true,
        sqlTabs: {
          version: 1,
          activeTabId: "missing",
          nextSqlTabNumber: 2,
          nextSqlTabNameIndex: 1,
          tabs: [{ id: "tab-1", title: "SQL 1", sql: "select 3" }]
        }
      }
    }
  },
  ["session"],
  "activeTabId must reference"
);

console.log("Settings-transfer contract validation passed.");
