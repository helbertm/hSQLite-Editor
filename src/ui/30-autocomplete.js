import { autocomplete, cmEditor } from "../capabilities/03-dom-editor-results.js";
import { sqlEscapeIdent } from "../core/07-sql-escaping.js";
import { hasActiveDatabase } from "../capabilities/07-database-runtime.js";
import { getEditorCursorIndex, getEditorValue, replaceEditorRange } from "../capabilities/32a-editor-api.js";
import { HSQLITE_DEBUG_FLAG, debugLog } from "../core/08-runtime-config.js";
import { getSchemaObjects } from "../core/14-state-database-schema.js";
import { escapeHtml } from "./00-helpers.js";

export function getCurrentTokenContext() {
    const pos = getEditorCursorIndex();
    const value = getEditorValue();
    const currentStatement = getCurrentStatementPrefix(value, pos);
    const tokenMatch = currentStatement.match(/([A-Za-z_][A-Za-z0-9_]*\.)?([A-Za-z_][A-Za-z0-9_]*)?$/);
    const token = tokenMatch ? tokenMatch[0] : "";

    let cmTokenType = "";
    if (cmEditor) {
      cmTokenType = cmEditor.getTokenTypeAtCursor();
    }

    const tableDot = token.match(/^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)?$/);
    const tableKeywordMatch = currentStatement.match(/\b(from|join|update|into)\s+([A-Za-z_][A-Za-z0-9_]*)?$/i);

    return {
      pos,
      token,
      currentStatement,
      tableDot,
      tableKeywordMatch,
      cmTokenType,
      aliasMap: buildAliasMap(currentStatement)
    };
  }

  export function getCurrentStatementPrefix(sql, cursorIndex) {
    let quote = null;
    let lineComment = false;
    let blockComment = false;
    let lastSemicolon = -1;

    for (let i = 0; i < cursorIndex; i++) {
      const ch = sql[i];
      const next = sql[i + 1];

      if (lineComment) {
        if (ch === "\n") lineComment = false;
        continue;
      }

      if (blockComment) {
        if (ch === "*" && next === "/") {
          i++;
          blockComment = false;
        }
        continue;
      }

      if (quote) {
        if (ch === quote) {
          if (sql[i + 1] === quote) i++;
          else quote = null;
        }
        continue;
      }

      if (ch === "-" && next === "-") {
        i++;
        lineComment = true;
        continue;
      }

      if (ch === "/" && next === "*") {
        i++;
        blockComment = true;
        continue;
      }

      if (ch === "'" || ch === '"' || ch === "`") {
        quote = ch;
        continue;
      }

      if (ch === ";") lastSemicolon = i;
    }

    return sql.slice(lastSemicolon + 1, cursorIndex);
  }

  export function buildAliasMap(statement) {
    const map = {};
    const reserved = new Set([
      "where", "on", "join", "left", "right", "inner", "outer", "full", "cross",
      "group", "order", "limit", "offset", "having", "union", "except", "intersect",
      "as", "and", "or", "using"
    ]);

    const regex = /\b(from|join|update|into)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(?:as\s+)?([A-Za-z_][A-Za-z0-9_]*))?/gi;
    let match;

    while ((match = regex.exec(statement)) !== null) {
      const tableName = resolveSchemaName(match[2]);
      const alias = match[3] ? match[3].toLowerCase() : "";
      if (tableName) {
        map[match[2].toLowerCase()] = tableName;
        if (alias && !reserved.has(alias)) map[alias] = tableName;
      }
    }

    return map;
  }

  export function resolveSchemaName(nameOrAlias, aliasMap = null) {
    if (!nameOrAlias) return null;
    const lowered = nameOrAlias.toLowerCase();
    const schemaObjects = getSchemaObjects();

    if (aliasMap && aliasMap[lowered]) return aliasMap[lowered];

    return Object.keys(schemaObjects).find(k => k.toLowerCase() === lowered) || null;
  }

  export function updateAutocomplete(force = false) {
    const debugAutocomplete = window[HSQLITE_DEBUG_FLAG] === true;
    const schemaObjects = getSchemaObjects();

    if (!hasActiveDatabase() || !Object.keys(schemaObjects).length) {
      if (debugAutocomplete || force) {
        debugLog("autocomplete skipped: db/schema not ready", {
          hasDb: hasActiveDatabase(),
          schemaObjects: Object.keys(schemaObjects).length
        });
      }
      hideAutocomplete();
      return;
    }

    const ctx = getCurrentTokenContext();

    if (debugAutocomplete || force) {
      debugLog("autocomplete context", {
        token: ctx.token,
        tableDot: ctx.tableDot ? Array.from(ctx.tableDot) : null,
        tableKeywordMatch: ctx.tableKeywordMatch ? Array.from(ctx.tableKeywordMatch) : null,
        cmTokenType: ctx.cmTokenType,
        aliasMap: ctx.aliasMap,
        cursor: ctx.pos
      });
    }

    if (ctx.cmTokenType && (ctx.cmTokenType.includes("comment") || ctx.cmTokenType.includes("string"))) {
      hideAutocomplete();
      return;
    }

    let suggestions = [];
    let replaceFrom = ctx.pos - (ctx.token?.length || 0);
    let replaceTo = ctx.pos;

    if (ctx.tableDot) {
      const typedEntity = ctx.tableDot[1];
      const prefix = (ctx.tableDot[2] || "").toLowerCase();
      const realTableName = resolveSchemaName(typedEntity, ctx.aliasMap);

      if (!realTableName) {
        if (debugAutocomplete || force) {
          debugLog("autocomplete: table/alias not resolved", {
            typedEntity,
            schemaObjects: Object.keys(schemaObjects).slice(0, 20),
            aliasMap: ctx.aliasMap
          });
        }
        hideAutocomplete();
        return;
      }

      const meta = schemaObjects[realTableName];
      replaceFrom = ctx.pos - ctx.token.length;

      suggestions = meta.fields
        .filter(f => !prefix || f.name.toLowerCase().includes(prefix))
        .slice(0, 100)
        .map(f => ({
          value: `${sqlEscapeIdent(typedEntity)}.${sqlEscapeIdent(f.name)}`,
          label: `${typedEntity}.${f.name}`,
          type: f.type || "column",
          replaceFrom
        }));
    } else if (ctx.tableKeywordMatch) {
      const tablePart = ctx.tableKeywordMatch[2] || "";
      const prefix = tablePart.toLowerCase();
      replaceFrom = ctx.pos - tablePart.length;

      suggestions = Object.entries(schemaObjects)
        .filter(([name]) => !prefix || name.toLowerCase().includes(prefix))
        .slice(0, 100)
        .map(([name, meta]) => ({
          value: sqlEscapeIdent(name),
          label: name,
          type: meta.type,
          replaceFrom
        }));
    } else {
      hideAutocomplete();
      return;
    }

    if (debugAutocomplete || force) {
      debugLog("autocomplete suggestions", {
        count: suggestions.length,
        firstSuggestions: suggestions.slice(0, 10)
      });
    }

    renderAutocomplete(suggestions, replaceTo);
  }

  export function renderAutocomplete(suggestions, replaceTo) {
    if (window[HSQLITE_DEBUG_FLAG] === true) {
      debugLog("renderAutocomplete", {
        count: suggestions.length,
        replaceTo
      });
    }

    if (!suggestions.length) {
      hideAutocomplete();
      return;
    }

    autocomplete.innerHTML = "";
    suggestions.forEach((s, i) => {
      const div = document.createElement("div");
      div.className = "suggestion" + (i === 0 ? " active" : "");
      div.id = `sql-autocomplete-option-${i}`;
      div.setAttribute("role", "option");
      div.setAttribute("aria-selected", i === 0 ? "true" : "false");
      div.dataset.value = s.value;
      div.dataset.replaceFrom = s.replaceFrom;
      div.dataset.replaceTo = replaceTo;
      div.innerHTML = `<span>${escapeHtml(s.label)}</span><small>${escapeHtml(s.type)}</small>`;
      div.addEventListener("mousedown", (e) => {
        e.preventDefault();
        applySuggestion(div);
      });
      autocomplete.appendChild(div);
    });

    const wrap = document.querySelector(".editor-wrap");
    const wrapRect = wrap.getBoundingClientRect();

    if (cmEditor) {
      const cursorCoords = cmEditor.getCursorRect("viewport");
      const left = Math.max(8, Math.min(cursorCoords.left - wrapRect.left, Math.max(8, wrapRect.width - 320)));
      const top = Math.max(42, cursorCoords.bottom - wrapRect.top + 6);
      autocomplete.style.left = `${left}px`;
      autocomplete.style.top = `${top}px`;
    } else {
      autocomplete.style.left = "16px";
      autocomplete.style.top = "48px";
    }

    autocomplete.style.display = "block";
    setAutocompleteActiveOption(autocomplete.querySelector(".suggestion.active"));
  }

  export function handleAutocompleteKeys(event) {
    const items = Array.from(autocomplete.querySelectorAll(".suggestion"));
    if (!items.length) return;

    let idx = items.findIndex(el => el.classList.contains("active"));
    if (idx < 0) idx = 0;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[idx].classList.remove("active");
      idx = (idx + 1) % items.length;
      items[idx].classList.add("active");
      items[idx].scrollIntoView({ block: "nearest" });
      setAutocompleteActiveOption(items[idx]);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[idx].classList.remove("active");
      idx = (idx - 1 + items.length) % items.length;
      items[idx].classList.add("active");
      items[idx].scrollIntoView({ block: "nearest" });
      setAutocompleteActiveOption(items[idx]);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      applySuggestion(items[idx]);
    } else if (event.key === "Escape") {
      hideAutocomplete();
    }
  }

  export function applySuggestion(el) {
    const value = el.dataset.value;
    const from = Number(el.dataset.replaceFrom);
    const to = Number(el.dataset.replaceTo);
    replaceEditorRange(from, to, value);
    hideAutocomplete();
  }
  export function setAutocompleteActiveOption(activeOption) {
    autocomplete.querySelectorAll("[role=option]").forEach(option => {
      option.classList.toggle("active", option === activeOption);
      option.setAttribute("aria-selected", option === activeOption ? "true" : "false");
    });
    if (cmEditor) {
      cmEditor.setPopupAccessibility({
        activeDescendant: activeOption?.id || ""
      });
    }
  }

  export function hideAutocomplete() {
    autocomplete.style.display = "none";
    if (cmEditor) cmEditor.setPopupAccessibility();
  }
