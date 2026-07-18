import assert from "node:assert/strict";
import test from "node:test";
import {
  getSqlitePopulationFamily,
  normalizeSqliteTypeClass
} from "../../src/core/06-sqlite-types.js";

test("normalizes representative SQLite declared types", () => {
  const cases = new Map([
    ["INTEGER", "integer"],
    ["DOUBLE PRECISION", "real"],
    ["DECIMAL(12,2)", "numeric"],
    ["BOOLEAN", "boolean"],
    ["DATETIME", "temporal_datetime"],
    ["DATE", "temporal_date"],
    ["TIME", "temporal_time"],
    ["VARCHAR(255)", "text"],
    ["JSON", "text"],
    ["BLOB", "blob"],
    ["", "unknown"],
    ["custom_domain", "unknown"]
  ]);

  for (const [declaredType, expectedClass] of cases) {
    assert.equal(normalizeSqliteTypeClass(declaredType), expectedClass, declaredType || "empty type");
  }
});

test("maps declared types to deterministic population families", () => {
  assert.equal(getSqlitePopulationFamily("INTEGER"), "numeric");
  assert.equal(getSqlitePopulationFamily("BOOLEAN"), "numeric");
  assert.equal(getSqlitePopulationFamily("DATETIME"), "text");
  assert.equal(getSqlitePopulationFamily("BLOB"), "blob");
  assert.equal(getSqlitePopulationFamily("custom_domain"), "text");
});
