import { clearSchemaFiltersBtn, clearSchemaSearchBtn, schemaList, schemaOtherMenu, schemaQuickGuide, schemaQuickGuideSummary, schemaSearch, schemaTypeAllBtn, schemaTypeFilters, schemaTypeOtherBtn, schemaTypeTableBtn, schemaTypeViewBtn } from "../capabilities/01-dom-layout-schema.js";
import { formatNumber, t } from "../capabilities/03-localization.js";
import { sqlEscapeIdent } from "../core/07-sql-escaping.js";
import { getActiveDatabase } from "../capabilities/07-database-runtime.js";
import { setStatus } from "../capabilities/12-shell-status.js";
import { getSchemaFilterState, setPreferencesState } from "../core/13-state-preferences.js";
import { getSchemaAvailableTypes, getSchemaObjects, setSchemaState } from "../core/14-state-database-schema.js";
import { isSqlExecutionRunning } from "../core/15-state-runtime-library.js";
import { STORAGE_KEYS, storage } from "../ports/05-storage.js";
import { escapeHtml, highlightSchemaMatch } from "./00-helpers.js";
import { insertAtCursor } from "../capabilities/33-editor-selection.js";
import { SCHEMA_COMMON_TYPES, SCHEMA_KNOWN_TYPES, SCHEMA_TYPE_LABELS } from "./09-schema-constants.js";

let openTablePopulation = () => {};

export function configureSchemaActions(actions) {
  openTablePopulation = actions.openTablePopulation;
}

