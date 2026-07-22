import { schemaCollapseBtn, schemaToggleRail } from "./01-dom-layout-schema.js";
import { clearPasteSqlBtn, clearSqlBtn, closeAllTabsBtn, copySqlBtn, newSqlTabBtn, openRunSqlBtn, openSqlBtn, sqlFileInput, sqlTabsEl } from "./03-dom-editor-results.js";
import { t } from "./03-localization.js";
import { firstRunContinueBtn, firstRunTabNamePresetSelect, sessionToggle, tabNamePresetSelect, themeToggle } from "./05-dom-library-settings.js";
import { setStatus } from "./12-shell-status.js";
import { toggleSchemaPanel } from "./13-schema-panel.js";
import { applyFirstRunPreferences, handleThemeSwitchClick, previewFirstRunTheme, toggleSessionPersistence } from "./15-preferences.js";
import { setTabNamePresetPreference } from "./22a-sql-tab-presets.js";
import { addSqlTab, closeAllSqlTabs } from "./23-sql-tabs-state.js";
import { updateSqlTabsOverflow } from "./24-sql-tabs-render.js";
import { bindDatabaseMenuActions, bindEditorMoreActions, bindSqlTabsShellActions, initKeyboardController } from "./25-shell-shortcuts.js";
import { loadSqlFile, openSqlFilePicker } from "./36-editor-file-workflow.js";
import { clearAndPasteSql, clearSqlEditor, copyFullSql } from "./37-editor-actions.js";
import { updateOfflineMode } from "./02a-offline-mode.js";

export function bindShellBootstrapUi() {
  window.addEventListener("online", updateOfflineMode);
  window.addEventListener("offline", updateOfflineMode);
  updateOfflineMode();

  firstRunContinueBtn.addEventListener("click", applyFirstRunPreferences);
  document.querySelectorAll('input[name="firstRunTheme"]').forEach(input => {
    input.addEventListener("change", previewFirstRunTheme);
  });
  if (tabNamePresetSelect) {
    tabNamePresetSelect.addEventListener("change", () => {
      setTabNamePresetPreference(tabNamePresetSelect.value);
      setStatus(t("tabs.presetUpdated"), "ok");
    });
  }
  if (firstRunTabNamePresetSelect) {
    firstRunTabNamePresetSelect.addEventListener("change", () => {
      setTabNamePresetPreference(firstRunTabNamePresetSelect.value);
    });
  }
  sessionToggle.addEventListener("click", toggleSessionPersistence);
  themeToggle.addEventListener("click", handleThemeSwitchClick);

  initKeyboardController();
  bindEditorMoreActions();
  bindDatabaseMenuActions();
  bindSqlTabsShellActions();

  schemaCollapseBtn.addEventListener("click", toggleSchemaPanel);
  schemaToggleRail.addEventListener("click", toggleSchemaPanel);

  newSqlTabBtn.addEventListener("click", addSqlTab);
  sqlTabsEl.addEventListener("scroll", updateSqlTabsOverflow, { passive: true });
  window.addEventListener("resize", updateSqlTabsOverflow);
  openSqlBtn.addEventListener("click", () => openSqlFilePicker(false));
  openRunSqlBtn.addEventListener("click", () => openSqlFilePicker(true));
  sqlFileInput.addEventListener("change", (event) => {
    loadSqlFile(event.target.files && event.target.files[0]);
  });
  copySqlBtn.addEventListener("click", copyFullSql);
  clearSqlBtn.addEventListener("click", clearSqlEditor);
  if (closeAllTabsBtn) closeAllTabsBtn.addEventListener("click", closeAllSqlTabs);
  clearPasteSqlBtn.addEventListener("click", clearAndPasteSql);
}
