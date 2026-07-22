import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightSpecifier = process.env.PLAYWRIGHT_MODULE || "playwright";
const playwrightUrl = path.isAbsolute(playwrightSpecifier)
  ? pathToFileURL(playwrightSpecifier).href
  : playwrightSpecifier;
const { chromium } = await import(playwrightUrl);

const baseUrl = process.env.HSQLITE_BASE_URL || "http://127.0.0.1:4173/";
const executablePath = process.env.CHROME_PATH || undefined;
const browser = await chromium.launch({ headless: true, executablePath });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await page.addInitScript(() => localStorage.setItem("hSQLiteEditorFirstRunDoneV1", "true"));
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.waitForFunction(() => document.body.dataset.bootState === "ready");

  const result = await page.evaluate(async () => {
    const SqlJs = await initSqlJsIfNeeded();
    const database = new SqlJs.Database();
    database.run(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE qa_parent (id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE);
      CREATE TABLE qa_child (id INTEGER PRIMARY KEY, code TEXT NOT NULL);
      CREATE TABLE qa_items (id INTEGER PRIMARY KEY, seq INTEGER NOT NULL, label TEXT NOT NULL);
      CREATE TABLE qa_unique (id INTEGER PRIMARY KEY, seq INTEGER NOT NULL UNIQUE);
      INSERT INTO qa_parent (code) VALUES ('parent-1'), ('parent-without-child');
      INSERT INTO qa_child (code) VALUES ('parent-1'), ('missing-parent');
    `);
    const initialBytes = database.export();
    database.close();
    await openDbFromBytes("backlog-worker-validation.db", initialBytes);
    buildSqlMapSchema();

    const draft = buildSqlMapRelationDraft("qa_child", "code", "qa_parent", "code");
    const orphanValidation = await runSqlMapRelationPreflight(draft);

    const populationResult = await runTablePopulationInWorker({
      table: "qa_items",
      rowCount: 3,
      batchSize: 2,
      columns: [
        { name: "id", strategy: "omit" },
        { name: "seq", strategy: "increment", start: 10, step: 5 },
        { name: "label", strategy: "fixed-text", value: "QA 'bound'" }
      ]
    });
    applyWorkerDatabaseState(populationResult);
    const insertedRows = getActiveDatabase().exec("SELECT seq, label FROM qa_items ORDER BY id")[0].values;

    let rollbackError = "";
    try {
      await runTablePopulationInWorker({
        table: "qa_unique",
        rowCount: 2,
        columns: [
          { name: "id", strategy: "omit" },
          { name: "seq", strategy: "fixed-number", value: 1 }
        ]
      });
    } catch (error) {
      rollbackError = error?.message || String(error);
    }
    const rowsAfterRollback = getActiveDatabase().exec("SELECT COUNT(*) FROM qa_unique")[0].values[0][0];

    let hardCapError = "";
    try {
      await runTablePopulationInWorker({ table: "qa_items", rowCount: 1000001, columns: [] });
    } catch (error) {
      hardCapError = error?.message || String(error);
    }

    const bytesBeforeCancel = new Uint8Array(getCurrentDbBytes());
    const cancelledOperation = runTablePopulationInWorker({
      table: "qa_items",
      rowCount: 1000000,
      batchSize: 1000,
      columns: [
        { name: "id", strategy: "omit" },
        { name: "seq", strategy: "increment", start: 1000, step: 1 },
        { name: "label", strategy: "random-text", length: 24 }
      ]
    }).then(() => null, (error) => error);
    await new Promise((resolve) => setTimeout(resolve, 10));
    terminateActiveSqlWorker(true);
    const cancellationError = await cancelledOperation;
    const bytesAfterCancel = new Uint8Array(getCurrentDbBytes());
    const cancelPreservedBytes = bytesBeforeCancel.length === bytesAfterCancel.length
      && bytesBeforeCancel.every((value, index) => value === bytesAfterCancel[index]);

    return {
      orphanStatus: orphanValidation?.status,
      orphanCounts: orphanValidation?.orphanCounts,
      orphanSummary: orphanValidation?.summary,
      orphanItems: orphanValidation?.items,
      diagnosticQuotedAndCapped: /"qa_child"/.test(orphanValidation?.diagnosticSql || "")
        && /LIMIT 200/i.test(orphanValidation?.diagnosticSql || ""),
      insertedRows,
      rollbackError,
      rowsAfterRollback,
      hardCapError,
      cancellationMarked: Boolean(cancellationError?.cancelled),
      cancelPreservedBytes
    };
  });

  assert(result.orphanStatus === "blocked-data", "Expected actual worker orphan validation to block the relationship.");
  assert(result.orphanCounts?.fromSide === 1 && result.orphanCounts?.toSide === 1, "Expected one orphan on each relationship side.");
  assert(result.diagnosticQuotedAndCapped, "Expected quoted and capped orphan diagnostic SQL.");
  assert(JSON.stringify(result.insertedRows) === JSON.stringify([[10, "QA 'bound'"], [15, "QA 'bound'"], [20, "QA 'bound'"]]), "Expected bound population values in the actual database.");
  assert(result.rollbackError && result.rowsAfterRollback === 0, "Expected a forced unique constraint failure to leave the target table empty.");
  assert(/1\.000\.000|1000000/.test(result.hardCapError), "Expected the actual worker to reject more than 1,000,000 rows.");
  assert(result.cancellationMarked && result.cancelPreservedBytes, "Expected cancellation to preserve authoritative pre-operation bytes.");
  assert(errors.length === 0, `Browser validation captured errors: ${errors.join(" | ")}`);

  process.stdout.write(`${JSON.stringify({
    executedAt: new Date().toISOString(),
    artifact: baseUrl,
    browser: "chromium",
    ...result,
    errors
  })}\n`);
} finally {
  await browser.close();
}
