import { t } from "./03-localization.js";
import { modalController } from "./05-modal-controller.js";
import { sqlMapCanvas, sqlMapModal, sqlMapRelationConfirmModal } from "./06-dom-sql-map.js";
import { hasActiveDatabase } from "./07-database-runtime.js";
import { setStatus } from "./12-shell-status.js";
import { saveCurrentTabState } from "./22c-active-tab-sync.js";
import { getEditorValue, setEditorValue } from "./32a-editor-api.js";
import { buildSqlMapRelationDraft, getSqlMapDraftVisualState, isSqlMapNaturalFkCandidate, parseSqlMapFieldDomId, saveSqlMapPositions } from "./45-sql-map-core.js";
import { cancelSqlMapFieldDragCleanup, resetSqlMapFieldDragRuntime, sqlMapRuntime, sqlMapState } from "./45a-sql-map-runtime.js";
import { hideSqlMapEdgeTooltip } from "./45b-sql-map-tooltip.js";
import { buildSqlMapSchema, ensureSqlMapLayout, getSqlMapJoinPlan, updateSqlMapActionButtons, updateSqlMapGeneratedSql } from "./46-sql-map-graph.js";
import { announceSqlMap, handleSqlMapFieldDrop, renderSqlMap, renderSqlMapLinks } from "./47-sql-map-render.js";
import { setSqlMapState } from "../core/14-state-database-schema.js";

export function commitSqlMapFieldRelationshipTarget(targetRow) {
  if (!sqlMapRuntime.fieldDrag || !targetRow) return false;
  const fieldDrag = sqlMapRuntime.fieldDrag;
  const targetId = targetRow.dataset.mapFieldDrag || "";
  const targetRef = parseSqlMapFieldDomId(targetId);
  const targetTable = targetRef.table || targetRow.dataset.mapFieldTable || "";
  const targetField = targetRef.field || targetRow.dataset.mapFieldName || "";
  if (!targetId || targetId === fieldDrag.fieldId || sqlMapRuntime.fieldDropCommitted) return false;
  if (!targetTable || !targetField) {
    scheduleSqlMapFieldDragCleanup();
    return false;
  }
  cancelSqlMapFieldDragCleanup();
  sqlMapRuntime.fieldDropCommitted = true;
  sqlMapRuntime.fieldDropTargetId = targetId;
  sqlMapRuntime.suppressFieldClickUntil = Date.now() + 400;
  sqlMapRuntime.fieldDrag = null;
  handleSqlMapFieldDrop(fieldDrag.table, fieldDrag.field, targetTable, targetField);
  return true;
}

export function scheduleSqlMapFieldDragCleanup() {
  cancelSqlMapFieldDragCleanup();
  sqlMapRuntime.fieldDragCleanupTimer = window.setTimeout(() => {
    sqlMapRuntime.fieldDragCleanupTimer = null;
    if (sqlMapRuntime.fieldDropCommitted) return;
    resetSqlMapFieldDragRuntime();
    syncSqlMapFieldDragUi();
  }, 80);
}

export function buildSqlMapFieldDragGhostMetrics(row, event) {
  const fieldNameEl = row.querySelector(".sql-map-field-name");
  const fieldMetaEl = row.querySelector(".sql-map-field-meta");
  const rect = typeof row.getBoundingClientRect === "function"
    ? row.getBoundingClientRect()
    : { left: 0, top: 0, width: row.offsetWidth || 180, height: row.offsetHeight || 28 };
  return {
    width: Math.max(160, Math.round(rect.width || row.offsetWidth || 180)),
    offsetX: Math.max(10, Math.round((event.clientX || 0) - (rect.left || 0))),
    offsetY: Math.max(10, Math.round((event.clientY || 0) - (rect.top || 0))),
    meta: fieldMetaEl ? String(fieldMetaEl.textContent || "").trim() : "",
    stateLabel: ""
  };
}

