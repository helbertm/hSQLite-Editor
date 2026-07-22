import { mainLayout, schemaCollapseBtn, schemaToggleRail } from "./01-dom-layout-schema.js";
import { cmEditor } from "./03-dom-editor-results.js";
import { t } from "./03-localization.js";
import { isSchemaPanelCollapsed, setPreferencesState } from "../core/13-state-preferences.js";
import { STORAGE_KEYS, storage } from "../ports/05-storage.js";

export const schemaPanelController = {
  setCollapsed(collapsed) {
    setPreferencesState({ schemaCollapsed: collapsed });
    mainLayout.classList.toggle("schema-collapsed", collapsed);
    storage.set(STORAGE_KEYS.SCHEMA_COLLAPSED, isSchemaPanelCollapsed() ? "1" : "0");

    if (schemaCollapseBtn) {
      schemaCollapseBtn.title = t(isSchemaPanelCollapsed() ? "schema.show" : "schema.toggle");
    }
    if (schemaToggleRail) {
      schemaToggleRail.title = t(isSchemaPanelCollapsed() ? "schema.show" : "schema.toggle");
    }

    if (cmEditor) {
      setTimeout(() => cmEditor.refresh(), 0);
    }
  },
  init() {
    const saved = storage.get(STORAGE_KEYS.SCHEMA_COLLAPSED, null);
    const prefersCompactSchema = window.matchMedia && window.matchMedia("(max-width: 920px)").matches;
    this.setCollapsed(saved === null ? prefersCompactSchema : saved === "1");
  },
  toggle() {
    this.setCollapsed(!isSchemaPanelCollapsed());
  }
};

export function toggleSchemaPanel() {
  schemaPanelController.toggle();
}

export function initSchemaPanelState() {
  schemaPanelController.init();
}
