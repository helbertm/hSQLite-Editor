import { cmEditor, exportCsvBtn, exportJsonBtn } from "./03-dom-editor-results.js";
import { t } from "./03-localization.js";
import { setStatus } from "./12-shell-status.js";
import { saveCurrentTabState } from "./22c-active-tab-sync.js";
import { getEditorValue, setEditorValue } from "./32a-editor-api.js";
import { showToast } from "./32b-editor-feedback.js";
import { openSqlFilePicker } from "./36-editor-file-workflow.js";
import { isSqlExecutionRunning } from "../core/15-state-runtime-library.js";
import { readClipboardText, writeClipboardText } from "../ports/10-browser-io.js";
import { saveSql } from "../ui/40-database-actions.js";

function getClipboardErrorMessage(error) {
  if (error?.code === "CLIPBOARD_WRITE_DENIED") return t("clipboard.writeDenied");
  if (error?.code === "CLIPBOARD_READ_DENIED") return t("clipboard.readDenied");
  return error?.message || String(error);
}

export async function copyFullSql() {
  try {
    const sql = getEditorValue();
    if (!sql.trim()) {
      setStatus(t("clipboard.queryRequired"), "warn");
      return;
    }
    await writeClipboardText(sql);
    setStatus(t("clipboard.queryCopied"), "ok");
  } catch (err) {
    console.error(err);
    const message = getClipboardErrorMessage(err);
    setStatus(t("clipboard.copyFailed", { reason: message }), "error");
    showToast("error", t("clipboard.copyFailedTitle"), t("clipboard.copyFailed", { reason: message }));
  }
}

export function clearSqlEditor() {
  setEditorValue("");
  setStatus(t("clipboard.queryCleared"), "ok");
}

export function bindEditorResizeRefresh() {
  const wrap = document.querySelector(".editor-wrap");
  if (!wrap || !window.ResizeObserver) return;

  const observer = new ResizeObserver(() => {
    if (cmEditor) {
      cmEditor.refresh();
    }
  });

  observer.observe(wrap);
}

export function bindEditorBottomResize() {
  const wrap = document.querySelector(".editor-wrap");
  const handle = document.getElementById("editorResizeHandle");
  if (!wrap || !handle) return;

  let isDragging = false;
  let startY = 0;
  let startHeight = 0;

  const minHeight = () => 170;
  const maxHeight = () => Math.max(minHeight(), Math.min(window.innerHeight * 0.68, 720));

  function onMouseMove(event) {
    if (!isDragging) return;
    const delta = event.clientY - startY;
    const nextHeight = Math.max(minHeight(), Math.min(maxHeight(), startHeight + delta));
    wrap.style.height = `${nextHeight}px`;
    if (cmEditor) cmEditor.refresh();
  }

  function onMouseUp() {
    if (!isDragging) return;
    isDragging = false;
    wrap.classList.remove("resizing-editor");
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    if (cmEditor) cmEditor.refresh();
  }

  handle.addEventListener("mousedown", (event) => {
    event.preventDefault();
    isDragging = true;
    startY = event.clientY;
    startHeight = wrap.getBoundingClientRect().height;
    wrap.classList.add("resizing-editor");
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

export async function clearAndPasteSql() {
  try {
    const text = await readClipboardText();
    setEditorValue(text || "");
    saveCurrentTabState();
    setStatus(t(text ? "clipboard.pasted" : "clipboard.empty"), text ? "ok" : "warn");
  } catch (err) {
    console.error(err);
    const message = getClipboardErrorMessage(err);
    setStatus(t("clipboard.pasteFailed", { reason: message }), "error");
    showToast("error", t("clipboard.pasteFailedTitle"), t("clipboard.pasteFailed", { reason: message }));
  }
}

export const EDITOR_ACTION_HANDLERS = {
  copy: () => copyFullSql(),
  clear: () => clearSqlEditor(),
  clearPaste: () => clearAndPasteSql(),
  openSql: () => openSqlFilePicker(false),
  openRunSql: () => openSqlFilePicker(true),
  save: () => saveSql(),
  csv: () => {
    if (!exportCsvBtn.disabled) exportCsvBtn.click();
    else setStatus(t("results.exportUnavailable"), "warn");
  },
  json: () => {
    if (!exportJsonBtn.disabled) exportJsonBtn.click();
    else setStatus(t("results.exportUnavailable"), "warn");
  }
};

export function triggerEditorActionShortcut(action) {
  if (isSqlExecutionRunning() && action !== "copy") {
    setStatus(t("status.queryRunning"), "warn");
    return;
  }
  const handler = EDITOR_ACTION_HANDLERS[action];
  if (handler) handler();
}
