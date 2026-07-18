import { getCurrentDbBytes } from "../core/14-state-database-schema.js";

export let SQL = null;
export let db = null;

export function getSqlRuntime() {
  return SQL;
}

export function setSqlRuntime(nextSqlRuntime) {
  SQL = nextSqlRuntime || null;
  return SQL;
}

export function getActiveDatabase() {
  return db;
}

export function hasActiveDatabase() {
  return Boolean(db);
}

export function setActiveDatabase(nextDb) {
  db = nextDb || null;
  return db;
}

export function closeDatabaseConnection(databaseHandle, warningCode = "sqlite-close-failed") {
  if (!databaseHandle || typeof databaseHandle.close !== "function") return;
  try {
    databaseHandle.close();
  } catch (error) {
    console.warn(warningCode, error);
  }
}

export function replaceActiveDatabase(nextDb) {
  const previousDb = db;
  db = nextDb || null;
  if (previousDb && previousDb !== db) {
    closeDatabaseConnection(previousDb, "previous-sqlite-close-failed");
  }
  return db;
}

export function rehydrateActiveDatabaseFromSessionBytes() {
  const currentBytes = getCurrentDbBytes();
  if (!currentBytes || !currentBytes.byteLength) {
    replaceActiveDatabase(null);
    return null;
  }
  const SqlJs = getSqlRuntime();
  if (!SqlJs) {
    const error = new Error("runtime.sqlJsUnavailable");
    error.code = "sql-runtime-unavailable";
    throw error;
  }
  return replaceActiveDatabase(new SqlJs.Database(currentBytes));
}
