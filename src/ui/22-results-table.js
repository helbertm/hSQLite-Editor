import { tableWrap } from "../capabilities/01-dom-layout-schema.js";
import { formatNumber, t } from "../capabilities/03-localization.js";
import { updatePersistentResultHorizontalScrollbar } from "../capabilities/05c-result-scrollbar.js";
import { activateResultSet, saveActiveResultSetState } from "../capabilities/05a-result-state-controller.js";
import { setStatus } from "../capabilities/12-shell-status.js";
import { getGridActiveResultIndex, getGridColumnMetadata, getGridColumnWidths, getGridColumns, getGridCurrentPage, getGridCurrentRowKey, getGridFilteredRows, getGridFrozenColumnCount, getGridPageSize, getGridResultSets, getGridSelectedKeys, setGridState } from "../core/12-state-grid-results.js";
import { getSchemaObjects } from "../core/14-state-database-schema.js";
import { escapeHtml } from "./00-helpers.js";
import { applySort, formatValue, getDisplayedColumns, getSortState, renderCellValue, toggleSort } from "./20-results-state.js";

let refreshResultsView = () => {};
let renderResultToolbars = () => {};
let updateResultToolbars = () => {};

export function configureResultsTableRendering(effects) {
  refreshResultsView = effects.refreshResultsView;
  renderResultToolbars = effects.renderResultToolbars;
  updateResultToolbars = effects.updateResultToolbars;
}

export function bindColumnDragAndDrop() {
  let draggedCol = null;

  tableWrap.querySelectorAll("th.column-draggable").forEach(th => {
    th.addEventListener("dragstart", (event) => {
      if (event.target.classList.contains("col-resizer")) {
        event.preventDefault();
        return;
      }

      draggedCol = th.dataset.col;
      th.classList.add("dragging-column");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedCol);
    });

    th.addEventListener("dragend", () => {
      draggedCol = null;
      tableWrap.querySelectorAll("th.column-draggable").forEach(header => {
        header.classList.remove("dragging-column", "column-drop-before", "column-drop-after");
      });
    });

    th.addEventListener("dragover", (event) => {
      if (!draggedCol || draggedCol === th.dataset.col) return;
      event.preventDefault();

      const rect = th.getBoundingClientRect();
      const placeAfter = event.clientX > rect.left + rect.width / 2;

      tableWrap.querySelectorAll("th.column-draggable").forEach(header => {
        header.classList.remove("column-drop-before", "column-drop-after");
      });
      th.classList.add(placeAfter ? "column-drop-after" : "column-drop-before");
    });

    th.addEventListener("dragleave", () => {
      th.classList.remove("column-drop-before", "column-drop-after");
    });

    th.addEventListener("drop", (event) => {
      event.preventDefault();

      const sourceCol = event.dataTransfer.getData("text/plain") || draggedCol;
      const targetCol = th.dataset.col;
      const rect = th.getBoundingClientRect();
      const placeAfter = event.clientX > rect.left + rect.width / 2;

      tableWrap.querySelectorAll("th.column-draggable").forEach(header => {
        header.classList.remove("dragging-column", "column-drop-before", "column-drop-after");
      });

      moveColumn(sourceCol, targetCol, placeAfter);
    });
  });
}

export function bindColumnResizers() {
  tableWrap.querySelectorAll(".col-resizer").forEach(handle => {
    handle.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const col = handle.dataset.col;
      const th = handle.closest("th");
      const startX = event.clientX;
      const startWidth = th.getBoundingClientRect().width;
      const minWidth = 60;

      handle.classList.add("active");
      document.body.classList.add("resizing-column");

      const onMouseMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = Math.max(minWidth, Math.round(startWidth + delta));
        const columnWidths = getGridColumnWidths();
        setGridState({ columnWidths: { ...columnWidths, [col]: newWidth } });
        applyColumnWidth(col, newWidth);
        applyFrozenColumns();
      };

      const onMouseUp = () => {
        handle.classList.remove("active");
        document.body.classList.remove("resizing-column");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    handle.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const col = handle.dataset.col;
      const columnWidths = getGridColumnWidths();
      const nextColumnWidths = { ...columnWidths };
      delete nextColumnWidths[col];
      setGridState({ columnWidths: nextColumnWidths });
      renderTable();
    });
  });
}

