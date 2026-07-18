import { databaseMenu, dbFile, recentDbModal, saveDbBtn } from "./02-dom-database.js";
import { initSqlJsIfNeeded } from "./02-runtime-loaders.js";
import { cmEditor, exportSchemaBtn, runBtn } from "./03-dom-editor-results.js";
import { t } from "./03-localization.js";
import { clearResults } from "./05a-result-state-controller.js";
import { getDbOriginLabel, setDbDirty } from "./05b-database-dirty.js";
import { modalController } from "./05-modal-controller.js";
import { getSqlRuntime, replaceActiveDatabase } from "./07-database-runtime.js";
import { setDbInfoLabel, setStatus } from "./12-shell-status.js";
import { loadTabState } from "./23-sql-tabs-state.js";
import { addRecentDb, buildDbSessionId, getFileHandle, getRecentDbs } from "./30-database-session-storage.js";
import { assertValidSqlitePayload, getSqliteValidationErrorMessage, isExpectedSqliteValidationError, normalizeSqliteFileName } from "./32-database-file-validation.js";
import { ALLOWED_SQLITE_EXTENSIONS } from "./32a-database-file-constants.js";
import { resetSqlMapSessionState } from "./45-sql-map-core.js";
import { createDbSession } from "../core/00-contracts.js";
import { debugLog } from "../core/08-runtime-config.js";
import { findSqlTabById, getActiveSqlTabId, resetAllSqlTabResultStates } from "../core/11-state-tabs.js";
import { getSchemaObjects, setDbSessionState } from "../core/14-state-database-schema.js";
import { isSqlExecutionRunning } from "../core/15-state-runtime-library.js";
import { chooseSingleFileHandle } from "../ports/30-file-access.js";
import { loadSchema } from "../ui/10-schema.js";
import { updateAutocomplete } from "../ui/30-autocomplete.js";

export function resetAllTabResultsForNewDatabase() {
  resetAllSqlTabResultStates();
  const active = findSqlTabById(getActiveSqlTabId());
  if (active) loadTabState(active);
}

export async function replaceDatabaseSession({
  nextDb,
  nextDbBytes,
  fileName,
  sessionId,
  nextSession = null,
  dbInfoSizeBytes,
  dbOriginLabel,
  loadingMessage,
  readyMessage = "",
  rememberRecent = null,
  debugDetails = null
}) {
  const resolvedFileName = fileName || "sqlite-db";
  const resolvedSession = createDbSession(nextSession || {
    id: sessionId,
    source: "unknown",
    name: resolvedFileName,
    sizeBytes: dbInfoSizeBytes,
    lastModified: Date.now(),
    originLabel: dbOriginLabel || ""
  });

  clearResults();
  setDbSessionState({ currentBytes: nextDbBytes });
  replaceActiveDatabase(nextDb);
  setDbSessionState({
    currentFileName: resolvedFileName,
    current: resolvedSession,
    currentId: resolvedSession.id
  });
  resetSqlMapSessionState();
  setDbInfoLabel(resolvedFileName, dbInfoSizeBytes, dbOriginLabel);
  runBtn.disabled = false;
  saveDbBtn.disabled = false;
  exportSchemaBtn.disabled = false;
  setDbDirty(false);
  setStatus(loadingMessage, "ok");
  loadSchema();
  resetAllTabResultsForNewDatabase();
  if (debugDetails) debugLog("database-loaded", debugDetails);
  if (cmEditor) {
    cmEditor.refresh();
    updateAutocomplete(false);
  }
  if (typeof rememberRecent === "function") {
    await rememberRecent();
  }
  if (readyMessage) setStatus(readyMessage, "ok");
}

export async function createValidatedDatabaseRuntime({
  fileName,
  bytes,
  requireAllowedExtension = true,
  allowEmptyGeneratedPayload = false
}) {
  const nextDbBytes = new Uint8Array(bytes);
  const normalizedFileName = assertValidSqlitePayload({
    fileName,
    bytes: nextDbBytes,
    requireAllowedExtension,
    allowEmptyGeneratedPayload
  });
  await initSqlJsIfNeeded();
  const SqlJs = getSqlRuntime();
  return {
    fileName: normalizedFileName,
    nextDbBytes,
    nextDb: nextDbBytes.length ? new SqlJs.Database(nextDbBytes) : new SqlJs.Database()
  };
}

