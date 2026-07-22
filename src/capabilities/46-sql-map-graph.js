import { compareLocalized, t } from "./03-localization.js";
import { sqlEscapeIdent } from "../core/07-sql-escaping.js";
import { sqlMapCanvas, sqlMapClearPasteSqlBtn, sqlMapCopySqlBtn, sqlMapLinks, sqlMapPasteSqlBtn, sqlMapSqlPreview } from "./06-dom-sql-map.js";
import { getActiveDatabase } from "./07-database-runtime.js";
import { getEditorValue } from "./32a-editor-api.js";
import { buildSqlMapEdge, compareSqlMapPathMetrics, getSqlMapEdges, getSqlMapFieldMeta, loadSqlMapPositions, saveSqlMapPositions } from "./45-sql-map-core.js";
import { resetSqlMapFieldDragRuntime, sqlMapRuntime, sqlMapState } from "./45a-sql-map-runtime.js";
import { hideSqlMapEdgeTooltip } from "./45b-sql-map-tooltip.js";
import { getSchemaObjects, setSqlMapState } from "../core/14-state-database-schema.js";

let renderSqlMapView = () => {};

export function configureSqlMapGraphEffects(effects) {
  renderSqlMapView = effects.renderSqlMapView;
}

export function buildSqlMapSchema() {
  const activeDb = getActiveDatabase();
  const tables = {};
  for (const [tableName, meta] of Object.entries(getSchemaObjects())) {
    const objectType = String(meta && meta.type ? meta.type : "").toLowerCase();
    if (objectType !== "table" && objectType !== "view") continue;
    tables[tableName] = {
      name: tableName,
      type: meta.type,
      fields: (meta.fields || []).map(field => ({
        name: field.name,
        type: field.type || "",
        pk: Boolean(field.pk),
        notnull: Boolean(field.notnull)
      }))
    };
  }
  const declaredFks = [];
  for (const tableName of Object.keys(tables)) {
    try {
      const safeName = String(tableName).replaceAll("'", "''");
      const fkRes = activeDb.exec(`pragma foreign_key_list('${safeName}')`);
      if (fkRes.length) {
        for (const row of fkRes[0].values) {
          if (!tables[row[2]]) continue;
          declaredFks.push(buildSqlMapEdge({
            kind: "declared",
            fromTable: tableName,
            fromColumn: row[3],
            toTable: row[2],
            toColumn: row[4]
          }));
        }
      }
    } catch (err) {
      console.warn("sql-map-fk-read-failed", tableName, err);
    }
  }
  const nextVirtualFks = sqlMapState.virtualFks.filter((edge) => (
    tables[edge.fromTable]
    && tables[edge.toTable]
    && getSqlMapFieldMeta(edge.fromTable, edge.fromColumn)
    && getSqlMapFieldMeta(edge.toTable, edge.toColumn)
  )).map((edge) => buildSqlMapEdge({
    kind: "virtual",
    fromTable: edge.fromTable,
    fromColumn: edge.fromColumn,
    toTable: edge.toTable,
    toColumn: edge.toColumn,
    createdAt: edge.createdAt
  }));
  setSqlMapState({
    tables,
    declaredFks,
    virtualFks: nextVirtualFks,
    selectedTables: new Set(),
    selectedFields: new Map(),
    positions: loadSqlMapPositions(),
    generatedSql: ""
  });
  resetSqlMapFieldDragRuntime();
  hideSqlMapEdgeTooltip(true);
}

export function autoLayoutSqlMap() {
  const names = Object.keys(sqlMapState.tables);
  const cols = Math.max(1, Math.ceil(Math.sqrt(names.length)));
  const xGap = 310, yGap = 300, margin = 40;
  names.forEach((name, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    sqlMapState.positions[name] = { x: margin + col * xGap, y: margin + row * yGap };
  });
  const width = Math.max(1600, margin * 2 + cols * xGap);
  const height = Math.max(1000, margin * 2 + Math.ceil(names.length / cols) * yGap);
  sqlMapCanvas.style.width = `${width}px`;
  sqlMapCanvas.style.height = `${height}px`;
  sqlMapCanvas.style.minWidth = `${width}px`;
  sqlMapCanvas.style.minHeight = `${height}px`;
  sqlMapLinks.setAttribute("width", width);
  sqlMapLinks.setAttribute("height", height);
  sqlMapLinks.style.width = `${width}px`;
  sqlMapLinks.style.height = `${height}px`;
  saveSqlMapPositions();
}

