import { formatNumber, t } from "./03-localization.js";
import { escapeXml } from "../core/07-sql-escaping.js";
import { modalController } from "./05-modal-controller.js";
import { sqlMapAnnouncement, sqlMapCanvas, sqlMapCanvasWrap, sqlMapConfirmAcknowledge, sqlMapConfirmAcknowledgeWrap, sqlMapConfirmAnnouncement, sqlMapConfirmCopySqlBtn, sqlMapConfirmCreateBtn, sqlMapConfirmDataBlock, sqlMapConfirmDiagnosticSql, sqlMapConfirmFrom, sqlMapConfirmHelpLink, sqlMapConfirmInvertBtn, sqlMapConfirmOpenSqlBtn, sqlMapConfirmOrphanCounts, sqlMapConfirmTo, sqlMapConfirmTypes, sqlMapConfirmWarning, sqlMapConfirmWarningList, sqlMapConfirmWarningTitle, sqlMapEdgeTooltip, sqlMapEdgeTooltipBadge, sqlMapEdgeTooltipPath, sqlMapEdgeTooltipReason, sqlMapEdgeTooltipRemoveBtn, sqlMapEdgeTooltipStatus, sqlMapEdgeTooltipTypes, sqlMapLinks, sqlMapRelationConfirmModal, sqlMapSearch, sqlMapSelectionInfo } from "./06-dom-sql-map.js";
import { setStatus } from "./12-shell-status.js";
import { saveCurrentTabState } from "./22c-active-tab-sync.js";
import { getEditorValue, setEditorValue } from "./32a-editor-api.js";
import { buildSqlMapBlockedDataDraft, buildSqlMapRelationDraft, getSqlMapDirectionHelpLink, getSqlMapEdgeStatusLabel, getSqlMapEdges, getSqlMapFieldDomId, getSqlMapFieldRef, isSqlMapNaturalFkCandidate, renderSqlMapVirtualSummary } from "./45-sql-map-core.js";
import { cancelSqlMapRelationPreflight, resetSqlMapFieldDragRuntime, sqlMapRuntime, sqlMapState } from "./45a-sql-map-runtime.js";
import { cancelSqlMapEdgeTooltipHide, hideSqlMapEdgeTooltip, scheduleHideSqlMapEdgeTooltip } from "./45b-sql-map-tooltip.js";
import { canSelectSqlMapTable, getSqlMapJoinPlan, getSqlMapReachableTables, getSqlMapSelectedFieldsList, toggleSqlMapField, toggleSqlMapTable, updateSqlMapActionButtons, updateSqlMapGeneratedSql } from "./46-sql-map-graph.js";
import { getCurrentDbBytes, setSqlMapState } from "../core/14-state-database-schema.js";
import { createEmbeddedSqlWorker, disposeEmbeddedSqlWorker } from "../ports/20-sql-worker.js";
import { escapeHtml } from "../ui/00-helpers.js";

let bindSqlMapCanvasDrag = () => {};
let bindSqlMapRelationshipDrag = () => {};
let getSqlMapFieldRow = () => null;

export function configureSqlMapRenderInteractions(interactions) {
  bindSqlMapCanvasDrag = interactions.bindSqlMapCanvasDrag;
  bindSqlMapRelationshipDrag = interactions.bindSqlMapRelationshipDrag;
  getSqlMapFieldRow = interactions.getSqlMapFieldRow;
}

export function positionSqlMapEdgeTooltip(clientX, clientY) {
  if (!sqlMapEdgeTooltip || sqlMapEdgeTooltip.hidden) return;
  const wrapRect = sqlMapCanvasWrap.getBoundingClientRect();
  const offsetLeft = sqlMapCanvasWrap.scrollLeft;
  const offsetTop = sqlMapCanvasWrap.scrollTop;
  const spacing = 14;
  const maxLeft = Math.max(offsetLeft, offsetLeft + sqlMapCanvasWrap.clientWidth - sqlMapEdgeTooltip.offsetWidth - spacing);
  const maxTop = Math.max(offsetTop, offsetTop + sqlMapCanvasWrap.clientHeight - sqlMapEdgeTooltip.offsetHeight - spacing);
  const nextLeft = Math.min(
    Math.max(offsetLeft + spacing, offsetLeft + (clientX - wrapRect.left) + spacing),
    maxLeft
  );
  const nextTop = Math.min(
    Math.max(offsetTop + spacing, offsetTop + (clientY - wrapRect.top) + spacing),
    maxTop
  );
  sqlMapEdgeTooltip.style.left = `${nextLeft}px`;
  sqlMapEdgeTooltip.style.top = `${nextTop}px`;
}

