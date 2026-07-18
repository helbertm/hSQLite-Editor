import { compareLocalized, formatNumber, getLocale, t } from "./03-localization.js";
import { modalController } from "./05-modal-controller.js";
import { sqlMapClearVirtualBtn, sqlMapRelationConfirmModal, sqlMapVirtualSummary } from "./06-dom-sql-map.js";
import { FK_DIRECTION_HELP_LINKS } from "./44-sql-map-constants.js";
import { cancelSqlMapRelationPreflight, resetSqlMapFieldDragRuntime, sqlMapState } from "./45a-sql-map-runtime.js";
import { hideSqlMapEdgeTooltip } from "./45b-sql-map-tooltip.js";
import { DEFAULT_LOCALE } from "../core/02-locales.js";
import { normalizeSqliteTypeClass } from "../core/06-sqlite-types.js";
import { getCurrentDbSessionId, setSqlMapState } from "../core/14-state-database-schema.js";
import { storage } from "../ports/05-storage.js";

export function getSqlMapStorageKey() {
  return `hSQLiteEditorSqlMapPositionsV1:${getCurrentDbSessionId() || "no-database"}`;
}

export const sqlMapStorage = {
  loadPositions() {
    return storage.getJSON(getSqlMapStorageKey(), {});
  },
  savePositions(positions) {
    storage.setJSON(getSqlMapStorageKey(), positions || {});
  }
};

export const SQL_MAP_DIAGNOSTIC_PREVIEW_LIMIT = 200;

export function loadSqlMapPositions() {
  try { return sqlMapStorage.loadPositions(); }
  catch { return {}; }
}

export function saveSqlMapPositions() {
  sqlMapStorage.savePositions(sqlMapState.positions);
}

export function resetSqlMapSessionState() {
  setSqlMapState({
    virtualFks: [],
    pendingRelationDraft: null
  });
  cancelSqlMapRelationPreflight();
  resetSqlMapFieldDragRuntime();
  hideSqlMapEdgeTooltip(true);
  if (sqlMapRelationConfirmModal && sqlMapRelationConfirmModal.style.display === "flex") {
    modalController.close(sqlMapRelationConfirmModal);
  }
}

export function getSqlMapLocale() {
  return getLocale();
}

export function getSqlMapDirectionHelpLink() {
  const locale = getSqlMapLocale();
  return FK_DIRECTION_HELP_LINKS[locale] || FK_DIRECTION_HELP_LINKS[DEFAULT_LOCALE];
}

export function getSqlMapEdges() {
  return [...sqlMapState.declaredFks, ...sqlMapState.virtualFks];
}

export function getSqlMapDraftVisualState(draft) {
  if (!draft) return "blocked";
  if (draft.status === "warn" || draft.level === "warn") return "caution";
  if (draft.status === "allowed" || draft.level === "allowed") return "allowed";
  return "blocked";
}

export function getSqlMapNaturalFkNameFamilies(fieldName) {
  const normalized = String(fieldName || "").trim().toLowerCase();
  if (!normalized) return new Set();

  const families = new Set([normalized]);
  if (normalized === "id" || normalized.startsWith("id_") || normalized.startsWith("id")) {
    families.add("id-family");
  }
  if (normalized === "uuid" || normalized.endsWith("_uuid")) {
    families.add("uuid-family");
  }
  if (normalized.endsWith("_id")) {
    families.add("suffix-id-family");
  }
  if (normalized.endsWith("_uuid")) {
    families.add("suffix-uuid-family");
  }
  if (normalized.startsWith("cod_") || normalized.startsWith("cod")) {
    families.add("cod-family");
  }
  if (normalized.startsWith("codigo") || normalized.startsWith("codigo_")) {
    families.add("codigo-family");
  }
  return families;
}

export function isSqlMapNaturalFkCandidate(sourceTableName, sourceFieldName, targetTableName, targetFieldName) {
  if (!sourceTableName || !sourceFieldName || !targetTableName || !targetFieldName) return false;
  if (sourceTableName === targetTableName) return false;
  const sourceMeta = getSqlMapFieldMeta(sourceTableName, sourceFieldName);
  const targetMeta = getSqlMapFieldMeta(targetTableName, targetFieldName);
  if (!sourceMeta || !targetMeta) return false;
  if (!sourceMeta.name || !targetMeta.name) return false;
  if (sourceMeta.normalizedType !== targetMeta.normalizedType) return false;

  const sourceFamilies = getSqlMapNaturalFkNameFamilies(sourceMeta.name);
  const targetFamilies = getSqlMapNaturalFkNameFamilies(targetMeta.name);
  for (const family of sourceFamilies) {
    if (targetFamilies.has(family)) return true;
  }
  return false;
}