export function ensureSqlMapLayout() {
  const names = Object.keys(sqlMapState.tables);
  if (names.some(name => !sqlMapState.positions[name])) autoLayoutSqlMap();
}

export function getSqlMapAdjacency() {
  const adjacency = new Map();
  Object.keys(sqlMapState.tables).forEach(table => adjacency.set(table, []));
  for (const edge of getSqlMapEdges()) {
    if (!adjacency.has(edge.fromTable)) adjacency.set(edge.fromTable, []);
    if (!adjacency.has(edge.toTable)) adjacency.set(edge.toTable, []);
    adjacency.get(edge.fromTable).push({ table: edge.toTable, edge });
    adjacency.get(edge.toTable).push({ table: edge.fromTable, edge });
  }
  for (const entries of adjacency.values()) {
    entries.sort((a, b) => {
      if (a.edge.kind !== b.edge.kind) return a.edge.kind === "declared" ? -1 : 1;
      return compareLocalized(a.edge.id, b.edge.id);
    });
  }
  return adjacency;
}

export function findSqlMapPath(start, target) {
  if (start === target) return [];
  const adjacency = getSqlMapAdjacency();
  const frontier = [{ table: start, path: [] }];
  const bestByTable = new Map([[start, []]]);
  while (frontier.length) {
    frontier.sort((a, b) => compareSqlMapPathMetrics(a.path, b.path));
    const current = frontier.shift();
    if (current.table === target) return current.path;
    for (const next of adjacency.get(current.table) || []) {
      const nextPath = [...current.path, next.edge];
      const bestKnown = bestByTable.get(next.table);
      if (bestKnown && compareSqlMapPathMetrics(nextPath, bestKnown) >= 0) continue;
      bestByTable.set(next.table, nextPath);
      frontier.push({ table: next.table, path: nextPath });
    }
  }
  return null;
}

export function getSqlMapReachableTables() {
  const selected = [...sqlMapState.selectedTables];
  if (!selected.length) return new Set(Object.keys(sqlMapState.tables));
  const reachable = new Set(selected);
  const adjacency = getSqlMapAdjacency();
  const queue = [...selected];
  while (queue.length) {
    const table = queue.shift();
    for (const edge of adjacency.get(table) || []) {
      if (!reachable.has(edge.table)) {
        reachable.add(edge.table);
        queue.push(edge.table);
      }
    }
  }
  return reachable;
}

export function canSelectSqlMapTable(tableName) {
  if (sqlMapState.selectedTables.has(tableName)) return true;
  const selected = [...sqlMapState.selectedTables];
  if (!selected.length) return true;
  return selected.some(selectedTable => findSqlMapPath(selectedTable, tableName));
}

export function toggleSqlMapTable(tableName, checked) {
  if (checked && !canSelectSqlMapTable(tableName)) return;
  if (checked) {
    sqlMapState.selectedTables.add(tableName);
    if (!sqlMapState.selectedFields.has(tableName)) sqlMapState.selectedFields.set(tableName, new Set());
  } else {
    sqlMapState.selectedTables.delete(tableName);
    sqlMapState.selectedFields.delete(tableName);
  }
  updateSqlMapGeneratedSql();
  renderSqlMapView();
}

export function toggleSqlMapField(tableName, fieldName, checked) {
  if (!canSelectSqlMapTable(tableName)) return;
  if (checked) {
    sqlMapState.selectedTables.add(tableName);
    if (!sqlMapState.selectedFields.has(tableName)) sqlMapState.selectedFields.set(tableName, new Set());
    sqlMapState.selectedFields.get(tableName).add(fieldName);
  } else {
    const fields = sqlMapState.selectedFields.get(tableName);
    if (fields) fields.delete(fieldName);
    if (fields && fields.size === 0) {
      sqlMapState.selectedFields.delete(tableName);
      sqlMapState.selectedTables.delete(tableName);
    }
  }
  updateSqlMapGeneratedSql();
  renderSqlMapView();
}

