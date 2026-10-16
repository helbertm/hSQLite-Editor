import { sqlFileInput } from "./03-dom-editor-results.js";
import { t } from "./03-localization.js";
import { executeSql } from "./10-sql-execution.js";
import { setStatus } from "./12-shell-status.js";
import { sqlTabsController } from "./23-sql-tabs-state.js";
import { MAX_SQL_FILE_BYTES, MAX_SQL_TABS } from "../core/03-app-limits.js";
import { showToast } from "./32b-editor-feedback.js";
import { getSqlTabsItems, shouldExecuteSqlAfterFileOpen } from "../core/11-state-tabs.js";
import { isSqlExecutionRunning, setEditorState } from "../core/15-state-runtime-library.js";

export function openSqlFilePicker(executeAfterOpen = false) {
  if (isSqlExecutionRunning()) {
    setStatus(t("file.waitForExecution"), "warn");
    return;
  }

  setEditorState({ executeSqlAfterFileOpen: Boolean(executeAfterOpen) });
  sqlFileInput.value = "";
  sqlFileInput.click();
}

let importingSqlFiles = false;

export async function loadSqlFile(file) {
  return loadSqlFiles(file ? [file] : []);
}

export async function loadSqlFiles(fileList) {
  const files = Array.from(fileList || []);
  const executeAfterOpen = shouldExecuteSqlAfterFileOpen();
  setEditorState({ executeSqlAfterFileOpen: false });
  if (!files.length) return false;
  if (importingSqlFiles || isSqlExecutionRunning()) {
    setStatus(t("file.waitForExecution"), "warn");
    return false;
  }
  if (executeAfterOpen && files.length !== 1) {
    setStatus(t("file.runSingleOnly"), "warn");
    return false;
  }
  if (files.length + getSqlTabsItems().length > MAX_SQL_TABS) {
    setStatus(t("tabs.limitReached", { count: MAX_SQL_TABS }), "warn");
    return false;
  }
  if (files.some(file => !isLikelyTextFile(file))) {
    setStatus(t("file.invalidSql"), "warn");
    return false;
  }
  if (files.some(file => file.size > MAX_SQL_FILE_BYTES)) {
    setStatus(t("file.tooLarge"), "warn");
    return false;
  }

  importingSqlFiles = true;
  try {
    // Read the whole selection before changing tabs, so a failed read keeps drafts intact.
    const documents = [];
    for (const file of files) {
      const text = await file.text();
      if (text.includes("\0")) throw new Error(t("file.invalidSql"));
      documents.push({ title: String(file.name || "SQL").slice(0, 50), text });
    }
    if (isSqlExecutionRunning()) {
      setStatus(t("file.waitForExecution"), "warn");
      return false;
    }
    if (documents.length + getSqlTabsItems().length > MAX_SQL_TABS) {
      setStatus(t("tabs.limitReached", { count: MAX_SQL_TABS }), "warn");
      return false;
    }
    for (const document of documents) sqlTabsController.add(document.title, document.text);
    if (executeAfterOpen) {
      await executeSql();
    } else {
      setStatus(t("file.loadedBatch", { count: documents.length }), "ok");
    }
    return true;
  } catch (err) {
    console.error(err);
    const message = t("file.openFailed", { reason: err.message || String(err) });
    setStatus(message, "error");
    showToast("error", t("file.openFailedTitle"), t("file.openFailed", { reason: err.message || String(err) }));
    return false;
  } finally {
    importingSqlFiles = false;
  }
}

export function isLikelyTextFile(file) {
  if (!file) return false;

  const lowerName = (file.name || "").toLowerCase();
  return lowerName.endsWith(".sql")
    || lowerName.endsWith(".txt")
    || lowerName.endsWith(".csv")
    || lowerName.endsWith(".json")
    || lowerName.endsWith(".md")
    || lowerName.endsWith(".log")
    || (file.type && file.type.startsWith("text/"))
    || file.type === "";
}

export function setEditorDragOver(active) {
  const wrap = document.querySelector(".editor-wrap");
  if (!wrap) return;
  wrap.classList.toggle("drag-over", active);
}

export async function handleEditorFileDrop(event) {
  event.preventDefault();
  event.stopPropagation();
  setEditorDragOver(false);

  if (isSqlExecutionRunning()) {
    setStatus(t("file.waitForExecution"), "warn");
    return;
  }

  const files = event.dataTransfer && event.dataTransfer.files;
  if (!files || !files.length) {
    setStatus(t("file.dropEmpty"), "warn");
    return;
  }
  setEditorState({ executeSqlAfterFileOpen: false });
  await loadSqlFiles(files);
}

export function bindEditorDropZone() {
  const wrap = document.querySelector(".editor-wrap");
  if (!wrap) return;

  ["dragenter", "dragover"].forEach(eventName => {
    wrap.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }

      setEditorDragOver(true);
    });
  });

  ["dragleave", "dragend"].forEach(eventName => {
    wrap.addEventListener(eventName, (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!wrap.contains(event.relatedTarget)) {
        setEditorDragOver(false);
      }
    });
  });

  wrap.addEventListener("drop", handleEditorFileDrop);
}
