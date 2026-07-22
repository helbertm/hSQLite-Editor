import { appState } from "./10-state-root.js";

export function setGridState(patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "allRows")) {
      appState.grid.allRows = patch.allRows;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "columns")) {
      appState.grid.columns = patch.columns;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "filteredRows")) {
      appState.grid.filteredRows = patch.filteredRows;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "resultSets")) {
      appState.grid.resultSets = patch.resultSets;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "activeResultIndex")) {
      appState.grid.activeResultIndex = patch.activeResultIndex;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "currentPage")) {
      appState.grid.currentPage = patch.currentPage;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "pageSize")) {
      appState.grid.pageSize = patch.pageSize;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "sortStates")) {
      appState.grid.sortStates = patch.sortStates;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "columnMetadata")) {
      appState.grid.columnMetadata = patch.columnMetadata;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "columnWidths")) {
      appState.grid.columnWidths = patch.columnWidths;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "columnOrder")) {
      appState.grid.columnOrder = patch.columnOrder;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "frozenColumnCount")) {
      appState.grid.frozenColumnCount = patch.frozenColumnCount;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "selectedKeys")) {
      appState.grid.selectedKeys = patch.selectedKeys;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "currentRowKey")) {
      appState.grid.currentRowKey = patch.currentRowKey;
    }
  }

export function getGridState() {
    return appState.grid;
  }

export function getGridAllRows() {
    return appState.grid.allRows;
  }

export function getGridColumns() {
    return appState.grid.columns;
  }

export function getGridFilteredRows() {
    return appState.grid.filteredRows;
  }

export function getGridResultSets() {
    return appState.grid.resultSets;
  }

export function getGridActiveResultIndex() {
    return appState.grid.activeResultIndex;
  }

export function getGridCurrentPage() {
    return appState.grid.currentPage;
  }

export function getGridPageSize() {
    return appState.grid.pageSize;
  }

export function getGridSortStates() {
    return appState.grid.sortStates;
  }

export function getGridColumnMetadata() {
    return appState.grid.columnMetadata;
  }

export function getGridColumnWidths() {
    return appState.grid.columnWidths;
  }

export function getGridColumnOrder() {
    return appState.grid.columnOrder;
  }

export function getGridFrozenColumnCount() {
    return appState.grid.frozenColumnCount;
  }

export function getGridSelectedKeys() {
    return appState.grid.selectedKeys;
  }

export function getGridCurrentRowKey() {
    return appState.grid.currentRowKey;
  }

export function resetGridStateToEmpty() {
    setGridState({
      columns: [],
      allRows: [],
      filteredRows: [],
      resultSets: [],
      activeResultIndex: 0,
      currentPage: 1,
      pageSize: 50,
      sortStates: [],
      columnMetadata: {},
      columnWidths: {},
      columnOrder: [],
      frozenColumnCount: 0,
      selectedKeys: new Set(),
      currentRowKey: null
    });
  }

export function hydrateGridStateFromResultSet(resultSet, nextActiveResultIndex = 0) {
    const resultSets = getGridResultSets();
    const normalized = normalizeResultSetState(resultSet);
    setGridState({
      resultSets,
      activeResultIndex: nextActiveResultIndex,
      columns: normalized.columns,
      allRows: normalized.allRows,
      filteredRows: normalized.filteredRows,
      currentPage: normalized.currentPage,
      pageSize: normalized.pageSize,
      sortStates: normalized.sortStates,
      selectedKeys: normalized.selectedKeys,
      currentRowKey: normalized.currentRowKey,
      columnMetadata: normalized.columnMetadata,
      columnWidths: normalized.columnWidths,
      columnOrder: normalized.columnOrder,
      frozenColumnCount: normalized.frozenColumnCount
    });
    return normalized;
  }

export function persistGridStateIntoResultSet(targetResultSet) {
    if (!targetResultSet) return null;
    targetResultSet.columns = getGridColumns();
    targetResultSet.allRows = getGridAllRows();
    targetResultSet.filteredRows = getGridFilteredRows();
    targetResultSet.currentPage = getGridCurrentPage();
    targetResultSet.pageSize = getGridPageSize();
    targetResultSet.sortStates = getGridSortStates();
    targetResultSet.selectedKeys = getGridSelectedKeys();
    targetResultSet.currentRowKey = getGridCurrentRowKey();
    targetResultSet.columnMetadata = getGridColumnMetadata();
    targetResultSet.columnWidths = getGridColumnWidths();
    targetResultSet.columnOrder = getGridColumnOrder();
    targetResultSet.frozenColumnCount = getGridFrozenColumnCount();
    return targetResultSet;
  }

export function createResultSetState({
    statement = "",
    statementIndex = 0,
    columns: nextColumns = [],
    allRows: nextAllRows = [],
    filteredRows: nextFilteredRows = null,
    currentPageValue = 1,
    pageSizeValue = 50,
    sortStatesValue = [],
    selectedKeysValue = new Set(),
    currentRowKeyValue = null,
    columnMetadataValue = {},
    columnWidthsValue = {},
    columnOrderValue = [],
    frozenColumnCountValue = 0,
    message = ""
  } = {}) {
    const safeColumns = Array.isArray(nextColumns) ? nextColumns : [];
    const safeAllRows = Array.isArray(nextAllRows) ? nextAllRows : [];
    const safeFilteredRows = Array.isArray(nextFilteredRows) ? nextFilteredRows : [...safeAllRows];

    return {
      statement,
      statementIndex,
      columns: safeColumns,
      allRows: safeAllRows,
      filteredRows: safeFilteredRows,
      currentPage: currentPageValue,
      pageSize: pageSizeValue,
      sortStates: Array.isArray(sortStatesValue) ? sortStatesValue : [],
      selectedKeys: selectedKeysValue instanceof Set ? selectedKeysValue : new Set(),
      currentRowKey: currentRowKeyValue,
      columnMetadata: columnMetadataValue && typeof columnMetadataValue === "object" ? columnMetadataValue : {},
      columnWidths: columnWidthsValue && typeof columnWidthsValue === "object" ? columnWidthsValue : {},
      columnOrder: Array.isArray(columnOrderValue) && columnOrderValue.length ? columnOrderValue : [...safeColumns],
      frozenColumnCount: frozenColumnCountValue,
      message
    };
  }

export function normalizeResultSetState(raw) {
    return createResultSetState({
      statement: raw?.statement || "",
      statementIndex: Number(raw?.statementIndex || 0),
      columns: raw?.columns || [],
      allRows: raw?.allRows || [],
      filteredRows: raw?.filteredRows || null,
      currentPageValue: Number(raw?.currentPage || 1),
      pageSizeValue: Number(raw?.pageSize || 50),
      sortStatesValue: raw?.sortStates || [],
      selectedKeysValue: raw?.selectedKeys || new Set(),
      currentRowKeyValue: raw?.currentRowKey || null,
      columnMetadataValue: raw?.columnMetadata || {},
      columnWidthsValue: raw?.columnWidths || {},
      columnOrderValue: raw?.columnOrder || [],
      frozenColumnCountValue: Number(raw?.frozenColumnCount || 0),
      message: raw?.message || ""
    });
  }
