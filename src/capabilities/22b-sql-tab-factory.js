import { getCurrentTabNamePool, shuffleList } from "./22a-sql-tab-presets.js";
import { createTabState } from "../core/00-contracts.js";
import { getNextSqlTabNameIndex, getNextSqlTabNumber, getSqlTabNameBag, getSqlTabsItems, setSqlTabsState } from "../core/11-state-tabs.js";

export function getNextSqlTabName() {
  const pool = getCurrentTabNamePool();
  const sqlTabs = getSqlTabsItems();
  let nextSqlTabNameIndex = getNextSqlTabNameIndex();
  const nextSqlTabNumber = getNextSqlTabNumber();
  let tabNameBag = getSqlTabNameBag();
  if (!tabNameBag.length) {
    tabNameBag = shuffleList(pool);
    setSqlTabsState({ tabNameBag });
  }
  const usedTitles = new Set(sqlTabs.map(tab => String(tab.title || "").trim()).filter(Boolean));
  const maxAttempts = Math.max(1, tabNameBag.length);

  for (let i = 0; i < maxAttempts; i += 1) {
    const bagIndex = nextSqlTabNameIndex % tabNameBag.length;
    const candidate = String(tabNameBag[bagIndex] || "").trim() || `SQL ${nextSqlTabNumber}`;
    setSqlTabsState({ nextSqlTabNameIndex: (nextSqlTabNameIndex + 1) % Math.max(1, pool.length) });
    if (!usedTitles.has(candidate)) return candidate;
  }

  const baseName = String(tabNameBag[(nextSqlTabNameIndex - 1 + tabNameBag.length) % tabNameBag.length] || "SQL").trim() || "SQL";
  let suffix = 2;
  let fallbackName = `${baseName} ${suffix}`;
  while (usedTitles.has(fallbackName)) {
    suffix += 1;
    fallbackName = `${baseName} ${suffix}`;
  }
  return fallbackName;
}

export function createEmptyTab(title = null, sql = null) {
  const number = getNextSqlTabNumber();
  setSqlTabsState({ nextSqlTabNumber: number + 1 });
  const id = `tab_${Date.now()}_${number}`;
  return createTabState({
    id,
    title: title || getNextSqlTabName(),
    sql: sql ?? "select *\nfrom\nwhere\norder by",
    resultSets: [],
    activeResultIndex: 0,
    filterValue: ""
  });
}