export function buildSqlMapBlockedSchemaDraft({ title, items, edge = null }) {
  return {
    valid: false,
    level: "blocked",
    status: "blocked-schema",
    title: title || t("sqlMap.relationNotAllowed"),
    summary: items && items.length ? items[0] : t("sqlMap.relationCreateFailed"),
    items: Array.isArray(items) ? items : [t("sqlMap.relationCreateFailed")],
    edge,
    orphanCounts: null,
    diagnosticSql: ""
  };
}

export function buildSqlMapOrphanDiagnosticSql(edge, previewLimit = SQL_MAP_DIAGNOSTIC_PREVIEW_LIMIT) {
  if (!edge) return "";
  const quoteIdentifier = (identifier) => `"${String(identifier || "").replaceAll('"', '""')}"`;
  const fromTable = quoteIdentifier(edge.fromTable);
  const fromColumn = quoteIdentifier(edge.fromColumn);
  const toTable = quoteIdentifier(edge.toTable);
  const toColumn = quoteIdentifier(edge.toColumn);
  const cappedLimit = Math.max(1, Number(previewLimit || SQL_MAP_DIAGNOSTIC_PREVIEW_LIMIT));
  return [
    `-- FK source orphan values: ${getSqlMapFieldRef(edge.fromTable, edge.fromColumn)}`,
    `SELECT 'fk_without_reference' AS orphan_side, src.*`,
    `FROM ${fromTable} AS src`,
    `LEFT JOIN ${toTable} AS ref ON src.${fromColumn} = ref.${toColumn}`,
    `WHERE src.${fromColumn} IS NOT NULL`,
    `  AND ref.${toColumn} IS NULL`,
    `LIMIT ${cappedLimit};`,
    ``,
    `-- Referenced target orphan values: ${getSqlMapFieldRef(edge.toTable, edge.toColumn)}`,
    `SELECT 'reference_without_fk' AS orphan_side, ref.*`,
    `FROM ${toTable} AS ref`,
    `LEFT JOIN ${fromTable} AS src ON src.${fromColumn} = ref.${toColumn}`,
    `WHERE ref.${toColumn} IS NOT NULL`,
    `  AND src.${fromColumn} IS NULL`,
    `LIMIT ${cappedLimit};`
  ].join("\n");
}

export function buildSqlMapBlockedDataDraft(structuralDraft, orphanCounts = {}) {
  const fromCount = Number(orphanCounts.fromSide || 0);
  const toCount = Number(orphanCounts.toSide || 0);
  const items = [];
  if (fromCount > 0) {
    items.push(t("sqlMap.orphanSource", { count: formatNumber(fromCount), source: getSqlMapFieldRef(structuralDraft.edge.fromTable, structuralDraft.edge.fromColumn), target: getSqlMapFieldRef(structuralDraft.edge.toTable, structuralDraft.edge.toColumn) }));
  }
  if (toCount > 0) {
    items.push(t("sqlMap.orphanTarget", { count: formatNumber(toCount), target: getSqlMapFieldRef(structuralDraft.edge.toTable, structuralDraft.edge.toColumn), source: getSqlMapFieldRef(structuralDraft.edge.fromTable, structuralDraft.edge.fromColumn) }));
  }
  return {
    ...structuralDraft,
    valid: false,
    level: "blocked",
    status: "blocked-data",
    title: t("sqlMap.incompatibleData"),
    summary: items[0] || t("sqlMap.orphansBlock"),
    items: items.length ? items : [t("sqlMap.orphansBlock")],
    orphanCounts: {
      fromSide: fromCount,
      toSide: toCount
    },
    diagnosticSql: buildSqlMapOrphanDiagnosticSql(structuralDraft.edge)
  };
}

export function getSqlMapFieldMeta(tableName, fieldName) {
  const table = sqlMapState.tables[tableName];
  const field = table && Array.isArray(table.fields)
    ? table.fields.find((item) => item.name === fieldName)
    : null;
  if (!field) return null;
  return {
    ...field,
    normalizedType: normalizeSqliteTypeClass(field.type)
  };
}