export const dbController = {
  async openFromFile(file, handle = null) {
    const buffer = await file.arrayBuffer();
    const prepared = await createValidatedDatabaseRuntime({
      fileName: file && file.name ? file.name : "sqlite-db.db",
      bytes: buffer,
      requireAllowedExtension: true
    });
    const { nextDbBytes, nextDb } = prepared;
    const fileName = prepared.fileName;
    const sessionId = buildDbSessionId({
      source: handle ? "handle" : "file",
      name: fileName,
      size: file.size,
      lastModified: file.lastModified
    });
    await replaceDatabaseSession({
      nextDb,
      nextDbBytes,
      fileName,
      sessionId,
      nextSession: createDbSession({
        id: sessionId,
        source: handle ? "handle" : "file",
        name: fileName,
        sizeBytes: file.size,
        lastModified: file.lastModified,
        originLabel: getDbOriginLabel(file, handle)
      }),
      dbInfoSizeBytes: file.size,
      dbOriginLabel: getDbOriginLabel(file, handle),
      loadingMessage: t("database.readingSchema"),
      readyMessage: t("database.ready"),
      rememberRecent: () => addRecentDb(file, handle),
      debugDetails: {
        fileName: file.name,
        fileSize: file.size,
        schemaObjects: Object.keys(getSchemaObjects()).length,
        firstObjects: Object.keys(getSchemaObjects()).slice(0, 10)
      }
    });
  },
  async openRecent(recentId = "") {
    const id = recentId || "";
    if (!id) {
      setStatus(t("database.recentRequired"), "warn");
      return;
    }

    const item = getRecentDbs().find(x => x.id === id);
    if (!item) {
      setStatus(t("database.recentMissing"), "warn");
      return;
    }

    try {
      const handle = await getFileHandle(id);
      if (handle) {
        let permission = "granted";
        if (handle.queryPermission) {
          permission = await handle.queryPermission({ mode: "read" });
        }
        if (permission !== "granted" && handle.requestPermission) {
          permission = await handle.requestPermission({ mode: "read" });
        }
        if (permission === "granted") {
          const file = await handle.getFile();
          await this.openFromFile(file, handle);
          modalController.close(recentDbModal);
          return;
        }
      }

      setStatus(t("database.reopenDenied", { name: item.name }), "warn");
    } catch (err) {
      if (!isExpectedSqliteValidationError(err)) {
        console.error(err);
      }
      setStatus(t("database.recentOpenFailed", { reason: getSqliteValidationErrorMessage(err, t) }), "error");
    }
  },
  async chooseWithFsApi() {
    const handle = await chooseSingleFileHandle({
      extensions: ALLOWED_SQLITE_EXTENSIONS,
      description: t("database.filePickerDescription")
    });
    if (!handle) return Boolean(window.showOpenFilePicker);

    const file = await handle.getFile();
    await this.openFromFile(file, handle);
    return true;
  },
  async openPicker() {
    if (isSqlExecutionRunning()) {
      setStatus(t("database.switchWait"), "warn");
      return;
    }

    try {
      if (window.showOpenFilePicker) {
        await this.chooseWithFsApi();
      } else {
        dbFile.click();
      }
    } catch (err) {
      if (!isExpectedSqliteValidationError(err)) {
        console.error(err);
      }
      setStatus(t("database.fileChooseFailed", { reason: getSqliteValidationErrorMessage(err, t) }), "error");
    }
  },
  async openFromBytes(fileName, bytes) {
    const prepared = await createValidatedDatabaseRuntime({
      fileName: normalizeSqliteFileName(fileName, "sqlite-db.db"),
      bytes,
      requireAllowedExtension: false,
      allowEmptyGeneratedPayload: true
    });
    const { nextDbBytes, nextDb } = prepared;
    const normalizedFileName = prepared.fileName;
    const sessionId = buildDbSessionId({
      source: "generated",
      name: normalizedFileName,
      size: nextDbBytes.byteLength,
      lastModified: Date.now()
    });
    await replaceDatabaseSession({
      nextDb,
      nextDbBytes,
      fileName: normalizedFileName,
      sessionId,
      nextSession: createDbSession({
        id: sessionId,
        source: "generated",
        name: normalizedFileName,
        sizeBytes: nextDbBytes.byteLength,
        lastModified: Date.now(),
        originLabel: t("database.generatedOrigin")
      }),
      dbInfoSizeBytes: nextDbBytes.byteLength,
      dbOriginLabel: t("database.generatedOrigin"),
      loadingMessage: t("database.createdReading")
    });
  }
};

export async function openDbFromFile(file, handle = null) {
  return dbController.openFromFile(file, handle);
}

export async function openRecentDb(recentId = "") {
  return dbController.openRecent(recentId);
}

export async function openDatabasePicker() {
  return dbController.openPicker();
}

export function closeDatabaseMenu() {
  if (databaseMenu) databaseMenu.open = false;
}
