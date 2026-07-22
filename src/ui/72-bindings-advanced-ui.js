import { bootRetryBtn } from "../capabilities/00-dom-base.js";
import { cancelCloseTabBtn, cancelSqlBtn, closeTabConfirmModal, confirmCloseTabBtn, sqlFindCloseBtn, sqlFindInput, sqlFindNextBtn, sqlFindPrevBtn, sqlFindToggleReplaceBtn, sqlReplaceAllBtn, sqlReplaceInput, sqlReplaceOneBtn } from "../capabilities/03-dom-editor-results.js";
import { t } from "../capabilities/03-localization.js";
import { modalController } from "../capabilities/05-modal-controller.js";
import { sqlMapAutoLayoutBtn, sqlMapBtn, sqlMapCanvasWrap, sqlMapClearPasteSqlBtn, sqlMapClearSelectionBtn, sqlMapClearVirtualBtn, sqlMapCloseBtn, sqlMapConfirmAcknowledge, sqlMapConfirmCancelBtn, sqlMapConfirmCopySqlBtn, sqlMapConfirmCreateBtn, sqlMapConfirmInvertBtn, sqlMapConfirmOpenSqlBtn, sqlMapCopySqlBtn, sqlMapEdgeTooltip, sqlMapEdgeTooltipRemoveBtn, sqlMapExportPngBtn, sqlMapModal, sqlMapPasteSqlBtn, sqlMapRelationConfirmModal, sqlMapSearch } from "../capabilities/06-dom-sql-map.js";
import { tablePopulationCancelBtn, tablePopulationColumnList, tablePopulationModal, tablePopulationRecordCount, tablePopulationRunBtn } from "../capabilities/07-dom-table-population.js";
import { terminateActiveSqlWorker } from "../capabilities/10-sql-execution.js";
import { setStatus } from "../capabilities/12-shell-status.js";
import { cancelCloseSqlTab, confirmCloseSqlTab } from "../capabilities/23-sql-tabs-state.js";
import { clearTablePopulationErrors, closeTablePopulationModal, executeTablePopulation, renderTablePopulationStrategyParams, updateTablePopulationLargeConfirmation } from "../capabilities/39-table-population.js";
import { closeSqlFindPanel, findNextSqlMatch, findPreviousSqlMatch, refreshSqlFindMatches, replaceAllSqlMatches, replaceCurrentSqlMatch, toggleSqlReplaceMode } from "../capabilities/40-sql-find.js";
import { resetSqlMapFieldDragRuntime, sqlMapRuntime, sqlMapState } from "../capabilities/45a-sql-map-runtime.js";
import { cancelSqlMapEdgeTooltipHide, hideSqlMapEdgeTooltip, scheduleHideSqlMapEdgeTooltip } from "../capabilities/45b-sql-map-tooltip.js";
import { autoLayoutSqlMap } from "../capabilities/46-sql-map-graph.js";
import { announceSqlMap, clearSqlMapVirtualRelationships, closeSqlMapRelationConfirm, confirmSqlMapPendingRelation, copySqlMapDiagnosticSql, exportSqlMapPng, invertSqlMapPendingRelation, openSqlMapDiagnosticSql, removeSqlMapVirtualRelationship, renderSqlMap } from "../capabilities/47-sql-map-render.js";
import { clearSqlMapSelection, closeSqlMap, copySqlMapSql, onSqlMapMouseMove, onSqlMapMouseUp, onSqlMapPointerMove, onSqlMapPointerUp, openSqlMap, pasteSqlMapSql } from "../capabilities/48-sql-map-interactions.js";

