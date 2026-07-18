import { exportCsvBtn, exportJsonBtn } from "./03-dom-editor-results.js";
import { syncActiveResultToTab } from "./22c-active-tab-sync.js";
import { getGridActiveResultIndex, getGridResultSets, hydrateGridStateFromResultSet, persistGridStateIntoResultSet, resetGridStateToEmpty, setGridState } from "../core/12-state-grid-results.js";

let clearResultError = () => {};
let renderEmptyResults = () => {};
let renderResultToolbars = () => {};

export function configureResultStateEffects(effects) {
  clearResultError = effects.clearResultError;
  renderEmptyResults = effects.renderEmptyResults;
  renderResultToolbars = effects.renderResultToolbars;
}

export const resultStateController = {
  clear() {
    resetGridStateToEmpty();
    renderEmptyResults();
    renderResultToolbars();
    exportCsvBtn.disabled = true;
    exportJsonBtn.disabled = true;
    clearResultError();
  },
  activate(index) {
    const resultSets = getGridResultSets();
    if (index < 0 || index >= resultSets.length) return;
    const rs = hydrateGridStateFromResultSet(resultSets[index], index);
    const nextResultSets = [...resultSets];
    nextResultSets[index] = rs;
    setGridState({ resultSets: nextResultSets });
  },
  saveActive() {
    const resultSets = getGridResultSets();
    const activeResultIndex = getGridActiveResultIndex();
    if (!resultSets.length || activeResultIndex < 0 || activeResultIndex >= resultSets.length) return;
    persistGridStateIntoResultSet(resultSets[activeResultIndex]);
    syncActiveResultToTab();
  },
  setControls(enabled) {
    document.querySelectorAll(".filterInput").forEach(el => el.disabled = !enabled);
    document.querySelectorAll(".pageSizeSelect").forEach(el => el.disabled = !enabled);
    exportCsvBtn.disabled = !enabled;
    exportJsonBtn.disabled = !enabled;
  }
};

export function clearResults() {
  resultStateController.clear();
}

export function activateResultSet(index) {
  resultStateController.activate(index);
}

export function saveActiveResultSetState() {
  resultStateController.saveActive();
}

export function setResultControlsEnabled(enabled) {
  resultStateController.setControls(enabled);
}
