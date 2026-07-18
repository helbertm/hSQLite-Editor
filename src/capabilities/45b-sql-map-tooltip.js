import { sqlMapEdgeTooltip, sqlMapEdgeTooltipRemoveBtn } from "./06-dom-sql-map.js";
import { sqlMapRuntime } from "./45a-sql-map-runtime.js";

export function cancelSqlMapEdgeTooltipHide() {
  if (sqlMapRuntime.edgeTooltipHideTimer) {
    clearTimeout(sqlMapRuntime.edgeTooltipHideTimer);
    sqlMapRuntime.edgeTooltipHideTimer = null;
  }
}

export function hideSqlMapEdgeTooltip() {
  if (!sqlMapEdgeTooltip) return;
  cancelSqlMapEdgeTooltipHide();
  sqlMapRuntime.hoveredEdgeId = "";
  sqlMapEdgeTooltipRemoveBtn.dataset.sqlMapEdgeId = "";
  sqlMapEdgeTooltip.hidden = true;
}

export function scheduleHideSqlMapEdgeTooltip() {
  cancelSqlMapEdgeTooltipHide();
  sqlMapRuntime.edgeTooltipHideTimer = window.setTimeout(() => {
    sqlMapRuntime.edgeTooltipHideTimer = null;
    hideSqlMapEdgeTooltip();
  }, 120);
}
