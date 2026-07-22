import { clearRecentDbBtn, closeRecentDbBtn, dbFile, openDbMenuBtn, openRecentDbBtn, recentDbModal } from "../capabilities/02-dom-database.js";
import { t } from "../capabilities/03-localization.js";
import { modalController } from "../capabilities/05-modal-controller.js";
import { setStatus } from "../capabilities/12-shell-status.js";
import { clearFileHandles, recentDbStorage, renderRecentDbs } from "../capabilities/30-database-session-storage.js";
import { closeDatabaseMenu, openDatabasePicker, openDbFromFile } from "../capabilities/31-database-session-runtime.js";
import { getSqliteValidationErrorMessage, isExpectedSqliteValidationError } from "../capabilities/32-database-file-validation.js";

export function bindDatabaseFileInputs() {
  dbFile.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      await openDbFromFile(file, null);
    } catch (err) {
      if (!isExpectedSqliteValidationError(err)) {
        console.error(err);
      }
      setStatus(t("database.openFailed", { reason: getSqliteValidationErrorMessage(err, t) }), "error");
    } finally {
      if (event.target && typeof event.target.value === "string") {
        event.target.value = "";
      }
    }
  });

  if (openDbMenuBtn) {
    openDbMenuBtn.addEventListener("click", async () => {
      closeDatabaseMenu();
      await openDatabasePicker();
    });
  }
}

export function bindRecentDatabaseUi() {
  openRecentDbBtn.addEventListener("click", () => {
    closeDatabaseMenu();
    renderRecentDbs();
    modalController.open(recentDbModal);
  });
  closeRecentDbBtn.addEventListener("click", () => modalController.close(recentDbModal));

  clearRecentDbBtn.addEventListener("click", async () => {
    recentDbStorage.clear();
    await clearFileHandles();
    renderRecentDbs();
    setStatus(t("recent.cleared"), "ok");
  });

  recentDbModal.addEventListener("click", (event) => {
    if (modalController.isBackdropClick(event, recentDbModal)) modalController.close(recentDbModal);
  });

  renderRecentDbs();
}
