import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSchemaFilterPreference,
  toggleSchemaFilterTypePreference
} from "../../src/core/13-state-preferences.js";

function selectedTypes(state) {
  return Array.from(state.selectedTypes).sort();
}

test("ALL starts a fresh TABLE or VIEW selection", () => {
  const allState = {
    all: true,
    selectedTypes: new Set(["table", "view"])
  };

  const tableState = toggleSchemaFilterTypePreference(allState, "table");
  const viewState = toggleSchemaFilterTypePreference(allState, "view");

  assert.equal(tableState.all, false);
  assert.deepEqual(selectedTypes(tableState), ["table"]);
  assert.equal(viewState.all, false);
  assert.deepEqual(selectedTypes(viewState), ["view"]);
});

test("specific schema filters remain multi-select", () => {
  const tableState = {
    all: false,
    selectedTypes: new Set(["table"])
  };

  const combinedState = toggleSchemaFilterTypePreference(tableState, "view");

  assert.equal(combinedState.all, false);
  assert.deepEqual(selectedTypes(combinedState), ["table", "view"]);
});

test("explicitly deselecting the last schema type keeps an empty filter", () => {
  const tableState = {
    all: false,
    selectedTypes: new Set(["table"])
  };

  const emptyState = toggleSchemaFilterTypePreference(tableState, "table");
  const normalizedEmptyState = normalizeSchemaFilterPreference(emptyState);

  assert.equal(normalizedEmptyState.all, false);
  assert.deepEqual(selectedTypes(normalizedEmptyState), []);
});

test("missing schema-filter preferences retain the default TABLE and VIEW selection", () => {
  const fallbackState = normalizeSchemaFilterPreference({});

  assert.equal(fallbackState.all, false);
  assert.deepEqual(selectedTypes(fallbackState), ["table", "view"]);
});