export function renderSqlMapFieldDragGhost() {
  const existingGhost = sqlMapCanvasWrap.querySelector(".sql-map-field-drag-ghost");
  if (existingGhost) existingGhost.remove();
  if (!sqlMapRuntime.fieldDrag || !sqlMapRuntime.fieldDrag.active) return;

  const wrapRect = sqlMapCanvasWrap.getBoundingClientRect();
  const ghostMetrics = sqlMapRuntime.fieldDragGhostMetrics || {};
  const ghost = document.createElement("div");
  ghost.className = `sql-map-field-drag-ghost ${sqlMapRuntime.fieldDropValidationStatus || "pending"}`;
  ghost.setAttribute("aria-hidden", "true");
  ghost.innerHTML = `
    <span class="sql-map-field-link-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M10.5 13.5 8 16a3 3 0 0 1-4.24-4.24l3.25-3.26A3 3 0 0 1 11.26 8"/><path d="M13.5 10.5 16 8a3 3 0 0 1 4.24 4.24l-3.25 3.26A3 3 0 0 1 12.74 16"/><path d="m9 15 6-6"/></svg>
    </span>
    <span class="sql-map-field-name" title="${escapeHtml(sqlMapRuntime.fieldDrag.field || "")}">${escapeHtml(sqlMapRuntime.fieldDrag.field || "")}</span>
    <span class="sql-map-field-drop-state" aria-hidden="true">${escapeHtml(ghostMetrics.stateLabel || "")}</span>
    <span class="sql-map-field-meta">${escapeHtml(ghostMetrics.meta || "")}</span>
  `;

  const offsetX = Number(ghostMetrics.offsetX || 18);
  const offsetY = Number(ghostMetrics.offsetY || 12);
  const nextLeft = sqlMapCanvasWrap.scrollLeft + (sqlMapRuntime.pointerClientX - wrapRect.left) - offsetX;
  const nextTop = sqlMapCanvasWrap.scrollTop + (sqlMapRuntime.pointerClientY - wrapRect.top) - offsetY;
  ghost.style.left = `${Math.max(0, nextLeft)}px`;
  ghost.style.top = `${Math.max(0, nextTop)}px`;
  if (ghostMetrics.width) {
    ghost.style.width = `${ghostMetrics.width}px`;
  }
  sqlMapCanvasWrap.appendChild(ghost);
}

export function getSqlMapCanvasPoint(clientX, clientY) {
  const wrapRect = sqlMapCanvasWrap.getBoundingClientRect();
  return {
    x: sqlMapCanvasWrap.scrollLeft + clientX - wrapRect.left,
    y: sqlMapCanvasWrap.scrollTop + clientY - wrapRect.top
  };
}

export function renderSqlMapFieldDraftEdge() {
  const drag = sqlMapRuntime.fieldDrag;
  if (!drag || !drag.active) return;
  const sourceRow = getSqlMapFieldRow(drag.fieldId);
  if (!sourceRow || typeof sourceRow.getBoundingClientRect !== "function") return;

  const sourceRect = sourceRow.getBoundingClientRect();
  const targetRow = getSqlMapFieldRow(sqlMapRuntime.fieldDropTargetId);
  const targetRect = targetRow && typeof targetRow.getBoundingClientRect === "function"
    ? targetRow.getBoundingClientRect()
    : null;
  const targetClientX = targetRect
    ? targetRect.left + targetRect.width / 2
    : sqlMapRuntime.pointerClientX;
  const targetClientY = targetRect
    ? targetRect.top + targetRect.height / 2
    : sqlMapRuntime.pointerClientY;
  const pointsRight = targetClientX >= sourceRect.left + sourceRect.width / 2;
  const source = getSqlMapCanvasPoint(
    pointsRight ? sourceRect.right : sourceRect.left,
    sourceRect.top + sourceRect.height / 2
  );
  const target = getSqlMapCanvasPoint(
    targetRect ? (pointsRight ? targetRect.left : targetRect.right) : targetClientX,
    targetClientY
  );
  const controlDistance = Math.max(34, Math.abs(target.x - source.x) * 0.38);
  const direction = pointsRight ? 1 : -1;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute(
    "d",
    `M ${source.x} ${source.y} C ${source.x + controlDistance * direction} ${source.y}, ${target.x - controlDistance * direction} ${target.y}, ${target.x} ${target.y}`
  );
  path.setAttribute("class", `sql-map-link draft ${sqlMapRuntime.fieldDropValidationStatus || "pending"}`);
  path.setAttribute("aria-hidden", "true");
  sqlMapLinks.appendChild(path);
}

