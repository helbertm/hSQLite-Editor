export function normalizeSqliteTypeClass(rawType) {
  const normalized = String(rawType || "").trim().toLowerCase();
  if (!normalized) return "unknown";
  if (normalized.includes("bool")) return "boolean";
  if (normalized.includes("datetime") || normalized.includes("timestamp")) return "temporal_datetime";
  if (normalized.includes("date") && !normalized.includes("time")) return "temporal_date";
  if (normalized.includes("time")) return "temporal_time";
  if (/(int)/.test(normalized)) return "integer";
  if (/(real|floa|doub)/.test(normalized)) return "real";
  if (/(dec|num)/.test(normalized)) return "numeric";
  if (/(char|clob|text|json|uuid)/.test(normalized)) return "text";
  if (/(blob|binary)/.test(normalized)) return "blob";
  return "unknown";
}

export function getSqlitePopulationFamily(rawType) {
  const typeClass = normalizeSqliteTypeClass(rawType);
  if (["integer", "real", "numeric", "boolean"].includes(typeClass)) return "numeric";
  if (["temporal_date", "temporal_datetime", "temporal_time"].includes(typeClass)) return "text";
  if (typeClass === "blob") return "blob";
  return "text";
}
