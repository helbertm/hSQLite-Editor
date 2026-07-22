import { cancelNewDbBtn, confirmNewDbBtn, newDbBtn, newDbFileNameInput, newDbModal, saveDbBtn } from "../capabilities/02-dom-database.js";
import { initSqlJsIfNeeded } from "../capabilities/02-runtime-loaders.js";
import { exportSchemaBtn, runBtn, saveSqlBtn } from "../capabilities/03-dom-editor-results.js";
import { t } from "../capabilities/03-localization.js";
import { modalController } from "../capabilities/05-modal-controller.js";
import { setDbDirty } from "../capabilities/05b-database-dirty.js";
import { getActiveDatabase, hasActiveDatabase, rehydrateActiveDatabaseFromSessionBytes } from "../capabilities/07-database-runtime.js";
import { executeSql } from "../capabilities/10-sql-execution.js";
import { setStatus } from "../capabilities/12-shell-status.js";
import { closeDatabaseMenu, dbController } from "../capabilities/31-database-session-runtime.js";
import { normalizeSqliteFileName } from "../capabilities/32-database-file-validation.js";
import { getEditorValue } from "../capabilities/32a-editor-api.js";
import { getCurrentDbFileName, setDbSessionState } from "../core/14-state-database-schema.js";
import { isSqlExecutionRunning } from "../core/15-state-runtime-library.js";
import { downloadBinary, downloadText } from "../ports/10-browser-io.js";
import { loadSchema } from "./10-schema.js";

