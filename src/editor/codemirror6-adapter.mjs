import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  HighlightStyle,
  bracketMatching,
  indentOnInput,
  syntaxHighlighting,
  syntaxTree
} from "@codemirror/language";
import { SQLite, sql } from "@codemirror/lang-sql";
import { Compartment, EditorState, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection
} from "@codemirror/view";
import { tags } from "@lezer/highlight";

const setSearchHighlightsEffect = StateEffect.define();
const searchHighlightsField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(highlights, transaction) {
    let nextHighlights = highlights.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (effect.is(setSearchHighlightsEffect)) nextHighlights = effect.value;
    }
    return nextHighlights;
  },
  provide: field => EditorView.decorations.from(field)
});

const sqlHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--editor-keyword)", fontWeight: "700" },
  { tag: [tags.name, tags.variableName, tags.propertyName], color: "var(--editor-variable)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--editor-string)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--editor-number)" },
  { tag: [tags.operator, tags.punctuation], color: "var(--editor-operator)", fontWeight: "650" },
  { tag: tags.comment, color: "var(--editor-comment)", fontStyle: "italic" },
  { tag: [tags.typeName, tags.className], color: "var(--editor-type, var(--editor-variable))" }
]);

function createEditorTheme(theme) {
  return EditorView.theme({
    "&": {
      height: "100%",
      minHeight: "100%",
      backgroundColor: "var(--editor-bg)",
      color: "var(--editor-fg)"
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
      lineHeight: "1.45"
    },
    ".cm-content": {
      minHeight: "180px",
      padding: "8px 0",
      caretColor: "var(--editor-cursor)"
    },
    ".cm-line": {
      padding: "0 14px 0 8px"
    },
    ".cm-gutters": {
      backgroundColor: "var(--editor-gutter-bg)",
      color: "var(--editor-line-number)",
      borderRight: "1px solid var(--editor-gutter-border)"
    },
    ".cm-activeLine": {
      backgroundColor: "var(--editor-active-line)"
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--editor-active-line)"
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "var(--editor-selection)"
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--editor-cursor)",
      borderLeftWidth: "2px"
    },
    ".cm-matchingBracket": {
      backgroundColor: "var(--editor-match-bg)",
      color: "var(--editor-variable)",
      outline: "1px solid var(--editor-match-outline)"
    },
    ".sql-search-highlight": {
      backgroundColor: "color-mix(in srgb, var(--info) 24%, transparent)",
      borderRadius: "3px"
    },
    ".sql-search-highlight-active": {
      backgroundColor: "color-mix(in srgb, var(--foreground) 28%, transparent)",
      outline: "1px solid color-mix(in srgb, var(--foreground) 52%, transparent)",
      borderRadius: "3px"
    }
  }, { dark: theme === "dark" });
}

function clampOffset(view, value) {
  return Math.max(0, Math.min(Number(value) || 0, view.state.doc.length));
}

function buildSearchDecorations(ranges, activeIndex, documentLength) {
  const decorations = (Array.isArray(ranges) ? ranges : [])
    .map((range, index) => ({
      from: Math.max(0, Math.min(documentLength, Number(range?.from) || 0)),
      to: Math.max(0, Math.min(documentLength, Number(range?.to) || 0)),
      active: index === activeIndex
    }))
    .filter(range => range.to > range.from)
    .sort((left, right) => left.from - right.from || left.to - right.to)
    .map(range => Decoration.mark({
      class: range.active ? "sql-search-highlight-active" : "sql-search-highlight"
    }).range(range.from, range.to));
  return Decoration.set(decorations, true);
}

