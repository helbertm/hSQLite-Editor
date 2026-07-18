import { cmEditor } from "./03-dom-editor-results.js";
import { t } from "./03-localization.js";
import { firstRunModal, firstRunTabNamePresetSelect, sessionToggle, settingsTransferModal, tabNamePresetSelect, themeToggle } from "./05-dom-library-settings.js";
import { modalController } from "./05-modal-controller.js";
import { setStatus } from "./12-shell-status.js";
import { saveSqlTabsToStorage } from "./22-sql-tabs-storage.js";
import { setTabNamePresetPreference, syncTabNamePresetSelectValue } from "./22a-sql-tab-presets.js";
import { getNextSqlTabName } from "./22b-sql-tab-factory.js";
import { renderSqlTabs } from "./24-sql-tabs-render.js";
import { invokeRuntimeTestOverride } from "../core/09-test-hooks.js";
import { getSqlTabsItems, updateTabState } from "../core/11-state-tabs.js";
import { getSelectedTabNamePreset, getShouldPersistSession, setPreferencesState } from "../core/13-state-preferences.js";
import { STORAGE_KEYS, sqlTabsStorage, storage } from "../ports/05-storage.js";

let prepareSettingsTransfer = () => {};

export function configurePreferenceSettingsEffects(effects) {
  prepareSettingsTransfer = effects.prepareSettingsTransfer;
}

export const themeController = {
  apply(theme) {
    document.documentElement.dataset.theme = theme;
    storage.set(STORAGE_KEYS.THEME, theme);
    if (themeToggle) {
      themeToggle.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
      themeToggle.title = t(theme === "dark" ? "preferences.themeDarkActive" : "preferences.themeLightActive");
    }
    if (cmEditor) {
      cmEditor.setTheme(theme);
      setTimeout(() => cmEditor.refresh(), 0);
    }
  },
  init() {
    this.apply(storage.get(STORAGE_KEYS.THEME, "dark"));
  },
  toggle() {
    const current = document.documentElement.dataset.theme || "dark";
    this.apply(current === "dark" ? "light" : "dark");
  }
};

export const sessionController = {
  load() {
    const saved = storage.get(STORAGE_KEYS.SESSION_PERSISTENCE, null);
    setPreferencesState({ shouldPersistSession: saved !== "false" });
    this.updateToggleUI();
  },
  updateToggleUI() {
    if (!sessionToggle) return;
    sessionToggle.setAttribute("aria-checked", getShouldPersistSession() ? "true" : "false");
    sessionToggle.classList.toggle("active", getShouldPersistSession());
    sessionToggle.title = getShouldPersistSession()
      ? t("preferences.sessionRestoreOn")
      : t("preferences.sessionRestoreOff");
  },
  set(value) {
    setPreferencesState({ shouldPersistSession: Boolean(value) });
    storage.set(STORAGE_KEYS.SESSION_PERSISTENCE, getShouldPersistSession() ? "true" : "false");
    this.updateToggleUI();

    if (!getShouldPersistSession()) {
      sqlTabsStorage.clear();
      setStatus(t("status.sessionOff"), "ok");
    } else {
      saveSqlTabsToStorage(true);
      setStatus(t("status.sessionOn"), "ok");
    }
  },
  toggle() {
    this.set(!getShouldPersistSession());
  }
};

export const firstRunController = {
  shouldShow() {
    return storage.get(STORAGE_KEYS.FIRST_RUN_DONE, "false") !== "true";
  },
  openIfNeeded() {
    if (!this.shouldShow()) return;

    const currentTheme = document.documentElement.dataset.theme || storage.get(STORAGE_KEYS.THEME, "dark");
    const themeInput = document.querySelector(`input[name="firstRunTheme"][value="${currentTheme}"]`);
    if (themeInput) themeInput.checked = true;

    const sessionInput = document.querySelector(`input[name="firstRunSession"][value="${getShouldPersistSession() ? "true" : "false"}"]`);
    if (sessionInput) sessionInput.checked = true;
    syncTabNamePresetSelectValue();

    modalController.open(firstRunModal);
  },
  previewTheme() {
    const themeValue = document.querySelector('input[name="firstRunTheme"]:checked')?.value || "dark";
    setTheme(themeValue);
  },
  apply() {
    const sessionValue = document.querySelector('input[name="firstRunSession"]:checked')?.value !== "false";
    const themeValue = document.querySelector('input[name="firstRunTheme"]:checked')?.value || "dark";
    const presetValue = firstRunTabNamePresetSelect?.value || getSelectedTabNamePreset();

    setTheme(themeValue);
    setSessionPersistence(sessionValue);
    setTabNamePresetPreference(presetValue);

    const sqlTabs = getSqlTabsItems();
    if (sqlTabs.length === 1 && firstRunController.shouldShow()) {
      const initialTab = sqlTabs[0];
      if (initialTab) {
        updateTabState(initialTab.id, { title: getNextSqlTabName() });
        renderSqlTabs();
        saveSqlTabsToStorage();
      }
    }

    storage.set(STORAGE_KEYS.FIRST_RUN_DONE, "true");
    modalController.close(firstRunModal);
    setStatus(t("status.preferencesSaved"), "ok");
  }
};

export function setTheme(theme) {
  return invokeRuntimeTestOverride("setTheme", [theme], value => themeController.apply(value));
}

export function initTheme() {
  themeController.init();
}

export function toggleTheme() {
  themeController.toggle();
}

export function handleThemeSwitchClick(event) {
  if (!themeToggle) return;
  if (event.detail === 0) {
    toggleTheme();
    return;
  }

  const rect = themeToggle.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const targetTheme = clickX >= rect.width / 2 ? "dark" : "light";
  setTheme(targetTheme);
  setStatus(t("status.themeApplied", { theme: t(targetTheme === "dark" ? "theme.dark" : "theme.light") }), "ok");
}

export function focusTabPresetSelector() {
  if (!tabNamePresetSelect) return;
  prepareSettingsTransfer();
  modalController.open(settingsTransferModal);
  setTimeout(() => tabNamePresetSelect.focus(), 0);
  setStatus(t("status.settingsPresetFocused"), "ok");
}

export function loadSessionPersistenceSetting() {
  sessionController.load();
}

export function setSessionPersistence(value) {
  sessionController.set(value);
}

export function toggleSessionPersistence() {
  sessionController.toggle();
}

export function openFirstRunModalIfNeeded() {
  firstRunController.openIfNeeded();
}

export function previewFirstRunTheme() {
  firstRunController.previewTheme();
}

export function applyFirstRunPreferences() {
  firstRunController.apply();
}
