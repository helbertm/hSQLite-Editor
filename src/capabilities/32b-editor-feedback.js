import { toastContainer } from "./00-dom-base.js";
import { saveDbBtn } from "./02-dom-database.js";
import { exportCsvBtn, exportJsonBtn, exportSchemaBtn, runBtn, saveSqlBtn, sqlBusyElapsed, sqlErrorBox, sqlErrorText, sqlRunningBar, sqlRunningText } from "./03-dom-editor-results.js";
import { t } from "./03-localization.js";
import { getSqlExecutionRuntime } from "./06-sql-runtime.js";
import { hasActiveDatabase } from "./07-database-runtime.js";
import { setStatus } from "./12-shell-status.js";
import { formatElapsedTime } from "../core/01-format-duration.js";
import { getGridColumns } from "../core/12-state-grid-results.js";
import { setRuntimeState } from "../core/15-state-runtime-library.js";
import { escapeHtml } from "../ui/00-helpers.js";

export function clearSqlError() {
  sqlErrorText.textContent = "";
  sqlErrorBox.style.display = "none";
}

export function getSqlErrorKnowledgeBase() {
  return [
    { id: "missing_table", patterns: [/no such table/i, /no such view/i], causeKey: "sqlError.missingTable.cause", solutionKey: "sqlError.missingTable.solution" },
    { id: "missing_column", patterns: [/no such column/i, /ambiguous column name/i], causeKey: "sqlError.missingColumn.cause", solutionKey: "sqlError.missingColumn.solution" },
    { id: "syntax", patterns: [/syntax error/i, /incomplete input/i, /unrecognized token/i], causeKey: "sqlError.syntax.cause", solutionKey: "sqlError.syntax.solution" },
    { id: "function", patterns: [/no such function/i, /wrong number of arguments/i, /misuse of aggregate/i], causeKey: "sqlError.function.cause", solutionKey: "sqlError.function.solution" },
    { id: "unique", patterns: [/UNIQUE constraint failed/i, /PRIMARY KEY.*failed/i], causeKey: "sqlError.unique.cause", solutionKey: "sqlError.unique.solution" },
    { id: "required", patterns: [/NOT NULL constraint failed/i], causeKey: "sqlError.required.cause", solutionKey: "sqlError.required.solution" },
    { id: "foreign_key", patterns: [/FOREIGN KEY constraint failed/i], causeKey: "sqlError.foreignKey.cause", solutionKey: "sqlError.foreignKey.solution" },
    { id: "constraint", patterns: [/constraint failed/i, /datatype mismatch/i], causeKey: "sqlError.constraint.cause", solutionKey: "sqlError.constraint.solution" },
    { id: "locked", patterns: [/database is locked/i, /database is busy/i, /database table is locked/i], causeKey: "sqlError.locked.cause", solutionKey: "sqlError.locked.solution" },
    { id: "readonly", patterns: [/readonly database/i, /attempt to write a readonly database/i], causeKey: "sqlError.readonly.cause", solutionKey: "sqlError.readonly.solution" },
    { id: "invalid_database", patterns: [/database disk image is malformed/i, /file is not a database/i], causeKey: "sqlError.invalidDatabase.cause", solutionKey: "sqlError.invalidDatabase.solution" },
    { id: "duplicate", patterns: [/(?:table|index|column) .* already exists/i, /duplicate column name/i], causeKey: "sqlError.duplicate.cause", solutionKey: "sqlError.duplicate.solution" }
  ];
}

export function classifySqlError(message) {
  const text = String(message || "");
  return getSqlErrorKnowledgeBase().find(item => item.patterns.some(pattern => pattern.test(text))) || null;
}

export function buildSqlErrorToastMessage(message, hadPreviousRows = false) {
  const known = classifySqlError(message);
  const parts = [t("sqlError.failed")];
  if (known) {
    parts.push("", t("sqlError.likelyCause", { cause: t(known.causeKey) }), t("sqlError.suggestedSolution", { solution: t(known.solutionKey) }));
  }
  if (hadPreviousRows) parts.push("", t("sqlError.previousResults"));
  parts.push("", t("sqlError.engineLabel"), String(message || t("sqlError.unknown")));
  return parts.join("\n");
}

export function showToast(type, title, message, timeoutMs = 9000) {
  const toast = document.createElement("div");
  toast.className = `toast ${type || ""}`;
  const isError = type === "error";
  toast.setAttribute("role", isError ? "alert" : "status");
  toast.setAttribute("aria-live", isError ? "assertive" : "polite");
  toast.setAttribute("aria-atomic", "true");
  toast.innerHTML = `
    <div class="toast-icon" aria-hidden="true">${isError ? "⚠️" : "ℹ️"}</div>
    <div><div class="toast-title">${escapeHtml(title)}</div><div class="toast-message">${escapeHtml(message)}</div></div>
    <button class="ui-button ui-button-icon ui-button-sm toast-close" title="${escapeHtml(t("common.close"))}" aria-label="${escapeHtml(t("common.close"))}" type="button"><span aria-hidden="true">×</span></button>
  `;
  toast.querySelector(".toast-close").addEventListener("click", () => toast.remove());
  toastContainer.appendChild(toast);
  if (timeoutMs > 0) setTimeout(() => toast.isConnected && toast.remove(), timeoutMs);
}

export function nextPaint() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

export function setSqlBusy(isBusy, message = "") {
  const sqlExecutionRuntime = getSqlExecutionRuntime();
  setRuntimeState({ isSqlRunning: isBusy });
  if (isBusy) {
    sqlExecutionRuntime.busyStartedAt = performance.now();
    document.body.classList.add("sql-running");
    sqlRunningBar.classList.add("visible");
    if (sqlRunningText) sqlRunningText.textContent = message || t("status.running");
    if (message) setStatus(message, "warn");
    if (sqlBusyElapsed) sqlBusyElapsed.textContent = t("status.elapsed", { elapsed: "0s" });
    clearInterval(sqlExecutionRuntime.busyTimer);
    sqlExecutionRuntime.busyTimer = setInterval(() => {
      const elapsedSeconds = Math.floor((performance.now() - sqlExecutionRuntime.busyStartedAt) / 1000);
      if (sqlBusyElapsed) sqlBusyElapsed.textContent = t("status.elapsed", { elapsed: formatElapsedTime(elapsedSeconds * 1000) });
    }, 250);
  } else {
    document.body.classList.remove("sql-running");
    sqlRunningBar.classList.remove("visible");
    clearInterval(sqlExecutionRuntime.busyTimer);
    sqlExecutionRuntime.busyTimer = null;
    if (sqlRunningText) sqlRunningText.textContent = t("status.running");
    if (sqlBusyElapsed) sqlBusyElapsed.textContent = t("status.elapsed", { elapsed: "0s" });
  }
  runBtn.disabled = isBusy || !hasActiveDatabase();
  saveSqlBtn.disabled = isBusy;
  saveDbBtn.disabled = isBusy || !hasActiveDatabase();
  exportSchemaBtn.disabled = isBusy || !hasActiveDatabase();
  document.querySelectorAll("[data-populate-table]").forEach((button) => {
    button.disabled = isBusy || !hasActiveDatabase();
  });
  exportCsvBtn.disabled = isBusy || !getGridColumns().length;
  exportJsonBtn.disabled = isBusy || !getGridColumns().length;
}
