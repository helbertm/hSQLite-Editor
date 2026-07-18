import { compareLocalized, formatNumber, t } from "../capabilities/03-localization.js";
import { saveActiveResultSetState } from "../capabilities/05a-result-state-controller.js";
import { setStatus } from "../capabilities/12-shell-status.js";
import { getGridAllRows, getGridColumnOrder, getGridColumns, getGridCurrentPage, getGridCurrentRowKey, getGridFilteredRows, getGridPageSize, getGridSelectedKeys, getGridSortStates, setGridState } from "../core/12-state-grid-results.js";
import { escapeHtml } from "./00-helpers.js";

let refreshResultsView = () => {};

export function configureResultsStateRendering(effects) {
  refreshResultsView = effects.refreshResultsView;
}

export function applyFilter() {
  const q = getFilterValue().trim().toLowerCase();
  const allRows = getGridAllRows();
  const columns = getGridColumns();

  if (!q) {
    setGridState({ filteredRows: [...allRows] });
  } else {
    setGridState({ filteredRows: allRows.filter(row =>
      columns.some(col => String(row[col] ?? "").toLowerCase().includes(q))
    ) });
  }

  applySort();
  const filteredRows = getGridFilteredRows();
  const pageSize = getGridPageSize();
  const currentPage = getGridCurrentPage();
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  setGridState({ currentPage: Math.min(currentPage, totalPages) });
  saveActiveResultSetState();
  refreshResultsView();
}

export function applySort() {
  const sortStates = getGridSortStates();
  if (!sortStates.length) return;

  const filteredRows = getGridFilteredRows();
  filteredRows.sort((a, b) => {
    for (const state of sortStates) {
      const cmp = compareValuesForSort(a[state.column], b[state.column]);
      if (cmp !== 0) {
        return state.direction === "asc" ? cmp : -cmp;
      }
    }
    return 0;
  });
}

export function compareValuesForSort(a, b) {
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";

  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  const an = Number(a);
  const bn = Number(b);
  if (!Number.isNaN(an) && !Number.isNaN(bn)) {
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  }

  return compareLocalized(a, b, { numeric: true, sensitivity: "base" });
}

export function toggleSort(col, additive = false) {
  const sortStates = getGridSortStates();
  const existingIndex = sortStates.findIndex(s => s.column === col);
  let nextSortStates = sortStates;

  if (!additive) {
    if (existingIndex === -1 || sortStates.length > 1) {
      nextSortStates = [{ column: col, direction: "asc" }];
    } else {
      const current = sortStates[0];
      if (current.direction === "asc") nextSortStates = [{ column: col, direction: "desc" }];
      else nextSortStates = [];
    }
  } else {
    if (existingIndex === -1) {
      nextSortStates = [...sortStates, { column: col, direction: "asc" }];
    } else {
      const current = sortStates[existingIndex];
      if (current.direction === "asc") {
        nextSortStates = sortStates.map((state, index) => (
          index === existingIndex ? { column: col, direction: "desc" } : state
        ));
      } else {
        nextSortStates = sortStates.filter((_, index) => index !== existingIndex);
      }
    }
  }

  setGridState({ sortStates: nextSortStates });
  applyFilter();
  if (sortStates.length) {
    updateSortStatus();
  } else {
    setNeutralStatusAfterSortChange();
  }
}

export function clearSort() {
  setGridState({ sortStates: [] });
  applyFilter();
  setNeutralStatusAfterSortChange();
}

export function clearSelection() {
  setGridState({ selectedKeys: new Set() });
  refreshResultsView();
  setStatus(t("results.selectionCleared"), "ok");
}

export function updateSortStatus() {
  const sortStates = getGridSortStates();
  if (!sortStates.length) {
    setNeutralStatusAfterSortChange();
    return;
  }
  const orderBy = sortStates
    .map(s => `${s.column} ${s.direction.toUpperCase()}`)
    .join(", ");
  setStatus(t("results.sortApplied", { orderBy }), "ok");
}

export function setNeutralStatusAfterSortChange() {
  const columns = getGridColumns();
  const filteredRows = getGridFilteredRows();
  if (columns.length) {
    setStatus(t("results.sortClearedFiltered", { count: formatNumber(filteredRows.length) }), "");
  } else {
    setStatus(t("results.sortCleared"), "");
  }
}

export function getSortState(col) {
  const sortStates = getGridSortStates();
  const idx = sortStates.findIndex(s => s.column === col);
  if (idx === -1) return null;
  return { ...sortStates[idx], index: idx + 1 };
}

export function getFilterValue() {
  const input = document.querySelector(".filterInput");
  return input ? input.value : "";
}

export function setFilterValue(value) {
  document.querySelectorAll(".filterInput").forEach(el => el.value = value);
}

export function getTotalPages() {
  const filteredRows = getGridFilteredRows();
  const pageSize = getGridPageSize();
  return Math.max(1, Math.ceil(filteredRows.length / pageSize));
}

export function getPageInfoText() {
  const columns = getGridColumns();
  const currentPage = getGridCurrentPage();
  const filteredRows = getGridFilteredRows();
  if (!columns.length) return t("results.pageEmpty");
  return t("grid.pageInfo", { page: currentPage, pages: getTotalPages(), count: formatNumber(filteredRows.length) });
}

export function getDisplayedColumns() {
  const columnOrder = getGridColumnOrder();
  const columns = getGridColumns();
  if (!columnOrder || columnOrder.length === 0) return columns;
  const available = new Set(columns);
  const ordered = columnOrder.filter(col => available.has(col));
  const missing = columns.filter(col => !ordered.includes(col));
  return [...ordered, ...missing];
}

export function initializeColumnOrder() {
  const columns = getGridColumns();
  setGridState({ columnOrder: [...columns] });
}

export function formatValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (value === "") return t("results.emptyValue");
  if (value instanceof Uint8Array) return `[BLOB ${value.length} bytes]`;
  return String(value);
}

export function renderCellValue(value) {
  if (value === null || value === undefined) {
    return '<span class="cell-marker cell-null">NULL</span>';
  }

  if (value === "") {
    return `<span class="cell-marker cell-empty">${escapeHtml(t("results.emptyValue"))}</span>`;
  }

  if (value instanceof Uint8Array) {
    return `<span class="cell-marker cell-blob">${escapeHtml(`[BLOB ${value.length} bytes]`)}</span>`;
  }

  return escapeHtml(value);
}

export function getRowsByScope(scope) {
  const allRows = getGridAllRows();
  const selectedKeys = getGridSelectedKeys();
  const currentRowKey = getGridCurrentRowKey();
  const filteredRows = getGridFilteredRows();
  if (scope === "selected") {
    return allRows.filter(r => selectedKeys.has(r.__rowKey)).map(stripInternal);
  }
  if (scope === "current") {
    const row = allRows.find(r => r.__rowKey === currentRowKey);
    return row ? [stripInternal(row)] : [];
  }
  return filteredRows.map(stripInternal);
}

export function stripInternal(row) {
  const out = {};
  for (const col of getDisplayedColumns()) out[col] = row[col];
  return out;
}

export function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[;"\n\r]/.test(s)) return '"' + s.replaceAll('"', '""') + '"';
  return s;
}
