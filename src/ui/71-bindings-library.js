import { t } from "../capabilities/03-localization.js";
import { cancelImportSettingsBtn, clearFavoritesBtn, clearQueryHistoryBtn, clearQueryHistorySearchBtn, closeFavoritesBtn, closeHelpBtn, closeQueryHistoryBtn, closeReleaseNotesBtn, closeSettingsTransferBtn, closeShortcutsHelpBtn, confirmImportSettingsBtn, exportSettingsBtn, favoritesBtn, favoritesModal, helpBtn, helpModal, importSettingsConfirmModal, importSettingsInput, importSettingsTrigger, queryHistoryBtn, queryHistoryModal, queryHistorySearch, releaseNotesBtn, releaseNotesModal, settingsTransferBtn, settingsTransferModal, shortcutsHelpBtn, shortcutsHelpModal } from "../capabilities/05-dom-library-settings.js";
import { modalController } from "../capabilities/05-modal-controller.js";
import { openReleaseNotesModal } from "../capabilities/10-release-metadata.js";
import { setStatus } from "../capabilities/12-shell-status.js";
import { clearQueryHistory, closeQueryHistoryModal, openQueryHistoryModal, renderQueryHistory } from "../capabilities/20-history-query.js";
import { favoritesController } from "../capabilities/21-history-favorites.js";
import { exportSettingsConfig, hasAnyConfigScopeSelected, importSettingsConfig, renderLastSettingsExportInfo, updateSettingsTransferActionsState } from "../capabilities/21a-settings-transfer.js";

export function bindHistoryAndFavoritesUi() {
  queryHistoryBtn.addEventListener("click", openQueryHistoryModal);
  favoritesBtn.addEventListener("click", () => favoritesController.openModal());
  closeFavoritesBtn.addEventListener("click", () => modalController.close(favoritesModal));
  clearFavoritesBtn.addEventListener("click", () => favoritesController.clear());
  closeQueryHistoryBtn.addEventListener("click", closeQueryHistoryModal);
  clearQueryHistoryBtn.addEventListener("click", clearQueryHistory);
  queryHistorySearch.addEventListener("input", renderQueryHistory);
  clearQueryHistorySearchBtn.addEventListener("click", () => {
    queryHistorySearch.value = "";
    renderQueryHistory();
    queryHistorySearch.focus();
  });

  queryHistoryModal.addEventListener("click", (event) => {
    if (modalController.isBackdropClick(event, queryHistoryModal)) closeQueryHistoryModal();
  });
  favoritesModal.addEventListener("click", (event) => {
    if (modalController.isBackdropClick(event, favoritesModal)) modalController.close(favoritesModal);
  });
}

export function bindSettingsAndHelpUi() {
  let bypassImportConfirmOnce = false;

  settingsTransferBtn.addEventListener("click", () => {
    updateSettingsTransferActionsState();
    renderLastSettingsExportInfo();
    modalController.open(settingsTransferModal);
  });
  releaseNotesBtn.addEventListener("click", () => openReleaseNotesModal(true));
  closeSettingsTransferBtn.addEventListener("click", () => modalController.close(settingsTransferModal));
  shortcutsHelpBtn.addEventListener("click", () => modalController.open(shortcutsHelpModal));
  closeReleaseNotesBtn.addEventListener("click", () => modalController.close(releaseNotesModal));
  closeShortcutsHelpBtn.addEventListener("click", () => modalController.close(shortcutsHelpModal));
  helpBtn.addEventListener("click", () => modalController.open(helpModal));
  closeHelpBtn.addEventListener("click", () => modalController.close(helpModal));
  exportSettingsBtn.addEventListener("click", exportSettingsConfig);

  importSettingsTrigger.addEventListener("click", (event) => {
    if (event.target === importSettingsInput || bypassImportConfirmOnce) {
      bypassImportConfirmOnce = false;
      return;
    }
    event.preventDefault();
    if (!hasAnyConfigScopeSelected()) {
      setStatus(t("settings.scopeRequiredImport"), "warn");
      return;
    }
    modalController.open(importSettingsConfirmModal);
  });
  cancelImportSettingsBtn.addEventListener("click", () => modalController.close(importSettingsConfirmModal));
  confirmImportSettingsBtn.addEventListener("click", () => {
    modalController.close(importSettingsConfirmModal);
    bypassImportConfirmOnce = true;
    importSettingsInput.click();
  });
  importSettingsInput.addEventListener("change", (event) => {
    importSettingsConfig(event.target.files && event.target.files[0]);
  });
  settingsTransferModal.querySelectorAll(".cfg-scope").forEach((inputEl) => {
    inputEl.addEventListener("change", updateSettingsTransferActionsState);
  });

  settingsTransferModal.addEventListener("click", (event) => {
    if (modalController.isBackdropClick(event, settingsTransferModal)) modalController.close(settingsTransferModal);
  });
  importSettingsConfirmModal.addEventListener("click", (event) => {
    if (modalController.isBackdropClick(event, importSettingsConfirmModal)) modalController.close(importSettingsConfirmModal);
  });
  shortcutsHelpModal.addEventListener("click", (event) => {
    if (modalController.isBackdropClick(event, shortcutsHelpModal)) modalController.close(shortcutsHelpModal);
  });
  helpModal.addEventListener("click", (event) => {
    if (modalController.isBackdropClick(event, helpModal)) modalController.close(helpModal);
  });
  releaseNotesModal.addEventListener("click", (event) => {
    if (modalController.isBackdropClick(event, releaseNotesModal)) modalController.close(releaseNotesModal);
  });

  updateSettingsTransferActionsState();
  renderLastSettingsExportInfo();
}
