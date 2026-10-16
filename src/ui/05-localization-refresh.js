import { registerLocaleRefresher } from "../capabilities/03-localization.js";
import { favoritesModal, queryHistoryModal } from "../capabilities/05-dom-library-settings.js";
import { tablePopulationModal } from "../capabilities/07-dom-table-population.js";
import { renderQueryHistory } from "../capabilities/20-history-query.js";
import { favoritesController } from "../capabilities/21-history-favorites.js";
import { renderLastSettingsExportInfo } from "../capabilities/21a-settings-transfer.js";
import { renderSqlTabs } from "../capabilities/24-sql-tabs-render.js";
import { getTablePopulationMeta, renderTablePopulationColumns, setTablePopulationBusy, tablePopulationRuntime } from "../capabilities/39-table-population.js";
import { sqlMapState } from "../capabilities/45a-sql-map-runtime.js";
import { renderSqlMap } from "../capabilities/47-sql-map-render.js";
import { getGridResultSets } from "../core/12-state-grid-results.js";
import { renderSchema } from "./10-schema.js";
import { renderToolbars } from "./21-results-toolbar.js";
import { renderAllResults } from "./22-results-table.js";

export function refreshFeatureLocalization() {
  renderToolbars();
  renderSchema();
  renderSqlTabs();
  if (getGridResultSets().length) renderAllResults();
  renderLastSettingsExportInfo();
  if (sqlMapState.open) renderSqlMap();
  if (queryHistoryModal?.style.display === "flex") renderQueryHistory();
  if (favoritesModal?.style.display === "flex") favoritesController.render();
  if (tablePopulationModal?.style.display === "flex") {
    const tableMeta = getTablePopulationMeta(tablePopulationRuntime.table);
    if (tableMeta) renderTablePopulationColumns(tableMeta);
    setTablePopulationBusy(tablePopulationRuntime.running);
  }
}

registerLocaleRefresher(refreshFeatureLocalization);
