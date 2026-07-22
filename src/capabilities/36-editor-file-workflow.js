import { sqlFileInput } from "./03-dom-editor-results.js";
import { t } from "./03-localization.js";
import { executeSql } from "./10-sql-execution.js";
import { setStatus } from "./12-shell-status.js";
import { saveCurrentTabState } from "./22c-active-tab-sync.js";
import { setEditorValue } from "./32a-editor-api.js";
import { showToast } from "./32b-editor-feedback.js";
import { shouldExecuteSqlAfterFileOpen } from "../core/11-state-tabs.js";
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

export async function loadSqlFile(file) {
  if (!file) return;

  const lowerName = (file.name || "").toLowerCase();
  const allowed = lowerName.endsWith(".sql") || lowerName.endsWith(".txt") || file.type.startsWith("text/") || file.type === "";

  if (!allowed) {
    setEditorState({ executeSqlAfterFileOpen: false });
    setStatus(t("file.invalidSql"), "warn");
    return;
  }

  try {
    const text = await file.text();
    setEditorValue(text);
    saveCurrentTabState();

    if (shouldExecuteSqlAfterFileOpen()) {
      setEditorState({ executeSqlAfterFileOpen: false });
      setStatus(t("file.loadedRunning", { name: file.name }), "warn");
      setTimeout(() => executeSql(), 0);
    } else {
      setStatus(t("file.loaded", { name: file.name }), "ok");
    }
  } catch (err) {
    console.error(err);
    const message = t("file.openFailed", { reason: err.message || String(err) });
    setStatus(message, "error");
    setEditorState({ executeSqlAfterFileOpen: false });
    showToast("error", t("file.openFailedTitle"), t("file.openFailed", { reason: err.message || String(err) }));
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

  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];

  if (!file) {
    setStatus(t("file.dropEmpty"), "warn");
    return;
  }

  if (!isLikelyTextFile(file)) {
    setStatus(t("file.dropTextOnly"), "warn");
    return;
  }

  setEditorState({ executeSqlAfterFileOpen: false });
  await loadSqlFile(file);
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
