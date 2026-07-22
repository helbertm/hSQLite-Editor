import { firstRunTabNamePresetSelect, tabNamePresetSelect } from "./05-dom-library-settings.js";
import { SQL_TAB_NAME_PRESETS } from "../core/04-tab-name-presets.js";
import { setSqlTabsState } from "../core/11-state-tabs.js";
import { getSelectedTabNamePreset, setPreferencesState } from "../core/13-state-preferences.js";
import { STORAGE_KEYS, storage } from "../ports/05-storage.js";

export const SQL_TAB_NAME_PRESET_LABELS = {
  tlor: "TLoR",
  vingadores: "Vingadores",
  harry_potter: "Harry Potter",
  heman: "He-Man",
  scoobydoo: "Scooby-Doo",
  jetsons: "Jetsons",
  star_wars: "Star Wars",
  caverna_do_dragao: "Caverna do Dragão",
  turma_da_monica: "Turma da Mônica"
};

export function getCurrentTabNamePool() {
  const pool = SQL_TAB_NAME_PRESETS[getSelectedTabNamePreset()];
  return Array.isArray(pool) && pool.length ? pool : SQL_TAB_NAME_PRESETS.tlor;
}

export function shuffleList(values) {
  const arr = [...values];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function loadTabNamePresetPreference() {
  const saved = storage.get(STORAGE_KEYS.TAB_NAME_PRESET, "tlor");
  setPreferencesState({ tabNamePreset: saved });
  setSqlTabsState({ tabNameBag: [] });
}

export function renderTabNamePresetSelectOptions() {
  const options = Object.keys(SQL_TAB_NAME_PRESETS).map((key) => ({
    value: key,
    label: SQL_TAB_NAME_PRESET_LABELS[key] || key
  }));
  [tabNamePresetSelect, firstRunTabNamePresetSelect].forEach((selectEl) => {
    if (!selectEl) return;
    selectEl.innerHTML = options.map((opt) => `<option value="${opt.value}">${opt.label}</option>`).join("");
    selectEl.value = getSelectedTabNamePreset();
  });
}

export function syncTabNamePresetSelectValue() {
  [tabNamePresetSelect, firstRunTabNamePresetSelect].forEach((selectEl) => {
    if (selectEl) selectEl.value = getSelectedTabNamePreset();
  });
}

export function setTabNamePresetPreference(presetKey) {
  setPreferencesState({ tabNamePreset: presetKey });
  storage.set(STORAGE_KEYS.TAB_NAME_PRESET, getSelectedTabNamePreset());
  setSqlTabsState({
    nextSqlTabNameIndex: 0,
    tabNameBag: []
  });
  syncTabNamePresetSelectValue();
}