export function showSqlMapEdgeTooltip(edge, clientX, clientY) {
  if (!edge || !sqlMapEdgeTooltip) return;
  cancelSqlMapEdgeTooltipHide();
  sqlMapRuntime.hoveredEdgeId = edge.id;
  sqlMapEdgeTooltipBadge.textContent = t(edge.kind === "virtual" ? "sqlMap.virtualRelationship" : "sqlMap.declaredFk");
  sqlMapEdgeTooltipStatus.textContent = getSqlMapEdgeStatusLabel(edge);
  sqlMapEdgeTooltipPath.textContent = `${getSqlMapFieldRef(edge.fromTable, edge.fromColumn)} → ${getSqlMapFieldRef(edge.toTable, edge.toColumn)}`;
  sqlMapEdgeTooltipTypes.textContent = t("sqlMap.edgeTypes", {
    source: edge.fromType || t("population.noType"),
    target: edge.toType || t("population.noType")
  });
  const reason = edge.compatibilityReason || "";
  sqlMapEdgeTooltipReason.hidden = !reason;
  sqlMapEdgeTooltipReason.textContent = reason;
  sqlMapEdgeTooltipRemoveBtn.hidden = edge.kind !== "virtual";
  sqlMapEdgeTooltipRemoveBtn.dataset.sqlMapEdgeId = edge.id;
  sqlMapEdgeTooltip.hidden = false;
  positionSqlMapEdgeTooltip(clientX, clientY);
}

export function announceSqlMap(message) {
  const target = sqlMapRelationConfirmModal?.style.display === "flex"
    ? sqlMapConfirmAnnouncement
    : sqlMapAnnouncement;
  if (!target) return;
  target.textContent = "";
  window.setTimeout(() => {
    target.textContent = String(message || "");
  }, 0);
}