export function syncSqlMapFieldDragUi() {
  sqlMapCanvas.querySelectorAll("[data-map-field-drag]").forEach((row) => {
    const fieldId = row.dataset.mapFieldDrag;
    const isDragSource = Boolean(sqlMapRuntime.fieldDrag && sqlMapRuntime.fieldDrag.fieldId === fieldId);
    const isKeyboardSource = sqlMapRuntime.keyboardRelationSource?.fieldId === fieldId;
    const activeSource = sqlMapRuntime.fieldDrag || sqlMapRuntime.keyboardRelationSource;
    const isDropTarget = sqlMapRuntime.fieldDropTargetId === fieldId;
    const isNaturalCandidate = Boolean(
      activeSource
      && !isDragSource
      && !isKeyboardSource
      && isSqlMapNaturalFkCandidate(
        activeSource.table,
        activeSource.field,
        row.dataset.mapFieldTable || "",
        row.dataset.mapFieldName || ""
      )
    );
    row.classList.toggle("drag-source", isDragSource);
    row.classList.toggle("keyboard-source", isKeyboardSource);
    row.setAttribute("aria-pressed", isKeyboardSource ? "true" : "false");
    row.classList.toggle("drop-target", isDropTarget);
    row.classList.toggle("natural-candidate", isNaturalCandidate);
    row.classList.toggle("drop-target-allowed", isDropTarget && sqlMapRuntime.fieldDropValidationStatus === "allowed");
    row.classList.toggle("drop-target-caution", isDropTarget && sqlMapRuntime.fieldDropValidationStatus === "caution");
    row.classList.toggle("drop-target-blocked", isDropTarget && sqlMapRuntime.fieldDropValidationStatus === "blocked");
    row.classList.toggle("drop-target-pending", isDropTarget && !sqlMapRuntime.fieldDropValidationStatus);
    const stateLabel = row.querySelector(".sql-map-field-drop-state");
    if (!stateLabel) return;
    const label = isKeyboardSource
      ? t("sqlMap.source")
      : isDropTarget
      ? sqlMapRuntime.fieldDropValidationStatus === "allowed"
        ? t("sqlMap.compatible")
        : sqlMapRuntime.fieldDropValidationStatus === "caution"
          ? t("sqlMap.review")
          : sqlMapRuntime.fieldDropValidationStatus === "blocked"
            ? t("sqlMap.blocked")
            : ""
      : row.classList.contains("natural-candidate")
        ? t("sqlMap.suggestion")
        : "";
    stateLabel.textContent = label;
    stateLabel.setAttribute("aria-hidden", label ? "false" : "true");
    if (isDragSource && sqlMapRuntime.fieldDragGhostMetrics) {
      sqlMapRuntime.fieldDragGhostMetrics.stateLabel = label;
    }
  });
  renderSqlMapLinks(getSqlMapJoinPlan().usedFks || new Set());
}

export function handleSqlMapFieldKeyboardAction(row) {
  const fieldId = row.dataset.mapFieldDrag || "";
  const table = row.dataset.mapFieldTable || "";
  const field = row.dataset.mapFieldName || "";
  if (!fieldId || !table || !field) return;

  const source = sqlMapRuntime.keyboardRelationSource;
  if (!source) {
    resetSqlMapFieldDragRuntime();
    sqlMapRuntime.keyboardRelationSource = { fieldId, table, field };
    syncSqlMapFieldDragUi();
    const announcement = t("sqlMap.sourceSelected", { table, field });
    setStatus(announcement, "warn");
    announceSqlMap(announcement);
    return;
  }

  if (source.fieldId === fieldId) {
    resetSqlMapFieldDragRuntime();
    syncSqlMapFieldDragUi();
    const announcement = t("sqlMap.relationCancelled");
    setStatus(announcement, "warn");
    announceSqlMap(announcement);
    return;
  }

  resetSqlMapFieldDragRuntime();
  handleSqlMapFieldDrop(source.table, source.field, table, field);
}

export function getSqlMapFieldDropTargetAt(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;
  const row = el.closest("[data-map-field-drag]");
  if (!row || !sqlMapCanvas.contains(row)) return null;
  return row;
}

export function getSqlMapFieldRowById(fieldId) {
  if (!fieldId) return null;
  const row = sqlMapCanvas.querySelector(`[data-map-field-drag="${CSS.escape(fieldId)}"]`);
  return row || null;
}

export function updateSqlMapFieldDragFromPoint(clientX, clientY) {
  if (!sqlMapRuntime.fieldDrag) return;
  const drag = sqlMapRuntime.fieldDrag;
  sqlMapRuntime.pointerClientX = clientX;
  sqlMapRuntime.pointerClientY = clientY;
  if (!drag.active) {
    const deltaX = Math.abs(clientX - drag.startX);
    const deltaY = Math.abs(clientY - drag.startY);
    if (deltaX < 4 && deltaY < 4) return;
    drag.active = true;
  }
  const targetRow = getSqlMapFieldDropTargetAt(clientX, clientY);
  const targetId = targetRow ? targetRow.dataset.mapFieldDrag : "";
  sqlMapRuntime.fieldDropTargetId = targetId && targetId !== drag.fieldId ? targetId : "";
  sqlMapRuntime.fieldDropValidationStatus = "";
  if (sqlMapRuntime.fieldDropTargetId) {
    const draft = buildSqlMapRelationDraft(
      drag.table,
      drag.field,
      targetRow.dataset.mapFieldTable || "",
      targetRow.dataset.mapFieldName || ""
    );
    sqlMapRuntime.fieldDropValidationStatus = getSqlMapDraftVisualState(draft);
  }
  syncSqlMapFieldDragUi();
}