export function normalizeSchemaType(type) {
    return String(type || "").trim().toLowerCase().replace(/\s+/g, "_");
  }

  export function getOrderedSchemaTypes() {
    const present = new Set(getSchemaAvailableTypes().map(normalizeSchemaType));
    const ordered = [];
    const pushType = (type) => {
      const normalized = normalizeSchemaType(type);
      if (!normalized || ordered.includes(normalized)) return;
      ordered.push(normalized);
    };
    SCHEMA_COMMON_TYPES.forEach(pushType);
    SCHEMA_KNOWN_TYPES.forEach(pushType);
    Array.from(present).sort().forEach(pushType);
    return ordered;
  }

  export function loadSchemaFiltersPreference() {
    const fallback = { all: false, selectedTypes: ["table", "view"] };
    const raw = storage.getJSON(STORAGE_KEYS.SCHEMA_FILTERS, fallback) || fallback;
    setPreferencesState({
      schemaFilters: {
        all: Boolean(raw.all),
        selectedTypes: Array.isArray(raw.selectedTypes)
          ? raw.selectedTypes.map(normalizeSchemaType).filter(Boolean)
          : ["table", "view"]
      }
    });
  }

  export function saveSchemaFiltersPreference() {
    const schemaFilterState = getSchemaFilterState();
    storage.set(STORAGE_KEYS.SCHEMA_FILTERS, JSON.stringify({
      all: schemaFilterState.all,
      selectedTypes: Array.from(schemaFilterState.selectedTypes)
    }));
  }

  export function setSchemaFilterState(nextState) {
    setPreferencesState({
      schemaFilters: {
        all: Boolean(nextState.all),
        selectedTypes: Array.from(nextState.selectedTypes || []).map(normalizeSchemaType).filter(Boolean)
      }
    });
    saveSchemaFiltersPreference();
  }

  export function getSchemaOtherSelectedCount() {
    const schemaFilterState = getSchemaFilterState();
    let count = 0;
    for (const type of schemaFilterState.selectedTypes) {
      if (type !== "table" && type !== "view") count++;
    }
    return count;
  }

  export function shouldKeepSchemaQuickGuideOpen() {
    return !getActiveDatabase() && Object.keys(getSchemaObjects()).length === 0;
  }

  export function syncSchemaQuickGuide() {
    if (schemaQuickGuide && shouldKeepSchemaQuickGuideOpen()) {
      schemaQuickGuide.open = true;
    }
  }

  export const schemaController = {
    load() {
      const activeDb = getActiveDatabase();
      const nextSchemaObjects = {};
      const nextSchemaTypes = [];
      try {
        const objectsRes = activeDb.exec(`
          select name, type
          from sqlite_schema
          where coalesce(type, '') <> ''
            and name not like 'sqlite_%'
          order by type, name
        `);

        if (!objectsRes.length) {
          setSchemaState({ objects: {}, availableTypes: [] });
          this.renderTypeFilters();
          this.render();
          return;
        }

        const rows = objectsRes[0].values;
        const types = new Set();
        for (const [name, type] of rows) {
          types.add(String(type || "").toLowerCase());
          let fields = [];
          if (type === "table" || type === "view") {
            try {
              const safeName = String(name).replaceAll("'", "''");
              const pragmaRes = activeDb.exec(`pragma table_xinfo('${safeName}')`);
              fields = pragmaRes.length
                ? pragmaRes[0].values.map(r => ({
                  name: r[1],
                  type: r[2] || "",
                  notnull: r[3],
                  defaultValue: r[4],
                  pk: r[5],
                  hidden: r[6] || 0
                }))
                : [];
            } catch (pragmaErr) {
              console.warn("schema-column-read-failed", name, pragmaErr);
              fields = [];
            }
          }
          nextSchemaObjects[name] = { type, fields };
        }
        nextSchemaTypes.push(...Array.from(types).map(normalizeSchemaType).filter(Boolean).sort());
        setSchemaState({
          objects: nextSchemaObjects,
          availableTypes: nextSchemaTypes
        });
        this.renderTypeFilters();
        this.render();
      } catch (err) {
        console.error(err);
        setSchemaState({ objects: {}, availableTypes: [] });
        this.renderTypeFilters();
        this.render();
        setStatus(t("schema.readFailed", { reason: err.message }), "warn");
      }
    },
    renderTypeFilters() {
      if (!schemaTypeFilters) return;
      const schemaFilterState = getSchemaFilterState();
      const selected = schemaFilterState.selectedTypes;
      const isAll = schemaFilterState.all;
      const otherSelected = getSchemaOtherSelectedCount();
      schemaTypeAllBtn.classList.toggle("active", isAll);
      schemaTypeTableBtn.classList.toggle("active", !isAll && selected.has("table"));
      schemaTypeViewBtn.classList.toggle("active", !isAll && selected.has("view"));
      schemaTypeOtherBtn.classList.toggle("active", !isAll && otherSelected > 0);
      schemaTypeOtherBtn.textContent = otherSelected > 0
        ? t("schema.otherCount", { count: formatNumber(otherSelected) })
        : t("schema.other");

      const orderedTypes = getOrderedSchemaTypes().filter(type => type !== "table" && type !== "view");
      schemaOtherMenu.innerHTML = orderedTypes.map(type => {
        const checked = selected.has(type) ? "checked" : "";
        const label = SCHEMA_TYPE_LABELS[type] || type.toUpperCase();
        return `<label class="schema-other-option"><input type="checkbox" data-schema-other="${escapeHtml(type)}" ${checked}><span>${escapeHtml(label)}</span></label>`;
      }).join("");
    },
    render() {
      syncSchemaQuickGuide();
      const filter = schemaSearch.value.trim().toLowerCase();
      const schemaFilterState = getSchemaFilterState();
      const entries = Object.entries(getSchemaObjects()).filter(([table, meta]) => {
        const objectType = normalizeSchemaType(meta.type);
        if (!schemaFilterState.all && !schemaFilterState.selectedTypes.has(objectType)) return false;
        if (!filter) return true;
        return table.toLowerCase().includes(filter)
          || meta.fields.some(f => f.name.toLowerCase().includes(filter));
      });

      if (!entries.length) {
        schemaList.innerHTML = `<div class="empty schema-empty"><div class="schema-empty-face">:-(</div><div>${escapeHtml(t("schema.noObjects"))}</div></div>`;
        return;
      }

      schemaList.innerHTML = "";
      for (const [table, meta] of entries) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.innerHTML = `${highlightSchemaMatch(table, filter)} <span class="schema-object-type">(${escapeHtml(meta.type)})</span>`;
        summary.title = t("schema.insertObject");
        summary.addEventListener("click", (e) => {
          if (e.metaKey || e.ctrlKey || e.altKey) {
            e.preventDefault();
            insertAtCursor(sqlEscapeIdent(table));
          }
        });
        details.appendChild(summary);

        if (String(meta.type || "").toLowerCase() === "table") {
          const actions = document.createElement("div");
          actions.className = "schema-object-actions";
          const populateButton = document.createElement("button");
          populateButton.className = "ui-button ui-button-ghost ui-button-sm schema-populate-table-btn";
          populateButton.type = "button";
          populateButton.dataset.populateTable = table;
          populateButton.textContent = t("schema.populateTable");
          populateButton.title = t("schema.populateTableTitle", { table });
          populateButton.disabled = isSqlExecutionRunning();
          populateButton.addEventListener("click", () => openTablePopulation(table));
          actions.appendChild(populateButton);
          details.appendChild(actions);
        }

        for (const field of meta.fields) {
          const div = document.createElement("div");
          div.className = "field";
          div.innerHTML = `${highlightSchemaMatch(field.name, filter)}${field.type ? " <span class=\"schema-field-meta\">· " + escapeHtml(field.type) + "</span>" : ""}${field.pk ? " <span class=\"schema-field-meta\">· PK</span>" : ""}`; // i18n-ignore-visible: database identifiers and PK marker
          div.title = t("schema.insertField", { table, field: field.name });
          div.addEventListener("click", () => insertAtCursor(`${sqlEscapeIdent(table)}.${sqlEscapeIdent(field.name)}`));
          details.appendChild(div);
        }
        schemaList.appendChild(details);
      }
    },
    updateSearchClearButton() {
      clearSchemaSearchBtn.style.display = schemaSearch.value ? "inline-flex" : "none";
    }
  };

  export function loadSchema() {
    schemaController.load();
  }

  export function renderSchema() {
    schemaController.render();
  }

  export function updateSchemaSearchClearButton() {
    schemaController.updateSearchClearButton();
  }

  export function bindSchemaUi() {
    if (schemaQuickGuideSummary) {
      schemaQuickGuideSummary.addEventListener("click", (event) => {
        if (!shouldKeepSchemaQuickGuideOpen()) return;
        event.preventDefault();
        schemaQuickGuide.open = true;
      });
    }
    if (schemaQuickGuide) {
      schemaQuickGuide.addEventListener("toggle", () => {
        syncSchemaQuickGuide();
      });
    }
    schemaSearch.addEventListener("input", () => {
      updateSchemaSearchClearButton();
      renderSchema();
    });

    clearSchemaSearchBtn.addEventListener("click", () => {
      schemaSearch.value = "";
      updateSchemaSearchClearButton();
      renderSchema();
      schemaSearch.focus();
    });
    if (schemaTypeAllBtn) {
      schemaTypeAllBtn.addEventListener("click", () => {
        const schemaFilterState = getSchemaFilterState();
        setSchemaFilterState({ all: true, selectedTypes: schemaFilterState.selectedTypes });
        schemaController.renderTypeFilters();
        renderSchema();
      });
    }
    if (schemaTypeTableBtn) {
      schemaTypeTableBtn.addEventListener("click", () => {
        const schemaFilterState = getSchemaFilterState();
        const selected = new Set(schemaFilterState.selectedTypes);
        selected.has("table") ? selected.delete("table") : selected.add("table");
        setSchemaFilterState({ all: false, selectedTypes: selected });
        schemaController.renderTypeFilters();
        renderSchema();
      });
    }
    if (schemaTypeViewBtn) {
      schemaTypeViewBtn.addEventListener("click", () => {
        const schemaFilterState = getSchemaFilterState();
        const selected = new Set(schemaFilterState.selectedTypes);
        selected.has("view") ? selected.delete("view") : selected.add("view");
        setSchemaFilterState({ all: false, selectedTypes: selected });
        schemaController.renderTypeFilters();
        renderSchema();
      });
    }
    if (schemaTypeOtherBtn) {
      schemaTypeOtherBtn.addEventListener("click", (event) => {
        event.preventDefault();
        schemaOtherMenu.classList.toggle("open");
      });
    }
    if (schemaOtherMenu) {
      schemaOtherMenu.addEventListener("change", (event) => {
        const input = event.target.closest("[data-schema-other]");
        if (!input) return;
        const type = normalizeSchemaType(input.dataset.schemaOther);
        const schemaFilterState = getSchemaFilterState();
        const selected = new Set(schemaFilterState.selectedTypes);
        if (input.checked) selected.add(type);
        else selected.delete(type);
        setSchemaFilterState({ all: false, selectedTypes: selected });
        schemaController.renderTypeFilters();
        renderSchema();
      });
    }
    if (clearSchemaFiltersBtn) {
      clearSchemaFiltersBtn.addEventListener("click", () => {
        schemaSearch.value = "";
        setSchemaFilterState({ all: false, selectedTypes: new Set(["table", "view"]) });
        updateSchemaSearchClearButton();
        schemaController.renderTypeFilters();
        renderSchema();
        setStatus(t("schema.filtersCleared"), "ok");
      });
    }
    document.addEventListener("click", (event) => {
      if (!schemaOtherMenu || !schemaTypeOtherBtn) return;
      if (!schemaOtherMenu.classList.contains("open")) return;
      if (schemaOtherMenu.contains(event.target) || schemaTypeOtherBtn.contains(event.target)) return;
      schemaOtherMenu.classList.remove("open");
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!schemaOtherMenu || !schemaTypeOtherBtn) return;
      if (!schemaOtherMenu.classList.contains("open")) return;
      event.preventDefault();
      schemaOtherMenu.classList.remove("open");
      schemaTypeOtherBtn.focus();
    });
  }

  export function initSchemaUi() {
    loadSchemaFiltersPreference();
    schemaController.renderTypeFilters();
    updateSchemaSearchClearButton();
    syncSchemaQuickGuide();
  }