function createSqlEditor(options) {
  const textarea = options?.textarea;
  if (!textarea?.parentNode) throw new Error("A mounted SQL textarea is required.");

  const themeCompartment = new Compartment();
  const host = document.createElement("div");
  host.className = "hsqlite-editor-host";
  textarea.parentNode.insertBefore(host, textarea);
  textarea.hidden = true;

  const extensions = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(sqlHighlightStyle),
    bracketMatching(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    sql({ dialect: SQLite }),
    searchHighlightsField,
    themeCompartment.of(createEditorTheme(options.theme || "dark")),
    EditorView.contentAttributes.of({
      "aria-label": String(options.label || "SQL editor"),
      "aria-multiline": "true",
      "aria-autocomplete": "list",
      "aria-controls": "autocomplete queryHistoryPopover",
      "aria-haspopup": "listbox",
      autocapitalize: "off",
      autocomplete: "off",
      spellcheck: "false"
    }),
    EditorView.editorAttributes.of({ class: "hsqlite-sql-editor" }),
    EditorView.updateListener.of(update => {
      if (update.docChanged && typeof options.onChange === "function") options.onChange();
      if (update.selectionSet && typeof options.onCursorActivity === "function") options.onCursorActivity();
    }),
    EditorView.domEventHandlers({
      focus() {
        if (typeof options.onFocus === "function") options.onFocus();
        return false;
      },
      blur() {
        if (typeof options.onBlur === "function") options.onBlur();
        return false;
      },
      keydown(event) {
        return typeof options.onKeydown === "function" && options.onKeydown(event) === true;
      }
    }),
    keymap.of([...defaultKeymap, ...historyKeymap])
  ];

  const view = new EditorView({
    doc: textarea.value,
    extensions,
    parent: host
  });

  return {
    focus() {
      view.focus();
    },
    hasFocus() {
      return view.hasFocus;
    },
    refresh() {
      view.requestMeasure();
    },
    getValue() {
      return view.state.doc.toString();
    },
    setValue(value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: String(value || "") },
        selection: { anchor: 0 }
      });
    },
    getSelection() {
      const selection = view.state.selection.main;
      return view.state.sliceDoc(selection.from, selection.to);
    },
    getCursorIndex() {
      return view.state.selection.main.head;
    },
    setCursor(index) {
      view.dispatch({ selection: { anchor: clampOffset(view, index) } });
    },
    setSelection(from, to) {
      view.dispatch({
        selection: {
          anchor: clampOffset(view, from),
          head: clampOffset(view, to)
        }
      });
    },
    replaceRange(from, to, text) {
      const safeFrom = clampOffset(view, from);
      const safeTo = Math.max(safeFrom, clampOffset(view, to));
      const insert = String(text || "");
      view.dispatch({
        changes: { from: safeFrom, to: safeTo, insert },
        selection: { anchor: safeFrom + insert.length }
      });
    },
    replaceRanges(replacements) {
      const changes = (Array.isArray(replacements) ? replacements : [])
        .map(item => ({
          from: clampOffset(view, item?.from),
          to: clampOffset(view, item?.to),
          insert: String(item?.text || "")
        }))
        .sort((left, right) => left.from - right.from);
      if (changes.length) view.dispatch({ changes });
    },
    scrollIntoView(from, margin = 80) {
      view.dispatch({
        effects: EditorView.scrollIntoView(clampOffset(view, from), {
          y: "center",
          yMargin: Math.max(0, Number(margin) || 0)
        })
      });
    },
    getCursorRect(space = "viewport") {
      const rect = view.coordsAtPos(view.state.selection.main.head) || view.contentDOM.getBoundingClientRect();
      const offsetX = space === "page" ? window.scrollX : 0;
      const offsetY = space === "page" ? window.scrollY : 0;
      return {
        left: rect.left + offsetX,
        right: rect.right + offsetX,
        top: rect.top + offsetY,
        bottom: rect.bottom + offsetY
      };
    },
    getTokenTypeAtCursor() {
      const nodeName = syntaxTree(view.state).resolveInner(view.state.selection.main.head, -1).type.name.toLowerCase();
      if (nodeName.includes("comment")) return "comment";
      if (nodeName.includes("string")) return "string";
      return nodeName;
    },
    setTheme(theme) {
      view.dispatch({
        effects: themeCompartment.reconfigure(createEditorTheme(theme === "light" ? "light" : "dark"))
      });
    },
    setSearchHighlights(ranges, activeIndex = -1) {
      view.dispatch({
        effects: setSearchHighlightsEffect.of(buildSearchDecorations(ranges, activeIndex, view.state.doc.length))
      });
    },
    clearSearchHighlights() {
      view.dispatch({ effects: setSearchHighlightsEffect.of(Decoration.none) });
    },
    getContentElement() {
      return view.contentDOM;
    },
    getDomElement() {
      return view.dom;
    },
    setPopupAccessibility({ activeDescendant = "" } = {}) {
      if (activeDescendant) view.contentDOM.setAttribute("aria-activedescendant", activeDescendant);
      else view.contentDOM.removeAttribute("aria-activedescendant");
    },
    destroy() {
      view.destroy();
      host.remove();
      textarea.hidden = false;
    }
  };
}

window.HSQLiteCodeEditor = Object.freeze({
  engine: "CodeMirror",
  majorVersion: 6,
  createSqlEditor
});
