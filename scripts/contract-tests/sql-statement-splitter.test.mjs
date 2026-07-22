import assert from "node:assert/strict";
import test from "node:test";
import { splitSqlStatements } from "../../src/core/05-sql-statement-splitter.js";

test("splits statements only at top-level semicolons", () => {
  const statements = splitSqlStatements(`
    select 'a;b' as single_quote;
    select "c;d" as double_quote;
    select \`e;f\` as identifier;
  `);

  assert.deepEqual(Array.from(statements), [
    "select 'a;b' as single_quote",
    'select "c;d" as double_quote',
    "select `e;f` as identifier"
  ]);
});

test("preserves comments without splitting on their semicolons", () => {
  const statements = splitSqlStatements(`
    -- keep ; inside a line comment
    select 1;
    /* keep ; inside a block comment */
    select 'it''s;valid';
  `);

  assert.equal(statements.length, 2);
  assert.match(statements[0], /select 1$/);
  assert.match(statements[1], /select 'it''s;valid'$/);
});

test("drops empty separators and retains a final unterminated statement", () => {
  assert.deepEqual(Array.from(splitSqlStatements(" ; ; select 42 ; ; select 7")), [
    "select 42",
    "select 7"
  ]);
});