export function finalizeSqlMapFieldDragFromPoint(clientX, clientY) {
  if (!sqlMapRuntime.fieldDrag) return false;
  const hoveredTargetRow = getSqlMapFieldDropTargetAt(clientX, clientY);
  const fallbackTargetRow = getSqlMapFieldRowById(sqlMapRuntime.fieldDropTargetId);
  const targetRow = hoveredTargetRow || fallbackTargetRow;
  if (commitSqlMapFieldRelationshipTarget(targetRow)) {
    return true;
  }
  scheduleSqlMapFieldDragCleanup();
  return false;
}

export function bindSqlMapFieldRelationshipDrag() {
  sqlMapCanvas.querySelectorAll("[data-map-field-drag]").forEach((row) => {
    row.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest("input")) return;
      sqlMapRuntime.keyboardRelationSource = null;
      sqlMapRuntime.fieldDrag = {
        fieldId: row.dataset.mapFieldDrag,
        table: row.dataset.mapFieldTable,
        field: row.dataset.mapFieldName,
        startX: event.clientX,
        startY: event.clientY,
        active: false
      };
      sqlMapRuntime.fieldDragGhostMetrics = buildSqlMapFieldDragGhostMetrics(row, event);
      sqlMapRuntime.pointerClientX = event.clientX;
      sqlMapRuntime.pointerClientY = event.clientY;
      sqlMapRuntime.fieldDropTargetId = "";
      sqlMapRuntime.fieldDropValidationStatus = "";
      sqlMapRuntime.fieldDropCommitted = false;
      event.preventDefault();
      event.stopPropagation();
      syncSqlMapFieldDragUi();
    });
    row.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest("input")) return;
      sqlMapRuntime.keyboardRelationSource = null;
      sqlMapRuntime.activePointerId = event.pointerId;
      sqlMapRuntime.fieldDrag = {
        fieldId: row.dataset.mapFieldDrag,
        table: row.dataset.mapFieldTable,
        field: row.dataset.mapFieldName,
        startX: event.clientX,
        startY: event.clientY,
        active: false
      };
      sqlMapRuntime.fieldDragGhostMetrics = buildSqlMapFieldDragGhostMetrics(row, event);
      sqlMapRuntime.pointerClientX = event.clientX;
      sqlMapRuntime.pointerClientY = event.clientY;
      sqlMapRuntime.fieldDropTargetId = "";
      sqlMapRuntime.fieldDropValidationStatus = "";
      sqlMapRuntime.fieldDropCommitted = false;
      event.preventDefault();
      event.stopPropagation();
      syncSqlMapFieldDragUi();
    });
    row.addEventListener("mouseenter", () => {
      if (!sqlMapRuntime.fieldDrag) return;
      const targetId = row.dataset.mapFieldDrag || "";
      sqlMapRuntime.fieldDropTargetId = targetId && targetId !== sqlMapRuntime.fieldDrag.fieldId ? targetId : "";
      sqlMapRuntime.fieldDropValidationStatus = sqlMapRuntime.fieldDropTargetId
        ? getSqlMapDraftVisualState(buildSqlMapRelationDraft(
          sqlMapRuntime.fieldDrag.table,
          sqlMapRuntime.fieldDrag.field,
          row.dataset.mapFieldTable || "",
          row.dataset.mapFieldName || ""
        ))
        : "";
      syncSqlMapFieldDragUi();
    });
    row.addEventListener("mouseleave", () => {
      if (!sqlMapRuntime.fieldDrag) return;
      if (sqlMapRuntime.fieldDropTargetId === row.dataset.mapFieldDrag) {
        sqlMapRuntime.fieldDropTargetId = "";
        sqlMapRuntime.fieldDropValidationStatus = "";
        syncSqlMapFieldDragUi();
      }
    });
    row.addEventListener("mouseup", (event) => {
      if (!sqlMapRuntime.fieldDrag) return;
      if (commitSqlMapFieldRelationshipTarget(row)) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
    row.addEventListener("click", (event) => {
      if (sqlMapRuntime.fieldDrag && commitSqlMapFieldRelationshipTarget(row)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (Date.now() > Number(sqlMapRuntime.suppressFieldClickUntil || 0)) return;
      event.preventDefault();
      event.stopPropagation();
    });
    row.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      handleSqlMapFieldKeyboardAction(row);
    });
  });
}

