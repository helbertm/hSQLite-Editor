import { exportCsvBtn, exportJsonBtn } from "../capabilities/03-dom-editor-results.js";
import { t } from "../capabilities/03-localization.js";
import { cancelExportBtn, confirmExportBtn, exportModal, exportScopeOptions } from "../capabilities/05-dom-library-settings.js";
import { modalController } from "../capabilities/05-modal-controller.js";
import { setStatus } from "../capabilities/12-shell-status.js";
import { formatRecordCount } from "../capabilities/35-editor-quick-history.js";
import { getGridCurrentRowKey, getGridFilteredRows, getGridSelectedKeys } from "../core/12-state-grid-results.js";
import { getPendingExportType, setRuntimeState } from "../core/15-state-runtime-library.js";
import { downloadText } from "../ports/10-browser-io.js";
import { csvEscape, getDisplayedColumns, getRowsByScope } from "./20-results-state.js";

export const exportController = {
  open(type) {
    setRuntimeState({ pendingExportType: type });
    const filteredRows = getGridFilteredRows();
    const selectedKeys = getGridSelectedKeys();
    const currentRowKey = getGridCurrentRowKey();

    const counts = {
      all: filteredRows.length,
      selected: selectedKeys.size,
      current: currentRowKey ? 1 : 0
    };

    document.getElementById("exportAllCount").textContent = formatRecordCount(counts.all);
    document.getElementById("exportSelectedCount").textContent = formatRecordCount(counts.selected);
    document.getElementById("exportCurrentLabel").textContent = formatRecordCount(counts.current);

    const hasAnyExportableRows = counts.all > 0 || counts.selected > 0 || counts.current > 0;
    exportScopeOptions.classList.toggle("export-empty-state", !hasAnyExportableRows);
    confirmExportBtn.disabled = !hasAnyExportableRows;

    const preferredOrder = ["all", "selected", "current"];
    let firstAvailableScope = "";

    for (const scope of preferredOrder) {
      const label = exportScopeOptions.querySelector(`[data-export-scope-label="${scope}"]`);
      const input = exportScopeOptions.querySelector(`input[name="exportScope"][value="${scope}"]`);
      const available = counts[scope] > 0;

      if (label) label.classList.toggle("export-option-disabled", !available);

      if (input) {
        input.disabled = !available;
        input.checked = false;
      }

      if (available && !firstAvailableScope) {
        firstAvailableScope = scope;
      }
    }

    const firstInput = firstAvailableScope
      ? exportScopeOptions.querySelector(`input[name="exportScope"][value="${firstAvailableScope}"]`)
      : null;

    if (firstInput) firstInput.checked = true;

    modalController.open(exportModal);
  },
  close() {
    modalController.close(exportModal);
    setRuntimeState({ pendingExportType: null });
  },
  confirm() {
    const selectedScopeInput = document.querySelector('input[name="exportScope"]:checked');

    if (!selectedScopeInput) {
      setStatus(t("results.exportUnavailable"), "warn");
      return;
    }

    const scope = selectedScopeInput.value;
    const rows = getRowsByScope(scope);

    if (!rows.length) {
      setStatus(t("results.exportUnavailable"), "warn");
      return;
    }

    if (getPendingExportType() === "csv") {
      const lines = [];
      const exportColumns = getDisplayedColumns();
      lines.push(exportColumns.map(csvEscape).join(";"));
      for (const row of rows) {
        lines.push(exportColumns.map(col => csvEscape(row[col])).join(";"));
      }
      downloadText(t("results.csvFilename"), "\ufeff" + lines.join("\n"), "text/csv;charset=utf-8");
    } else if (getPendingExportType() === "json") {
      downloadText(t("results.jsonFilename"), JSON.stringify(rows, null, 2), "application/json;charset=utf-8");
    }
    this.close();
  }
};

export function openExportModal(type) {
  exportController.open(type);
}

export function closeExportModal() {
  exportController.close();
}

export function bindResultsExportUi() {
  cancelExportBtn.addEventListener("click", closeExportModal);
  exportModal.addEventListener("click", (e) => {
    if (modalController.isBackdropClick(e, exportModal)) closeExportModal();
  });
  confirmExportBtn.addEventListener("click", () => exportController.confirm());
  exportCsvBtn.addEventListener("click", () => openExportModal("csv"));
  exportJsonBtn.addEventListener("click", () => openExportModal("json"));
}
