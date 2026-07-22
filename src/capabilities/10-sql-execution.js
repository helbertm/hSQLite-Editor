import { sqlRunningText } from "./03-dom-editor-results.js";
import { formatNumber, t } from "./03-localization.js";
import { activateResultSet, clearResults, saveActiveResultSetState, setResultControlsEnabled } from "./05a-result-state-controller.js";
import { setDbDirty } from "./05b-database-dirty.js";
import { getSqlExecutionRuntime } from "./06-sql-runtime.js";
import { hasActiveDatabase, rehydrateActiveDatabaseFromSessionBytes } from "./07-database-runtime.js";
import { setStatus } from "./12-shell-status.js";
import { addQueryHistoryEntry } from "./20-history-query.js";
import { saveCurrentTabState } from "./22c-active-tab-sync.js";
import { renderSqlTabs } from "./24-sql-tabs-render.js";
import { buildSqlErrorToastMessage, clearSqlError, nextPaint, setSqlBusy, showToast } from "./32b-editor-feedback.js";
import { formatElapsedTime } from "../core/01-format-duration.js";
import { splitSqlStatements } from "../core/05-sql-statement-splitter.js";
import { createResultSetState, getGridAllRows, getGridColumnOrder, getGridPageSize, getGridResultSets, setGridState } from "../core/12-state-grid-results.js";
import { getCurrentDbBytes, setDbSessionState } from "../core/14-state-database-schema.js";
import { isSqlExecutionRunning } from "../core/15-state-runtime-library.js";
import { createEmbeddedSqlWorker, disposeEmbeddedSqlWorker } from "../ports/20-sql-worker.js";
import { getSelectedOrAllSql } from "./33-editor-selection.js";
import { loadSchema } from "../ui/10-schema.js";
import { initializeColumnOrder } from "../ui/20-results-state.js";
import { buildColumnMetadata, renderAllResults } from "../ui/22-results-table.js";

export function terminateActiveSqlWorker(markCancelled = true) {
  const sqlExecutionRuntime = getSqlExecutionRuntime();
  const activeOperation = sqlExecutionRuntime.activeOperation;
  const rejectPendingExecution = sqlExecutionRuntime.activeExecutionReject;
  sqlExecutionRuntime.activeExecutionReject = null;
  sqlExecutionRuntime.activeOperation = "";

  if (sqlExecutionRuntime.activeWorker) {
    disposeEmbeddedSqlWorker(sqlExecutionRuntime.activeWorker);
    sqlExecutionRuntime.activeWorker = null;
  }

  if (markCancelled && typeof rejectPendingExecution === "function") {
    const cancellationError = new Error(t("status.workerCancelled"));
    cancellationError.cancelled = true;
    rejectPendingExecution(cancellationError);
  }

  if (markCancelled) {
    const isPopulation = activeOperation === "populate-table";
    setSqlBusy(false);
    setStatus(t(isPopulation ? "status.populationCancelled" : "status.workerCancelled"), "warn");
    showToast(
      "info",
      t(isPopulation ? "toast.populationStopped" : "toast.executionStopped"),
      isPopulation
        ? t("toast.populationStoppedBody")
        : t("toast.executionStoppedBody"),
      6000
    );
  }
}

