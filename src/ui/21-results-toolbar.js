import { bottomResultToolbar, topResultToolbar } from "../capabilities/01-dom-layout-schema.js";
import { formatNumber, t } from "../capabilities/03-localization.js";
import { saveActiveResultSetState } from "../capabilities/05a-result-state-controller.js";
import { getGridColumns, getGridCurrentPage, getGridFilteredRows, getGridFrozenColumnCount, getGridPageSize, getGridResultSets, getGridSelectedKeys, getGridSortStates, setGridState } from "../core/12-state-grid-results.js";
import { escapeHtml } from "./00-helpers.js";
import { applyFilter, clearSelection, clearSort, configureResultsStateRendering, getFilterValue, getPageInfoText, getTotalPages, setFilterValue } from "./20-results-state.js";
import { clearFrozenColumns, configureResultsTableRendering, renderAllResults, renderTable } from "./22-results-table.js";

export const BOTTOM_TOOLBAR_MIN_ROWS = 31;

export const tableRenderController = {
  renderCurrent() {
    const resultSets = getGridResultSets();
    resultSets.length > 1 ? renderAllResults() : renderTable();
  },
  refresh() {
    this.renderCurrent();
    updateToolbars();
  }
};

export const toolbarController = {
  render() {
    const columns = getGridColumns();
    const pageSize = getGridPageSize();
    const sortStates = getGridSortStates();
    const selectedKeys = getGridSelectedKeys();
    const frozenColumnCount = getGridFrozenColumnCount();
    const currentPage = getGridCurrentPage();
    const filteredRows = getGridFilteredRows();
    const toolbarHtml = `
      <div class="filter-wrap">
        <input class="filterInput" placeholder="${escapeHtml(t("results.filter"))}" aria-label="${escapeHtml(t("results.filter"))}" ${columns.length ? "" : "disabled"} value="${escapeHtml(getFilterValue())}" />
        <button class="ui-button ui-button-icon ui-button-sm ui-inline-clear clear-filter-btn" title="${escapeHtml(t("results.clearFilter"))}" aria-label="${escapeHtml(t("results.clearFilter"))}" type="button">×</button>
      </div>
      <select class="pageSizeSelect" aria-label="${escapeHtml(t("results.pageSize"))}" ${columns.length ? "" : "disabled"}>
        ${[50,75,100,125,150,175,200].map(n => `<option value="${n}" ${pageSize === n ? "selected" : ""}>${t("grid.perPage", { count: n })}</option>`).join("")}
      </select>
      <button class="ui-button ui-button-ghost ui-button-sm sort-clear-btn" title="${escapeHtml(t("results.clearSort"))} (Shift+F5)" type="button" ${sortStates.length ? "" : "disabled"}>${escapeHtml(t("results.clearSort"))}</button>
      <button class="ui-button ui-button-ghost ui-button-sm selection-clear-btn" title="${escapeHtml(t("results.clearSelection"))} (Shift+F3)" type="button" ${selectedKeys.size ? "" : "disabled"}>${escapeHtml(t("results.clearSelection"))}</button>
      <button class="ui-button ui-button-ghost ui-button-sm freeze-clear-btn" title="${escapeHtml(t("results.unfreeze"))}" type="button" ${frozenColumnCount ? "" : "disabled"}>${escapeHtml(t("results.unfreeze"))}</button>
      <span class="pill selectedCount">${t("grid.selectedCount", { count: formatNumber(selectedKeys.size) })}</span>
      <div class="pagination" aria-label="${escapeHtml(t("results.pagination"))}">
        <button class="ui-button ui-button-icon ui-button-sm firstPageBtn" title="${escapeHtml(t("results.firstPage"))}" aria-label="${escapeHtml(t("results.firstPage"))}" type="button" ${currentPage <= 1 ? "disabled" : ""}>⏮</button>
        <button class="ui-button ui-button-icon ui-button-sm prevPageBtn" title="${escapeHtml(t("results.previousPage"))}" aria-label="${escapeHtml(t("results.previousPage"))}" type="button" ${currentPage <= 1 ? "disabled" : ""}>◀</button>
        <span class="pageInfo">${getPageInfoText()}</span>
        <button class="ui-button ui-button-icon ui-button-sm nextPageBtn" title="${escapeHtml(t("results.nextPage"))}" aria-label="${escapeHtml(t("results.nextPage"))}" type="button" ${currentPage >= getTotalPages() ? "disabled" : ""}>▶</button>
        <button class="ui-button ui-button-icon ui-button-sm lastPageBtn" title="${escapeHtml(t("results.lastPage"))}" aria-label="${escapeHtml(t("results.lastPage"))}" type="button" ${currentPage >= getTotalPages() ? "disabled" : ""}>⏭</button>
      </div>
    `;

    topResultToolbar.innerHTML = toolbarHtml;
    bottomResultToolbar.innerHTML = toolbarHtml;

    const shouldShowBottomToolbar = columns.length && filteredRows.length >= BOTTOM_TOOLBAR_MIN_ROWS;
    bottomResultToolbar.classList.toggle("toolbar-hidden", !shouldShowBottomToolbar);

    document.querySelectorAll(".filterInput").forEach(el => {
      el.addEventListener("input", () => {
        setFilterValue(el.value);
        setGridState({ currentPage: 1 });
        applyFilter();
      });
    });

    document.querySelectorAll(".clear-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        setFilterValue("");
        setGridState({ currentPage: 1 });
        applyFilter();
        const first = document.querySelector(".filterInput");
        if (first) first.focus();
      });
    });

    document.querySelectorAll(".pageSizeSelect").forEach(el => {
      el.addEventListener("change", () => {
        setGridState({ pageSize: Number(el.value), currentPage: 1 });
        applyFilter();
      });
    });

    document.querySelectorAll(".sort-clear-btn").forEach(el => el.addEventListener("click", clearSort));
    document.querySelectorAll(".selection-clear-btn").forEach(el => el.addEventListener("click", clearSelection));
    document.querySelectorAll(".freeze-clear-btn").forEach(el => el.addEventListener("click", clearFrozenColumns));
    document.querySelectorAll(".firstPageBtn").forEach(el => el.addEventListener("click", () => { setGridState({ currentPage: 1 }); saveActiveResultSetState(); tableRenderController.refresh(); }));
    document.querySelectorAll(".prevPageBtn").forEach(el => el.addEventListener("click", () => { setGridState({ currentPage: Math.max(1, getGridCurrentPage() - 1) }); saveActiveResultSetState(); tableRenderController.refresh(); }));
    document.querySelectorAll(".nextPageBtn").forEach(el => el.addEventListener("click", () => { setGridState({ currentPage: Math.min(getTotalPages(), getGridCurrentPage() + 1) }); saveActiveResultSetState(); tableRenderController.refresh(); }));
    document.querySelectorAll(".lastPageBtn").forEach(el => el.addEventListener("click", () => { setGridState({ currentPage: getTotalPages() }); saveActiveResultSetState(); tableRenderController.refresh(); }));

    this.update();
  },
  update() {
    const selectedKeys = getGridSelectedKeys();
    const currentPage = getGridCurrentPage();
    const sortStates = getGridSortStates();
    const frozenColumnCount = getGridFrozenColumnCount();
    const pageSize = getGridPageSize();
    document.querySelectorAll(".pageInfo").forEach(el => el.textContent = getPageInfoText());
    document.querySelectorAll(".selectedCount").forEach(el => el.textContent = t("grid.selectedCount", { count: formatNumber(selectedKeys.size) }));
    document.querySelectorAll(".firstPageBtn,.prevPageBtn").forEach(el => el.disabled = currentPage <= 1);
    document.querySelectorAll(".nextPageBtn,.lastPageBtn").forEach(el => el.disabled = currentPage >= getTotalPages());
    document.querySelectorAll(".sort-clear-btn").forEach(el => el.disabled = sortStates.length === 0);
    document.querySelectorAll(".selection-clear-btn").forEach(el => el.disabled = selectedKeys.size === 0);
    document.querySelectorAll(".freeze-clear-btn").forEach(el => el.disabled = frozenColumnCount === 0);
    document.querySelectorAll(".clear-filter-btn").forEach(el => el.style.display = getFilterValue() ? "inline-flex" : "none");
    document.querySelectorAll(".pageSizeSelect").forEach(el => el.value = String(pageSize));
  }
};

export function renderToolbars() {
  toolbarController.render();
}

export function updateToolbars() {
  toolbarController.update();
}

configureResultsStateRendering({ refreshResultsView: () => tableRenderController.refresh() });
configureResultsTableRendering({
  refreshResultsView: () => tableRenderController.refresh(),
  renderResultToolbars: renderToolbars,
  updateResultToolbars: updateToolbars
});