export function renderSqlMap() {
  const filter = sqlMapSearch.value.trim().toLowerCase();
  const reachable = getSqlMapReachableTables();
  const joinPlan = getSqlMapJoinPlan();
  const usedFks = joinPlan.usedFks || new Set();
  sqlMapCanvas.innerHTML = "";
  for (const [tableName, table] of Object.entries(sqlMapState.tables)) {
    const pos = sqlMapState.positions[tableName] || { x: 40, y: 40 };
    const tableText = `${tableName} ${(table.fields || []).map(f => f.name).join(" ")}`.toLowerCase();
    const isHighlight = filter && tableText.includes(filter);
    const isSelected = sqlMapState.selectedTables.has(tableName);
    const isBlocked = !canSelectSqlMapTable(tableName);
    const selectedFields = sqlMapState.selectedFields.get(tableName) || new Set();
    const node = document.createElement("div");
    node.className = `sql-map-node ${isSelected ? "selected" : ""} ${isBlocked ? "blocked" : ""} ${isHighlight ? "highlight" : ""}`;
    node.dataset.table = tableName;
    node.style.left = `${pos.x}px`;
    node.style.top = `${pos.y}px`;
    const disabled = isBlocked ? "disabled" : "";
    node.innerHTML = `
      <div class="sql-map-node-header" data-drag-table="${escapeHtml(tableName)}">
        <span class="sql-map-drag-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M12 3v18M12 3 8.5 6.5M12 3l3.5 3.5M12 21l-3.5-3.5M12 21l3.5-3.5M3 12h18M3 12l3.5-3.5M3 12l3.5 3.5M21 12l-3.5-3.5M21 12l-3.5 3.5"/></svg>
        </span>
        <input type="checkbox" data-map-table-check="${escapeHtml(tableName)}" aria-label="${escapeHtml(t("sqlMap.selectTable", { table: tableName }))}" aria-describedby="sqlMapSelectionInfo" ${isSelected ? "checked" : ""} ${disabled}>
        <span class="sql-map-table-name" title="${escapeHtml(tableName)}">${escapeHtml(tableName)}</span>
      </div>
      <div class="sql-map-field-list">
        ${table.fields.map(field => {
          const meta = `${field.pk ? "PK " : ""}${field.type || ""}`.trim();
          const fieldId = getSqlMapFieldDomId(tableName, field.name);
          const isDragSource = sqlMapRuntime.fieldDrag && sqlMapRuntime.fieldDrag.fieldId === fieldId;
          const isKeyboardSource = sqlMapRuntime.keyboardRelationSource?.fieldId === fieldId;
          const isDropTarget = sqlMapRuntime.fieldDropTargetId === fieldId;
          const isNaturalCandidate = Boolean(
            sqlMapRuntime.fieldDrag
            && !isDragSource
            && isSqlMapNaturalFkCandidate(
              sqlMapRuntime.fieldDrag.table,
              sqlMapRuntime.fieldDrag.field,
              tableName,
              field.name
            )
          );
          const dropState = isDropTarget ? (sqlMapRuntime.fieldDropValidationStatus || "pending") : "";
          const dropStateLabel = dropState === "allowed"
            ? t("sqlMap.compatible")
            : dropState === "caution"
              ? t("sqlMap.review")
              : dropState === "blocked"
                ? t("sqlMap.blocked")
                : "";
          const helperLabel = isKeyboardSource
            ? t("sqlMap.source")
            : isDropTarget
            ? dropStateLabel
            : isNaturalCandidate
              ? t("sqlMap.suggestion")
              : "";
          return `
            <div class="sql-map-field">
              <input type="checkbox" data-map-field-table="${escapeHtml(tableName)}" data-map-field-name="${escapeHtml(field.name)}" aria-label="${escapeHtml(t("sqlMap.selectField", { table: tableName, field: field.name }))}" aria-describedby="sqlMapSelectionInfo" ${selectedFields.has(field.name) ? "checked" : ""} ${disabled}>
              <span class="sql-map-field-row ${isDragSource ? "drag-source" : ""} ${isKeyboardSource ? "keyboard-source" : ""} ${isNaturalCandidate ? "natural-candidate" : ""} ${isDropTarget ? `drop-target drop-target-${dropState || "pending"}` : ""}" data-map-field-drag="${escapeHtml(fieldId)}" data-map-field-table="${escapeHtml(tableName)}" data-map-field-name="${escapeHtml(field.name)}" role="button" tabindex="0" aria-pressed="${isKeyboardSource ? "true" : "false"}" aria-describedby="sqlMapAnnouncement" aria-label="${escapeHtml(t("sqlMap.createFrom", { field: `${tableName}.${field.name}` }))}" title="${escapeHtml(t("sqlMap.dragOrEnter"))}">
                <span class="sql-map-field-link-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img" focusable="false"><path d="M10.5 13.5 8 16a3 3 0 0 1-4.24-4.24l3.25-3.26A3 3 0 0 1 11.26 8"/><path d="M13.5 10.5 16 8a3 3 0 0 1 4.24 4.24l-3.25 3.26A3 3 0 0 1 12.74 16"/><path d="m9 15 6-6"/></svg>
                </span>
                <span class="sql-map-field-name" title="${escapeHtml(field.name)}">${escapeHtml(field.name)}</span>
                <span class="sql-map-field-drop-state" aria-hidden="${helperLabel ? "false" : "true"}">${escapeHtml(helperLabel)}</span>
                <span class="sql-map-field-meta">${escapeHtml(meta)}</span>
              </span>
            </div>`;
        }).join("")}
      </div>`;
    sqlMapCanvas.appendChild(node);
  }
  sqlMapCanvas.querySelectorAll("[data-map-table-check]").forEach(input => {
    input.addEventListener("change", () => toggleSqlMapTable(input.dataset.mapTableCheck, input.checked));
  });
  sqlMapCanvas.querySelectorAll("[data-map-field-table]").forEach(input => {
    input.addEventListener("change", () => toggleSqlMapField(input.dataset.mapFieldTable, input.dataset.mapFieldName, input.checked));
  });
  bindSqlMapRelationshipDrag();
  bindSqlMapCanvasDrag();
  renderSqlMapLinks(usedFks);
  updateSqlMapSelectionInfo(reachable);
  renderSqlMapVirtualSummary();
  updateSqlMapActionButtons();
}

