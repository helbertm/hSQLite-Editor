import { databaseMenu } from "./02-dom-database.js";
import { focusSqlEditor } from "./02b-editor-focus.js";
import { autocomplete, editorMoreActions, sqlTabsOverflowMenu } from "./03-dom-editor-results.js";
import { modalController } from "./05-modal-controller.js";
import { executeSql } from "./10-sql-execution.js";
import { toggleSchemaPanel } from "./13-schema-panel.js";
import { focusTabPresetSelector, toggleSessionPersistence, toggleTheme } from "./15-preferences.js";
import { addSqlTab } from "./23-sql-tabs-state.js";
import { closeSqlTabsOverflowMenu } from "./24-sql-tabs-render.js";
import { closeDatabaseMenu, openDatabasePicker } from "./31-database-session-runtime.js";
import { openQuickQueryHistory } from "./35-editor-quick-history.js";
import { triggerEditorActionShortcut } from "./37-editor-actions.js";
import { openSqlFindPanel } from "./40-sql-find.js";
import { SHORTCUT_ACTIONS } from "../core/08-runtime-config.js";
import { clearSelection, clearSort } from "../ui/20-results-state.js";
import { handleAutocompleteKeys } from "../ui/30-autocomplete.js";

export function normalizeShortcutKey(key) {
  if (!key) return "";
  if (key.length === 1) return key.toUpperCase();
  if (key === "Escape") return "Esc";
  return key;
}

export function parseShortcutCombo(combo) {
  const parts = String(combo || "").split("-");
  const key = normalizeShortcutKey(parts[parts.length - 1]);
  const mods = new Set(parts.slice(0, -1));
  return { key, mods };
}

export function matchShortcutCombo(event, combo) {
  const parsed = parseShortcutCombo(combo);
  const eventKey = normalizeShortcutKey(event.key);
  if (eventKey !== parsed.key) return false;

  const expectedCtrl = parsed.mods.has("Ctrl");
  const expectedCmd = parsed.mods.has("Cmd");
  const expectedShift = parsed.mods.has("Shift");
  const expectedAlt = parsed.mods.has("Alt");

  return (
    Boolean(event.ctrlKey) === expectedCtrl
    && Boolean(event.metaKey) === expectedCmd
    && Boolean(event.shiftKey) === expectedShift
    && Boolean(event.altKey) === expectedAlt
  );
}

export const shortcutRegistry = [
  { id: "schema-toggle", scopes: ["global", "editor"], combos: ["F4"], allowInTextInput: true, run: () => toggleSchemaPanel() },
  { id: "theme-toggle", scopes: ["global", "editor"], combos: ["Shift-F2"], allowInTextInput: true, run: () => toggleTheme() },
  { id: "focus-sql", scopes: ["global", "editor"], combos: ["F2"], allowInTextInput: true, run: () => focusSqlEditor() },
  { id: "open-find", scopes: ["global", "editor"], combos: ["Ctrl-F", "Cmd-F"], allowInTextInput: true, run: () => openSqlFindPanel(false) },
  { id: "open-replace", scopes: ["global", "editor"], combos: ["Ctrl-Shift-L", "Cmd-Shift-L"], allowInTextInput: true, run: () => openSqlFindPanel(true) },
  { id: "run-sql", scopes: ["global", "editor"], combos: ["F5", "Ctrl-Enter", "Cmd-Enter"], allowInTextInput: true, run: () => executeSql() },
  { id: "clear-sort", scopes: ["global", "editor"], combos: ["Shift-F5"], allowInTextInput: true, run: () => clearSort() },
  { id: "open-db", scopes: ["global"], combos: ["F3"], allowInTextInput: true, run: () => openDatabasePicker() },
  { id: "clear-selection", scopes: ["global"], combos: ["Shift-F3"], allowInTextInput: true, run: () => clearSelection() },
  { id: "session-toggle", scopes: ["global"], combos: ["Ctrl-F2", "Cmd-F2"], allowInTextInput: true, run: () => toggleSessionPersistence() },
  { id: "focus-tab-preset", scopes: ["global", "editor"], combos: ["Ctrl-Shift-P", "Cmd-Shift-P"], allowInTextInput: false, run: () => focusTabPresetSelector() },
  { id: "new-tab", scopes: ["global", "editor"], combos: ["Ctrl-T", "Cmd-T"], allowInTextInput: false, run: () => addSqlTab() },
  { id: "quick-history", scopes: ["editor"], combos: ["Ctrl-H", "Cmd-H"], allowInTextInput: true, run: () => openQuickQueryHistory() },
  { id: "open-sql", scopes: ["global", "editor"], combos: SHORTCUT_ACTIONS.openSql, allowInTextInput: false, run: () => triggerEditorActionShortcut("openSql") },
  { id: "open-run-sql", scopes: ["global", "editor"], combos: SHORTCUT_ACTIONS.openRunSql, allowInTextInput: false, run: () => triggerEditorActionShortcut("openRunSql") },
  { id: "save-sql", scopes: ["global", "editor"], combos: SHORTCUT_ACTIONS.save, allowInTextInput: true, run: () => triggerEditorActionShortcut("save") },
  { id: "copy-sql", scopes: ["global", "editor"], combos: [SHORTCUT_ACTIONS.copy], allowInTextInput: true, run: () => triggerEditorActionShortcut("copy") },
  { id: "clear-sql", scopes: ["global", "editor"], combos: [SHORTCUT_ACTIONS.clear], allowInTextInput: true, run: () => triggerEditorActionShortcut("clear") },
  { id: "clear-paste-sql", scopes: ["global", "editor"], combos: [SHORTCUT_ACTIONS.clearPaste], allowInTextInput: true, run: () => triggerEditorActionShortcut("clearPaste") },
  { id: "export-csv", scopes: ["global", "editor"], combos: [SHORTCUT_ACTIONS.csv], allowInTextInput: true, run: () => triggerEditorActionShortcut("csv") },
  { id: "export-json", scopes: ["global", "editor"], combos: [SHORTCUT_ACTIONS.json], allowInTextInput: true, run: () => triggerEditorActionShortcut("json") }
];

