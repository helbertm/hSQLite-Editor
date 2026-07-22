import assert from "node:assert/strict";
import test from "node:test";
import {
  assertValidSqlitePayload,
  getKnownBinaryTypeLabel,
  hasAllowedSqliteExtension,
  isLikelySqliteBySignature,
  normalizeSqliteFileName
} from "../../src/capabilities/32-database-file-validation.js";

function sqliteBytes() {
  const bytes = new Uint8Array(100);
  bytes.set(Buffer.from("SQLite format 3\0", "ascii"));
  return bytes;
}

test("normalizes generated names without weakening input extension checks", () => {
  assert.equal(normalizeSqliteFileName(" quarterly/report "), "quarterly_report.db");
  assert.equal(hasAllowedSqliteExtension("DATA.SQLITE3"), true);
  assert.equal(hasAllowedSqliteExtension("archive.pdf"), false);
  assert.throws(
    () => assertValidSqlitePayload({ fileName: "archive.pdf", bytes: sqliteBytes() }),
    error => error?.code === "invalid-sqlite-extension"
  );
});

test("accepts a valid SQLite signature and rejects known foreign binaries", () => {
  const bytes = sqliteBytes();
  assert.equal(isLikelySqliteBySignature(bytes), true);
  assert.equal(assertValidSqlitePayload({ fileName: "data.db", bytes }), "data.db");

  const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(getKnownBinaryTypeLabel(pdf), "PDF");
  assert.throws(
    () => assertValidSqlitePayload({ fileName: "data.db", bytes: pdf }),
    error => error?.code === "invalid-sqlite-file" && error.message.includes("database.invalidFileDetected")
  );
});

test("allows empty bytes only for explicitly generated databases", () => {
  assert.equal(
    assertValidSqlitePayload({
      fileName: "generated.db",
      bytes: new Uint8Array(),
      allowEmptyGeneratedPayload: true
    }),
    "generated.db"
  );
  assert.throws(
    () => assertValidSqlitePayload({ fileName: "uploaded.db", bytes: new Uint8Array() }),
    error => error?.code === "invalid-sqlite-file"
  );
});
