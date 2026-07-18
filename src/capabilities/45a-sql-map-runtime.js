import { getSqlMapState } from "../core/14-state-database-schema.js";
import { disposeEmbeddedSqlWorker } from "../ports/20-sql-worker.js";

export const sqlMapState = getSqlMapState();
export let sqlMapRuntime = {
  dragging: null,
  fieldDrag: null,
  fieldDropTargetId: "",
  fieldDropValidationStatus: "",
  fieldDropCommitted: false,
  pointerClientX: 0,
  pointerClientY: 0,
  fieldDragCleanupTimer: null,
  activePointerId: null,
  suppressFieldClickUntil: 0,
  hoveredEdgeId: "",
  edgeTooltipHideTimer: null,
  pendingRelationDraft: null,
  relationPreflightWorker: null,
  relationPreflightRequestId: 0,
  fieldDragGhostMetrics: null,
  keyboardRelationSource: null
};

export function cancelSqlMapFieldDragCleanup() {
  if (sqlMapRuntime.fieldDragCleanupTimer) {
    clearTimeout(sqlMapRuntime.fieldDragCleanupTimer);
    sqlMapRuntime.fieldDragCleanupTimer = null;
  }
}

export function resetSqlMapFieldDragRuntime() {
  cancelSqlMapFieldDragCleanup();
  sqlMapRuntime.fieldDrag = null;
  sqlMapRuntime.fieldDropTargetId = "";
  sqlMapRuntime.fieldDropValidationStatus = "";
  sqlMapRuntime.fieldDropCommitted = false;
  sqlMapRuntime.pointerClientX = 0;
  sqlMapRuntime.pointerClientY = 0;
  sqlMapRuntime.activePointerId = null;
  sqlMapRuntime.suppressFieldClickUntil = 0;
  sqlMapRuntime.fieldDragGhostMetrics = null;
  sqlMapRuntime.keyboardRelationSource = null;
}

export function cancelSqlMapRelationPreflight() {
  if (!sqlMapRuntime.relationPreflightWorker) return;
  disposeEmbeddedSqlWorker(sqlMapRuntime.relationPreflightWorker);
  sqlMapRuntime.relationPreflightWorker = null;
  sqlMapRuntime.relationPreflightRequestId += 1;
}
