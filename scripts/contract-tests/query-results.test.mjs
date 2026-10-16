import test from "node:test";
import assert from "node:assert/strict";
import initSqlJs from "sql.js";
import { databaseBytesEqual, escapeCsvCell, normalizeResultColumns, readBoundedStatement } from "../../src/core/16-query-results.js";
import { SQL_RESULT_LIMITS } from "../../src/core/03-app-limits.js";

const SQL = await initSqlJs();
const budget = () => ({ rows: 0, cells: 0, bytes: 0 });

test("preserves empty-result columns and exact 64-bit identifiers", () => {
  const db = new SQL.Database();
  try {
    assert.deepEqual(readBoundedStatement(db, "select 1 as id where 0", budget(), SQL_RESULT_LIMITS), { columns: ["id"], values: [] });
    const result = readBoundedStatement(db, "select 9223372036854775807, -9223372036854775808, 42, 1.25", budget(), SQL_RESULT_LIMITS);
    assert.deepEqual(result.values, [["9223372036854775807", "-9223372036854775808", 42, 1.25]]);
  } finally { db.close(); }
});

test("bounds aggregate rows, cells and text/BLOB payload and frees statements", () => {
  const db = new SQL.Database();
  try {
    db.run("create table items(id); insert into items values (1),(2),(3)");
    for (const limits of [{ rows: 2, cells: 100, bytes: 1000 }, { rows: 100, cells: 2, bytes: 1000 }, { rows: 100, cells: 100, bytes: 4 }]) {
      assert.throws(() => readBoundedStatement(db, "select * from items", budget(), limits), error => error.errorCode === "resultLimitExceeded");
    }
    const shared = budget();
    readBoundedStatement(db, "select * from items", shared, { ...SQL_RESULT_LIMITS, rows: 5 });
    assert.throws(() => readBoundedStatement(db, "select * from items", shared, { ...SQL_RESULT_LIMITS, rows: 5 }));
    assert.throws(() => readBoundedStatement(db, "select zeroblob(100)", budget(), { ...SQL_RESULT_LIMITS, bytes: 50 }));
    db.run("drop table items");
  } finally { db.close(); }
});

test("persistent-byte comparison detects CTE writes and PRAGMAs but not reads", () => {
  const db = new SQL.Database();
  try {
    db.run("create table items(id)");
    const initial = db.export();
    readBoundedStatement(db, "select * from items", budget(), SQL_RESULT_LIMITS);
    assert.equal(databaseBytesEqual(initial, db.export()), true);
    readBoundedStatement(db, "with data(id) as (select 7) insert into items select id from data", budget(), SQL_RESULT_LIMITS);
    const written = db.export();
    assert.equal(databaseBytesEqual(initial, written), false);
    db.run("pragma user_version=42");
    assert.equal(databaseBytesEqual(written, db.export()), false);
  } finally { db.close(); }
});

test("duplicate and internal column labels cannot overwrite results or row identity", () => {
  assert.deepEqual(normalizeResultColumns(["id", "id", "id (2)", "__rowKey", "__proto__", "constructor"]),
    ["id", "id (3)", "id (2)", "__rowKey (2)", "__proto__ (2)", "constructor (2)"]);
});

test("CSV shields formula text, quotes separators, and preserves numeric negatives", () => {
  assert.equal(escapeCsvCell('=HYPERLINK("https://example.invalid")'), '"\'=HYPERLINK(""https://example.invalid"")"');
  for (const value of ["+1", "-1", "@SUM(A1)", "\tvalue", "  =1", "＝1"]) {
    assert.ok(escapeCsvCell(value).startsWith('"\''));
  }
  assert.equal(escapeCsvCell(-42), '"-42"');
  assert.equal(escapeCsvCell('a;b\n"c"'), '"a;b\n""c"""');
  assert.equal(escapeCsvCell(null), "");
  assert.equal(escapeCsvCell(Uint8Array.of(0, 255)), '"X\'00ff\'"');
});