export function renderSqlMapLinks(usedFks) {
  hideSqlMapEdgeTooltip(true);
  sqlMapLinks.innerHTML = "";
  for (const fk of getSqlMapEdges()) {
    const from = sqlMapCanvas.querySelector(`[data-table="${CSS.escape(fk.fromTable)}"]`);
    const to = sqlMapCanvas.querySelector(`[data-table="${CSS.escape(fk.toTable)}"]`);
    if (!from || !to) continue;
    const x1 = from.offsetLeft + from.offsetWidth / 2, y1 = from.offsetTop + from.offsetHeight / 2;
    const x2 = to.offsetLeft + to.offsetWidth / 2, y2 = to.offsetTop + to.offsetHeight / 2;
    const dx = Math.abs(x2 - x1) * 0.38;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
    path.setAttribute("class", `sql-map-link ${fk.kind === "virtual" ? "virtual" : "declared"} ${usedFks.has(fk.id) ? "used" : ""}`);
    path.setAttribute("role", "img");
    path.setAttribute("tabindex", "0");
    path.setAttribute("aria-label", t("sqlMap.edgeLabel", {
      kind: t(fk.kind === "virtual" ? "sqlMap.virtualRelationship" : "sqlMap.declaredFk"),
      source: getSqlMapFieldRef(fk.fromTable, fk.fromColumn),
      target: getSqlMapFieldRef(fk.toTable, fk.toColumn)
    }));
    path.addEventListener("mouseenter", (event) => showSqlMapEdgeTooltip(fk, event.clientX, event.clientY));
    path.addEventListener("mousemove", (event) => showSqlMapEdgeTooltip(fk, event.clientX, event.clientY));
    path.addEventListener("mouseleave", () => scheduleHideSqlMapEdgeTooltip());
    path.addEventListener("focus", () => {
      const wrapRect = sqlMapCanvasWrap.getBoundingClientRect();
      showSqlMapEdgeTooltip(fk, wrapRect.left + 24, wrapRect.top + 24);
    });
    path.addEventListener("blur", () => hideSqlMapEdgeTooltip(true));
    sqlMapLinks.appendChild(path);
  }
  renderSqlMapFieldDraftEdge();
  renderSqlMapFieldDragGhost();
}

export function updateSqlMapSelectionInfo(reachable) {
  const selectedTables = [...sqlMapState.selectedTables];
  const selectedFields = getSqlMapSelectedFieldsList();
  sqlMapSelectionInfo.textContent = selectedTables.length
    ? t("sqlMap.selectionSummary", { tables: formatNumber(selectedTables.length), fields: formatNumber(selectedFields.length), reachable: formatNumber(reachable.size) })
    : t("sqlMap.noSelection");
}

export function refreshSqlMapRelationConfirmModal() {
  const draft = sqlMapState.pendingRelationDraft;
  if (!draft) return;
  sqlMapConfirmFrom.textContent = draft.edge
    ? getSqlMapFieldRef(draft.edge.fromTable, draft.edge.fromColumn)
    : t("common.unavailable");
  sqlMapConfirmTo.textContent = draft.edge
    ? getSqlMapFieldRef(draft.edge.toTable, draft.edge.toColumn)
    : t("common.unavailable");
  sqlMapConfirmTypes.textContent = draft.edge
    ? `${draft.edge.fromType || t("population.noType")} → ${draft.edge.toType || t("population.noType")}`
    : t("common.unavailable");
  sqlMapConfirmHelpLink.href = getSqlMapDirectionHelpLink();
  const isWarn = draft.status === "warn";
  const isBlockedData = draft.status === "blocked-data";
  const isBlocked = draft.status === "blocked-data" || draft.status === "blocked-schema" || draft.level === "blocked";
  sqlMapConfirmWarning.style.display = draft.status === "allowed" ? "none" : "grid";
  sqlMapConfirmWarningTitle.textContent = draft.title || t("common.attention");
  sqlMapConfirmWarningList.innerHTML = (draft.items || []).map(item => `<li>${escapeHtml(item)}</li>`).join("");
  sqlMapConfirmAcknowledge.checked = false;
  sqlMapConfirmAcknowledgeWrap.style.display = isWarn ? "flex" : "none";
  sqlMapConfirmCreateBtn.disabled = isWarn || isBlocked;
  sqlMapConfirmInvertBtn.disabled = !draft.edge;
  sqlMapConfirmDataBlock.hidden = !isBlockedData;
  sqlMapConfirmOrphanCounts.textContent = isBlockedData
    ? t("sqlMap.orphanCounts", { source: formatNumber(draft.orphanCounts?.fromSide || 0), target: formatNumber(draft.orphanCounts?.toSide || 0) })
    : "";
  sqlMapConfirmDiagnosticSql.textContent = isBlockedData ? String(draft.diagnosticSql || "") : "";
  sqlMapConfirmCopySqlBtn.disabled = !isBlockedData || !draft.diagnosticSql;
  sqlMapConfirmOpenSqlBtn.disabled = !isBlockedData || !draft.diagnosticSql;
}