export function getSqlMapSelectedFieldsList() {
  const fields = [];
  for (const table of sqlMapState.selectedTables) {
    const selectedFields = sqlMapState.selectedFields.get(table);
    if (selectedFields && selectedFields.size) {
      for (const field of selectedFields) fields.push({ table, field });
    }
  }
  return fields;
}

export function getSqlMapJoinPlan() {
  const selectedTables = [...sqlMapState.selectedTables];
  if (!selectedTables.length) return { baseTable: "", joins: [], usedFks: new Set(), error: "" };
  const baseTable = selectedTables[0];
  const joined = new Set([baseTable]);
  const joins = [];
  const usedFks = new Set();
  for (const table of selectedTables.slice(1)) {
    let best = null;
    for (const source of joined) {
      const path = findSqlMapPath(source, table);
      if (path && (!best || compareSqlMapPathMetrics(path, best) < 0)) best = path;
    }
    if (!best) return { baseTable, joins, usedFks, error: t("sqlMap.noPath", { table }) };
    for (const edge of best) {
      if (usedFks.has(edge.id)) continue;
      const fromJoined = joined.has(edge.fromTable);
      const toJoined = joined.has(edge.toTable);
      let joinTable = "";
      if (fromJoined && !toJoined) joinTable = edge.toTable;
      else if (toJoined && !fromJoined) joinTable = edge.fromTable;
      else if (!fromJoined && !toJoined) joinTable = edge.toTable;
      else continue;
      joins.push({ table: joinTable, edge });
      usedFks.add(edge.id);
      joined.add(edge.fromTable);
      joined.add(edge.toTable);
    }
  }
  return { baseTable, joins, usedFks, error: "" };
}

export function updateSqlMapGeneratedSql() {
  const selectedTables = [...sqlMapState.selectedTables];
  const selectedFields = getSqlMapSelectedFieldsList();
  if (!selectedTables.length) {
    sqlMapState.generatedSql = "";
    sqlMapSqlPreview.textContent = t("sqlMap.generatedPlaceholder");
    updateSqlMapActionButtons();
    return;
  }
  const joinPlan = getSqlMapJoinPlan();
  if (joinPlan.error) {
    sqlMapState.generatedSql = "";
    sqlMapSqlPreview.textContent = `-- ${joinPlan.error}`;
    updateSqlMapActionButtons();
    return;
  }
  const selectFields = selectedFields.length
    ? selectedFields.map(item => `  ${sqlEscapeIdent(item.table)}.${sqlEscapeIdent(item.field)}`)
    : [`  ${sqlEscapeIdent(selectedTables[0])}.*`];
  const lines = ["select", selectFields.join(",\n"), `from ${sqlEscapeIdent(joinPlan.baseTable)}`];
  for (const join of joinPlan.joins) {
    const fk = join.edge;
    lines.push(
      `join ${sqlEscapeIdent(join.table)}`,
      `  on ${sqlEscapeIdent(fk.fromTable)}.${sqlEscapeIdent(fk.fromColumn)} = ${sqlEscapeIdent(fk.toTable)}.${sqlEscapeIdent(fk.toColumn)}`
    );
  }
  lines.push("limit 50;");
  sqlMapState.generatedSql = lines.join("\n");
  sqlMapSqlPreview.textContent = sqlMapState.generatedSql;
  updateSqlMapActionButtons();
}

export function updateSqlMapActionButtons() {
  const hasSql = Boolean(sqlMapState.generatedSql);
  const editorHasText = getEditorValue().trim().length > 0;
  sqlMapCopySqlBtn.disabled = !hasSql;
  sqlMapPasteSqlBtn.disabled = !hasSql || editorHasText;
  sqlMapPasteSqlBtn.style.display = editorHasText ? "none" : "block";
  sqlMapClearPasteSqlBtn.disabled = !hasSql || !editorHasText;
  sqlMapClearPasteSqlBtn.style.display = editorHasText ? "block" : "none";
}
