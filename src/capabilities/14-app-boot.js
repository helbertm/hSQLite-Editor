import { bootRetryBtn, bootScreen, bootScreenActions, bootScreenMessage, bootScreenTitle, bootStateBadge, bootStateLabel } from "./00-dom-base.js";
import { runBtn } from "./03-dom-editor-results.js";
import { initLocalization, t } from "./03-localization.js";
import { bindPersistentResultHorizontalScrollbar, bindResultTableHorizontalWheel } from "./05c-result-scrollbar.js";
import { evaluateReleaseNotesUpdate, loadReleaseMetadataFromRepoFiles } from "./10-release-metadata.js";
import { setShellAvailability, setStatus } from "./12-shell-status.js";
import { initSchemaPanelState } from "./13-schema-panel.js";
import { initTheme, loadSessionPersistenceSetting, openFirstRunModalIfNeeded } from "./15-preferences.js";
import { loadQueryHistoryFromStorage } from "./20-history-query.js";
import { loadTabNamePresetPreference, renderTabNamePresetSelectOptions } from "./22a-sql-tab-presets.js";
import { initSqlTabs } from "./23-sql-tabs-state.js";
import { initSqlEditor } from "./32-editor-runtime.js";
import { bindEditorDropZone } from "./36-editor-file-workflow.js";
import { bindEditorBottomResize, bindEditorResizeRefresh } from "./37-editor-actions.js";
import { APP_LOG_PREFIX } from "../core/08-runtime-config.js";
import { storageMigrationController } from "../ports/05-storage.js";
import { updateToolbars } from "../ui/21-results-toolbar.js";

export function updateBootSurface(state, error = null) {
  if (!document.body) return;
  document.body.dataset.bootState = state;
  if (!bootScreen) return;

  const message = error instanceof Error ? error.message : String(error || "").trim();
  if (state === "booting") {
    if (bootStateBadge) bootStateBadge.className = "boot-status is-booting";
    if (bootStateLabel) bootStateLabel.textContent = t("boot.initializing");
    if (bootScreenTitle) bootScreenTitle.textContent = t("boot.preparing");
    if (bootScreenMessage) bootScreenMessage.textContent = t("boot.loading");
    if (bootScreenActions) bootScreenActions.hidden = true;
    return;
  }

  if (state === "failed") {
    if (bootStateBadge) bootStateBadge.className = "boot-status is-failed";
    if (bootStateLabel) bootStateLabel.textContent = t("boot.interrupted");
    if (bootScreenTitle) bootScreenTitle.textContent = t("boot.failedTitle");
    if (bootScreenMessage) {
      bootScreenMessage.textContent = message
        ? t("boot.failedWithReason", { reason: message })
        : t("boot.failed");
    }
    if (bootScreenActions) bootScreenActions.hidden = false;
    if (bootRetryBtn && typeof bootRetryBtn.focus === "function") {
      setTimeout(() => bootRetryBtn.focus(), 0);
    }
    return;
  }

  if (bootStateBadge) bootStateBadge.className = "boot-status";
  if (bootStateLabel) bootStateLabel.textContent = t("boot.ready");
  if (bootScreenTitle) bootScreenTitle.textContent = t("boot.preparing");
  if (bootScreenMessage) bootScreenMessage.textContent = t("boot.loading");
  if (bootScreenActions) bootScreenActions.hidden = true;
}

export const bootState = {
  started: false,
  ready: false,
  failed: false,
  error: null,
  promise: null
};

export function handleAppBootFailure(error) {
  const normalizedError = error instanceof Error ? error : new Error(String(error || "unknown boot error"));
  bootState.failed = true;
  bootState.ready = false;
  bootState.error = normalizedError;
  setShellAvailability(false);
  updateBootSurface("failed", normalizedError);
  console.error(`${APP_LOG_PREFIX} bootstrap failed`, normalizedError);

  if (runBtn) runBtn.disabled = true;
  setStatus(t("boot.statusFailed", { reason: normalizedError.message }), "error");
}

export async function bootApp() {
  if (bootState.ready) return;
  if (bootState.promise) return bootState.promise;

  bootState.started = true;
  bootState.failed = false;
  bootState.error = null;
  setShellAvailability(false);
  updateBootSurface("booting");

  bootState.promise = (async () => {
    storageMigrationController.run();
    initLocalization();
    await loadReleaseMetadataFromRepoFiles();
    evaluateReleaseNotesUpdate();
    initTheme();
    initSchemaPanelState();
    loadTabNamePresetPreference();
    renderTabNamePresetSelectOptions();
    loadSessionPersistenceSetting();
    loadQueryHistoryFromStorage();
    await initSqlEditor();
    initSqlTabs();
    bindEditorDropZone();
    bindEditorResizeRefresh();
    bindEditorBottomResize();
    bindResultTableHorizontalWheel();
    bindPersistentResultHorizontalScrollbar();
    updateToolbars();
    openFirstRunModalIfNeeded();
    bootState.ready = true;
    setShellAvailability(true);
    updateBootSurface("ready");
  })().catch((error) => {
    handleAppBootFailure(error);
    throw error;
  });

  return bootState.promise;
}