export function applyColumnWidth(col, width) {
  const colIndex = getDisplayedColumns().indexOf(col);
  if (colIndex === -1) return;

  const th = tableWrap.querySelector(`th[data-col="${cssEscape(col)}"]`);
  if (th) {
    th.style.width = `${width}px`;
    th.style.minWidth = `${width}px`;
    th.style.maxWidth = `${width}px`;
  }

  tableWrap.querySelectorAll("tbody tr").forEach(row => {
    const cell = row.children[colIndex + 1];
    if (cell) {
      cell.style.width = `${width}px`;
      cell.style.minWidth = `${width}px`;
      cell.style.maxWidth = `${width}px`;
    }
  });
}

export function cssEscape(value) {
  if (window.CSS && CSS.escape) return CSS.escape(value);
  return String(value).replace(/["\\]/g, "\\$&");
}

export function buildColumnMetadata() {
  const columns = getGridColumns();
  const nextMetadata = {};
  const schemaObjects = getSchemaObjects();
  if (!columns.length || !Object.keys(schemaObjects).length) {
    setGridState({ columnMetadata: nextMetadata });
    return;
  }

  const tableEntries = Object.entries(schemaObjects);

  for (const col of columns) {
    const matches = [];
    for (const [table, meta] of tableEntries) {
      const field = meta.fields.find(f => f.name === col);
      if (field) matches.push({ table, field });
    }
    if (matches.length === 1) {
      const { table, field } = matches[0];
      nextMetadata[col] = { table, field };
    }
  }
  setGridState({ columnMetadata: nextMetadata });
}

export function getColumnHint(col) {
  const columnMetadata = getGridColumnMetadata();
  const meta = columnMetadata[col];
  if (!meta) return "";
  const f = meta.field;
  const parts = [
    t("grid.metaTable", { value: meta.table }),
    t("grid.metaColumn", { value: f.name }),
    t("grid.metaType", { value: f.type || t("common.notProvided") }),
    t("grid.metaPk", { value: t(f.pk ? "common.yes" : "common.no") }),
    t("grid.metaNotNull", { value: t(f.notnull ? "common.yes" : "common.no") })
  ];
  return parts.join("\\n");
}

export function setFrozenColumnsUntil(col) {
  const columns = getGridColumns();
  const idx = columns.indexOf(col);
  if (idx < 0) return;
  setGridState({ frozenColumnCount: idx + 1 });
  saveActiveResultSetState();
  refreshResultsView();
  setStatus(t("grid.columnsFrozen", { count: getGridFrozenColumnCount() }), "ok");
}

export function clearFrozenColumns() {
  setGridState({ frozenColumnCount: 0 });
  saveActiveResultSetState();
  refreshResultsView();
  setStatus(t("grid.columnsUnfrozen"), "ok");
}

export function getColumnPixelWidth(col, fallback = 160) {
  const columnWidths = getGridColumnWidths();
  if (columnWidths[col]) return columnWidths[col];

  const th = tableWrap.querySelector(`th[data-col="${cssEscape(col)}"]`);
  if (th) return Math.round(th.getBoundingClientRect().width);

  return fallback;
}

export function getFrozenLeftOffsets() {
  const frozenColumnCount = getGridFrozenColumnCount();
  const offsets = [];
  let left = 30;
  const displayedColumns = getDisplayedColumns();
  for (let i = 0; i < Math.min(frozenColumnCount, displayedColumns.length); i++) {
    offsets[i] = left;
    left += getColumnPixelWidth(displayedColumns[i]);
  }
  return offsets;
}

export function applyFrozenColumns() {
  const frozenColumnCount = getGridFrozenColumnCount();
  const columns = getGridColumns();
  if (!frozenColumnCount || !columns.length) return;

  const offsets = getFrozenLeftOffsets();
  const boundaryIndex = frozenColumnCount - 1;

  const displayedColumns = getDisplayedColumns();
  for (let i = 0; i < frozenColumnCount && i < displayedColumns.length; i++) {
    const col = displayedColumns[i];
    const left = offsets[i];

    const th = tableWrap.querySelector(`th[data-col="${cssEscape(col)}"]`);
    if (th) {
      th.classList.add("frozen-col");
      th.style.left = `${left}px`;
      th.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue("--panel2").trim();
      th.style.opacity = "1";
      if (i === boundaryIndex) th.classList.add("frozen-boundary");
    }

    tableWrap.querySelectorAll("tbody tr").forEach(row => {
      const cell = row.children[i + 1];
      if (cell) {
        cell.classList.add("frozen-col");
        cell.style.left = `${left}px`;
        cell.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue("--input-bg").trim();
        cell.style.opacity = "1";
        if (i === boundaryIndex) cell.classList.add("frozen-boundary");
      }
    });
  }
}

export function renderAllResults() {
  const resultSets = getGridResultSets();
  if (!resultSets.length) {
    renderSleepEmptyState();
    renderResultToolbars();
    return;
  }

  if (resultSets.length === 1) {
    activateResultSet(0);
    buildColumnMetadata();
    saveActiveResultSetState();
    renderTable();
    renderResultToolbars();
    return;
  }

  const previousActive = getGridActiveResultIndex();
  let htmlBlocks = '<div class="multi-results">';

  resultSets.forEach((rs, idx) => {
    activateResultSet(idx);
    buildColumnMetadata();
    applySort();

    const filteredRows = getGridFilteredRows();
    const pageSize = getGridPageSize();
    const currentPage = getGridCurrentPage();
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    setGridState({ currentPage: Math.min(currentPage, totalPages) });
    const safeCurrentPage = getGridCurrentPage();
    const start = (safeCurrentPage - 1) * pageSize;
    const pageRows = filteredRows.slice(start, start + pageSize);

    const activeClass = idx === previousActive ? " active" : "";
    htmlBlocks += `<section class="result-block${activeClass}" data-result-index="${idx}">`;
    htmlBlocks += `
      <div class="result-block-header">
        <div>
          <span class="result-block-title">${escapeHtml(t("results.resultNumber", { number: idx + 1 }))}</span>
          <span> · ${escapeHtml(t("results.rowCount", { count: formatNumber(filteredRows.length) }))}</span>
          <span> · ${escapeHtml(t("results.pageNumber", { page: safeCurrentPage, pages: totalPages }))}</span>
        </div>
        <div class="result-block-sql" title="${escapeHtml(rs.statement)}">${escapeHtml(rs.statement)}</div>
      </div>
    `;

    if (!getGridColumns().length) {
      htmlBlocks += `<div class="empty">${escapeHtml(rs.message || t("worker.noResultSet"))}</div>`;
    } else if (!pageRows.length) {
      htmlBlocks += `<div class="empty">${escapeHtml(t("results.emptyAfterFilter"))}</div>`;
    } else {
      htmlBlocks += buildTableHtml(pageRows);
    }

    htmlBlocks += "</section>";

    saveActiveResultSetState();
  });

  htmlBlocks += "</div>";
  tableWrap.innerHTML = htmlBlocks;

  setGridState({ activeResultIndex: previousActive });
  activateResultSet(getGridActiveResultIndex());
  bindRenderedTableInteractions();
  renderResultToolbars();
  updatePersistentResultHorizontalScrollbar();
}

export function moveColumn(sourceCol, targetCol, placeAfter = false) {
  if (!sourceCol || !targetCol || sourceCol === targetCol) return;

  const current = getDisplayedColumns();
  const fromIndex = current.indexOf(sourceCol);
  let toIndex = current.indexOf(targetCol);

  if (fromIndex === -1 || toIndex === -1) return;

  current.splice(fromIndex, 1);

  if (fromIndex < toIndex) toIndex -= 1;
  if (placeAfter) toIndex += 1;

  current.splice(Math.max(0, Math.min(toIndex, current.length)), 0, sourceCol);
  setGridState({ columnOrder: current });

  saveActiveResultSetState();
  refreshResultsView();
  setStatus(t("grid.columnMoved", { column: sourceCol }), "ok");
}

export function buildTableHtml(pageRows) {
  const selectedKeys = getGridSelectedKeys();
  const currentRowKey = getGridCurrentRowKey() || pageRows[0]?.__rowKey || null;
  if (!getGridCurrentRowKey() && currentRowKey) setGridState({ currentRowKey });
  const columnWidths = getGridColumnWidths();
  const visibleKeys = pageRows.map(r => r.__rowKey);
  const allVisibleSelected = visibleKeys.length > 0 && visibleKeys.every(k => selectedKeys.has(k));

  let output = `<table aria-label="${escapeHtml(t("results.tableLabel"))}"><thead><tr>`;
  output += `<th class="checkbox" scope="col"><input type="checkbox" class="selectPageCheckbox" ${allVisibleSelected ? "checked" : ""} title="${escapeHtml(t("results.selectPage"))}" aria-label="${escapeHtml(t("results.selectPage"))}"></th>`;

  const displayedColumns = getDisplayedColumns();

  for (const col of displayedColumns) {
    const sort = getSortState(col);
    const indicator = sort ? `<span class="sort-indicator">${sort.direction === "asc" ? "▲" : "▼"}</span><span class="sort-badge">${sort.index}</span>` : "";
    const ariaSort = sort ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
    const meta = getColumnHint(col);
    const title = meta ? escapeHtml(`${meta}\n${t("grid.freezeHint")}`) : escapeHtml(t("grid.columnHint"));
    const widthStyle = columnWidths[col] ? ` style="width:${columnWidths[col]}px;min-width:${columnWidths[col]}px;max-width:${columnWidths[col]}px"` : "";
    output += `<th class="sortable resizable column-draggable" scope="col" tabindex="0" draggable="true" data-col="${escapeHtml(col)}" aria-sort="${ariaSort}" aria-label="${escapeHtml(`${col}. ${t("grid.sortHelp")}`)}" title="${title}\n${escapeHtml(t("grid.sortHelp"))}"${widthStyle}><span class="column-title">${escapeHtml(col)}</span>${indicator}<span class="column-drag-handle" aria-hidden="true"><svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M12 3v18M12 3 8.5 6.5M12 3l3.5 3.5M12 21l-3.5-3.5M12 21l3.5-3.5M3 12h18M3 12l3.5-3.5M3 12l3.5 3.5M21 12l-3.5-3.5M21 12l-3.5 3.5"/></svg></span><span class="col-resizer" data-col="${escapeHtml(col)}" aria-hidden="true"></span></th>`;
  }

  output += "</tr></thead><tbody>";

  for (let rowIndex = 0; rowIndex < pageRows.length; rowIndex += 1) {
    const row = pageRows[rowIndex];
    const selected = selectedKeys.has(row.__rowKey);
    const current = currentRowKey === row.__rowKey;
    output += `<tr data-key="${row.__rowKey}" tabindex="${current ? "0" : "-1"}" aria-selected="${selected ? "true" : "false"}" class="${selected ? "selected" : ""} ${current ? "current-row" : ""}" title="${escapeHtml(t("grid.rowHelp"))}">`;
    output += `<td class="checkbox"><input type="checkbox" class="rowCheckbox" data-key="${row.__rowKey}" ${selected ? "checked" : ""} aria-label="${escapeHtml(t("grid.rowSelection", { row: rowIndex + 1 }))}"></td>`;
    for (const col of displayedColumns) {
      const widthStyle = columnWidths[col] ? ` style="width:${columnWidths[col]}px;min-width:${columnWidths[col]}px;max-width:${columnWidths[col]}px"` : "";
      output += `<td title="${escapeHtml(formatValue(row[col]))}"${widthStyle}>${renderCellValue(row[col])}</td>`;
    }
    output += "</tr>";
  }

  output += "</tbody></table>";
  return output;
}

export const tableInteractionController = {
  bindRendered() {
    tableWrap.querySelectorAll(".result-block").forEach(block => {
      block.addEventListener("mousedown", () => {
        const idx = Number(block.dataset.resultIndex);
        saveActiveResultSetState();
        activateResultSet(idx);
        setGridState({ activeResultIndex: idx });
        updateResultToolbars();
      });
    });
    this.bindSingle();
  },
  bindSingle() {
    tableWrap.querySelectorAll("th[data-col]").forEach(th => {
      th.addEventListener("click", (event) => {
        if (event.target.classList.contains("col-resizer")) return;
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          setFrozenColumnsUntil(th.dataset.col);
          return;
        }
        toggleSort(th.dataset.col, event.shiftKey);
      });
      th.addEventListener("keydown", (event) => {
        const col = th.dataset.col;
        if ((event.key === "Enter" || event.key === " ") && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          setFrozenColumnsUntil(col);
          setTimeout(() => focusGridHeader(col), 0);
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleSort(col, event.shiftKey);
          setTimeout(() => focusGridHeader(col), 0);
          return;
        }
        if (!event.altKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        if (event.shiftKey) {
          resizeColumnFromKeyboard(col, event.key === "ArrowRight" ? 16 : -16);
        } else {
          moveColumnFromKeyboard(col, event.key === "ArrowRight" ? 1 : -1);
        }
      });
    });

    bindColumnDragAndDrop();
    bindColumnResizers();
    applyFrozenColumns();

    tableWrap.querySelectorAll(".selectPageCheckbox").forEach(pageCheckbox => {
      pageCheckbox.addEventListener("change", () => {
        const currentPage = getGridCurrentPage();
        const pageSize = getGridPageSize();
        const filteredRows = getGridFilteredRows();
        const selectedKeys = getGridSelectedKeys();
        const start = (currentPage - 1) * pageSize;
        const pageRows = filteredRows.slice(start, start + pageSize);
        const visibleKeys = pageRows.map(r => r.__rowKey);
        const nextSelectedKeys = new Set(selectedKeys);

        for (const key of visibleKeys) {
          if (pageCheckbox.checked) nextSelectedKeys.add(key);
          else nextSelectedKeys.delete(key);
        }

        setGridState({ selectedKeys: nextSelectedKeys });
        saveActiveResultSetState();
        refreshResultsView();
      });
    });

    tableWrap.querySelectorAll(".rowCheckbox").forEach(cb => {
      cb.addEventListener("click", (e) => {
        e.stopPropagation();
        const selectedKeys = getGridSelectedKeys();
        const nextSelectedKeys = new Set(selectedKeys);
        if (cb.checked) nextSelectedKeys.add(cb.dataset.key);
        else nextSelectedKeys.delete(cb.dataset.key);
        setGridState({ selectedKeys: nextSelectedKeys, currentRowKey: cb.dataset.key });
        saveActiveResultSetState();
        refreshResultsView();
      });
    });

    tableWrap.querySelectorAll("tbody tr").forEach(tr => {
      tr.addEventListener("click", (e) => {
        if (e.target.tagName.toLowerCase() === "input") return;
        const key = tr.dataset.key;
        const selectedKeys = getGridSelectedKeys();
        let nextSelectedKeys = selectedKeys;
        if (e.shiftKey) {
          nextSelectedKeys = new Set(selectedKeys);
          if (nextSelectedKeys.has(key)) nextSelectedKeys.delete(key);
          else nextSelectedKeys.add(key);
        }
        setGridState({ selectedKeys: nextSelectedKeys, currentRowKey: key });
        saveActiveResultSetState();
        refreshResultsView();
      });
      tr.addEventListener("dblclick", () => {
        const key = tr.dataset.key;
        const selectedKeys = getGridSelectedKeys();
        const nextSelectedKeys = new Set(selectedKeys);
        if (nextSelectedKeys.has(key)) nextSelectedKeys.delete(key);
        else nextSelectedKeys.add(key);
        setGridState({ selectedKeys: nextSelectedKeys, currentRowKey: key });
        saveActiveResultSetState();
        refreshResultsView();
      });
      tr.addEventListener("keydown", (event) => {
        const rows = Array.from(tableWrap.querySelectorAll("tbody tr"));
        const index = rows.indexOf(tr);
        if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const targetIndex = event.key === "Home" ? 0
            : event.key === "End" ? rows.length - 1
              : Math.max(0, Math.min(rows.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
          setCurrentGridRow(rows[targetIndex]);
          return;
        }
        if (event.key === " ") {
          event.preventDefault();
          const key = tr.dataset.key;
          const nextSelectedKeys = new Set(getGridSelectedKeys());
          if (nextSelectedKeys.has(key)) nextSelectedKeys.delete(key);
          else nextSelectedKeys.add(key);
          setGridState({ selectedKeys: nextSelectedKeys, currentRowKey: key });
          saveActiveResultSetState();
          refreshResultsView();
          setTimeout(() => tableWrap.querySelector(`tbody tr[data-key="${cssEscape(key)}"]`)?.focus(), 0);
        }
      });
    });
  }
};

export function focusGridHeader(column) {
  tableWrap.querySelector(`th[data-col="${cssEscape(column)}"]`)?.focus();
}

export function resizeColumnFromKeyboard(column, delta) {
  const currentWidth = getColumnPixelWidth(column);
  const nextWidth = Math.max(60, currentWidth + delta);
  setGridState({ columnWidths: { ...getGridColumnWidths(), [column]: nextWidth } });
  saveActiveResultSetState();
  refreshResultsView();
  setTimeout(() => focusGridHeader(column), 0);
}

export function moveColumnFromKeyboard(column, delta) {
  const columns = getDisplayedColumns();
  const sourceIndex = columns.indexOf(column);
  const targetIndex = Math.max(0, Math.min(columns.length - 1, sourceIndex + delta));
  if (targetIndex === sourceIndex) return;
  moveColumn(column, columns[targetIndex], delta > 0);
  setTimeout(() => focusGridHeader(column), 0);
}

export function setCurrentGridRow(row) {
  if (!row) return;
  setGridState({ currentRowKey: row.dataset.key });
  tableWrap.querySelectorAll("tbody tr").forEach(candidate => {
    const current = candidate === row;
    candidate.tabIndex = current ? 0 : -1;
    candidate.classList.toggle("current-row", current);
  });
  saveActiveResultSetState();
  row.focus();
}

export function bindRenderedTableInteractions() {
  tableInteractionController.bindRendered();
}

export function renderSleepEmptyState() {
  tableWrap.innerHTML = `
    <div class="empty-state" aria-label="${escapeHtml(t("results.sleepLabel"))}">
      <div class="empty-state-card">
        <p class="empty-state-title">${escapeHtml(t("results.sleepTitle"))}</p>
        <p class="empty-state-description">${escapeHtml(t("results.sleepDescription"))}</p>
      </div>
    </div>
  `;
  updatePersistentResultHorizontalScrollbar();
}

export function renderTable() {
  const columns = getGridColumns();
  const filteredRows = getGridFilteredRows();
  const pageSize = getGridPageSize();
  const currentPage = getGridCurrentPage();
  if (!columns.length) {
    renderSleepEmptyState();
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);

  if (!pageRows.length) {
    renderSleepEmptyState();
    return;
  }

  tableWrap.innerHTML = buildTableHtml(pageRows);
  bindSingleTableInteractions();
  updatePersistentResultHorizontalScrollbar();
}

export function bindSingleTableInteractions() {
  tableInteractionController.bindSingle();
}