export function bindSqlMapDrag() {
  sqlMapCanvas.querySelectorAll("[data-drag-table]").forEach(handle => {
    handle.addEventListener("mousedown", (event) => {
      if (event.target.tagName === "INPUT") return;
      const table = handle.dataset.dragTable;
      const node = handle.closest(".sql-map-node");
      const startX = event.clientX, startY = event.clientY;
      const pos = sqlMapState.positions[table] || { x: node.offsetLeft, y: node.offsetTop };
      sqlMapRuntime.dragging = { table, node, startX, startY, x: pos.x, y: pos.y };
      node.classList.add("dragging");
      event.preventDefault();
    });
  });
}

export function onSqlMapMouseMove(event) {
  if (sqlMapRuntime.dragging) {
    const drag = sqlMapRuntime.dragging;
    const x = Math.max(0, drag.x + event.clientX - drag.startX);
    const y = Math.max(0, drag.y + event.clientY - drag.startY);
    sqlMapState.positions[drag.table] = { x, y };
    drag.node.style.left = `${x}px`;
    drag.node.style.top = `${y}px`;
    renderSqlMapLinks(getSqlMapJoinPlan().usedFks || new Set());
    return;
  }
  updateSqlMapFieldDragFromPoint(event.clientX, event.clientY);
}

export function onSqlMapMouseUp(event) {
  if (sqlMapRuntime.dragging) {
    sqlMapRuntime.dragging.node.classList.remove("dragging");
    sqlMapRuntime.dragging = null;
    saveSqlMapPositions();
    return;
  }
  finalizeSqlMapFieldDragFromPoint(event.clientX, event.clientY);
}

export function onSqlMapPointerMove(event) {
  if (!sqlMapRuntime.fieldDrag) return;
  if (sqlMapRuntime.activePointerId !== null && event.pointerId !== sqlMapRuntime.activePointerId) return;
  updateSqlMapFieldDragFromPoint(event.clientX, event.clientY);
}

export function onSqlMapPointerUp(event) {
  if (!sqlMapRuntime.fieldDrag) return;
  if (sqlMapRuntime.activePointerId !== null && event.pointerId !== sqlMapRuntime.activePointerId) return;
  finalizeSqlMapFieldDragFromPoint(event.clientX, event.clientY);
}

export const sqlMapController = {
  open() {
    if (!hasActiveDatabase()) {
      setStatus(t("sqlMap.openRequiresDatabase"), "warn");
      return;
    }
    buildSqlMapSchema();
    ensureSqlMapLayout();
    updateSqlMapGeneratedSql();
    modalController.open(sqlMapModal);
    setSqlMapState({ open: true });
    renderSqlMap();
  },
  close() {
    if (sqlMapRelationConfirmModal.style.display === "flex") {
      modalController.close(sqlMapRelationConfirmModal);
    }
    setSqlMapState({ pendingRelationDraft: null, open: false });
    resetSqlMapFieldDragRuntime();
    hideSqlMapEdgeTooltip(true);
    modalController.close(sqlMapModal);
  },
  async copySql() {
    if (!sqlMapState.generatedSql) return;
    await navigator.clipboard.writeText(sqlMapState.generatedSql);
    setStatus(t("sqlMap.sqlCopied"), "ok");
  },
  pasteSql(forceClear = false) {
    if (!sqlMapState.generatedSql) return;
    const editorHasText = getEditorValue().trim().length > 0;
    if (editorHasText && !forceClear) return;
    if (editorHasText && forceClear) {
      const confirmed = confirm(t("sqlMap.replaceGeneratedConfirm"));
      if (!confirmed) return;
    }
    setEditorValue(sqlMapState.generatedSql);
    saveCurrentTabState();
    setStatus(t("sqlMap.sqlPasted"), "ok");
    updateSqlMapActionButtons();
  },
  clearSelection() {
    setSqlMapState({
      selectedTables: new Set(),
      selectedFields: new Map()
    });
    updateSqlMapGeneratedSql();
    renderSqlMap();
  }
};

export function openSqlMap() {
  sqlMapController.open();
}

export function closeSqlMap() {
  sqlMapController.close();
}

export async function copySqlMapSql() {
  return sqlMapController.copySql();
}

export function pasteSqlMapSql(forceClear = false) {
  sqlMapController.pasteSql(forceClear);
}

export function clearSqlMapSelection() {
  sqlMapController.clearSelection();
}