export function getSqlMapFieldRef(tableName, fieldName) {
  return `${tableName}.${fieldName}`;
}

export function getSqlMapFieldDomId(tableName, fieldName) {
  return `${tableName}::${fieldName}`;
}

export function parseSqlMapFieldDomId(fieldId) {
  const value = String(fieldId || "");
  const separatorIndex = value.indexOf("::");
  if (separatorIndex === -1) {
    return { table: "", field: "" };
  }
  return {
    table: value.slice(0, separatorIndex),
    field: value.slice(separatorIndex + 2)
  };
}

export function compareSqlMapPathMetrics(pathA, pathB) {
  const metrics = (path) => ({
    length: Array.isArray(path) ? path.length : Number.POSITIVE_INFINITY,
    virtualCount: (path || []).filter(edge => edge.kind === "virtual").length,
    ids: (path || []).map(edge => edge.id).join("|")
  });
  const a = metrics(pathA);
  const b = metrics(pathB);
  if (a.length !== b.length) return a.length - b.length;
  if (a.virtualCount !== b.virtualCount) return a.virtualCount - b.virtualCount;
  return compareLocalized(a.ids, b.ids);
}

export function getSqlMapCompatibilityDetails(fromClass, toClass) {
  const pair = [fromClass, toClass].sort().join("|");
  if (fromClass === "unknown" || toClass === "unknown") {
    return {
      level: "warn",
      title: t("sqlMap.compatibilityUnknown"),
      items: [
        t("sqlMap.unknownType"),
        t("sqlMap.possibleIncorrectLink"),
        t("sqlMap.reviewBusinessKey")
      ]
    };
  }
  if (fromClass === "text" && toClass === "text") return { level: "allowed", title: "", items: [] };
  if (fromClass === "blob" && toClass === "blob") return { level: "allowed", title: "", items: [] };
  if (fromClass === "boolean" && toClass === "boolean") return { level: "allowed", title: "", items: [] };

  const numericClasses = new Set(["integer", "real", "numeric"]);
  if (numericClasses.has(fromClass) && numericClasses.has(toClass)) {
    return { level: "allowed", title: "", items: [] };
  }

  if (fromClass === "text" || toClass === "text") {
    return {
      level: "blocked",
      title: t("sqlMap.incompatibleTypes"),
      items: [t("sqlMap.textTypeRule")]
    };
  }
  if (fromClass === "blob" || toClass === "blob") {
    return {
      level: "blocked",
      title: t("sqlMap.incompatibleTypes"),
      items: [t("sqlMap.blobTypeRule")]
    };
  }

  const temporalClasses = new Set(["temporal_date", "temporal_datetime", "temporal_time"]);
  if (temporalClasses.has(fromClass) || temporalClasses.has(toClass)) {
    if (fromClass === toClass) {
      return {
        level: "warn",
        title: t("sqlMap.temporalWarning"),
        items: [
          t("sqlMap.unusualRelationship"),
          t("sqlMap.temporalRisk"),
          t("sqlMap.reviewBusinessKey")
        ]
      };
    }
    return {
      level: "blocked",
      title: t("sqlMap.incompatibleTypes"),
      items: [t("sqlMap.temporalTypeRule")]
    };
  }

  if (pair === "boolean|integer" || pair === "boolean|numeric") {
    return {
      level: "warn",
      title: t("sqlMap.suspiciousCompatibility"),
      items: [
        t("sqlMap.unusualRelationship"),
        t("sqlMap.booleanNumericRisk"),
        t("sqlMap.reviewBoolean")
      ]
    };
  }

  if (fromClass === "boolean" || toClass === "boolean") {
    return {
      level: "blocked",
      title: t("sqlMap.incompatibleTypes"),
      items: [t("sqlMap.booleanTypeRule")]
    };
  }

  return {
    level: "blocked",
    title: t("sqlMap.incompatibleTypes"),
    items: [t("sqlMap.declaredTypesRule")]
  };
}

export function summarizeSqlMapCompatibilityReason(details) {
  return details.items[0] || "";
}