export function runDatabaseWorkerAction(action, payload, options = {}) {
  return new Promise((resolve, reject) => {
    const sessionDbBytes = getCurrentDbBytes();
    if (!sessionDbBytes) {
      reject(new Error(t("error.databaseNotLoaded")));
      return;
    }

    const sqlExecutionRuntime = getSqlExecutionRuntime();
    if (sqlExecutionRuntime.activeWorker) {
      reject(new Error(t("status.operationRunning")));
      return;
    }

    const worker = createEmbeddedSqlWorker();
    const requestId = `db-worker-${Date.now()}-${sqlExecutionRuntime.requestSequence + 1}`;
    sqlExecutionRuntime.requestSequence += 1;
    sqlExecutionRuntime.activeWorker = worker;
    sqlExecutionRuntime.activeExecutionReject = reject;
    sqlExecutionRuntime.activeOperation = action;

    worker.onmessage = (event) => {
      const data = event.data || {};
      if (data.requestId && data.requestId !== requestId) return;

      if (data.event === "progress" || data.type === "statement-start" || data.type === "population-progress") {
        if (typeof options.onProgress === "function") options.onProgress(data);
        return;
      }

      if (data.ok && data.type === options.doneType) {
        disposeEmbeddedSqlWorker(worker);
        sqlExecutionRuntime.activeWorker = null;
        sqlExecutionRuntime.activeExecutionReject = null;
        sqlExecutionRuntime.activeOperation = "";
        resolve(data);
        return;
      }

      if (!data.ok || data.event === "error") {
        disposeEmbeddedSqlWorker(worker);
        sqlExecutionRuntime.activeWorker = null;
        sqlExecutionRuntime.activeExecutionReject = null;
        sqlExecutionRuntime.activeOperation = "";
        const workerMessage = data.errorCode ? t(`worker.${data.errorCode}`, data.errorVariables || {}) : data.error;
        reject(new Error(workerMessage || t("error.workerUnknown")));
      }
    };

    worker.onerror = (event) => {
      disposeEmbeddedSqlWorker(worker);
      sqlExecutionRuntime.activeWorker = null;
      sqlExecutionRuntime.activeExecutionReject = null;
      sqlExecutionRuntime.activeOperation = "";
      reject(new Error(event.message || t("status.sqlError")));
    };

    // Transfer a copy of the ArrayBuffer to avoid losing the main in-memory DB bytes.
    const dbBytesCopy = new Uint8Array(sessionDbBytes);
    worker.postMessage({
      protocolVersion: 1,
      requestId,
      action,
      payload,
      dbBytes: dbBytesCopy.buffer
    }, [dbBytesCopy.buffer]);
  });
}

export function runSqlInWorker(sql) {
  return runDatabaseWorkerAction("execute", { sql }, {
    doneType: "done",
    onProgress(data) {
      if (data.type !== "statement-start") return;
      const runningLabel = t("status.runningStatement", { current: data.statementIndex + 1, total: data.totalStatements });
      if (sqlRunningText) sqlRunningText.textContent = runningLabel;
      setStatus(runningLabel, "warn");
    }
  });
}

export function runTablePopulationInWorker(population, onProgress) {
  return runDatabaseWorkerAction("populate-table", { population }, {
    doneType: "population-done",
    onProgress
  });
}

export function applyWorkerDatabaseState(workerResult) {
  if (!workerResult || !workerResult.dbBytes) return;

  const nextBytes = new Uint8Array(workerResult.dbBytes);
  if (!nextBytes.byteLength) return;

  setDbSessionState({ currentBytes: nextBytes });
  rehydrateActiveDatabaseFromSessionBytes();
}

export function stripLeadingSqlComments(statement) {
  let text = String(statement || "");
  let changed = true;

  while (changed) {
    changed = false;
    const trimmedStart = text.replace(/^\s+/, "");
    if (trimmedStart !== text) {
      text = trimmedStart;
      changed = true;
    }
    if (text.startsWith("--")) {
      const newlineIndex = text.indexOf("\n");
      text = newlineIndex >= 0 ? text.slice(newlineIndex + 1) : "";
      changed = true;
      continue;
    }
    if (text.startsWith("/*")) {
      const endIndex = text.indexOf("*/");
      text = endIndex >= 0 ? text.slice(endIndex + 2) : "";
      changed = true;
    }
  }

  return text.trim();
}

export function isMutationStatement(statement) {
  const normalized = stripLeadingSqlComments(statement);
  return /^(create|alter|drop|insert|update|delete|replace|vacuum|reindex)\b/i.test(normalized);
}

