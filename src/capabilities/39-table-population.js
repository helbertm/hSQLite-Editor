import { sqlRunningText } from "./03-dom-editor-results.js";
import { formatNumber, t } from "./03-localization.js";
import { modalController } from "./05-modal-controller.js";
import { setDbDirty } from "./05b-database-dirty.js";
import { hasActiveDatabase } from "./07-database-runtime.js";
import { tablePopulationCancelBtn, tablePopulationColumnList, tablePopulationFeedback, tablePopulationLargeConfirm, tablePopulationLargeConfirmWrap, tablePopulationModal, tablePopulationProgress, tablePopulationRecordCount, tablePopulationRunBtn, tablePopulationTableName } from "./07-dom-table-population.js";
import { applyWorkerDatabaseState, runTablePopulationInWorker, terminateActiveSqlWorker } from "./10-sql-execution.js";
import { setStatus } from "./12-shell-status.js";
import { nextPaint, setSqlBusy, showToast } from "./32b-editor-feedback.js";
import { formatElapsedTime } from "../core/01-format-duration.js";
import { getSqlitePopulationFamily, normalizeSqliteTypeClass } from "../core/06-sqlite-types.js";
import { getSchemaObjects } from "../core/14-state-database-schema.js";
import { isSqlExecutionRunning } from "../core/15-state-runtime-library.js";
import { escapeHtml } from "../ui/00-helpers.js";
import { loadSchema } from "../ui/10-schema.js";

export const TABLE_POPULATION_MAX_ROWS = 1000000;
export const TABLE_POPULATION_SOFT_WARNING_ROWS = 100000;
export const TABLE_POPULATION_MAX_TEXT_LENGTH = 256;

export const tablePopulationRuntime = {
  table: "",
  running: false
};

export function getTablePopulationMeta(tableName) {
  const meta = getSchemaObjects()[tableName];
  return meta && String(meta.type || "").toLowerCase() === "table" ? meta : null;
}

export function getTablePopulationStrategyOptions(field) {
  if (field.pk || Number(field.hidden || 0) !== 0) {
    return [{ value: "omit", label: t("population.strategy.automatic"), selected: true }];
  }

  const family = getSqlitePopulationFamily(field.type);
  const options = [];
  if (field.defaultValue !== null && field.defaultValue !== undefined) {
    options.push({ value: "omit", label: t("population.strategy.default") });
  }
  if (!field.notnull) options.push({ value: "null", label: "NULL" });

  if (family === "numeric") {
    options.push(
      { value: "fixed-number", label: t("population.strategy.fixedNumber") },
      { value: "increment", label: t("population.strategy.increment") },
      { value: "random-number", label: t("population.strategy.randomNumber") }
    );
  } else if (family === "text") {
    options.push(
      { value: "fixed-text", label: t("population.strategy.fixedText") },
      { value: "random-text", label: t("population.strategy.randomText") },
      { value: "lorem-text", label: t("population.strategy.lorem") }
    );
  }

  const preferred = family === "numeric"
    ? "increment"
    : family === "text"
      ? "fixed-text"
      : options[0]?.value || "";
  return options.map((option) => ({ ...option, selected: option.value === preferred }));
}

export function renderTablePopulationStrategyParams(columnRow) {
  const select = columnRow.querySelector("[data-population-strategy]");
  const params = columnRow.querySelector("[data-population-params]");
  if (!select || !params) return;
  const strategy = select.value;
  const name = select.dataset.columnName || "column";

  if (strategy === "fixed-number") {
    params.innerHTML = `<label>${escapeHtml(t("population.valueFor", { column: name }))}<input data-population-param="value" type="number" step="any" value="0"></label>`;
  } else if (strategy === "increment") {
    params.innerHTML = `
      <label>${escapeHtml(t("population.start"))}<input data-population-param="start" type="number" step="any" value="1"></label>
      <label>${escapeHtml(t("population.step"))}<input data-population-param="step" type="number" step="any" value="1"></label>`;
  } else if (strategy === "random-number") {
    params.innerHTML = `
      <label>${escapeHtml(t("population.minimum"))}<input data-population-param="min" type="number" step="any" value="0"></label>
      <label>${escapeHtml(t("population.maximum"))}<input data-population-param="max" type="number" step="any" value="100"></label>`;
  } else if (strategy === "fixed-text") {
    params.innerHTML = `<label>${escapeHtml(t("population.textFor", { column: name }))}<input data-population-param="value" type="text" maxlength="${TABLE_POPULATION_MAX_TEXT_LENGTH}" value=""></label>`;
  } else if (strategy === "random-text") {
    params.innerHTML = `<label>${escapeHtml(t("population.characters"))}<input data-population-param="length" type="number" min="1" max="${TABLE_POPULATION_MAX_TEXT_LENGTH}" step="1" value="12"></label>`;
  } else if (strategy === "lorem-text") {
    params.innerHTML = `<label>${escapeHtml(t("population.words"))}<input data-population-param="words" type="number" min="1" max="40" step="1" value="8"></label>`;
  } else {
    params.innerHTML = "";
  }
  const errorId = columnRow.querySelector("[data-population-error]")?.id || "";
  columnRow.querySelectorAll("input, select").forEach((control) => {
    if (errorId) control.setAttribute("aria-describedby", errorId);
  });
}

