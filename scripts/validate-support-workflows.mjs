import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const baseUrl = process.env.HSQLITE_BASE_URL || "http://127.0.0.1:4173/";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ locale: "en-US" });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__HSQLITE_TEST__ = true;
    localStorage.setItem("hSQLiteEditorFirstRunDoneV1", "true");
    localStorage.setItem("hSQLiteEditorLocaleV1", "en-US");
  });
  await page.goto(baseUrl);
  await page.waitForFunction(() => document.body.dataset.bootState === "ready");
  await page.evaluate(() => Object.assign(window, window.__HSQLITE_TEST_API__));

  // Real embedded WASM and worker; no fake database or execution stubs.
  assert.equal(await page.evaluate(() => openDbFromBytes("support.db", new Uint8Array())), true);
  async function execute(sql) {
    return page.evaluate(async sql => {
      setEditorValue(sql);
      await executeSql();
      return {
        columns: getGridColumns(),
        rows: getGridAllRows(),
        dirty: isCurrentDbDirty(),
        history: getQueryHistoryState()[0]
      };
    }, sql);
  }
  let result = await execute("create table tickets(id integer primary key, note text); insert into tickets values(1, 'first'); select * from tickets;");
  assert.equal(result.dirty, true);
  assert.equal(result.rows[0].id, 1);
  assert.equal(result.history.databaseName, "support.db");

  page.once("dialog", dialog => dialog.dismiss());
  assert.equal(await page.evaluate(() => openDbFromBytes("discarded.db", new Uint8Array())), false);
  assert.equal(await page.evaluate(() => getCurrentDbFileName()), "support.db");
  await page.evaluate(() => setDbDirty(false));
  result = await execute("select 1 as id, 2 as id, 3 as '__rowKey', 4 as '__proto__', 9223372036854775807 as big_id");
  assert.deepEqual(result.columns, ["id", "id (2)", "__rowKey (2)", "__proto__ (2)", "big_id"]);
  assert.equal(result.rows[0]["id (2)"], 2);
  assert.equal(result.rows[0]["__rowKey (2)"], 3);
  assert.equal(result.rows[0].big_id, "9223372036854775807");
  assert.equal(result.dirty, false);
  result = await execute("with next(id) as (select 2) insert into tickets select id, 'second' from next; select count(*) as total from tickets;");
  assert.equal(result.dirty, true);
  assert.equal(result.rows[0].total, 2);

  result = await execute("create table audit(note); create trigger ticket_audit after insert on tickets begin insert into audit values ('first;entry'); insert into audit values ('second'); end; insert into tickets values (4, 'trigger'); select count(*) as total from audit;");
  assert.equal(result.rows[0].total, 2);
  await assert.rejects(page.evaluate(() => runSqlInWorker("BEGIN; insert into tickets values(5,'rollback')")), /transaction open/);
  result = await execute("BEGIN; insert into tickets values(6,'commit'); COMMIT; select count(*) as total from tickets;");
  assert.equal(result.rows[0].total, 4);

  const largeResultStarted = performance.now();
  result = await execute("with recursive n(x) as (select 1 union all select x+1 from n where x<50000) select x as id from n");
  assert.equal(result.rows.length, 50000);
  assert.ok(await page.locator(".rowCheckbox").count() <= 50, "Large results must render only the current page");
  console.log(`50,000-row execution and first page: ${Math.round(performance.now() - largeResultStarted)} ms`);

  await page.evaluate(() => setDbDirty(false));
  result = await execute("pragma user_version=17");
  assert.equal(result.dirty, true);
  await page.evaluate(() => setDbDirty(false));
  result = await execute("select * from tickets where 0");
  assert.deepEqual(result.columns, ["id", "note"]);
  assert.equal(result.rows.length, 0);

  const failure = await page.evaluate(async () => {
    const previous = getCurrentDbBytes();
    try {
      await runSqlInWorker("insert into tickets values(3,'must not persist'); with recursive n(x) as (select 1 union all select x+1 from n where x<100001) select x from n");
      return { rejected: false };
    } catch (error) {
      return { rejected: true, message: error.message, sameBytes: previous === getCurrentDbBytes() };
    }
  });
  assert.equal(failure.rejected, true);
  assert.equal(failure.sameBytes, true);
  assert.match(failure.message, /safety limit/);
  result = await execute("select count(*) as total from tickets");
  assert.equal(result.rows[0].total, 4);

  const beforeCancellation = await page.evaluate(() => Array.from(getCurrentDbBytes()));
  await page.evaluate(() => {
    setEditorValue("with recursive n(x) as (select 1 union all select x+1 from n where x<1000000000) select sum(x) from n");
    window.pendingExecution = executeSql();
  });
  await page.waitForFunction(() => Boolean(getSqlExecutionRuntime().activeWorker));
  await page.evaluate(async () => { terminateActiveSqlWorker(); await window.pendingExecution; });
  assert.deepEqual(await page.evaluate(() => Array.from(getCurrentDbBytes())), beforeCancellation);
  assert.equal(await page.evaluate(() => isSqlExecutionRunning()), false);
  await assert.rejects(page.evaluate(() => {
    const invalid = new Uint8Array(100);
    invalid.set(new TextEncoder().encode("SQLite format 3\0"));
    return openDbFromBytes("broken.db", invalid);
  }));
  assert.equal(await page.evaluate(() => getCurrentDbFileName()), "support.db");

  const busyOpen = await page.evaluate(async () => {
    let resolveRead;
    const SQL = getSqlRuntime();
    const temp = new SQL.Database();
    temp.run("create table test(id)");
    const bytes = temp.export();
    temp.close();
    const pending = openDbFromFile({ name: "pending.db", arrayBuffer: () => new Promise(resolve => { resolveRead = resolve; }) });
    setRuntimeState({ isSqlRunning: true });
    resolveRead(bytes.buffer);
    const opened = await pending;
    setRuntimeState({ isSqlRunning: false });
    return opened;
  });
  assert.equal(busyOpen, false);

  // Late reads cannot replace a newer choice or a database with an active worker.
  const race = await page.evaluate(async () => {
    let resolveRead;
    const slow = openDbFromFile({ name: "slow.db", size: 0, lastModified: 1, arrayBuffer: () => new Promise(resolve => { resolveRead = resolve; }) });
    const SQL = getSqlRuntime();
    const temporary = new SQL.Database();
    temporary.run("create table fixture(id)");
    const bytes = temporary.export();
    temporary.close();
    await openDbFromBytes("latest.db", bytes);
    resolveRead(bytes.buffer);
    return { slow: await slow, current: getCurrentDbFileName() };
  });
  assert.deepEqual(race, { slow: false, current: "latest.db" });

  await page.evaluate(() => setEditorValue("select 'keep my draft'"));
  await page.locator("#sqlFileInput").setInputFiles([
    { name: "incident.sql", mimeType: "application/sql", buffer: Buffer.from("select 10 as incident") },
    { name: "diagnostic.sql", mimeType: "application/sql", buffer: Buffer.from("select 20 as diagnostic") }
  ]);
  await page.waitForFunction(() => getSqlTabsItems().some(tab => tab.title === "diagnostic.sql"));
  const tabs = await page.evaluate(() => getSqlTabsItems().map(({ title, sql }) => ({ title, sql })));
  assert.ok(tabs.some(tab => tab.sql === "select 'keep my draft'"));
  assert.ok(tabs.some(tab => tab.title === "incident.sql" && tab.sql === "select 10 as incident"));
  assert.ok(tabs.some(tab => tab.title === "diagnostic.sql" && tab.sql === "select 20 as diagnostic"));

  // Quota failures must not suppress dirty state or discard in-memory history.
  await page.evaluate(() => {
    setSessionPersistence(true);
    window.originalStorageSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException("Quota exceeded", "QuotaExceededError"); };
  });
  result = await execute("create table quota_proof(id)");
  assert.equal(result.dirty, true);
  assert.equal(result.history.status, "success");
  await page.evaluate(() => {
    setEditorValue("select 'latest in-memory draft'");
    document.querySelectorAll(".cfg-scope").forEach(input => { input.checked = input.value === "session"; });
  });
  const backupDownload = page.waitForEvent("download");
  await page.evaluate(() => exportSettingsConfig());
  const backupStream = await (await backupDownload).createReadStream();
  const backupChunks = [];
  for await (const chunk of backupStream) backupChunks.push(chunk);
  const backup = JSON.parse(Buffer.concat(backupChunks).toString("utf8"));
  assert.ok(backup.data.session.sqlTabs.tabs.some(tab => tab.sql === "select 'latest in-memory draft'"));
  await page.evaluate(() => { Storage.prototype.setItem = window.originalStorageSet; });

  page.once("dialog", dialog => dialog.accept());
  assert.equal(await page.evaluate(() => openDbFromBytes("confirmed.db", new Uint8Array())), true);
  assert.equal(await page.evaluate(() => isCurrentDbDirty()), false);
  assert.deepEqual(errors, []);
  console.log("Support workflows passed: real SQLite worker, 64-bit IDs, duplicate/empty columns, CTE/PRAGMA dirty state, discard decisions, bounded results, async database opens, batch imports and quota failures.");
} finally {
  await browser.close();
}
