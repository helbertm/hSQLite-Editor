import { EMBEDDED_SQLJS_WASM_DATA_URL, EMBEDDED_SQLJS_WORKER_SOURCE, EMBEDDED_SQL_WORKER_SHARED_SOURCE } from "../core/08-runtime-config.js";

export function createEmbeddedSqlWorker() {
  const workerCode = `
    let SQL = null;
    const SQL_WASM_DATA_URL = ${JSON.stringify(EMBEDDED_SQLJS_WASM_DATA_URL)};
    const SQL_WORKER_PROTOCOL_VERSION = 1;
    const TABLE_POPULATION_MAX_ROWS = 1000000;
    const TABLE_POPULATION_MAX_TEXT_LENGTH = 256;
    ${EMBEDDED_SQLJS_WORKER_SOURCE}
    ${EMBEDDED_SQL_WORKER_SHARED_SOURCE}

    function quoteIdent(identifier) {
      return '"' + String(identifier || "").replace(/"/g, '""') + '"';
    }

    function postWorkerEvent(action, requestId, type, eventName, payload = {}, transfer = []) {
      self.postMessage({
        protocolVersion: SQL_WORKER_PROTOCOL_VERSION,
        requestId,
        action,
        type,
        event: eventName,
        ...payload
      }, transfer);
    }

    function workerError(code, variables = {}) {
      const error = new Error(code);
      error.errorCode = code;
      error.errorVariables = variables;
      return error;
    }

    function readSingleNumber(db, sql) {
      const result = db.exec(sql);
      if (!result.length || !result[0].values.length || !result[0].values[0].length) return 0;
      return Number(result[0].values[0][0] || 0);
    }

    function buildDistinctOrphanCountSql(fromTable, fromColumn, toTable, toColumn) {
      const fromTableSql = quoteIdent(fromTable);
      const fromColumnSql = quoteIdent(fromColumn);
      const toTableSql = quoteIdent(toTable);
      const toColumnSql = quoteIdent(toColumn);
      return [
        "SELECT COUNT(*)",
        "FROM (",
        "  SELECT DISTINCT src." + fromColumnSql + " AS orphan_value",
        "  FROM " + fromTableSql + " AS src",
        "  LEFT JOIN " + toTableSql + " AS ref ON src." + fromColumnSql + " = ref." + toColumnSql,
        "  WHERE src." + fromColumnSql + " IS NOT NULL",
        "    AND ref." + toColumnSql + " IS NULL",
        ")"
      ].join("\\n");
    }

    function tableExists(db, tableName) {
      const statement = db.prepare("SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = ? LIMIT 1");
      try {
        statement.bind([tableName]);
        return statement.step();
      } finally {
        statement.free();
      }
    }

    function readTableColumns(db, tableName) {
      const result = db.exec("PRAGMA table_xinfo(" + quoteIdent(tableName) + ")");
      if (!result.length) return [];
      return result[0].values.map((row) => ({
        name: String(row[1] || ""),
        type: String(row[2] || ""),
        notnull: Boolean(row[3]),
        defaultValue: row[4],
        pk: Boolean(row[5]),
        hidden: Number(row[6] || 0)
      }));
    }

    function normalizePopulationPlan(db, rawPlan) {
      const table = String(rawPlan?.table || "");
      const rowCount = Number(rawPlan?.rowCount || 0);
      if (!table || !tableExists(db, table)) throw workerError("populationTableMissing");
      if (!Number.isInteger(rowCount) || rowCount < 1 || rowCount > TABLE_POPULATION_MAX_ROWS) {
        throw workerError("populationCountRange");
      }

      const schemaColumns = readTableColumns(db, table);
      const schemaByName = new Map(schemaColumns.map((column) => [column.name, column]));
      const seenNames = new Set();
      const columns = [];
      for (const rawColumn of Array.isArray(rawPlan?.columns) ? rawPlan.columns : []) {
        const name = String(rawColumn?.name || "");
        const strategy = String(rawColumn?.strategy || "omit");
        if (!name || seenNames.has(name)) throw workerError("populationInvalidColumns");
        seenNames.add(name);
        const schemaColumn = schemaByName.get(name);
        if (!schemaColumn) throw workerError("populationColumnMissing", { name });
        if (schemaColumn.hidden !== 0 && strategy !== "omit") {
          throw workerError("populationGeneratedColumn", { name });
        }
        if (strategy === "omit") continue;
        columns.push({ ...rawColumn, name, strategy, schema: schemaColumn });
      }

      return {
        table,
        rowCount,
        batchSize: Math.max(100, Math.min(5000, Number(rawPlan?.batchSize || 1000))),
        columns
      };
    }

    const loremWords = ["lorem", "ipsum", "dolor", "sit", "amet", "integer", "porta", "massa", "nunc", "vitae", "semper", "erat"];

    function randomText(length) {
      const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let output = "";
      for (let index = 0; index < length; index += 1) {
        output += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      return output;
    }

    function loremText(wordCount) {
      const words = [];
      for (let index = 0; index < wordCount; index += 1) {
        words.push(loremWords[index % loremWords.length]);
      }
      return words.join(" ").slice(0, TABLE_POPULATION_MAX_TEXT_LENGTH);
    }

    function buildPopulationValue(column, rowIndex) {
      switch (column.strategy) {
        case "null":
          return null;
        case "fixed-number": {
          const value = Number(column.value);
          if (!Number.isFinite(value)) throw workerError("populationInvalidFixedNumber", { name: column.name });
          return value;
        }
        case "increment": {
          const start = Number(column.start);
          const step = Number(column.step);
          if (!Number.isFinite(start)) throw workerError("populationInvalidIncrementStart", { name: column.name });
          if (!Number.isFinite(step)) throw workerError("populationInvalidIncrementStep", { name: column.name });
          return start + rowIndex * step;
        }
        case "random-number": {
          const min = Number(column.min);
          const max = Number(column.max);
          if (!Number.isFinite(min)) throw workerError("populationInvalidMinimum", { name: column.name });
          if (!Number.isFinite(max)) throw workerError("populationInvalidMaximum", { name: column.name });
          if (max < min) throw workerError("populationColumnRange", { name: column.name });
          const value = min + Math.random() * (max - min);
          return column.integer ? Math.floor(value) : value;
        }
        case "fixed-text":
          return String(column.value || "").slice(0, TABLE_POPULATION_MAX_TEXT_LENGTH);
        case "random-text": {
          const length = Math.max(1, Math.min(TABLE_POPULATION_MAX_TEXT_LENGTH, Number(column.length || 12)));
          return randomText(length);
        }
        case "lorem-text": {
          const words = Math.max(1, Math.min(40, Number(column.words || 8)));
          return loremText(words);
        }
        default:
          throw workerError("populationStrategyUnsupported", { name: column.name });
      }
    }

    function executePopulation(db, rawPlan, action, requestId) {
      const plan = normalizePopulationPlan(db, rawPlan);
      const quotedTable = quoteIdent(plan.table);
      const columnNames = plan.columns.map((column) => quoteIdent(column.name));
      const insertSql = columnNames.length
        ? "INSERT INTO " + quotedTable + " (" + columnNames.join(", ") + ") VALUES (" + columnNames.map(() => "?").join(", ") + ")"
        : "INSERT INTO " + quotedTable + " DEFAULT VALUES";
      const statement = db.prepare(insertSql);
      const startedAt = performance.now();
      let transactionOpen = false;

      try {
        db.run("PRAGMA foreign_keys = ON");
        db.run("BEGIN IMMEDIATE");
        transactionOpen = true;
        for (let rowIndex = 0; rowIndex < plan.rowCount; rowIndex += 1) {
          if (plan.columns.length) {
            statement.bind(plan.columns.map((column) => buildPopulationValue(column, rowIndex)));
            statement.step();
            statement.reset();
          } else {
            statement.step();
            statement.reset();
          }

          const completed = rowIndex + 1;
          if (completed % plan.batchSize === 0 || completed === plan.rowCount) {
            postWorkerEvent(action, requestId, "population-progress", "progress", {
              completed,
              total: plan.rowCount
            });
          }
        }
        db.run("COMMIT");
        transactionOpen = false;
        statement.free();
        const exportedBytes = db.export();
        db.close();
        postWorkerEvent(action, requestId, "population-done", "done", {
          ok: true,
          elapsed: Math.round(performance.now() - startedAt),
          insertedCount: plan.rowCount,
          table: plan.table,
          dbBytes: exportedBytes.buffer
        }, [exportedBytes.buffer]);
      } catch (error) {
        if (transactionOpen) {
          try { db.run("ROLLBACK"); } catch {}
        }
        try { statement.free(); } catch {}
        try { db.close(); } catch {}
        throw error;
      }
    }

    self.onmessage = async (event) => {
      const message = event.data || {};
      const action = String(message.action || message.type || "");
      const requestId = String(message.requestId || "");
      const payload = message.payload || {};
      const sql = String(payload.sql ?? message.sql ?? "");
      const edge = payload.edge || message.edge || null;
      const population = payload.population || message.population || null;
      const dbBytes = message.dbBytes;
      if (!["execute", "validate-virtual-fk", "populate-table"].includes(action)) return;

      try {
        if (!SQL) {
          SQL = await initSqlJs({
            locateFile: () => SQL_WASM_DATA_URL
          });
        }

        const db = new SQL.Database(new Uint8Array(dbBytes));
        if (action === "validate-virtual-fk") {
          try {
            const fromTable = String(edge?.fromTable || "");
            const fromColumn = String(edge?.fromColumn || "");
            const toTable = String(edge?.toTable || "");
            const toColumn = String(edge?.toColumn || "");
            const fromSide = readSingleNumber(db, buildDistinctOrphanCountSql(fromTable, fromColumn, toTable, toColumn));
            const toSide = readSingleNumber(db, buildDistinctOrphanCountSql(toTable, toColumn, fromTable, fromColumn));
            db.close();
            postWorkerEvent(action, requestId, "virtual-fk-validation", "done", {
              ok: true,
              status: fromSide > 0 || toSide > 0 ? "blocked-data" : "allowed",
              orphanCounts: { fromSide, toSide }
            });
            return;
          } catch (validationError) {
            try { db.close(); } catch {}
            postWorkerEvent(action, requestId, "virtual-fk-validation", "done", {
              ok: true,
              status: "blocked-schema",
              summaryCode: "validationSchemaFailed",
              itemCodes: [{
                code: validationError?.errorCode || "sqliteError",
                variables: validationError?.errorVariables || { reason: validationError?.message || String(validationError || "") }
              }]
            });
            return;
          }
        }

        if (action === "populate-table") {
          executePopulation(db, population, action, requestId);
          return;
        }

        const statements = splitSqlStatements(sql);
        if (!statements.length) {
          postWorkerEvent(action, requestId, "error", "error", { ok: false, errorCode: "noValidSql", errorVariables: {} });
          db.close();
          return;
        }

        const resultSets = [];
        const startedAt = performance.now();
        for (let statementIndex = 0; statementIndex < statements.length; statementIndex += 1) {
          const statement = statements[statementIndex];
          postWorkerEvent(action, requestId, "statement-start", "progress", {
            ok: true,
            statementIndex,
            totalStatements: statements.length,
            statement
          });
          const results = db.exec(statement);
          if (!results.length) {
            resultSets.push({ statement, statementIndex, columns: [], values: [], messageCode: "noResultSet" });
            continue;
          }
          const result = results[0];
          resultSets.push({
            statement,
            statementIndex,
            columns: result.columns || [],
            values: result.values || [],
            message: ""
          });
        }

        const exportedBytes = db.export();
        db.close();
        postWorkerEvent(action, requestId, "done", "done", {
          ok: true,
          elapsed: Math.round(performance.now() - startedAt),
          resultSets,
          dbBytes: exportedBytes.buffer
        }, [exportedBytes.buffer]);
      } catch (err) {
        postWorkerEvent(action, requestId, "error", "error", {
          ok: false,
          errorCode: err?.errorCode || "sqliteError",
          errorVariables: err?.errorVariables || { reason: err?.message || String(err) },
          stack: err && err.stack ? err.stack : ""
        });
      }
    };
  `;

  const workerBlob = new Blob([workerCode], { type: "application/javascript" });
  const workerUrl = URL.createObjectURL(workerBlob);
  const worker = new Worker(workerUrl);
  worker._objectUrl = workerUrl;
  return worker;
}

export function disposeEmbeddedSqlWorker(worker) {
  if (!worker) return;
  worker.terminate();
  if (worker._objectUrl) URL.revokeObjectURL(worker._objectUrl);
}