export function buildSqlMapEdge({ kind, fromTable, fromColumn, toTable, toColumn, createdAt = "" }) {
  const fromField = getSqlMapFieldMeta(fromTable, fromColumn);
  const toField = getSqlMapFieldMeta(toTable, toColumn);
  const fromType = fromField ? fromField.type || "" : "";
  const toType = toField ? toField.type || "" : "";
  const fromTypeClass = fromField ? fromField.normalizedType : "unknown";
  const toTypeClass = toField ? toField.normalizedType : "unknown";
  const compatibility = getSqlMapCompatibilityDetails(fromTypeClass, toTypeClass);
  return {
    kind,
    fromTable,
    fromColumn,
    toTable,
    toColumn,
    fromType,
    toType,
    fromTypeClass,
    toTypeClass,
    compatibilityLevel: compatibility.level,
    compatibilityReason: summarizeSqlMapCompatibilityReason(compatibility),
    compatibilityTitle: compatibility.title,
    compatibilityItems: compatibility.items,
    createdAt,
    id: `${kind}:${fromTable}.${fromColumn}__${toTable}.${toColumn}`
  };
}

export function hasSqlMapEdgeConflict(candidate) {
  return getSqlMapEdges().some((edge) => (
    (edge.fromTable === candidate.fromTable && edge.fromColumn === candidate.fromColumn && edge.toTable === candidate.toTable && edge.toColumn === candidate.toColumn)
    || (edge.fromTable === candidate.toTable && edge.fromColumn === candidate.toColumn && edge.toTable === candidate.fromTable && edge.toColumn === candidate.fromColumn)
  ));
}

export function buildSqlMapRelationDraft(fromTable, fromColumn, toTable, toColumn) {
  if (fromTable === toTable && fromColumn === toColumn) {
    return buildSqlMapBlockedSchemaDraft({
      title: t("sqlMap.relationNotAllowed"),
      items: [t("sqlMap.sameColumn")]
    });
  }
  if (fromTable === toTable) {
    return buildSqlMapBlockedSchemaDraft({
      title: t("sqlMap.relationNotAllowed"),
      items: [t("sqlMap.sameTable")]
    });
  }
  if (!getSqlMapFieldMeta(fromTable, fromColumn) || !getSqlMapFieldMeta(toTable, toColumn)) {
    return buildSqlMapBlockedSchemaDraft({
      title: t("sqlMap.relationNotAllowed"),
      items: [t("sqlMap.columnMissing")]
    });
  }
  const edge = buildSqlMapEdge({ kind: "virtual", fromTable, fromColumn, toTable, toColumn, createdAt: new Date().toISOString() });
  if (hasSqlMapEdgeConflict(edge)) {
    return buildSqlMapBlockedSchemaDraft({
      title: t("sqlMap.relationExists"),
      items: [t("sqlMap.relationConflict")],
      edge
    });
  }
  if (edge.compatibilityLevel === "blocked") {
    return buildSqlMapBlockedSchemaDraft({
      title: edge.compatibilityTitle || t("sqlMap.incompatibleTypes"),
      items: edge.compatibilityItems && edge.compatibilityItems.length
        ? edge.compatibilityItems
        : [t("sqlMap.declaredTypesRule")],
      edge
    });
  }
  return {
    valid: true,
    level: edge.compatibilityLevel,
    status: edge.compatibilityLevel,
    title: edge.compatibilityTitle,
    summary: "",
    items: edge.compatibilityItems,
    edge,
    orphanCounts: null,
    diagnosticSql: ""
  };
}

export function getSqlMapEdgeStatusLabel(edge) {
  if (edge.kind === "declared") return t("sqlMap.declaredFk");
  if (edge.compatibilityLevel === "warn") return t("sqlMap.suspicious");
  return t("sqlMap.compatible");
}

export function renderSqlMapVirtualSummary() {
  if (!sqlMapVirtualSummary) return;
  if (!sqlMapState.virtualFks.length) {
    sqlMapVirtualSummary.textContent = t("sqlMap.virtualHint");
    sqlMapClearVirtualBtn.disabled = true;
    return;
  }
  const suspiciousCount = sqlMapState.virtualFks.filter((edge) => edge.compatibilityLevel === "warn").length;
  sqlMapVirtualSummary.textContent = t("sqlMap.virtualSummary", {
    count: formatNumber(sqlMapState.virtualFks.length),
    warnings: suspiciousCount ? t("sqlMap.warningCount", { count: formatNumber(suspiciousCount) }) : ""
  });
  sqlMapClearVirtualBtn.disabled = false;
}
