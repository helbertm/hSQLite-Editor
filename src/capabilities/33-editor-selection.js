import { t } from "./03-localization.js";
import { setStatus } from "./12-shell-status.js";
import { getEditorCursorIndex, getEditorSelection, getEditorValue, replaceEditorRange } from "./32a-editor-api.js";
import { updateAutocomplete } from "../ui/30-autocomplete.js";

export function insertAtCursor(text) {
  const start = getEditorCursorIndex();
  replaceEditorRange(start, start, text);
  updateAutocomplete();
}

export function getSelectedOrAllSql() {
  const selected = getEditorSelection().trim();
  if (selected) {
    setStatus(t("status.selectedSqlOnly"), "ok");
    return selected;
  }
  return getEditorValue().trim();
}