export function openSqlMapRelationDraft(draft) {
  if (!draft) return;
  resetSqlMapFieldDragRuntime();
  setSqlMapState({ pendingRelationDraft: draft });
  refreshSqlMapRelationConfirmModal();
  modalController.open(sqlMapRelationConfirmModal);
  const announcement = draft.summary || draft.title || t("sqlMap.reviewRelationship");
  setStatus(announcement, draft.status === "allowed" ? "ok" : "warn");
  announceSqlMap(announcement);
}

export function createSqlMapVirtualRelationship(edge, successMessage = t("sqlMap.relationCreated")) {
  if (!edge) return;
  cancelSqlMapRelationPreflight();
  setSqlMapState({
    virtualFks: [...sqlMapState.virtualFks, edge],
    pendingRelationDraft: null
  });
  resetSqlMapFieldDragRuntime();
  modalController.close(sqlMapRelationConfirmModal);
  updateSqlMapGeneratedSql();
  renderSqlMap();
  setStatus(successMessage, "ok");
  announceSqlMap(successMessage);
}

export function buildSqlMapBlockedSchemaFromWorker(structuralDraft, validationResult = {}) {
  return {
    ...structuralDraft,
    valid: false,
    level: "blocked",
    status: "blocked-schema",
    title: validationResult.summaryCode ? t(`worker.${validationResult.summaryCode}`) : validationResult.summary || t("sqlMap.validationFailed"),
    summary: validationResult.summaryCode ? t(`worker.${validationResult.summaryCode}`) : validationResult.summary || t("sqlMap.validationSchemaFailed"),
    items: Array.isArray(validationResult.itemCodes) && validationResult.itemCodes.length
      ? validationResult.itemCodes.map(item => t(`worker.${item.code}`, item.variables || {}))
      : Array.isArray(validationResult.items) && validationResult.items.length
        ? validationResult.items
        : [t("sqlMap.validationSchemaFailed")],
    orphanCounts: null,
    diagnosticSql: ""
  };
}

export async function runSqlMapRelationPreflight(structuralDraft) {
  if (!structuralDraft) return null;
  if (!structuralDraft.valid || !structuralDraft.edge) return structuralDraft;

  const sessionDbBytes = getCurrentDbBytes();
  if (!sessionDbBytes || !sessionDbBytes.byteLength) {
    return buildSqlMapBlockedSchemaFromWorker(structuralDraft, {
      summary: t("error.databaseNotLoaded"),
      items: [t("sqlMap.validationRequiresDatabase")]
    });
  }

  cancelSqlMapRelationPreflight();
  const requestId = sqlMapRuntime.relationPreflightRequestId + 1;
  sqlMapRuntime.relationPreflightRequestId = requestId;

  return new Promise((resolve) => {
    const worker = createEmbeddedSqlWorker();
    sqlMapRuntime.relationPreflightWorker = worker;

    worker.onmessage = (event) => {
      const data = event.data || {};
      if (sqlMapRuntime.relationPreflightRequestId !== requestId) return;
      disposeEmbeddedSqlWorker(worker);
      sqlMapRuntime.relationPreflightWorker = null;

      if (!data.ok || data.type !== "virtual-fk-validation") {
        resolve(buildSqlMapBlockedSchemaFromWorker(structuralDraft, {
          summary: t("sqlMap.validationFailed"),
          items: [data.errorCode ? t(`worker.${data.errorCode}`, data.errorVariables || {}) : t("sqlMap.validationUnknown")]
        }));
        return;
      }

      if (data.status === "blocked-data") {
        resolve(buildSqlMapBlockedDataDraft(structuralDraft, data.orphanCounts || {}));
        return;
      }

      if (data.status === "blocked-schema") {
        resolve(buildSqlMapBlockedSchemaFromWorker(structuralDraft, data));
        return;
      }

      resolve({
        ...structuralDraft,
        status: structuralDraft.level === "warn" ? "warn" : "allowed"
      });
    };

    worker.onerror = (event) => {
      if (sqlMapRuntime.relationPreflightRequestId !== requestId) return;
      disposeEmbeddedSqlWorker(worker);
      sqlMapRuntime.relationPreflightWorker = null;
      resolve(buildSqlMapBlockedSchemaFromWorker(structuralDraft, {
        summary: t("sqlMap.validationFailed"),
        items: [event.message || t("sqlMap.validationDataFailed")]
      }));
    };

    const dbBytesCopy = new Uint8Array(sessionDbBytes);
    worker.postMessage({
      protocolVersion: 1,
      requestId: `sql-map-preflight-${requestId}`,
      action: "validate-virtual-fk",
      payload: {
        edge: {
          fromTable: structuralDraft.edge.fromTable,
          fromColumn: structuralDraft.edge.fromColumn,
          toTable: structuralDraft.edge.toTable,
          toColumn: structuralDraft.edge.toColumn
        }
      },
      dbBytes: dbBytesCopy.buffer
    }, [dbBytesCopy.buffer]);
  });
}