export function bindSqlMapUi() {
  sqlMapBtn.addEventListener("click", openSqlMap);
  sqlMapCloseBtn.addEventListener("click", closeSqlMap);
  sqlMapModal.addEventListener("click", (event) => {
    if (modalController.isBackdropClick(event, sqlMapModal)) closeSqlMap();
  });
  sqlMapSearch.addEventListener("input", renderSqlMap);
  sqlMapAutoLayoutBtn.addEventListener("click", () => {
    autoLayoutSqlMap();
    renderSqlMap();
  });
  sqlMapCopySqlBtn.addEventListener("click", copySqlMapSql);
  sqlMapPasteSqlBtn.addEventListener("click", () => pasteSqlMapSql(false));
  sqlMapClearPasteSqlBtn.addEventListener("click", () => pasteSqlMapSql(true));
  sqlMapClearSelectionBtn.addEventListener("click", clearSqlMapSelection);
  sqlMapClearVirtualBtn.addEventListener("click", clearSqlMapVirtualRelationships);
  sqlMapExportPngBtn.addEventListener("click", exportSqlMapPng);
  sqlMapCanvasWrap.addEventListener("scroll", () => hideSqlMapEdgeTooltip(true));
  sqlMapEdgeTooltip.addEventListener("mouseenter", cancelSqlMapEdgeTooltipHide);
  sqlMapEdgeTooltip.addEventListener("mouseleave", scheduleHideSqlMapEdgeTooltip);
  sqlMapEdgeTooltipRemoveBtn.addEventListener("click", () => {
    const edgeId = sqlMapEdgeTooltipRemoveBtn.dataset.sqlMapEdgeId || "";
    if (!edgeId) return;
    removeSqlMapVirtualRelationship(edgeId);
  });
  sqlMapRelationConfirmModal.addEventListener("click", (event) => {
    if (modalController.isBackdropClick(event, sqlMapRelationConfirmModal)) closeSqlMapRelationConfirm();
  });
  sqlMapConfirmCancelBtn.addEventListener("click", closeSqlMapRelationConfirm);
  sqlMapConfirmInvertBtn.addEventListener("click", invertSqlMapPendingRelation);
  sqlMapConfirmCreateBtn.addEventListener("click", confirmSqlMapPendingRelation);
  sqlMapConfirmCopySqlBtn.addEventListener("click", copySqlMapDiagnosticSql);
  sqlMapConfirmOpenSqlBtn.addEventListener("click", openSqlMapDiagnosticSql);
  sqlMapConfirmAcknowledge.addEventListener("change", () => {
    const draft = sqlMapState.pendingRelationDraft;
    const isBlocked = Boolean(draft && (draft.status === "blocked-data" || draft.status === "blocked-schema" || draft.level === "blocked"));
    sqlMapConfirmCreateBtn.disabled = Boolean(isBlocked || (draft && draft.status === "warn" && !sqlMapConfirmAcknowledge.checked));
  });
  document.addEventListener("mousemove", onSqlMapMouseMove);
  document.addEventListener("mouseup", onSqlMapMouseUp);
  document.addEventListener("pointermove", onSqlMapPointerMove);
  document.addEventListener("pointerup", onSqlMapPointerUp);
  sqlMapModal.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!sqlMapRuntime.fieldDrag && !sqlMapRuntime.keyboardRelationSource) return;
    event.preventDefault();
    event.stopPropagation();
    resetSqlMapFieldDragRuntime();
    renderSqlMap();
    const announcement = t("sqlMap.relationCancelled");
    setStatus(announcement, "warn");
    announceSqlMap(announcement);
  });
}

export function bindSqlFindUi() {
  sqlFindInput.addEventListener("input", () => refreshSqlFindMatches());
  sqlFindInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.shiftKey ? findPreviousSqlMatch() : findNextSqlMatch();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeSqlFindPanel();
    }
  });
  sqlReplaceInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      replaceCurrentSqlMatch();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeSqlFindPanel();
    }
  });
  sqlFindPrevBtn.addEventListener("click", findPreviousSqlMatch);
  sqlFindNextBtn.addEventListener("click", findNextSqlMatch);
  sqlFindToggleReplaceBtn.addEventListener("click", toggleSqlReplaceMode);
  sqlFindCloseBtn.addEventListener("click", closeSqlFindPanel);
  sqlReplaceOneBtn.addEventListener("click", replaceCurrentSqlMatch);
  sqlReplaceAllBtn.addEventListener("click", replaceAllSqlMatches);
}

export function bindTablePopulationUi() {
  tablePopulationRecordCount.addEventListener("input", updateTablePopulationLargeConfirmation);
  tablePopulationColumnList.addEventListener("change", (event) => {
    const select = event.target.closest("[data-population-strategy]");
    if (!select) return;
    const row = select.closest("[data-population-column]");
    if (row) renderTablePopulationStrategyParams(row);
    clearTablePopulationErrors();
  });
  tablePopulationCancelBtn.addEventListener("click", closeTablePopulationModal);
  tablePopulationRunBtn.addEventListener("click", executeTablePopulation);
  tablePopulationModal.addEventListener("click", (event) => {
    if (modalController.isBackdropClick(event, tablePopulationModal)) closeTablePopulationModal();
  });
}

export function bindExecutionAndTabDialogs() {
  cancelSqlBtn.addEventListener("click", () => {
    terminateActiveSqlWorker(true);
  });
  cancelCloseTabBtn.addEventListener("click", cancelCloseSqlTab);
  confirmCloseTabBtn.addEventListener("click", confirmCloseSqlTab);
  closeTabConfirmModal.addEventListener("click", (event) => {
    if (modalController.isBackdropClick(event, closeTabConfirmModal)) cancelCloseSqlTab();
  });
}

export function bindBootRecoveryUi() {
  if (!bootRetryBtn) return;
  bootRetryBtn.addEventListener("click", () => {
    location.reload();
  });
}
