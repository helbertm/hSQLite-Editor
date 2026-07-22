import { t } from "./03-localization.js";
import { getSqlRuntime, setSqlRuntime } from "./07-database-runtime.js";
import { setStatus } from "./12-shell-status.js";
import { EMBEDDED_SQLJS_WASM_DATA_URL } from "../core/08-runtime-config.js";

export async function ensureSqlJsRuntimeLoaded() {
  return typeof window.initSqlJs === "function";
}

export async function ensureEditorRuntimeLoaded() {
  return Boolean(window.HSQLiteCodeEditor);
}

export async function initSqlJsIfNeeded() {
  const existingSqlRuntime = getSqlRuntime();
  if (existingSqlRuntime) return existingSqlRuntime;
  setStatus(t("runtime.loadingSqlJs"));
  const loaded = await ensureSqlJsRuntimeLoaded();
  if (!loaded || typeof window.initSqlJs !== "function") {
    throw new Error(t("runtime.sqlJsInitFailed"));
  }
  if (!EMBEDDED_SQLJS_WASM_DATA_URL) {
    throw new Error(t("runtime.wasmMissing"));
  }
  const nextSqlRuntime = await window.initSqlJs({
    locateFile: () => EMBEDDED_SQLJS_WASM_DATA_URL
  });
  return setSqlRuntime(nextSqlRuntime);
}