export const newDbController = {
    defaultFileName() {
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      return `${t("database.defaultNewBaseName")}-${yyyy}${mm}${dd}.db`;
    },
    normalizeFileName(rawValue) {
      return normalizeSqliteFileName(rawValue, this.defaultFileName());
    },
    openModal() {
      if (isSqlExecutionRunning()) {
        setStatus(t("database.createWait"), "warn");
        return;
      }
      newDbFileNameInput.value = this.defaultFileName();
      modalController.open(newDbModal);
      newDbFileNameInput.focus();
      newDbFileNameInput.select();
    },
    closeModal() {
      modalController.close(newDbModal);
    },
    async confirm() {
      if (isSqlExecutionRunning()) {
        setStatus(t("database.createWait"), "warn");
        return;
      }

      const fileName = this.normalizeFileName(newDbFileNameInput.value);

      try {
        confirmNewDbBtn.disabled = true;
        confirmNewDbBtn.textContent = t("database.creating");
        const SqlJs = await initSqlJsIfNeeded();
        const emptyDb = new SqlJs.Database();
        const bytes = emptyDb.export();
        if (typeof emptyDb.close === "function") emptyDb.close();

        await openDbFromBytes(fileName, bytes);
        setDbDirty(false);

        this.closeModal();
        setStatus(t("database.created", { name: fileName }), "ok");
      } catch (err) {
        console.error(err);
        setStatus(t("database.actionFailed", { reason: err.message || String(err) }), "error");
      } finally {
        confirmNewDbBtn.disabled = false;
        confirmNewDbBtn.textContent = t("database.create");
      }
    }
  };

  export function openNewDbModal() {
    newDbController.openModal();
  }

  export function closeNewDbModal() {
    newDbController.closeModal();
  }

  export async function confirmNewDatabase() {
    return newDbController.confirm();
  }

  export async function openDbFromBytes(fileName, bytes) {
    return dbController.openFromBytes(fileName, bytes);
  }

  export function saveSql() {
    const sql = getEditorValue().trim();
    downloadText(t("file.defaultSqlName"), sql + "\n", "application/sql;charset=utf-8");
  }

  export function saveCurrentDatabase() {
    const activeDb = getActiveDatabase();
    if (!activeDb) {
      setStatus(t("database.saveRequired"), "warn");
      return;
    }

    try {
      const fileName = getCurrentDbFileName() || "sqlite-db.db";
      const dbBytes = activeDb.export();
      setDbSessionState({ currentBytes: new Uint8Array(dbBytes) });
      rehydrateActiveDatabaseFromSessionBytes();
      loadSchema();
      downloadBinary(fileName, dbBytes, "application/x-sqlite3");
      setDbDirty(false);
      setStatus(t("database.saved", { name: fileName }), "ok");
    } catch (err) {
      console.error(err);
      setStatus(t("database.actionFailed", { reason: err.message || String(err) }), "error");
    }
  }

  export function getSchemaExportBaseName() {
    const fallback = "sqlite-db";
    const rawName = (getCurrentDbFileName() || "").trim();
    const safe = (rawName || fallback).replace(/[\\/:*?"<>|]+/g, "_");
    return safe.replace(/\.(db|sqlite|sqlite3)$/i, "") || fallback;
  }

  export function ensureSqlStatementTerminator(sqlText) {
    const text = String(sqlText || "").trim();
    if (!text) return "";
    return /;\s*$/.test(text) ? text : `${text};`;
  }

  export function buildEmptyDatabaseStructureSql() {
    const activeDb = getActiveDatabase();
    if (!activeDb) return "";
    const query = `
      select type, name, sql
      from sqlite_schema
      where sql is not null
        and type in ('table', 'view', 'index', 'trigger')
        and name not like 'sqlite_%'
      order by
        case type
          when 'table' then 1
          when 'view' then 2
          when 'index' then 3
          when 'trigger' then 4
          else 99
        end,
        lower(name)
    `;
    const result = activeDb.exec(query);
    const rows = result && result[0] ? result[0].values : [];

    if (!rows.length) return "";

    const lines = [];
    lines.push(`-- ${t("database.schemaExportHeader")}`);
    lines.push(`-- ${t("database.schemaExportSource", { name: getCurrentDbFileName() || t("common.unidentified") })}`);
    lines.push(`-- ${t("database.schemaExportGenerated", { date: new Date().toISOString() })}`);
    lines.push("");
    lines.push("PRAGMA foreign_keys = OFF;");
    lines.push("BEGIN TRANSACTION;");
    lines.push("");

    for (const row of rows) {
      const type = String(row[0] || "").toLowerCase();
      const name = String(row[1] || "");
      const sqlText = ensureSqlStatementTerminator(row[2]);
      if (!sqlText) continue;
      lines.push(`-- ${type.toUpperCase()}: ${name}`);
      lines.push(sqlText);
      lines.push("");
    }

    lines.push("COMMIT;");
    lines.push("PRAGMA foreign_keys = ON;");
    lines.push("");

    return lines.join("\n");
  }

  export function exportEmptyDatabaseStructure() {
    if (!hasActiveDatabase()) {
      setStatus(t("status.databaseRequired"), "warn");
      return;
    }

    try {
      const script = buildEmptyDatabaseStructureSql();
      if (!script) {
        setStatus(t("database.schemaExportEmpty"), "warn");
        return;
      }
      const fileName = `${getSchemaExportBaseName()}-schema.sql`;
      downloadText(fileName, script, "application/sql;charset=utf-8");
      setStatus(t("database.schemaExported", { name: fileName }), "ok");
    } catch (err) {
      console.error(err);
      setStatus(t("database.schemaExportFailed", { reason: err.message || String(err) }), "error");
    }
  }

  export function bindDatabaseActionButtons() {
    newDbBtn.addEventListener("click", () => {
      closeDatabaseMenu();
      openNewDbModal();
    });
    cancelNewDbBtn.addEventListener("click", closeNewDbModal);
    confirmNewDbBtn.addEventListener("click", confirmNewDatabase);
    newDbFileNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        confirmNewDatabase();
      }
    });
    newDbModal.addEventListener("click", (event) => {
      if (modalController.isBackdropClick(event, newDbModal)) closeNewDbModal();
    });

    runBtn.addEventListener("click", executeSql);
    saveSqlBtn.addEventListener("click", saveSql);
    saveDbBtn.addEventListener("click", () => {
      closeDatabaseMenu();
      saveCurrentDatabase();
    });
    exportSchemaBtn.addEventListener("click", exportEmptyDatabaseStructure);
  }
