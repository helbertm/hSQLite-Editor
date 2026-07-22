import { createReleaseMetadata } from "./00-contracts.js";

const runtimeGlobal = globalThis.window || globalThis;

export const BOOT = runtimeGlobal.__HSQLITE_BOOT__ || {
  release: {},
  sqlWasmBase64: "",
  sqlJsWorkerSource: "",
  sqlWorkerSharedSource: ""
};
export const APP_LOG_PREFIX = "[hSQLite Editor]";
export const HSQLITE_DEBUG_FLAG = "HSQLITE_EDITOR_DEBUG";
export const EMBEDDED_SQLJS_WASM_DATA_URL = BOOT.sqlWasmBase64
  ? `data:application/wasm;base64,${BOOT.sqlWasmBase64}`
  : "";
export const EMBEDDED_SQLJS_WORKER_SOURCE = BOOT.sqlJsWorkerSource || "";
export const EMBEDDED_SQL_WORKER_SHARED_SOURCE = BOOT.sqlWorkerSharedSource || "";
export const SHORTCUT_ACTIONS = {
  copy: "F6",
  clear: "F7",
  clearPaste: "F8",
  csv: "F9",
  json: "F10",
  openSql: ["Cmd-O", "Ctrl-O"],
  openRunSql: ["Cmd-Shift-O", "Ctrl-Shift-O"],
  save: ["Cmd-S", "Ctrl-S"]
};

runtimeGlobal[HSQLITE_DEBUG_FLAG] = runtimeGlobal[HSQLITE_DEBUG_FLAG] || false;
export const INITIAL_RELEASE_METADATA = createReleaseMetadata(BOOT.release || {});

export function getInitialReleaseMetadata() {
  return INITIAL_RELEASE_METADATA;
}

export function debugLog(message, details = null) {
  if (runtimeGlobal[HSQLITE_DEBUG_FLAG] !== true) return;
  if (details === null) {
    console.debug(APP_LOG_PREFIX, message);
    return;
  }
  console.debug(APP_LOG_PREFIX, message, details);
}