export function validateShortcutRegistryConflicts() {
  const seen = new Map();
  for (const entry of shortcutRegistry) {
    for (const scope of entry.scopes) {
      for (const combo of entry.combos) {
        const key = `${scope}:${combo}`;
        if (seen.has(key)) {
          console.warn("Conflito de atalho detectado:", key, "entre", seen.get(key), "e", entry.id);
        } else {
          seen.set(key, entry.id);
        }
      }
    }
  }
}

export function findShortcutMatch(scope, event) {
  return shortcutRegistry.find((entry) => {
    if (!entry.scopes.includes(scope)) return false;
    return entry.combos.some((combo) => matchShortcutCombo(event, combo));
  }) || null;
}

export function handleGlobalKeyboardShortcut(event) {
  if (modalController.activeModal) {
    return false;
  }
  if (event.key === "Escape") {
    if (editorMoreActions && editorMoreActions.open) {
      event.preventDefault();
      closeEditorMoreActions();
      return true;
    }
    if (databaseMenu && databaseMenu.open) {
      event.preventDefault();
      closeDatabaseMenu();
      return true;
    }
  }

  const typingTarget = event.target && (
    event.target.closest("input, textarea, select, [contenteditable='true']")
    || event.target.closest(".cm-editor")
  );
  const matchedShortcut = findShortcutMatch("global", event);
  if (typingTarget && (!matchedShortcut || !matchedShortcut.allowInTextInput)) {
    return false;
  }

  if (matchedShortcut) {
    event.preventDefault();
    matchedShortcut.run(event);
    return true;
  }

  if (autocomplete.style.display === "block") {
    handleAutocompleteKeys(event);
    return true;
  }
  return false;
}

export function initKeyboardController() {
  document.addEventListener("keydown", handleGlobalKeyboardShortcut);
}

export function closeEditorMoreActions() {
  if (editorMoreActions) editorMoreActions.open = false;
}

export function bindEditorMoreActions() {
  if (!editorMoreActions) return;
  editorMoreActions.addEventListener("toggle", () => {
    if (!editorMoreActions.open) return;
    const firstAction = editorMoreActions.querySelector(".editor-more-menu .ui-button");
    if (firstAction && typeof firstAction.focus === "function") firstAction.focus();
  });

  document.addEventListener("click", (event) => {
    if (!editorMoreActions.open) return;
    if (!editorMoreActions.contains(event.target)) closeEditorMoreActions();
  });

  editorMoreActions.querySelectorAll(".editor-more-menu .ui-button").forEach((button) => {
    button.addEventListener("click", () => closeEditorMoreActions());
  });
}

export function bindDatabaseMenuActions() {
  if (!databaseMenu) return;
  databaseMenu.addEventListener("toggle", () => {
    if (!databaseMenu.open) return;
    const firstAction = databaseMenu.querySelector(".db-menu-list .ui-button");
    if (firstAction && typeof firstAction.focus === "function") firstAction.focus();
  });

  document.addEventListener("click", (event) => {
    if (!databaseMenu.open) return;
    if (!databaseMenu.contains(event.target)) closeDatabaseMenu();
  });
}

export function bindSqlTabsShellActions() {
  if (sqlTabsOverflowMenu) {
    sqlTabsOverflowMenu.addEventListener("toggle", () => {
      if (!sqlTabsOverflowMenu.open) return;
      const firstAction = sqlTabsOverflowMenu.querySelector(".sql-tabs-overflow-menu .ui-button");
      if (firstAction && typeof firstAction.focus === "function") firstAction.focus();
    });
  }

  document.addEventListener("click", (event) => {
    if (sqlTabsOverflowMenu?.open && !sqlTabsOverflowMenu.contains(event.target)) closeSqlTabsOverflowMenu();
  });
}

export function initShortcutRegistry() {
  validateShortcutRegistryConflicts();
}