export const executionController = {
  getPreferredActiveResultIndex(resultSets) {
    if (!Array.isArray(resultSets) || !resultSets.length) return 0;
    const firstTabularIndex = resultSets.findIndex((rs) => Array.isArray(rs.columns) && rs.columns.length > 0);
    return firstTabularIndex >= 0 ? firstTabularIndex : 0;
  },
  mapWorkerResultSets(workerResult) {
    const pageSize = getGridPageSize();
    return workerResult.resultSets.map((workerSet) => {
      const resultColumns = workerSet.columns || [];
      const resultRows = (workerSet.values || []).map((values, idx) => {
        const obj = { __rowKey: `q${workerSet.statementIndex}_row_${idx}` };
        resultColumns.forEach((col, i) => obj[col] = values[i]);
        return obj;
      });

      return createResultSetState({
        statement: workerSet.statement,
        statementIndex: workerSet.statementIndex,
        columns: resultColumns,
        allRows: resultRows,
        pageSizeValue: pageSize,
        message: workerSet.messageCode ? t(`worker.${workerSet.messageCode}`) : ""
      });
    });
  },
  async run() {
    if (isSqlExecutionRunning()) {
      setStatus(t("status.queryRunning"), "warn");
      return;
    }

    if (!hasActiveDatabase() || !getCurrentDbBytes()) {
      setStatus(t("status.databaseRequired"), "warn");
      return;
    }

    const sql = getSelectedOrAllSql();
    if (!sql) {
      setStatus(t("status.queryRequired"), "warn");
      return;
    }

    try {
      clearSqlError();
      setSqlBusy(true, t("status.runningSql"));
      await nextPaint();

      const workerResult = await runSqlInWorker(sql);
      applyWorkerDatabaseState(workerResult);
      loadSchema();
      const nextResultSets = this.mapWorkerResultSets(workerResult);
      const preferredActiveResultIndex = this.getPreferredActiveResultIndex(nextResultSets);
      setGridState({ resultSets: nextResultSets, activeResultIndex: preferredActiveResultIndex });
      const resultSets = getGridResultSets();
      if (resultSets.length) {
        activateResultSet(preferredActiveResultIndex);
        if (!getGridColumnOrder().length) initializeColumnOrder();
        buildColumnMetadata();
        saveActiveResultSetState();
      } else {
        clearResults();
      }

      setResultControlsEnabled(resultSets.some(rs => rs.columns.length));
      renderAllResults();
      saveCurrentTabState();
      renderSqlTabs();

      const totalRows = resultSets.reduce((sum, rs) => sum + rs.allRows.length, 0);
      addQueryHistoryEntry(sql, "success");
      const hasMutation = splitSqlStatements(sql).some(isMutationStatement);
      setStatus(
        t("status.executionSummary", {
          queries: formatNumber(resultSets.length),
          elapsed: formatElapsedTime(workerResult.elapsed),
          rows: formatNumber(totalRows)
        }),
        "ok"
      );
      if (hasMutation) {
        setDbDirty(true);
        showToast("info", t("toast.memoryChanges"), t("toast.saveDatabaseHint"), 7000);
      }
    } catch (err) {
      if (err && err.cancelled) return;
      console.error(err);
      const message = err && err.message ? err.message : String(err);
      addQueryHistoryEntry(sql, "error", message);
      const resultSets = getGridResultSets();
      const hadPreviousRows = resultSets.some(rs => rs.allRows && rs.allRows.length) || getGridAllRows().length > 0;
      setStatus(t("status.sqlExecutionFailed"), "error");
      clearSqlError();
      showToast(
        "error",
        t("toast.sqlExecutionFailed"),
        buildSqlErrorToastMessage(message, hadPreviousRows),
        0
      );
    } finally {
      terminateActiveSqlWorker(false);
      setSqlBusy(false);
    }
  }
};

export async function executeSql() {
  return executionController.run();
}
