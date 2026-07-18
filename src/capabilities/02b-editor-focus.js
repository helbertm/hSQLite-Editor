import { cmEditor, sqlEditor } from "./03-dom-editor-results.js";
import { t } from "./03-localization.js";
import { setStatus } from "./12-shell-status.js";

export function focusSqlEditor() {
  if (cmEditor) {
    cmEditor.focus();
    setStatus(t("status.focusEditor"), "ok");
    return;
  }

  sqlEditor.focus();
  setStatus(t("status.focusEditor"), "ok");
}
