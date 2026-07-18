import { databaseMenuAlert, databaseMenuSummary, saveDbBtn } from "./02-dom-database.js";
import { t } from "./03-localization.js";
import { isCurrentDbDirty, setDbSessionState } from "../core/14-state-database-schema.js";

export function setDbDirty(value) {
  setDbSessionState({ isDirty: Boolean(value) });
  const isDirty = isCurrentDbDirty();
  if (databaseMenuAlert) databaseMenuAlert.style.display = isDirty ? "inline-flex" : "none";
  if (databaseMenuSummary) {
    databaseMenuSummary.classList.toggle("dirty", isDirty);
    databaseMenuSummary.title = isDirty
      ? t("database.unsavedChanges")
      : t("database.file");
  }
  if (saveDbBtn) {
    saveDbBtn.classList.toggle("dirty", isDirty);
    saveDbBtn.title = isDirty
      ? t("database.saveUnsaved")
      : t("database.saveFile");
  }
}

export function getDbOriginLabel(file, handle = null) {
  if (handle && handle.name) return handle.name;
  if (file && file.webkitRelativePath) return file.webkitRelativePath;
  if (file && file.name) return file.name;
  return t("database.originUnavailable");
}
