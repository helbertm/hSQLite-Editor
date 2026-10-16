// Shared by the embedded worker and real-SQLite contract tests.
export function readBoundedStatement(db, sql, budget, limits, prepared = null) {
  const statement = prepared || db.prepare(sql);
  try {
    const columns = statement.getColumnNames();
    const values = [];
    budget.bytes += columns.reduce((sum, column) => sum + column.length * 2, 0);
    while (statement.step()) {
      budget.rows += 1;
      budget.cells += columns.length;
      const row = statement.get(null, { useBigInt: true }).map(value => {
        // Preserve 64-bit identifiers exactly; JSON cannot represent BigInt.
        if (typeof value !== "bigint") return value;
        return value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)
          ? Number(value) : value.toString();
      });
      budget.bytes += row.reduce((sum, value) => sum + (
        typeof value === "string" ? value.length * 2 : value instanceof Uint8Array ? value.byteLength : 8
      ), 0);
      if (budget.rows > limits.rows || budget.cells > limits.cells || budget.bytes > limits.bytes) {
        const error = new Error("resultLimitExceeded");
        error.errorCode = "resultLimitExceeded";
        throw error;
      }
      values.push(row);
    }
    return { columns, values };
  } finally {
    if (!prepared) statement.free();
  }
}

export function normalizeResultColumns(columns) {
  const reserved = new Set(["__rowKey", "__proto__", "constructor", "prototype"]);
  const original = new Set(columns);
  const used = new Set(reserved);
  return columns.map(raw => {
    const name = String(raw);
    let label = name;
    let suffix = 2;
    while (used.has(label)) {
      label = `${name} (${suffix++})`;
      while (original.has(label)) label = `${name} (${suffix++})`;
    }
    used.add(label);
    return label;
  });
}

export function databaseBytesEqual(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export function escapeCsvCell(value) {
  if (value === null || value === undefined) return "";
  let text = value instanceof Uint8Array
    ? `X'${Array.from(value, byte => byte.toString(16).padStart(2, "0")).join("")}'`
    : String(value);
  // Spreadsheet-oriented export. JSON retains the original text without this prefix.
  if (typeof value === "string" && /^[\s\uFEFF]*[=+\-@＝＋－＠]|^[\t\r\n]/u.test(text)) {
    text = "'" + text;
  }
  return '"' + text.replaceAll('"', '""') + '"';
}
