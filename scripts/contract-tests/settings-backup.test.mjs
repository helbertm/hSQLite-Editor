import test from "node:test";
import assert from "node:assert/strict";
import { serializeSettingsExportPayload, validateSettingsImportPayload } from "../../src/core/05-settings-import-contract.js";

test("settings exports round-trip long SQL and database provenance", () => {
  const sql = "select '" + "x".repeat(300000) + "'";
  const payload = {
    version: 1,
    exportedAt: "2026-10-15T00:00:00Z",
    scopes: ["queryHistory"],
    data: { queryHistory: [{ id: "case-42", sql, databaseName: "incident.db", status: "success", executedAt: "2026-10-15T00:00:00Z", errorMessage: "" }] }
  };
  const restored = validateSettingsImportPayload(JSON.parse(serializeSettingsExportPayload(payload)), payload.scopes);
  assert.equal(restored.queryHistory[0].sql, sql);
  assert.equal(restored.queryHistory[0].databaseName, "incident.db");
});

test("settings export rejects invalid scope data before creating a download", () => {
  assert.throws(() => serializeSettingsExportPayload({ version: 1, scopes: ["theme"], data: { theme: "unknown" } }));
});