export function maybeReplaceEditorWithSql(sqlText) {
  const nextSql = String(sqlText || "");
  if (!nextSql) return false;
  const editorHasText = getEditorValue().trim().length > 0;
  if (editorHasText) {
    const confirmed = confirm(t("sqlMap.replaceDiagnosticConfirm"));
    if (!confirmed) return false;
  }
  setEditorValue(nextSql);
  saveCurrentTabState();
  updateSqlMapActionButtons();
  return true;
}

export async function copySqlMapDiagnosticSql() {
  const draft = sqlMapState.pendingRelationDraft;
  if (!draft || !draft.diagnosticSql) return;
  await navigator.clipboard.writeText(draft.diagnosticSql);
  setStatus(t("sqlMap.diagnosticCopied"), "ok");
}

export function openSqlMapDiagnosticSql() {
  const draft = sqlMapState.pendingRelationDraft;
  if (!draft || !draft.diagnosticSql) return;
  if (!maybeReplaceEditorWithSql(draft.diagnosticSql)) return;
  setStatus(t("sqlMap.diagnosticOpened"), "ok");
}

export function closeSqlMapRelationConfirm() {
  cancelSqlMapRelationPreflight();
  modalController.close(sqlMapRelationConfirmModal);
  setSqlMapState({ pendingRelationDraft: null });
  resetSqlMapFieldDragRuntime();
  renderSqlMap();
}

export async function invertSqlMapPendingRelation() {
  const draft = sqlMapState.pendingRelationDraft;
  if (!draft || !draft.edge) return;
  const nextDraft = buildSqlMapRelationDraft(
    draft.edge.toTable,
    draft.edge.toColumn,
    draft.edge.fromTable,
    draft.edge.fromColumn
  );
  if (!nextDraft) return;
  const validatingMessage = t("sqlMap.validatingInverted");
  setStatus(validatingMessage, "warn");
  announceSqlMap(validatingMessage);
  const resolvedDraft = await runSqlMapRelationPreflight(nextDraft);
  if (!sqlMapState.open || !resolvedDraft) return;
  openSqlMapRelationDraft(resolvedDraft);
}

export function confirmSqlMapPendingRelation() {
  const draft = sqlMapState.pendingRelationDraft;
  if (!draft || !draft.valid || !draft.edge) return;
  if (draft.status === "warn" && !sqlMapConfirmAcknowledge.checked) return;
  createSqlMapVirtualRelationship(draft.edge);
}

export function removeSqlMapVirtualRelationship(edgeId) {
  const next = sqlMapState.virtualFks.filter(edge => edge.id !== edgeId);
  if (next.length === sqlMapState.virtualFks.length) return;
  setSqlMapState({ virtualFks: next });
  if (sqlMapRuntime.hoveredEdgeId === edgeId) hideSqlMapEdgeTooltip(true);
  updateSqlMapGeneratedSql();
  renderSqlMap();
  setStatus(t("sqlMap.relationRemoved"), "ok");
}

