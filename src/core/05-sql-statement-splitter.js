export function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let quote = null;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (lineComment) {
      current += ch;
      if (ch === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      current += ch;
      if (ch === "*" && next === "/") {
        current += next;
        i += 1;
        blockComment = false;
      }
      continue;
    }

    if (quote) {
      current += ch;
      if (ch === quote) {
        if (sql[i + 1] === quote) {
          current += sql[i + 1];
          i += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (ch === "-" && next === "-") {
      current += ch + next;
      i += 1;
      lineComment = true;
      continue;
    }

    if (ch === "/" && next === "*") {
      current += ch + next;
      i += 1;
      blockComment = true;
      continue;
    }

    if (ch === "'" || ch === '"' || ch.charCodeAt(0) === 96) {
      quote = ch;
      current += ch;
      continue;
    }

    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      continue;
    }

    current += ch;
  }

  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);
  return statements;
}