export function renderTablePopulationColumns(tableMeta) {
  tablePopulationColumnList.innerHTML = "";
  for (const [fieldIndex, field] of (tableMeta.fields || []).entries()) {
    const options = getTablePopulationStrategyOptions(field);
    const errorId = `tablePopulationColumnError-${fieldIndex}`;
    const row = document.createElement("div");
    row.className = "table-population-column";
    row.dataset.populationColumn = field.name;
    const badges = [
      field.type || t("population.noType"),
      field.pk ? "PK" : "",
      Number(field.hidden || 0) !== 0 ? t("population.generated") : "",
      field.notnull ? t("population.required") : t("population.optional")
    ].filter(Boolean);
    row.innerHTML = `
      <div class="table-population-column-head">
        <strong>${escapeHtml(field.name)}</strong>
        <span>${badges.map(escapeHtml).join(" · ")}</span>
      </div>
      <label class="table-population-strategy-label">
        ${escapeHtml(t("population.strategy"))}
        <select data-population-strategy data-column-name="${escapeHtml(field.name)}" data-column-type="${escapeHtml(field.type || "")}" aria-describedby="${errorId}" ${options.length <= 1 && (field.pk || Number(field.hidden || 0) !== 0) ? "disabled" : ""}>
          ${options.length
            ? options.map((option) => `<option value="${option.value}" ${option.selected ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")
            : `<option value="">${escapeHtml(t("population.noStrategy"))}</option>`}
        </select>
      </label>
      <div class="table-population-params" data-population-params></div>
      <div class="table-population-column-error" id="${errorId}" data-population-error role="alert"></div>`;
    tablePopulationColumnList.appendChild(row);
    renderTablePopulationStrategyParams(row);
  }
}

export function setTablePopulationFeedback(message = "", type = "") {
  tablePopulationFeedback.textContent = message;
  tablePopulationFeedback.className = `table-population-feedback ${type}`;
}

export function updateTablePopulationLargeConfirmation() {
  const rowCount = Number(tablePopulationRecordCount.value || 0);
  const needsConfirmation = rowCount > TABLE_POPULATION_SOFT_WARNING_ROWS;
  tablePopulationLargeConfirmWrap.hidden = !needsConfirmation;
  if (!needsConfirmation) tablePopulationLargeConfirm.checked = false;
}

export function setTablePopulationBusy(running) {
  tablePopulationRuntime.running = running;
  tablePopulationModal.querySelectorAll("input, select").forEach((control) => {
    if (control === tablePopulationLargeConfirm && tablePopulationLargeConfirmWrap.hidden) return;
    control.disabled = running || (control.dataset.populationStrategy !== undefined && control.options?.length <= 1);
  });
  tablePopulationRunBtn.disabled = running;
  tablePopulationRunBtn.textContent = running ? t("population.populating") : t("schema.populateTable");
  tablePopulationCancelBtn.textContent = running ? t("population.cancelExecution") : t("common.close");
  tablePopulationCancelBtn.classList.toggle("ui-button-destructive", running);
  tablePopulationCancelBtn.classList.toggle("ui-button-secondary", !running);
}

export function clearTablePopulationErrors() {
  tablePopulationModal.querySelectorAll("[data-population-error]").forEach((element) => {
    element.textContent = "";
  });
  tablePopulationModal.querySelectorAll("[aria-invalid='true']").forEach((control) => {
    control.removeAttribute("aria-invalid");
  });
  setTablePopulationFeedback();
}

export function readTablePopulationNumber(row, param, label) {
  const input = row.querySelector(`[data-population-param="${param}"]`);
  const number = Number(input?.value);
  if (!Number.isFinite(number)) throw new Error(t("population.invalidNumber", { label }));
  return number;
}

export function buildTablePopulationPlan() {
  clearTablePopulationErrors();
  const tableMeta = getTablePopulationMeta(tablePopulationRuntime.table);
  if (!tableMeta) throw new Error(t("population.tableUnavailable"));

  const rowCount = Number(tablePopulationRecordCount.value || 0);
  if (!Number.isInteger(rowCount) || rowCount < 1 || rowCount > TABLE_POPULATION_MAX_ROWS) {
    throw new Error(t("population.invalidCount"));
  }
  if (rowCount > TABLE_POPULATION_SOFT_WARNING_ROWS && !tablePopulationLargeConfirm.checked) {
    throw new Error(t("population.confirmLarge"));
  }

  const columns = [];
  for (const row of tablePopulationColumnList.querySelectorAll("[data-population-column]")) {
    const select = row.querySelector("[data-population-strategy]");
    const name = select?.dataset.columnName || "";
    const strategy = select?.value || "";
    const field = (tableMeta.fields || []).find((item) => item.name === name);
    try {
      if (!strategy) throw new Error(t("population.strategyRequired"));
      const column = { name, strategy };
      if (strategy === "fixed-number") column.value = readTablePopulationNumber(row, "value", t("population.fixedValue"));
      if (strategy === "increment") {
        column.start = readTablePopulationNumber(row, "start", t("population.start"));
        column.step = readTablePopulationNumber(row, "step", t("population.step"));
      }
      if (strategy === "random-number") {
        column.min = readTablePopulationNumber(row, "min", t("population.minimum"));
        column.max = readTablePopulationNumber(row, "max", t("population.maximum"));
        if (column.max < column.min) throw new Error(t("population.maxBelowMin"));
        column.integer = normalizeSqliteTypeClass(field?.type) === "integer";
      }
      if (strategy === "fixed-text") {
        column.value = String(row.querySelector('[data-population-param="value"]')?.value || "").slice(0, TABLE_POPULATION_MAX_TEXT_LENGTH);
      }
      if (strategy === "random-text") {
        column.length = readTablePopulationNumber(row, "length", t("population.characters"));
        if (!Number.isInteger(column.length) || column.length < 1 || column.length > TABLE_POPULATION_MAX_TEXT_LENGTH) {
          throw new Error(t("population.characterRange", { max: TABLE_POPULATION_MAX_TEXT_LENGTH }));
        }
      }
      if (strategy === "lorem-text") {
        column.words = readTablePopulationNumber(row, "words", t("population.words"));
        if (!Number.isInteger(column.words) || column.words < 1 || column.words > 40) {
          throw new Error(t("population.wordRange"));
        }
      }
      columns.push(column);
    } catch (error) {
      const errorElement = row.querySelector("[data-population-error]");
      if (errorElement) errorElement.textContent = error.message;
      row.querySelectorAll("input, select").forEach((control) => control.setAttribute("aria-invalid", "true"));
      throw error;
    }
  }

  return {
    table: tablePopulationRuntime.table,
    rowCount,
    batchSize: 1000,
    columns
  };
}

export function openTablePopulationModal(tableName) {
  if (isSqlExecutionRunning()) {
    setStatus(t("population.wait"), "warn");
    return;
  }
  if (!hasActiveDatabase()) {
    setStatus(t("status.databaseRequired"), "warn");
    return;
  }
  const tableMeta = getTablePopulationMeta(tableName);
  if (!tableMeta) {
    setStatus(t("population.tableOnly"), "warn");
    return;
  }

  tablePopulationRuntime.table = tableName;
  tablePopulationTableName.textContent = tableName;
  tablePopulationRecordCount.value = "100";
  tablePopulationProgress.textContent = "";
  tablePopulationLargeConfirm.checked = false;
  updateTablePopulationLargeConfirmation();
  renderTablePopulationColumns(tableMeta);
  setTablePopulationFeedback();
  setTablePopulationBusy(false);
  modalController.open(tablePopulationModal);
}

export function closeTablePopulationModal() {
  if (tablePopulationRuntime.running) {
    terminateActiveSqlWorker(true);
    return;
  }
  modalController.close(tablePopulationModal);
  tablePopulationRuntime.table = "";
}

export async function executeTablePopulation() {
  if (tablePopulationRuntime.running || isSqlExecutionRunning()) return;
  let plan;
  try {
    plan = buildTablePopulationPlan();
  } catch (error) {
    setTablePopulationFeedback(error.message || String(error), "error");
    return;
  }

  try {
    setTablePopulationBusy(true);
    setSqlBusy(true, t("population.starting", { table: plan.table, count: formatNumber(plan.rowCount) }));
    tablePopulationProgress.textContent = t("population.progress", { completed: 0, total: formatNumber(plan.rowCount) });
    await nextPaint();
    const result = await runTablePopulationInWorker(plan, (progress) => {
      if (progress.type !== "population-progress") return;
      const completed = Number(progress.completed || 0);
      tablePopulationProgress.textContent = t("population.progress", { completed: formatNumber(completed), total: formatNumber(plan.rowCount) });
      if (sqlRunningText) sqlRunningText.textContent = t("population.running", { table: plan.table, completed: formatNumber(completed), total: formatNumber(plan.rowCount) });
    });

    applyWorkerDatabaseState(result);
    loadSchema();
    setDbDirty(true);
    modalController.close(tablePopulationModal);
    tablePopulationRuntime.table = "";
    setStatus(
      t("population.summary", { count: formatNumber(Number(result.insertedCount || plan.rowCount)), table: plan.table, elapsed: formatElapsedTime(result.elapsed) }),
      "ok"
    );
    showToast("info", t("population.completed"), t("population.completedBody"), 7000);
  } catch (error) {
    if (!error?.cancelled) {
      const message = error?.message || String(error);
      setTablePopulationFeedback(message, "error");
      setStatus(t("population.statusFailed", { reason: message }), "error");
      showToast("error", t("population.failed"), t("population.failedBody"), 0);
    }
  } finally {
    setSqlBusy(false);
    setTablePopulationBusy(false);
  }
}
