import { ensureEditorRuntimeLoaded } from "./02-runtime-loaders.js";
import { autocomplete, cmEditor, setCmEditor, sqlEditor, sqlFindPanel } from "./03-dom-editor-results.js";
import { t } from "./03-localization.js";
import { setStatus } from "./12-shell-status.js";
import { saveSqlTabsToStorage } from "./22-sql-tabs-storage.js";
import { findShortcutMatch } from "./25-shell-shortcuts.js";
import { configureEditorApiEffects, getEditorValue } from "./32a-editor-api.js";
import { closeQuickQueryHistory, handleQuickHistoryKey, isQuickQueryHistoryOpen, positionQuickHistoryPopover } from "./35-editor-quick-history.js";
import { refreshSqlFindMatches } from "./40-sql-find.js";
import { APP_LOG_PREFIX, debugLog } from "../core/08-runtime-config.js";
import { findSqlTabById, getActiveSqlTabId, isSqlTabSwitching, updateTabState } from "../core/11-state-tabs.js";
import { handleAutocompleteKeys, hideAutocomplete, updateAutocomplete } from "../ui/30-autocomplete.js";

export async function initSqlEditor() {
  configureEditorApiEffects({ onEditorValueSet: () => updateAutocomplete(false) });
  debugLog("initSqlEditor called", {
    editorRuntimeLoaded: Boolean(window.HSQLiteCodeEditor),
    sqlEditorFound: Boolean(sqlEditor),
    currentTheme: document.documentElement.dataset.theme || "dark"
  });
  if (!window.HSQLiteCodeEditor) {
    const loaded = await ensureEditorRuntimeLoaded();
    if (loaded) return initSqlEditor();
    console.error(`${APP_LOG_PREFIX} editor-runtime-unavailable`);
    setStatus(t("editor.runtimeFallback"), "warn");
    return;
  }
  setCmEditor(window.HSQLiteCodeEditor.createSqlEditor({
    textarea: sqlEditor,
    label: t("editor.ariaLabel"),
    theme: document.documentElement.dataset.theme || "dark",
    onKeydown: handleEditorRuntimeKeydown,
    onChange: handleEditorRuntimeChange,
    onCursorActivity: handleEditorCursorActivity,
    onFocus: () => updateAutocomplete(false),
    onBlur: () => setTimeout(() => {
      if (cmEditor?.hasFocus()) return;
      hideAutocomplete();
      closeQuickQueryHistory();
    }, 180)
  }));
  setTimeout(() => cmEditor.refresh(), 0);
  debugLog("editor-runtime-ready", {
    engine: window.HSQLiteCodeEditor.engine,
    majorVersion: window.HSQLiteCodeEditor.majorVersion,
    theme: document.documentElement.dataset.theme || "dark",
    initialLength: cmEditor.getValue().length
  });
}

export function handleEditorRuntimeKeydown(event) {
  const key = event.key;
  if ((event.ctrlKey || event.metaKey) && !event.altKey && key === " ") {
    event.preventDefault();
    event.stopPropagation();
    updateAutocomplete(true);
    return true;
  }
  if (["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(key)) {
    if (handleQuickHistoryKey(key)) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    if (autocomplete.style.display === "block") {
      event.stopPropagation();
      handleAutocompleteKeys(event);
      return true;
    }
  }
  const matchedShortcut = findShortcutMatch("editor", event);
  if (!matchedShortcut) return false;
  event.preventDefault();
  event.stopPropagation();
  matchedShortcut.run(event);
  return true;
}

export function handleEditorRuntimeChange() {
  if (!isSqlTabSwitching()) {
    const tab = findSqlTabById(getActiveSqlTabId());
    if (tab) {
      updateTabState(tab.id, { sql: getEditorValue() });
      saveSqlTabsToStorage();
    }
  }
  closeQuickQueryHistory();
  if (sqlFindPanel.classList.contains("open")) refreshSqlFindMatches(true);
  updateAutocomplete(false);
}

export function handleEditorCursorActivity() {
  if (isQuickQueryHistoryOpen()) positionQuickHistoryPopover();
  updateAutocomplete(false);
}