export function clearSqlMapVirtualRelationships() {
  if (!sqlMapState.virtualFks.length) return;
  setSqlMapState({ virtualFks: [] });
  hideSqlMapEdgeTooltip(true);
  updateSqlMapGeneratedSql();
  renderSqlMap();
  setStatus(t("sqlMap.relationsCleared"), "ok");
}

export function handleSqlMapFieldDrop(fromTable, fromColumn, toTable, toColumn) {
  const draft = buildSqlMapRelationDraft(fromTable, fromColumn, toTable, toColumn);
  const relatingMessage = t("sqlMap.relating", { source: fromColumn, target: toColumn });
  setStatus(relatingMessage, "ok");
  announceSqlMap(relatingMessage);
  if (!draft) return;
  if (!draft.valid) {
    openSqlMapRelationDraft(draft);
    return;
  }
  const validationMessage = t("sqlMap.validatingData");
  setStatus(validationMessage, "warn");
  announceSqlMap(validationMessage);
  runSqlMapRelationPreflight(draft).then((resolvedDraft) => {
    if (!sqlMapState.open || !resolvedDraft) return;
    if (resolvedDraft.status === "allowed") {
      createSqlMapVirtualRelationship(resolvedDraft.edge);
      return;
    }
    openSqlMapRelationDraft(resolvedDraft);
  });
}

export function exportSqlMapPng() {
  const nodes = [...sqlMapCanvas.querySelectorAll(".sql-map-node")];
  if (!nodes.length) {
    setStatus(t("sqlMap.exportUnavailable"), "warn");
    return;
  }
  const margin = 40;
  const width = Math.max(900, Math.max(...nodes.map(n => n.offsetLeft + n.offsetWidth)) + margin);
  const height = Math.max(600, Math.max(...nodes.map(n => n.offsetTop + n.offsetHeight)) + margin);
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#f3f4f6"/>`];
  for (const fk of getSqlMapEdges()) {
    const from = sqlMapCanvas.querySelector(`[data-table="${CSS.escape(fk.fromTable)}"]`);
    const to = sqlMapCanvas.querySelector(`[data-table="${CSS.escape(fk.toTable)}"]`);
    if (!from || !to) continue;
    const x1 = from.offsetLeft + from.offsetWidth / 2, y1 = from.offsetTop + from.offsetHeight / 2;
    const x2 = to.offsetLeft + to.offsetWidth / 2, y2 = to.offsetTop + to.offsetHeight / 2;
    const dx = Math.abs(x2 - x1) * 0.38;
    const stroke = fk.kind === "virtual" ? "#0f766e" : "#777";
    const dash = fk.kind === "virtual" ? ` stroke-dasharray="7 5"` : "";
    parts.push(`<path d="M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}" stroke="${stroke}" stroke-width="1.5" fill="none"${dash}/>`);
  }
  for (const node of nodes) {
    const table = node.dataset.table;
    const data = sqlMapState.tables[table];
    const x = node.offsetLeft, y = node.offsetTop, w = node.offsetWidth, h = Math.min(node.offsetHeight, 320);
    parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#ffffff" stroke="#9ca3af"/>`);
    parts.push(`<rect x="${x}" y="${y}" width="${w}" height="36" rx="14" fill="#e5e7eb" stroke="#9ca3af"/>`);
    parts.push(`<text x="${x + 12}" y="${y + 23}" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#111827">${escapeXml(table)}</text>`);
    let yy = y + 56;
    for (const field of data.fields.slice(0, 11)) {
      parts.push(`<text x="${x + 12}" y="${yy}" font-family="Consolas, monospace" font-size="11" fill="#111827">${escapeXml((field.pk ? "PK " : "") + field.name)}</text>`);
      yy += 18;
    }
    if (data.fields.length > 11) {
      parts.push(`<text x="${x + 12}" y="${yy}" font-family="Arial, sans-serif" font-size="11" fill="#6b7280">${escapeXml(t("sqlMap.moreFields", { count: data.fields.length - 11 }))}</text>`);
    }
  }
  parts.push("</svg>");
  const blob = new Blob([parts.join("")], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * 2; canvas.height = height * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(pngBlob);
      a.download = `${t("sqlMap.pngFilenamePrefix")}-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  };
  img.src = url;
}
