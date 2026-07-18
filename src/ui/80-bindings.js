import { bindShellBootstrapUi } from "../capabilities/02c-shell-bootstrap-ui.js";
import { initModalControllerBindings } from "../capabilities/05-modal-controller.js";
import { configureResultStateEffects } from "../capabilities/05a-result-state-controller.js";
import { configurePreferenceSettingsEffects } from "../capabilities/15-preferences.js";
import { renderLastSettingsExportInfo, updateSettingsTransferActionsState } from "../capabilities/21a-settings-transfer.js";
import { configureActiveTabSync } from "../capabilities/22c-active-tab-sync.js";
import { bootApp, bootState, handleAppBootFailure } from "../capabilities/14-app-boot.js";
import { requestCloseSqlTab, switchSqlTab } from "../capabilities/23-sql-tabs-state.js";
import { configureSqlTabActions } from "../capabilities/24-sql-tabs-render.js";
import { configureRecentDatabaseActions } from "../capabilities/30-database-session-storage.js";
import { openRecentDb } from "../capabilities/31-database-session-runtime.js";
import { initShortcutRegistry } from "../capabilities/25-shell-shortcuts.js";
import { clearSqlError } from "../capabilities/32b-editor-feedback.js";
import { openTablePopulationModal } from "../capabilities/39-table-population.js";
import { configureSqlMapGraphEffects } from "../capabilities/46-sql-map-graph.js";
import { configureSqlMapRenderInteractions, renderSqlMap } from "../capabilities/47-sql-map-render.js";
import { bindSqlMapDrag, bindSqlMapFieldRelationshipDrag, getSqlMapFieldRowById } from "../capabilities/48-sql-map-interactions.js";
import { bindSchemaUi, configureSchemaActions, initSchemaUi } from "./10-schema.js";
import { getFilterValue } from "./20-results-state.js";
import { renderToolbars } from "./21-results-toolbar.js";
import { renderSleepEmptyState } from "./22-results-table.js";
import { bindResultsExportUi } from "./23-results-export.js";
import { bindDatabaseActionButtons } from "./40-database-actions.js";
import { bindDatabaseFileInputs, bindRecentDatabaseUi } from "./70-bindings-database.js";
import { bindHistoryAndFavoritesUi, bindSettingsAndHelpUi } from "./71-bindings-library.js";
import { bindBootRecoveryUi, bindExecutionAndTabDialogs, bindSqlFindUi, bindSqlMapUi, bindTablePopulationUi } from "./72-bindings-advanced-ui.js";

export async function initUiBindings() {
  configureActiveTabSync({ getActiveResultFilterValue: getFilterValue });
  configurePreferenceSettingsEffects({
    prepareSettingsTransfer: () => {
      updateSettingsTransferActionsState();
      renderLastSettingsExportInfo();
    }
  });
  configureRecentDatabaseActions({ openRecentDatabase: openRecentDb });
  configureSchemaActions({ openTablePopulation: openTablePopulationModal });
  configureSqlMapGraphEffects({ renderSqlMapView: renderSqlMap });
  configureSqlMapRenderInteractions({
    bindSqlMapCanvasDrag: bindSqlMapDrag,
    bindSqlMapRelationshipDrag: bindSqlMapFieldRelationshipDrag,
    getSqlMapFieldRow: getSqlMapFieldRowById
  });
  configureResultStateEffects({
    clearResultError: clearSqlError,
    renderEmptyResults: renderSleepEmptyState,
    renderResultToolbars: renderToolbars
  });
  configureSqlTabActions({ requestCloseSqlTab, switchSqlTab });
  initModalControllerBindings();
  bindBootRecoveryUi();
  initSchemaUi();

  // Keep the shell inert until boot completes so no early click/shortcut can
  // reach partially initialized controllers inherited from the old monolith.
  await bootApp();

  initShortcutRegistry();
  bindShellBootstrapUi();
  bindDatabaseFileInputs();
  bindDatabaseActionButtons();
  bindRecentDatabaseUi();
  bindExecutionAndTabDialogs();
  bindHistoryAndFavoritesUi();
  bindResultsExportUi();
  bindSchemaUi();
  bindSettingsAndHelpUi();
  bindSqlMapUi();
  bindTablePopulationUi();
  bindSqlFindUi();
}

initUiBindings().catch((error) => {
  if (!bootState.failed) handleAppBootFailure(error);
});
