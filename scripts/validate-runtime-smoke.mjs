import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { TextDecoder, TextEncoder } from "node:util";
import { extractInlineScripts, extractMarkupText } from "./release-utils.mjs";

var FAKE_DB_STATE_PREFIX = "__hsqlite_fake_db__:";
var fakeDbStateSequence = 0;
var fakeDbStateStore = new Map();

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const cliArgs = process.argv.slice(2);
const artifactArg = cliArgs.find(argument => !argument.startsWith("--")) || "index.html";
const suiteArgument = cliArgs.find(argument => argument.startsWith("--suite="));
const requestedSuites = (suiteArgument ? suiteArgument.slice("--suite=".length) : "cross-surface")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);
const supportedSuites = [
  "cross-surface",
  "database-session",
  "library-settings",
  "execution-grid",
  "sql-map-population"
];
const selectedSuites = requestedSuites.includes("all") ? supportedSuites : requestedSuites;
const unknownSuites = selectedSuites.filter(suite => !supportedSuites.includes(suite));
if (unknownSuites.length) {
  throw new Error(`Unknown runtime suite: ${unknownSuites.join(", ")}. Expected ${supportedSuites.join(", ")} or all.`);
}
const artifactPath = path.isAbsolute(artifactArg)
  ? artifactArg
  : path.join(rootDir, artifactArg);

if (!fs.existsSync(artifactPath)) {
  throw new Error(`Runtime smoke artifact missing: ${path.relative(rootDir, artifactPath)}`);
}

const html = fs.readFileSync(artifactPath, "utf8");
const artifactName = path.relative(rootDir, artifactPath);

const { bootSource, appSource } = extractBootAndAppSource(html);
const htmlIds = extractHtmlIds(html);

for (const suiteName of selectedSuites) {
  const runtime = createHarness(htmlIds, artifactName);
  const context = vm.createContext(runtime.context);

  runScript(bootSource, `${path.basename(artifactPath)}#boot`, context);
  runScript(appSource, `${path.basename(artifactPath)}#app`, context);
  installApplicationTestApi(runtime, context);
  await waitForBoot(runtime);
  await runRuntimeSuite(suiteName, runtime, context);

  const bootState = runtime.document.body.dataset.bootState || "";
  if (bootState !== "ready") {
    throw new Error(`[${suiteName}] expected bootState=ready, got ${bootState || "empty"}.`);
  }
  if (runtime.capturedErrors.length) {
    throw new Error(`[${suiteName}] captured console errors: ${runtime.capturedErrors.join(" | ")}`);
  }

  process.stdout.write(`Runtime suite passed: ${suiteName} (${artifactName})\n`);
}

async function runRuntimeSuite(suiteName, runtime, context) {
  installFakeSqlRuntime(context);
  const suites = {
    "cross-surface": runCrossSurfaceSuite,
    "database-session": runDatabaseSessionSuite,
    "library-settings": runLibrarySettingsSuite,
    "execution-grid": runExecutionGridSuite,
    "sql-map-population": runSqlMapPopulationSuite
  };
  await suites[suiteName](runtime, context);
}

function assertRuntimeFunctions(context, suiteName, functionNames) {
  for (const functionName of functionNames) {
    assert(
      typeof context[functionName] === "function",
      `[${suiteName}] could not find ${functionName}().`
    );
  }
}

async function openRuntimeDatabase(runtime, context) {
  await context.openDbFromBytes("runtime-smoke-db", buildValidSqliteStubBytes());
  const currentDbFileName = context.getCurrentDbFileName();
  const currentDbBytes = context.getCurrentDbBytes();
  assert(
    currentDbFileName === "runtime-smoke-db.db",
    `Runtime smoke expected generated DB filename runtime-smoke-db.db, got ${currentDbFileName || "empty"}.`
  );
  assert(
    ArrayBuffer.isView(currentDbBytes) && currentDbBytes.byteLength > 0,
    "Runtime smoke expected generated DB bytes in authoritative state."
  );
  assert(
    runtime.elementsById.get("runBtn")?.disabled === false,
    "Runtime smoke expected SQL execution to be enabled after DB open."
  );
}

async function runCrossSurfaceSuite(runtime, context) {
  const suiteName = "cross-surface";
  assertRuntimeFunctions(context, suiteName, [
    "openDbFromBytes",
    "getCurrentDbFileName",
    "getCurrentDbBytes",
    "executeSql",
    "getSqlTabsItems",
    "getGridResultSets",
    "getGridColumns"
  ]);
  await openRuntimeDatabase(runtime, context);
  await assertSqlExecutionMixedStatementFlows(runtime, context);
  await assertGeneratedDatabaseReplacementFlows(runtime, context);
}

async function runDatabaseSessionSuite(runtime, context) {
  const suiteName = "database-session";
  assertRuntimeFunctions(context, suiteName, [
    "openDbFromBytes",
    "openDatabasePicker",
    "openRecentDb",
    "getCurrentDbFileName",
    "getCurrentDbBytes",
    "saveRecentDbs",
    "getRecentDbs",
    "renderRecentDbs"
  ]);
  await assertRecentDatabaseFlows(runtime, context);
  await assertDatabaseFileInputFlows(runtime, context);
  await openRuntimeDatabase(runtime, context);
  await assertNewDatabaseCreationFlow(runtime, context);
  await openRuntimeDatabase(runtime, context);
  await assertGeneratedDatabaseReplacementFlows(runtime, context);
}

async function runLibrarySettingsSuite(runtime, context) {
  const suiteName = "library-settings";
  assertRuntimeFunctions(context, suiteName, [
    "setTheme",
    "toggleSessionPersistence",
    "addQueryHistoryEntry",
    "getQuickHistoryItems",
    "openQueryHistoryModal",
    "clearQueryHistory",
    "setFavoriteQueriesState",
    "getFavoriteQueriesState",
    "showToast",
    "exportSettingsConfig",
    "importSettingsConfig",
    "openReleaseNotesModal",
    "getAppVersion",
    "getPendingReleaseVersions"
  ]);
  assertReleaseMetadataFlows(runtime, context);
  assertQueryHistoryFlows(runtime, context);
  assertFavoritesFlows(runtime, context);
  await assertSettingsTransferFlows(runtime, context);
  assertAdvancedLocalizationFlows(runtime, context);
  context.setTheme("light");
  assert(
    runtime.document.documentElement.dataset.theme === "light",
    "Runtime smoke expected theme switch to update documentElement dataset."
  );
  assert(
    context.localStorage.getItem("hSQLiteEditorThemeV1") === "light",
    "Runtime smoke expected theme switch to persist the selected theme."
  );

  const persistedSessionBefore = context.localStorage.getItem("hSQLiteEditorSessionPersistenceV1");
  context.toggleSessionPersistence();
  const persistedSessionAfter = context.localStorage.getItem("hSQLiteEditorSessionPersistenceV1");
  assert(
    persistedSessionBefore !== persistedSessionAfter,
    "Runtime smoke expected session persistence toggle to change stored preference."
  );
}

async function runExecutionGridSuite(runtime, context) {
  const suiteName = "execution-grid";
  assertRuntimeFunctions(context, suiteName, [
    "openDbFromBytes",
    "executeSql",
    "terminateActiveSqlWorker",
    "loadSchema",
    "renderSchema",
    "toggleSort",
    "clearSort",
    "applyFilter",
    "bindColumnResizers",
    "setFrozenColumnsUntil",
    "clearFrozenColumns",
    "moveColumn",
    "bindColumnDragAndDrop",
    "getRowsByScope",
    "openExportModal",
    "isCurrentDbDirty"
  ]);
  assertQuickGuideEmptyState(runtime);
  await openRuntimeDatabase(runtime, context);
  assertQuickGuideAvailableAfterDatabaseLoad(runtime);
  assertSchemaFlows(runtime, context);
  await assertSqlExecutionMultiStatementFlows(runtime, context);
  await assertSqlExecutionMixedStatementFlows(runtime, context);
  await assertSqlExecutionCancellationFlows(runtime, context);
  await assertSqlExecutionMutationFlows(runtime, context);
  seedTabResultState(context);
  const seededTabIds = context.getSqlTabsItems().map((tab) => tab.id);
  assert(seededTabIds.length >= 2, "Runtime smoke expected at least two SQL tabs after seeding tab state.");
  assert(
    context.getSqlTabsItems().every((tab) => Array.isArray(tab.resultSets) && tab.resultSets.length === 1 && tab.filterValue === "seed-filter"),
    "Runtime smoke expected seeded tab result state before valid DB replacement."
  );
  assert(
    context.getGridResultSets().length === 1,
    "Runtime smoke expected active grid result state before valid DB replacement."
  );
  assertSqlTabLifecycleFlows(runtime, context);
  seedTabResultState(context);
  assertTabSwitchStateIsolation(context);
  assertSqlTabDragReorderFlows(runtime, context);
  assertGridStateFlows(runtime, context);
  assertGridColumnDragDropFlows(runtime, context);
  assertGridColumnResizeFlows(runtime, context);
  assertResultExportFlows(runtime, context);
}

async function runSqlMapPopulationSuite(runtime, context) {
  const suiteName = "sql-map-population";
  assertRuntimeFunctions(context, suiteName, [
    "openDbFromBytes",
    "openSqlMap",
    "exportSqlMapPng",
    "bindSqlMapFieldRelationshipDrag",
    "buildSqlMapRelationDraft",
    "runSqlMapRelationPreflight",
    "createSqlMapVirtualRelationship",
    "clearSqlMapVirtualRelationships",
    "openSqlMapDiagnosticSql",
    "copySqlMapDiagnosticSql",
    "runTablePopulationInWorker",
    "openTablePopulationModal",
    "getTablePopulationStrategyOptions"
  ]);
  await openRuntimeDatabase(runtime, context);
  await assertSqlMapFlows(runtime, context);
  await assertSqlMapFieldDragFlows(runtime, context);
  await assertSqlMapExportFlows(runtime, context);
  await assertTablePopulationFlows(runtime, context);
}

async function assertGeneratedDatabaseReplacementFlows(runtime, context) {
  seedTabResultState(context);
  await context.openDbFromBytes("runtime-smoke-db-next", buildValidSqliteStubBytes());
  assert(
    context.getSqlTabsItems().every((tab) => Array.isArray(tab.resultSets) && tab.resultSets.length === 0 && tab.activeResultIndex === 0 && tab.filterValue === ""),
    "Runtime smoke expected valid DB replacement to reset tab-scoped result state."
  );
  assert(
    context.getGridResultSets().length === 0 && context.getGridColumns().length === 0,
    "Runtime smoke expected valid DB replacement to clear active grid state."
  );

  seedTabResultState(context);
  const stableDbName = context.getCurrentDbFileName();
  const stableDbSize = context.getCurrentDbBytes().byteLength;
  const stableTabSnapshot = snapshotTabResultState(context.getSqlTabsItems());
  const stableGridSnapshot = snapshotGridState(context);
  let invalidOpenError = null;
  try {
    await context.openDbFromBytes("invalid-payload", new Uint8Array([0x50, 0x4B, 0x03, 0x04]));
  } catch (error) {
    invalidOpenError = error;
  }

  assert(Boolean(invalidOpenError), "Runtime smoke expected invalid DB bytes to be rejected.");
  assert(
    context.getCurrentDbFileName() === stableDbName,
    "Runtime smoke expected invalid DB replacement to preserve the previous visible DB session."
  );
  assert(
    ArrayBuffer.isView(context.getCurrentDbBytes()) && context.getCurrentDbBytes().byteLength === stableDbSize,
    "Runtime smoke expected invalid DB replacement to preserve previous DB bytes."
  );
  assert(
    JSON.stringify(snapshotTabResultState(context.getSqlTabsItems())) === JSON.stringify(stableTabSnapshot),
    "Runtime smoke expected invalid DB replacement to preserve tab-scoped result state."
  );
  assert(
    JSON.stringify(snapshotGridState(context)) === JSON.stringify(stableGridSnapshot),
    "Runtime smoke expected invalid DB replacement to preserve active grid state."
  );
}

function assertAdvancedLocalizationFlows(runtime, context) {
  const observedHelpTitles = new Set();
  const localizedBackupLabels = {
    "en-US": "Local backup",
    "pt-BR": "Backup local",
    "es-ES": "Copia local"
  };
  const localizedHelpHeadings = {
    "en-US": "Local data and backups",
    "pt-BR": "Dados locais e backups",
    "es-ES": "Datos locales y copias de seguridad"
  };
  for (const locale of ["en-US", "pt-BR", "es-ES"]) {
    context.setLocale(locale, { persist: false });
    assert(runtime.document.documentElement.lang === locale, `Runtime smoke expected document language ${locale}.`);
    const localizedProbe = runtime.document.createElement("div");
    localizedProbe.nodeType = 1;
    localizedProbe.dataset.i18n = "help.title";
    context.translateElement(localizedProbe);
    const helpTitle = localizedProbe.textContent;
    assert(helpTitle === context.t("help.title"), `Runtime smoke expected explicit data-i18n rendering for ${locale}.`);
    observedHelpTitles.add(helpTitle);
    assert(
      context.t("schema.quickGuideHtml").includes(localizedBackupLabels[locale]) &&
        context.t("schema.quickGuideHtml").includes("JSON"),
      `Runtime smoke expected concise local-backup guidance in the Quick guide for ${locale}.`
    );
    assert(
      context.t("help.gridHtml").includes(localizedHelpHeadings[locale]) &&
        context.t("help.gridHtml").includes("JSON"),
      `Runtime smoke expected detailed local-backup guidance in Help for ${locale}.`
    );
    const textStrategies = context.getTablePopulationStrategyOptions({
      name: "notes",
      type: "TEXT",
      notnull: true,
      pk: false,
      hidden: 0,
      defaultValue: null
    });
    assert(
      textStrategies.some(option => option.label === context.t("population.strategy.fixedText")),
      `Runtime smoke expected localized population strategies for ${locale}.`
    );
    context.setStatus(context.t("settings.importFailed"), "error");
    assert(
      runtime.elementsById.get("status")?.textContent === context.t("settings.importFailed"),
      `Runtime smoke expected localized advanced status for ${locale}.`
    );
    assert(
      context.t("worker.noValidSql") !== "worker.noValidSql" && context.t("sqlMap.validationFailed") !== "sqlMap.validationFailed",
      `Runtime smoke expected worker and SQL Map catalogs for ${locale}.`
    );

    const toastContainer = runtime.elementsById.get("toastContainer");
    context.showToast("error", context.t("toast.sqlExecutionFailed"), context.t("status.sqlExecutionFailed"), 0);
    const errorToast = toastContainer?.children.at(-1);
    assert(
      errorToast?.getAttribute("role") === "alert"
        && errorToast?.getAttribute("aria-live") === "assertive"
        && errorToast?.getAttribute("aria-atomic") === "true",
      `Runtime smoke expected an atomic assertive error toast for ${locale}.`
    );
    errorToast?.remove();

    context.showToast("info", context.t("toast.memoryChanges"), context.t("toast.saveDatabaseHint"), 0);
    const infoToast = toastContainer?.children.at(-1);
    assert(
      infoToast?.getAttribute("role") === "status"
        && infoToast?.getAttribute("aria-live") === "polite"
        && infoToast?.getAttribute("aria-atomic") === "true",
      `Runtime smoke expected an atomic polite informational toast for ${locale}.`
    );
    infoToast?.remove();
  }
  assert(observedHelpTitles.size === 3, "Runtime smoke expected distinct help titles for all supported locales.");
  context.setLocale("pt-BR", { persist: false });
}

function extractHtmlIds(markup) {
  return Array.from(markup.matchAll(/\sid="([^"]+)"/g)).map((match) => match[1]);
}

function extractBootAndAppSource(markup) {
  const scripts = extractInlineScripts(markup);
  const combinedScript = scripts.find((source) => source.includes("window.__HSQLITE_BOOT__ = "));
  if (!combinedScript) {
    throw new Error("Runtime smoke could not find embedded boot script.");
  }

  const assignmentToken = "window.__HSQLITE_BOOT__ = ";
  const assignmentStart = combinedScript.indexOf(assignmentToken);
  const objectStart = combinedScript.indexOf("{", assignmentStart);
  if (assignmentStart < 0 || objectStart < 0) {
    throw new Error("Runtime smoke could not parse boot assignment.");
  }

  const objectEnd = findMatchingBrace(combinedScript, objectStart);
  const statementEnd = combinedScript.indexOf(";", objectEnd);
  if (objectEnd < 0 || statementEnd < 0) {
    throw new Error("Runtime smoke could not find the end of the boot assignment.");
  }

  return {
    bootSource: combinedScript.slice(assignmentStart, statementEnd + 1),
    appSource: combinedScript.slice(statementEnd + 1)
  };
}

function findMatchingBrace(source, startIndex) {
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function runScript(source, filename, context) {
  new vm.Script(source, { filename }).runInContext(context);
}

function installApplicationTestApi(runtime, context) {
  const testApi = runtime.context.window.__HSQLITE_TEST_API__;
  if (!testApi || typeof testApi !== "object") {
    throw new Error("Application test API was not exposed to the opt-in runtime harness.");
  }
  Object.assign(context, testApi);
}

async function waitForBoot(runtime) {
  const deadline = Date.now() + 1000;
  while (Date.now() < deadline) {
    if (runtime.document.body.dataset.bootState === "ready") return;
    if (runtime.document.body.dataset.bootState === "failed") {
      throw new Error(`Runtime smoke observed boot failure: ${runtime.statusEl.textContent || "unknown failure"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Runtime smoke timed out waiting for boot readiness. Last state: ${runtime.document.body.dataset.bootState || "empty"}`);
}

function createHarness(htmlIds, artifactName) {
  const localStorageStore = new Map([
    ["hSQLiteEditorFirstRunDoneV1", "true"]
  ]);
  const capturedErrors = [];
  const downloads = [];
  const blobStore = new Map();
  const elementsById = new Map();
  const clipboard = { text: "" };
  const allElements = [];
  const runtimeRefs = { downloads, blobStore, elementsById, allElements };
  const documentListeners = new Map();
  const documentElement = createFakeElement("html", null, runtimeRefs);
  const body = createFakeElement("body", null, runtimeRefs);
  const editorWrap = createFakeElement("div", null, runtimeRefs);
  editorWrap.getBoundingClientRect = () => ({ left: 0, top: 0, width: 960, height: 420 });
  const document = {
    body,
    documentElement,
    currentScript: null,
    activeElement: body,
    createElement: (tagName) => createFakeElement(tagName, document, runtimeRefs),
    createElementNS: (_namespace, tagName) => createFakeElement(tagName, document, runtimeRefs),
    getElementById(id) {
      return elementsById.get(id) || null;
    },
    querySelector(selector) {
      if (selector === 'input[name="exportScope"]:checked') {
        return getExportScopeInputs(elementsById).find((input) => input.checked && !input.disabled) || null;
      }
      if (selector === ".filterInput") {
        return getFilterInputs(runtimeRefs)[0] || null;
      }
      if (selector === ".editor-wrap") {
        return editorWrap;
      }
      if (selector.startsWith("#")) return elementsById.get(selector.slice(1)) || null;
      return null;
    },
    querySelectorAll(selector = "") {
      return [];
    },
    elementFromPoint(clientX, clientY) {
      for (let index = allElements.length - 1; index >= 0; index -= 1) {
        const element = allElements[index];
        if (!element || element.hidden) continue;
        const hasOffsetBox = Number(element.offsetWidth || 0) > 0 || Number(element.offsetHeight || 0) > 0;
        const rect = hasOffsetBox
          ? {
              left: Number(element.offsetLeft || 0),
              top: Number(element.offsetTop || 0),
              width: Number(element.offsetWidth || 0),
              height: Number(element.offsetHeight || 0)
            }
          : typeof element.getBoundingClientRect === "function"
            ? element.getBoundingClientRect()
            : {
                left: 0,
                top: 0,
                width: 0,
                height: 0
              };
        const width = Number(rect.width || element.offsetWidth || 0);
        const height = Number(rect.height || element.offsetHeight || 0);
        if (clientX >= rect.left && clientX <= rect.left + width && clientY >= rect.top && clientY <= rect.top + height) {
          return element;
        }
      }
      return null;
    },
    addEventListener(type, handler) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      if (!documentListeners.has(type)) return;
      documentListeners.set(type, documentListeners.get(type).filter((item) => item !== handler));
    },
    dispatchEvent(event) {
      const payload = event && typeof event === "object" ? event : { type: String(event || "") };
      payload.type = String(payload.type || "");
      payload.target = payload.target || document;
      payload.currentTarget = document;
      if (typeof payload.preventDefault !== "function") {
        payload.defaultPrevented = false;
        payload.preventDefault = () => {
          payload.defaultPrevented = true;
        };
      }
      if (typeof payload.stopPropagation !== "function") {
        payload.stopPropagation = () => {};
      }
      const handlers = documentListeners.get(payload.type) || [];
      handlers.forEach((handler) => handler(payload));
      return !payload.defaultPrevented;
    },
    execCommand() {
      return true;
    }
  };

  body.ownerDocument = document;
  documentElement.ownerDocument = document;
  editorWrap.ownerDocument = document;

  for (const id of htmlIds) {
    const element = createFakeElement("div", document, runtimeRefs);
    element.id = id;
    if (id === "sqlEditor") {
      element.value = "select *\nfrom \nwhere\norder by";
    }
    elementsById.set(id, element);
  }

  const appRoot = elementsById.get("appRoot");
  if (appRoot) {
    appRoot.ownerDocument = document;
  }

  const statusEl = elementsById.get("status") || createFakeElement("div", document);
  statusEl.textContent = "Carregue um arquivo .db para começar.";
  elementsById.set("status", statusEl);

  const location = {
    pathname: `/${artifactName}`,
    reload() {}
  };

  const fakeConsole = {
    log() {},
    info() {},
    warn(...args) {
      const text = args.map(String).join(" ");
      if (/Falha|bootstrap failed/i.test(text)) capturedErrors.push(text);
    },
    error(...args) {
      capturedErrors.push(args.map(formatConsoleValue).join(" "));
    }
  };

  const windowObject = {
    document,
    navigator: {
      platform: "MacIntel",
      userAgent: "Mozilla/5.0",
      languages: ["pt-BR"],
      clipboard: {
        async writeText(text) {
          clipboard.text = String(text ?? "");
        }
      }
    },
    location,
    console: fakeConsole,
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
        removeEventListener() {}
      };
    },
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(callback) {
      return setTimeout(() => callback(Date.now()), 0);
    },
    cancelAnimationFrame(handle) {
      clearTimeout(handle);
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
    Blob: class {
      constructor(parts, options = {}) {
        this.parts = parts;
        this.type = options.type || "";
      }
    },
    URL: {
      createObjectURL(blob) {
        const ref = `blob:runtime-smoke-${blobStore.size + 1}`;
        blobStore.set(ref, blob);
        return ref;
      },
      revokeObjectURL() {}
    },
    Worker: createFakeWorkerClass(runtimeRefs),
    localStorage: {
      getItem(key) {
        return localStorageStore.has(key) ? localStorageStore.get(key) : null;
      },
      setItem(key, value) {
        localStorageStore.set(key, String(value));
      },
      removeItem(key) {
        localStorageStore.delete(key);
      }
    },
    performance: {
      now: () => Date.now()
    },
    isSecureContext: false,
    confirm() {
      return true;
    }
  };

  windowObject.Image = class FakeImage {
    constructor() {
      this.onload = null;
      this._src = "";
    }

    set src(value) {
      this._src = String(value || "");
      if (typeof this.onload === "function") {
        setTimeout(() => this.onload(), 0);
      }
    }

    get src() {
      return this._src;
    }
  };

  windowObject.window = windowObject;
  windowObject.globalThis = windowObject;
  windowObject.self = windowObject;
  windowObject.queueMicrotask = queueMicrotask;
  windowObject.Intl = Intl;
  windowObject.Date = Date;
  windowObject.Math = Math;
  windowObject.JSON = JSON;
  windowObject.TextDecoder = TextDecoder;
  windowObject.TextEncoder = TextEncoder;
  windowObject.CSS = {
    escape(value) {
      return String(value);
    }
  };
  windowObject.HSQLiteCodeEditor = createFakeCodeEditorRuntime();
  windowObject.__HSQLITE_TEST__ = true;

  const context = {
    ...windowObject,
    window: windowObject,
    globalThis: windowObject,
    self: windowObject,
    document,
    console: fakeConsole,
    localStorage: windowObject.localStorage,
    navigator: windowObject.navigator,
    location,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    queueMicrotask,
    requestAnimationFrame: windowObject.requestAnimationFrame,
    cancelAnimationFrame: windowObject.cancelAnimationFrame,
    performance: windowObject.performance,
    Intl,
    Date,
    Math,
    JSON,
    TextDecoder,
    TextEncoder,
    Blob: windowObject.Blob,
    URL: windowObject.URL,
    Worker: windowObject.Worker,
    ResizeObserver: windowObject.ResizeObserver,
    HSQLiteCodeEditor: windowObject.HSQLiteCodeEditor,
    Image: windowObject.Image
  };

  return {
    context,
    document,
    statusEl,
    capturedErrors,
    elementsById,
    downloads,
    clipboard
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createFakeDefaultState() {
  return {
    tables: {
      clientes: {
        type: "table",
        columns: [
          { name: "id", type: "INTEGER", notnull: 1, pk: 1 },
          { name: "uuid", type: "TEXT", notnull: 1, pk: 0 },
          { name: "nome", type: "TEXT", notnull: 0, pk: 0 }
        ],
        rows: [
          { id: 1, uuid: "cli-1", nome: "Ana" },
          { id: 2, uuid: "cli-2", nome: "Bruno" }
        ]
      },
      enderecos: {
        type: "table",
        columns: [
          { name: "id", type: "INTEGER", notnull: 1, pk: 1 },
          { name: "cliente_uuid", type: "TEXT", notnull: 1, pk: 0 },
          { name: "cidade", type: "TEXT", notnull: 0, pk: 0 }
        ],
        rows: [
          { id: 1, cliente_uuid: "cli-1", cidade: "Recife" },
          { id: 2, cliente_uuid: "cli-2", cidade: "Santos" }
        ]
      },
      pedidos: {
        type: "table",
        columns: [
          { name: "id", type: "INTEGER", notnull: 1, pk: 1 },
          { name: "id_cliente", type: "INTEGER", notnull: 1, pk: 0 },
          { name: "total", type: "REAL", notnull: 0, pk: 0 }
        ],
        rows: [
          { id: 1, id_cliente: 1, total: 125.5 },
          { id: 2, id_cliente: 2, total: 89.9 }
        ]
      }
    },
    foreignKeys: {
      pedidos: [{ id: 0, seq: 0, table: "clientes", from: "id_cliente", to: "id" }]
    }
  };
}

function createFakeOrphanedState() {
  return {
    tables: {
      clientes: {
        type: "table",
        columns: [
          { name: "id", type: "INTEGER", notnull: 1, pk: 1 },
          { name: "uuid", type: "TEXT", notnull: 1, pk: 0 },
          { name: "nome", type: "TEXT", notnull: 0, pk: 0 }
        ],
        rows: [
          { id: 1, uuid: "cli-1", nome: "Ana" },
          { id: 2, uuid: "cli-2", nome: "Bruno" },
          { id: 3, uuid: "cli-3", nome: "Carla" }
        ]
      },
      enderecos: {
        type: "table",
        columns: [
          { name: "id", type: "INTEGER", notnull: 1, pk: 1 },
          { name: "cliente_uuid", type: "TEXT", notnull: 1, pk: 0 },
          { name: "cidade", type: "TEXT", notnull: 0, pk: 0 }
        ],
        rows: [
          { id: 1, cliente_uuid: "cli-1", cidade: "Recife" },
          { id: 2, cliente_uuid: "cli-9", cidade: "Santos" }
        ]
      }
    },
    foreignKeys: {}
  };
}

function cloneFakeDbState(state) {
  return JSON.parse(JSON.stringify(state || { tables: {}, foreignKeys: {} }));
}

function createEmptyFakeDbState() {
  return { tables: {}, foreignKeys: {} };
}

function isSqliteStubBytes(bytes) {
  const header = buildValidSqliteStubBytes();
  return bytes.length === header.length && header.every((value, index) => bytes[index] === value);
}

function hasSqliteHeader(bytes) {
  const header = buildValidSqliteStubBytes();
  return bytes.length >= header.length && header.every((value, index) => bytes[index] === value);
}

function readFakeDbState(bytes) {
  const nextBytes = new Uint8Array(bytes || []);
  if (!nextBytes.length) return createEmptyFakeDbState();
  if (isSqliteStubBytes(nextBytes)) return createFakeDefaultState();

  if (hasSqliteHeader(nextBytes)) {
    const decodedTail = new TextDecoder().decode(nextBytes.slice(buildValidSqliteStubBytes().length));
    if (decodedTail.startsWith(FAKE_DB_STATE_PREFIX) && fakeDbStateStore.has(decodedTail)) {
      return cloneFakeDbState(fakeDbStateStore.get(decodedTail));
    }
  }

  const decoded = new TextDecoder().decode(nextBytes);
  if (decoded.startsWith(FAKE_DB_STATE_PREFIX) && fakeDbStateStore.has(decoded)) {
    return cloneFakeDbState(fakeDbStateStore.get(decoded));
  }

  return createEmptyFakeDbState();
}

function persistFakeDbState(state) {
  const snapshot = cloneFakeDbState(state);
  const key = `${FAKE_DB_STATE_PREFIX}${String(++fakeDbStateSequence)}:${JSON.stringify(snapshot)}`;
  fakeDbStateStore.set(key, snapshot);
  return new TextEncoder().encode(key);
}

function buildOrphanedSqliteStubBytes() {
  const header = buildValidSqliteStubBytes();
  const payload = persistFakeDbState(createFakeOrphanedState());
  const nextBytes = new Uint8Array(header.length + payload.length);
  nextBytes.set(header, 0);
  nextBytes.set(payload, header.length);
  return nextBytes;
}

function parseSqlLiteral(rawValue) {
  const trimmed = String(rawValue || "").trim();
  if (/^null$/i.test(trimmed)) return null;
  if (/^'.*'$/.test(trimmed)) return trimmed.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function splitCommaSeparatedValues(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getNextPrimaryKey(table) {
  const primaryColumn = table.columns.find((column) => column.pk === 1);
  if (!primaryColumn) return null;
  const maxValue = table.rows.reduce((currentMax, row) => {
    const rowValue = Number(row[primaryColumn.name]);
    return Number.isFinite(rowValue) ? Math.max(currentMax, rowValue) : currentMax;
  }, 0);
  return maxValue + 1;
}

function ensureTableState(state, tableName) {
  const table = state.tables[tableName];
  if (!table) {
    throw new Error(`no such table: ${tableName}`);
  }
  return table;
}

function applyCreateTable(state, statement) {
  const match = statement.match(/^create\s+table\s+([a-zA-Z_][\w]*)\s*\(([\s\S]+)\)$/i);
  if (!match) return false;

  const tableName = match[1];
  const columnDefinitions = splitCommaSeparatedValues(match[2]);
  const columns = columnDefinitions.map((definition) => {
    const normalizedDefinition = definition.replace(/\s+/g, " ").trim();
    const parts = normalizedDefinition.split(" ");
    const name = parts[0];
    const type = (parts[1] || "TEXT").toUpperCase();
    const isPrimaryKey = /\bprimary key\b/i.test(normalizedDefinition);
    const isNotNull = /\bnot null\b/i.test(normalizedDefinition) || isPrimaryKey;
    return {
      name,
      type,
      notnull: isNotNull ? 1 : 0,
      pk: isPrimaryKey ? 1 : 0
    };
  });

  state.tables[tableName] = {
    type: "table",
    columns,
    rows: []
  };
  return true;
}

function applyInsertInto(state, statement) {
  const match = statement.match(/^insert\s+into\s+([a-zA-Z_][\w]*)\s*\(([^)]+)\)\s*values\s*\(([\s\S]+)\)$/i);
  if (!match) return false;

  const tableName = match[1];
  const table = ensureTableState(state, tableName);
  const columnNames = splitCommaSeparatedValues(match[2]);
  const values = splitCommaSeparatedValues(match[3]).map(parseSqlLiteral);
  const nextRow = {};

  columnNames.forEach((columnName, index) => {
    nextRow[columnName] = values[index];
  });

  table.columns.forEach((column) => {
    if (!(column.name in nextRow)) {
      if (column.pk === 1) {
        nextRow[column.name] = getNextPrimaryKey(table);
      } else {
        nextRow[column.name] = null;
      }
    }
  });

  table.rows.push(nextRow);
  return true;
}

function buildSelectResult(state, statement, statementIndex) {
  const match = statement.match(/^select\s+(.+?)\s+from\s+([a-zA-Z_][\w]*)/i);
  if (!match) return null;

  const requestedColumns = match[1].trim();
  const tableName = match[2];
  const table = ensureTableState(state, tableName);
  const columns = requestedColumns === "*"
    ? table.columns.map((column) => column.name)
    : splitCommaSeparatedValues(requestedColumns);
  const values = table.rows.map((row) => columns.map((columnName) => row[columnName] ?? null));

  return {
    statement,
    statementIndex,
    columns,
    values,
    message: ""
  };
}

function buildSchemaResult(state) {
  return [{
    columns: ["name", "type"],
    values: Object.entries(state.tables).map(([tableName, table]) => [tableName, table.type || "table"])
  }];
}

function buildTableInfoResult(state, tableName) {
  const table = state.tables[tableName];
  if (!table) return [];
  return [{
    columns: ["cid", "name", "type", "notnull", "dflt_value", "pk", "hidden"],
    values: table.columns.map((column, index) => [
      index,
      column.name,
      column.type,
      column.notnull || 0,
      null,
      column.pk || 0,
      column.hidden || 0
    ])
  }];
}

function buildForeignKeysResult(state, tableName) {
  const foreignKeys = state.foreignKeys[tableName] || [];
  if (!foreignKeys.length) return [];
  return [{
    columns: ["id", "seq", "table", "from", "to"],
    values: foreignKeys.map((foreignKey) => [foreignKey.id, foreignKey.seq, foreignKey.table, foreignKey.from, foreignKey.to])
  }];
}

function installFakeSqlRuntime(context) {
  class FakeDatabase {
    constructor(bytes = null) {
      this.bytes = bytes && bytes.length
        ? new Uint8Array(bytes)
        : new Uint8Array();
      this.state = readFakeDbState(this.bytes);
      this.closed = false;
    }

    export() {
      if (!this.bytes.length && Object.keys(this.state.tables).length === 0) {
        return new Uint8Array();
      }
      return persistFakeDbState(this.state);
    }

    exec(query) {
      const sql = String(query || "").trim();
      const normalized = sql.toLowerCase();
      if (normalized.includes("from sqlite_schema")) {
        return buildSchemaResult(this.state);
      }
      const tableInfoMatch = normalized.match(/pragma\s+table_(?:info|xinfo)\('([^']+)'\)/i);
      if (tableInfoMatch) {
        return buildTableInfoResult(this.state, tableInfoMatch[1]);
      }
      const fkListMatch = normalized.match(/pragma\s+foreign_key_list\('([^']+)'\)/i);
      if (fkListMatch) return buildForeignKeysResult(this.state, fkListMatch[1]);
      return [];
    }

    close() {
      this.closed = true;
    }
  }

  const fakeRuntime = { Database: FakeDatabase };
  const fakeInit = async () => fakeRuntime;
  context.window.initSqlJs = fakeInit;
  context.initSqlJs = fakeInit;
}

function buildValidSqliteStubBytes() {
  return new Uint8Array([
    0x53, 0x51, 0x4C, 0x69, 0x74, 0x65, 0x20, 0x66,
    0x6F, 0x72, 0x6D, 0x61, 0x74, 0x20, 0x33, 0x00
  ]);
}

function createFakeRuntimeDbFile(name, bytes = buildValidSqliteStubBytes(), lastModified = 1718064000000) {
  const nextBytes = new Uint8Array(bytes);
  return {
    name,
    size: nextBytes.byteLength,
    lastModified,
    webkitRelativePath: "",
    async arrayBuffer() {
      return new Uint8Array(nextBytes).buffer;
    }
  };
}

function createFakeFileHandle({
  name,
  file,
  initialPermission = "granted",
  requestedPermission = "granted"
}) {
  return {
    name,
    async queryPermission() {
      return initialPermission;
    },
    async requestPermission() {
      return requestedPermission;
    },
    async getFile() {
      return file;
    }
  };
}

async function assertNewDatabaseCreationFlow(runtime, context) {
  const databaseMenuSummary = runtime.elementsById.get("databaseMenuSummary");
  const newDbBtn = runtime.elementsById.get("newDbBtn");
  const newDbModal = runtime.elementsById.get("newDbModal");
  const newDbFileNameInput = runtime.elementsById.get("newDbFileNameInput");
  const confirmNewDbBtn = runtime.elementsById.get("confirmNewDbBtn");

  assert(databaseMenuSummary && newDbBtn && newDbModal && newDbFileNameInput && confirmNewDbBtn, "Runtime smoke expected new-database UI elements.");

  newDbBtn.click();
  assert(
    newDbModal.style.display === "flex",
    "Runtime smoke expected clicking the new-database action to open the creation modal."
  );

  newDbFileNameInput.value = "runtime-empty.db";
  await context.confirmNewDatabase();

  assert(
    context.getCurrentDbFileName() === "runtime-empty.db",
    `Runtime smoke expected new empty database flow to load runtime-empty.db, got ${context.getCurrentDbFileName() || "empty"}.`
  );
  assert(
    context.getCurrentDbSession()?.source === "generated",
    "Runtime smoke expected new empty database flow to create a generated DB session."
  );
  assert(
    runtime.elementsById.get("runBtn")?.disabled === false && runtime.elementsById.get("saveDbBtn")?.disabled === false,
    "Runtime smoke expected creating a new empty database to enable run/save actions."
  );
  assert(
    /Novo banco criado em memória: runtime-empty\.db/i.test(runtime.elementsById.get("status")?.textContent || ""),
    `Runtime smoke expected success feedback after creating a new empty database, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
  );
  assert(
    newDbModal.style.display === "none",
    "Runtime smoke expected new-database modal to close after successful creation."
  );

  context.setEditorValue("create table clientes (id integer primary key, nome text); insert into clientes (nome) values ('Ana'); select id, nome from clientes;");
  await context.executeSql();

  assert(
    context.getGridResultSets().length === 3,
    `Runtime smoke expected generated empty DB execution to surface three result sets, got ${context.getGridResultSets().length}. Status=${runtime.elementsById.get("status")?.textContent || "empty"} Errors=${runtime.capturedErrors.join(" | ") || "none"}.`
  );
  assert(
    context.getGridActiveResultIndex() === 2,
    `Runtime smoke expected generated empty DB execution to activate the tabular SELECT result set, got ${context.getGridActiveResultIndex()}.`
  );
  assert(
    context.getGridColumns().join(",") === "id,nome",
    `Runtime smoke expected generated empty DB SELECT columns id,nome, got ${context.getGridColumns().join(",") || "empty"}.`
  );
  assert(
    context.getGridFilteredRows().length === 1 && context.getGridFilteredRows()[0]?.nome === "Ana",
    "Runtime smoke expected generated empty DB SELECT to render the inserted row."
  );
  assert(
    runtime.elementsById.get("exportCsvBtn")?.disabled === false &&
      runtime.elementsById.get("exportJsonBtn")?.disabled === false,
    "Runtime smoke expected generated empty DB SELECT to enable CSV/JSON exports."
  );
  assert(
    Array.isArray(runtime.elementsById.get("schemaList")?.children) && runtime.elementsById.get("schemaList").children.length >= 1,
    "Runtime smoke expected generated empty DB execution to refresh the schema sidebar with at least one rendered object."
  );
  assert(
    /3 consulta\(s\) executada\(s\)/i.test(runtime.elementsById.get("status")?.textContent || ""),
    `Runtime smoke expected generated empty DB execution status feedback, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
  );
}

function seedTabResultState(context) {
  const seededTabs = [context.createEmptyTab("Seed A", "select 1"), context.createEmptyTab("Seed B", "select 2")];
  context.replaceSqlTabsItems(seededTabs);
  context.setSqlTabsState({ activeTabId: seededTabs[0].id });

  seededTabs.forEach((tab, index) => {
    context.updateTabState(tab.id, {
      resultSets: [
        context.createResultSetState({
          statement: `select ${index + 1}`,
          statementIndex: index,
          columns: ["id"],
          allRows: [{ __rowKey: `seed_${index}`, id: index + 1 }],
          filteredRows: [{ __rowKey: `seed_${index}`, id: index + 1 }],
          message: "seed"
        })
      ],
      activeResultIndex: 0,
      filterValue: "seed-filter"
    });
  });

  const activeTab = context.getSqlTabsItems()[0];
  context.switchSqlTab(activeTab.id);
  context.loadTabState(context.findSqlTabById(activeTab.id));
  context.setFilterValue("seed-filter");
}

function snapshotTabResultState(tabs) {
  return tabs.map((tab) => ({
    id: tab.id,
    resultSetCount: Array.isArray(tab.resultSets) ? tab.resultSets.length : 0,
    activeResultIndex: Number(tab.activeResultIndex || 0),
    filterValue: String(tab.filterValue || "")
  }));
}

function snapshotGridState(context) {
  return {
    resultSetCount: context.getGridResultSets().length,
    columns: [...context.getGridColumns()],
    allRowsCount: context.getGridAllRows().length,
    filteredRowsCount: context.getGridFilteredRows().length,
    activeResultIndex: context.getGridActiveResultIndex(),
    currentPage: context.getGridCurrentPage(),
    pageSize: context.getGridPageSize()
  };
}

function createFakeDataTransfer() {
  const store = new Map();
  return {
    effectAllowed: "",
    dropEffect: "",
    setData(type, value) {
      store.set(String(type || ""), String(value || ""));
    },
    getData(type) {
      return store.get(String(type || "")) || "";
    }
  };
}

function assertTabSwitchStateIsolation(context) {
  const [firstTab, secondTab] = context.getSqlTabsItems();
  assert(firstTab && secondTab, "Runtime smoke expected two tabs for tab-switch isolation checks.");

  context.switchSqlTab(firstTab.id);
  assert(
    context.getActiveSqlTabId() === firstTab.id,
    "Runtime smoke expected first tab to become active after switch."
  );
  assert(
    context.getEditorValue() === "select 1",
    `Runtime smoke expected editor SQL for first tab, got ${context.getEditorValue() || "empty"}.`
  );
  assert(
    context.getGridResultSets()[0]?.statement === "select 1",
    "Runtime smoke expected first tab result set to hydrate into the grid."
  );

  context.switchSqlTab(secondTab.id);
  assert(
    context.getActiveSqlTabId() === secondTab.id,
    "Runtime smoke expected second tab to become active after switch."
  );
  assert(
    context.getEditorValue() === "select 2",
    `Runtime smoke expected editor SQL for second tab, got ${context.getEditorValue() || "empty"}.`
  );
  assert(
    context.getGridResultSets()[0]?.statement === "select 2",
    "Runtime smoke expected second tab result set to hydrate into the grid."
  );

  context.switchSqlTab(firstTab.id);
  assert(
    context.getEditorValue() === "select 1" && context.getGridResultSets()[0]?.statement === "select 1",
    "Runtime smoke expected first tab SQL and result state to be restored after switching back."
  );
}

function assertSqlTabLifecycleFlows(runtime, context) {
  const closeTabConfirmModal = runtime.elementsById.get("closeTabConfirmModal");
  const closeTabConfirmText = runtime.elementsById.get("closeTabConfirmText");
  const closeTabPreview = runtime.elementsById.get("closeTabPreview");

  const baseTab = context.createEmptyTab("Lifecycle Base", "select * from clientes");
  context.replaceSqlTabsItems([baseTab]);
  context.setSqlTabsState({ activeTabId: baseTab.id });
  context.loadTabState(baseTab);

  context.setEditorValue("select * from clientes");
  context.saveCurrentTabState();
  context.addSqlTab();

  const lifecycleTabsAfterAdd = context.getSqlTabsItems();
  assert(
    lifecycleTabsAfterAdd.length === 2,
    `Runtime smoke expected addSqlTab() to create a second tab, got ${lifecycleTabsAfterAdd.length}.`
  );
  assert(
    context.getActiveSqlTabId() === lifecycleTabsAfterAdd[1].id,
    "Runtime smoke expected addSqlTab() to activate the newly created tab."
  );
  assert(
    /Nova aba criada/i.test(runtime.elementsById.get("status")?.textContent || ""),
    `Runtime smoke expected new-tab status feedback, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
  );

  const renderedCloseAction = runtime.elementsById.get("closeActiveSqlTabBtn");
  const renderedRenameAction = runtime.elementsById.get("renameActiveSqlTabBtn");

  assert(renderedCloseAction && renderedRenameAction, "Runtime smoke expected close and rename controls outside the SQL tablist.");
  assert(!renderedCloseAction.disabled && !renderedRenameAction.disabled, "Runtime smoke expected active-tab actions to be enabled when two tabs exist.");
  assert(
    renderedCloseAction.getAttribute("aria-label")?.includes(lifecycleTabsAfterAdd[1].title)
      && renderedRenameAction.getAttribute("aria-label")?.includes(lifecycleTabsAfterAdd[1].title),
    "Runtime smoke expected active-tab action names to identify the current tab."
  );

  context.requestCloseSqlTab(baseTab.id);
  assert(
    closeTabConfirmModal?.style?.display === "flex",
    "Runtime smoke expected closing a tab with SQL content to open the close-tab confirmation modal."
  );
  assert(
    /Lifecycle Base/i.test(closeTabConfirmText?.textContent || ""),
    `Runtime smoke expected close-tab confirmation text to mention the tab title, got ${closeTabConfirmText?.textContent || "empty"}.`
  );
  assert(
    /select \* from clientes/i.test(closeTabPreview?.textContent || ""),
    `Runtime smoke expected close-tab preview to include the tab SQL content, got ${closeTabPreview?.textContent || "empty"}.`
  );

  context.confirmCloseSqlTab();
  assert(
    context.getSqlTabsItems().length === 1,
    "Runtime smoke expected confirmed close to remove the requested SQL tab."
  );
  assert(
    context.getSqlTabsItems()[0]?.id !== baseTab.id,
    "Runtime smoke expected confirmed close to keep only the remaining SQL tab."
  );
  assert(
    closeTabConfirmModal?.style?.display === "none",
    "Runtime smoke expected close-tab confirmation modal to close after confirmation."
  );
  assert(
    /Aba fechada/i.test(runtime.elementsById.get("status")?.textContent || ""),
    `Runtime smoke expected close-tab status feedback, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
  );
}

function assertSqlTabDragReorderFlows(runtime, context) {
  const dragTabs = [
    context.createEmptyTab("Drag A", "select 'a'"),
    context.createEmptyTab("Drag B", "select 'b'"),
    context.createEmptyTab("Drag C", "select 'c'")
  ];

  context.replaceSqlTabsItems(dragTabs);
  context.setSqlTabsState({ activeTabId: dragTabs[1].id });
  context.renderSqlTabs();

  const sqlTabsEl = runtime.elementsById.get("sqlTabs");
  assert(sqlTabsEl && sqlTabsEl.children.length === 3, "Runtime smoke expected three rendered SQL tabs for drag reorder checks.");

  const sourceItem = sqlTabsEl.children[0];
  const sourceButton = sourceItem?.children?.[0];
  const targetItem = sqlTabsEl.children[2];
  const dataTransfer = createFakeDataTransfer();

  assert(sourceButton && targetItem, "Runtime smoke expected source and target SQL tab elements for drag reorder.");

  sourceButton.dispatchEvent({ type: "dragstart", dataTransfer });
  assert(
    sourceButton.classList.contains("dragging") === true,
    "Runtime smoke expected SQL tab dragstart to mark the dragged tab."
  );
  assert(
    dataTransfer.effectAllowed === "move" && dataTransfer.getData("text/plain") === dragTabs[0].id,
    "Runtime smoke expected SQL tab dragstart to expose the dragged tab id through dataTransfer."
  );

  targetItem.dispatchEvent({ type: "dragover", dataTransfer });
  assert(
    targetItem.classList.contains("drag-over") === true && dataTransfer.dropEffect === "move",
    "Runtime smoke expected SQL tab dragover to mark the drop target and advertise move dropEffect."
  );

  targetItem.dispatchEvent({ type: "drop", dataTransfer });
  assert(
    targetItem.classList.contains("drag-over") === false,
    "Runtime smoke expected SQL tab drop to clear the temporary drag-over affordance."
  );
  assert(
    context.getSqlTabsItems().map((tab) => tab.title).join(",") === "Drag B,Drag C,Drag A",
    `Runtime smoke expected SQL tab reorder to move the dragged tab, got ${context.getSqlTabsItems().map((tab) => tab.title).join(",") || "empty"}.`
  );
  assert(
    context.getActiveSqlTabId() === dragTabs[1].id,
    "Runtime smoke expected SQL tab drag reorder to preserve the active tab identity."
  );
  assert(
    sqlTabsEl.children.length === 3,
    "Runtime smoke expected SQL tabs to rerender with the same item count after drag reorder."
  );
}

function assertReleaseMetadataFlows(runtime, context) {
  const appVersion = context.getAppVersion();
  const versionPill = runtime.elementsById.get("appVersionPill");
  const releaseNotesSummary = runtime.elementsById.get("releaseNotesSummary");
  const releaseNotesContent = runtime.elementsById.get("releaseNotesContent");
  const releaseNotesBadge = runtime.elementsById.get("releaseNotesBadge");

  assert(appVersion, "Runtime smoke expected a non-empty app version.");
  assert(versionPill, "Runtime smoke could not find appVersionPill.");
  assert(
    versionPill.textContent === `v${appVersion}`,
    `Runtime smoke expected version pill to be derived from embedded release metadata, got ${versionPill.textContent || "empty"}.`
  );
  assert(
    releaseNotesBadge?.style?.display === "inline-flex",
    "Runtime smoke expected release badge to be visible when no seen version is stored."
  );
  assert(
    releaseNotesBadge?.textContent === "1",
    `Runtime smoke expected release badge to expose a count badge with text 1, got ${releaseNotesBadge?.textContent || "empty"}.`
  );

  context.openReleaseNotesModal(false);
  assert(
    releaseNotesSummary?.textContent?.includes(`versão ${appVersion}`),
    "Runtime smoke expected release notes summary to mention the embedded current version."
  );
  assert(
    releaseNotesContent?.innerHTML?.includes(`v${appVersion}`),
    "Runtime smoke expected release notes content to contain the embedded current version heading."
  );
  assert(
    !/https?:\/\//i.test(releaseNotesContent?.textContent || ""),
    "Runtime smoke expected user-facing release notes content to be normalized without raw URLs."
  );

  const olderSeenVersion = "0.3.84";
  const multiVersionCount = context.getPendingReleaseVersions(appVersion, olderSeenVersion).length;
  context.localStorage.setItem("hSQLiteEditorLastSeenReleaseVersionV1", olderSeenVersion);
  context.evaluateReleaseNotesUpdate();
  assert(
    releaseNotesBadge?.textContent === String(multiVersionCount),
    `Runtime smoke expected release badge count ${multiVersionCount} for older seen version, got ${releaseNotesBadge?.textContent || "empty"}.`
  );

  context.openReleaseNotesModal(false);
  const releaseHeadingsCount = Array.from(releaseNotesContent?.innerHTML?.matchAll(/<h4[^>]*>v/g) || []).length;
  assert(
    releaseHeadingsCount === multiVersionCount,
    `Runtime smoke expected ${multiVersionCount} release sections in modal history, got ${releaseHeadingsCount}.`
  );

  context.localStorage.removeItem("hSQLiteEditorLastSeenReleaseVersionV1");
  context.evaluateReleaseNotesUpdate();
}

async function assertRecentDatabaseFlows(runtime, context) {
  const recentDbList = runtime.elementsById.get("recentDbList");
  const clearRecentDbBtn = runtime.elementsById.get("clearRecentDbBtn");
  const recentSeed = [{
    id: "file|clientes.db|4096|1718064000000",
    name: "clientes.db",
    path: "clientes.db",
    size: 4096,
    lastModified: 1718064000000,
    lastOpenedAt: "2026-06-10T12:00:00.000Z",
    hasHandle: false
  }];

  context.saveRecentDbs(recentSeed);
  assert(
    context.getRecentDbs().length === 1,
    "Runtime smoke expected one persisted recent DB after seeding recent items."
  );
  assert(
    recentDbList?.innerHTML?.includes("clientes.db") && recentDbList?.innerHTML?.includes("Abrir"),
    "Runtime smoke expected recent DB modal list to render the seeded database item."
  );

  clearRecentDbBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(
    context.getRecentDbs().length === 0,
    "Runtime smoke expected clear recent DB action to empty recent DB storage."
  );
  assert(
    recentDbList?.innerHTML?.includes("Nenhum banco recente."),
    "Runtime smoke expected recent DB modal list to render the empty state after clearing."
  );

  const originalShowOpenFilePicker = context.showOpenFilePicker;
  const originalWindowShowOpenFilePicker = context.window.showOpenFilePicker;
  try {
    const pickerFile = createFakeRuntimeDbFile("picker-open.db");
    const pickerHandle = createFakeFileHandle({
      name: pickerFile.name,
      file: pickerFile
    });
    const pickerCalls = [];

    const pickerStub = async () => {
      pickerCalls.push("called");
      return [pickerHandle];
    };

    context.showOpenFilePicker = pickerStub;
    context.window.showOpenFilePicker = pickerStub;

    await context.openDatabasePicker();

    assert(
      pickerCalls.length === 1,
      "Runtime smoke expected openDatabasePicker() to call showOpenFilePicker() exactly once."
    );
    assert(
      context.getCurrentDbFileName() === "picker-open.db",
      `Runtime smoke expected picker-open.db after chooser flow, got ${context.getCurrentDbFileName() || "empty"}.`
    );
    assert(
      context.getCurrentDbSession()?.source === "handle",
      `Runtime smoke expected picker flow to create a handle-backed DB session, got ${context.getCurrentDbSession()?.source || "empty"}.`
    );
    assert(
      context.getRecentDbs().some((item) => item.name === "picker-open.db" && item.hasHandle === true),
      "Runtime smoke expected picker-open.db to be registered as a recent DB with handle support."
    );

    seedTabResultState(context);
    const handleRecentFile = createFakeRuntimeDbFile("recent-handle.db", buildValidSqliteStubBytes(), 1718150400000);
    const handleRecentItem = {
      id: "handle|recent-handle.db|16|1718150400000",
      name: "recent-handle.db",
      path: "recent-handle.db",
      size: 16,
      lastModified: 1718150400000,
      lastOpenedAt: "2026-06-11T12:00:00.000Z",
      hasHandle: true
    };

    context.saveRecentDbs([handleRecentItem]);
    context.setRuntimeTestOverride("getFileHandle", async (id) => {
      if (id !== handleRecentItem.id) return null;
      return createFakeFileHandle({
        name: handleRecentFile.name,
        file: handleRecentFile,
        initialPermission: "prompt",
        requestedPermission: "granted"
      });
    });

    const openRecentButton = recentDbList?.querySelector(`[data-recent-open="${handleRecentItem.id}"]`);
    assert(openRecentButton, "Runtime smoke expected a rendered recent-database open button for UI reopen checks.");
    openRecentButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert(
      context.getCurrentDbFileName() === "recent-handle.db",
      `Runtime smoke expected recent-database UI reopen to switch to recent-handle.db, got ${context.getCurrentDbFileName() || "empty"}.`
    );
    assert(
      context.getCurrentDbSession()?.source === "handle",
      `Runtime smoke expected recent-database UI reopen to keep a handle-backed session, got ${context.getCurrentDbSession()?.source || "empty"}.`
    );
    assert(
      context.getSqlTabsItems().every((tab) => Array.isArray(tab.resultSets) && tab.resultSets.length === 0 && tab.activeResultIndex === 0 && tab.filterValue === ""),
      "Runtime smoke expected recent-database UI reopen to reset tab-scoped result state like a normal DB switch."
    );
    assert(
      context.getGridResultSets().length === 0 && context.getGridColumns().length === 0,
      "Runtime smoke expected recent-database UI reopen to clear active grid state like a normal DB switch."
    );

    seedTabResultState(context);
    const deniedSnapshot = {
      dbName: context.getCurrentDbFileName(),
      dbSize: context.getCurrentDbBytes().byteLength,
      tabState: snapshotTabResultState(context.getSqlTabsItems()),
      gridState: snapshotGridState(context)
    };
    const deniedRecentFile = createFakeRuntimeDbFile("denied-recent.db", buildValidSqliteStubBytes(), 1718236800000);
    const deniedRecentItem = {
      id: "handle|denied-recent.db|16|1718236800000",
      name: "denied-recent.db",
      path: "denied-recent.db",
      size: 16,
      lastModified: 1718236800000,
      lastOpenedAt: "2026-06-11T12:30:00.000Z",
      hasHandle: true
    };

    context.saveRecentDbs([deniedRecentItem]);
    context.setRuntimeTestOverride("getFileHandle", async (id) => {
      if (id !== deniedRecentItem.id) return null;
      return createFakeFileHandle({
        name: deniedRecentFile.name,
        file: deniedRecentFile,
        initialPermission: "prompt",
        requestedPermission: "denied"
      });
    });

    await context.openRecentDb(deniedRecentItem.id);

    assert(
      /não permitiu reabrir automaticamente/i.test(runtime.elementsById.get("status")?.textContent || ""),
      `Runtime smoke expected denied recent reopen warning, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
    );
    assert(
      context.getCurrentDbFileName() === deniedSnapshot.dbName,
      "Runtime smoke expected denied recent reopen to preserve the current DB session."
    );
    assert(
      context.getCurrentDbBytes().byteLength === deniedSnapshot.dbSize,
      "Runtime smoke expected denied recent reopen to preserve current DB bytes."
    );
    assert(
      JSON.stringify(snapshotTabResultState(context.getSqlTabsItems())) === JSON.stringify(deniedSnapshot.tabState),
      "Runtime smoke expected denied recent reopen to preserve tab-scoped result state."
    );
    assert(
      JSON.stringify(snapshotGridState(context)) === JSON.stringify(deniedSnapshot.gridState),
      "Runtime smoke expected denied recent reopen to preserve active grid state."
    );
  } finally {
    context.showOpenFilePicker = originalShowOpenFilePicker;
    context.window.showOpenFilePicker = originalWindowShowOpenFilePicker;
    context.setRuntimeTestOverride("getFileHandle", null);
  }
}

async function assertDatabaseFileInputFlows(runtime, context) {
  const dbFileInput = runtime.elementsById.get("dbFile");
  assert(dbFileInput, "Runtime smoke expected dbFile input for direct file-open checks.");

  seedTabResultState(context);
  const stableSnapshot = {
    dbName: context.getCurrentDbFileName(),
    dbSize: context.getCurrentDbBytes().byteLength,
    tabState: snapshotTabResultState(context.getSqlTabsItems()),
    gridState: snapshotGridState(context)
  };

  dbFileInput.dispatchEvent({
    type: "change",
    target: {
      ...dbFileInput,
      value: "invalid.db",
      files: [createFakeRuntimeDbFile("invalid.db", new Uint8Array([0x50, 0x4B, 0x03, 0x04]))]
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  const invalidOpenStatus = runtime.elementsById.get("status")?.textContent || "";
  const invalidOpenPrefix = context.t("database.openFailed", { reason: "" }).replace(/:\s*$/, "").trim();
  assert(
    invalidOpenStatus.startsWith(invalidOpenPrefix),
    `Runtime smoke expected file-input invalid open warning, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
  );
  assert(
    context.getCurrentDbFileName() === stableSnapshot.dbName,
    "Runtime smoke expected invalid file-input open to preserve the current DB session."
  );
  assert(
    context.getCurrentDbBytes().byteLength === stableSnapshot.dbSize,
    "Runtime smoke expected invalid file-input open to preserve current DB bytes."
  );
  assert(
    JSON.stringify(snapshotTabResultState(context.getSqlTabsItems())) === JSON.stringify(stableSnapshot.tabState),
    "Runtime smoke expected invalid file-input open to preserve tab-scoped result state."
  );
  assert(
    JSON.stringify(snapshotGridState(context)) === JSON.stringify(stableSnapshot.gridState),
    "Runtime smoke expected invalid file-input open to preserve active grid state."
  );
  assert(
    runtime.elementsById.get("runBtn")?.disabled === false,
    "Runtime smoke expected invalid file-input open to preserve SQL execution availability for the current session."
  );

  dbFileInput.dispatchEvent({
    type: "change",
    target: {
      ...dbFileInput,
      value: "valid-content.pdf",
      files: [createFakeRuntimeDbFile("valid-content.pdf")]
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  const invalidExtensionStatus = runtime.elementsById.get("status")?.textContent || "";
  assert(
    invalidExtensionStatus.startsWith(invalidOpenPrefix) && invalidExtensionStatus.includes("valid-content.pdf"),
    `Runtime smoke expected a localized invalid-extension warning, got ${invalidExtensionStatus || "empty"}.`
  );
  assert(
    context.getCurrentDbFileName() === stableSnapshot.dbName
      && context.getCurrentDbBytes().byteLength === stableSnapshot.dbSize,
    "Runtime smoke expected an invalid file extension to preserve the current DB session."
  );
  assert(
    JSON.stringify(snapshotTabResultState(context.getSqlTabsItems())) === JSON.stringify(stableSnapshot.tabState)
      && JSON.stringify(snapshotGridState(context)) === JSON.stringify(stableSnapshot.gridState),
    "Runtime smoke expected an invalid file extension to preserve tab and grid state."
  );

  dbFileInput.dispatchEvent({
    type: "change",
    target: {
      ...dbFileInput,
      value: "input-open.db",
      files: [createFakeRuntimeDbFile("input-open.db")]
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert(
    context.getCurrentDbFileName() === "input-open.db",
    `Runtime smoke expected direct file-input open to load input-open.db, got ${context.getCurrentDbFileName() || "empty"}.`
  );
  assert(
    context.getCurrentDbSession()?.source === "file",
    `Runtime smoke expected direct file-input open to create a file-backed session, got ${context.getCurrentDbSession()?.source || "empty"}.`
  );
  assert(
    context.getSqlTabsItems().every((tab) => Array.isArray(tab.resultSets) && tab.resultSets.length === 0 && tab.activeResultIndex === 0 && tab.filterValue === ""),
    "Runtime smoke expected direct file-input open to reset tab-scoped result state like a normal DB switch."
  );
  assert(
    context.getGridResultSets().length === 0 && context.getGridColumns().length === 0,
    "Runtime smoke expected direct file-input open to clear active grid state like a normal DB switch."
  );
}

function assertQueryHistoryFlows(runtime, context) {
  context.clearQueryHistory();
  context.addQueryHistoryEntry("select * from clientes", "success");
  context.addQueryHistoryEntry("select * from pedidos", "error", "no such table: pedidos");

  const items = context.getQuickHistoryItems();
  assert(items.length === 2, `Runtime smoke expected two query history entries, got ${items.length}.`);
  assert(items[0].status === "error" && items[0].sql === "select * from pedidos", "Runtime smoke expected newest error entry first in query history.");
  assert(items[1].status === "success" && items[1].sql === "select * from clientes", "Runtime smoke expected previous success entry second in query history.");

  context.openQueryHistoryModal();
  const queryHistoryList = runtime.elementsById.get("queryHistoryList");
  assert(
    queryHistoryList?.innerHTML?.includes("select * from pedidos") && queryHistoryList?.innerHTML?.includes("select * from clientes"),
    "Runtime smoke expected query history modal to render stored SQL entries."
  );
  assert(
    queryHistoryList?.innerHTML?.includes("Sucesso") && queryHistoryList?.innerHTML?.includes("Erro"),
    "Runtime smoke expected query history modal to render success and error states."
  );

  const queryHistorySearch = runtime.elementsById.get("queryHistorySearch");
  queryHistorySearch.value = "pedidos";
  context.renderQueryHistory();
  assert(
    /select \* from[\s\S]*pedidos/i.test(queryHistoryList?.innerHTML || ""),
    "Runtime smoke expected query history filter to keep matching entries visible."
  );

  queryHistorySearch.value = "nao-existe";
  context.renderQueryHistory();
  assert(
    /Nenhuma consulta encontrada para o filtro/i.test(queryHistoryList?.innerHTML || ""),
    "Runtime smoke expected query history empty-filter state when no items match the search."
  );

  queryHistorySearch.value = "clientes";
  context.renderQueryHistory();
  const clientesHistoryItem = context.getQuickHistoryItems().find((item) => item.sql === "select * from clientes");
  const loadButton = queryHistoryList?.querySelector(`[data-history-load="${clientesHistoryItem?.id || ""}"]`);
  assert(loadButton, "Runtime smoke expected a rendered query-history load button for replay checks.");
  context.setEditorValue("");
  loadButton.click();
  assert(
    context.getEditorValue() === "select * from clientes",
    `Runtime smoke expected query history replay to load SQL into the active tab, got ${context.getEditorValue() || "empty"}.`
  );
  assert(
    /Consulta carregada do histórico/i.test(runtime.elementsById.get("status")?.textContent || ""),
    `Runtime smoke expected query history replay status feedback, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
  );

  context.clearQueryHistory();
  assert(context.getQuickHistoryItems().length === 0, "Runtime smoke expected clearQueryHistory() to remove all entries.");
}

function assertFavoritesFlows(runtime, context) {
  const favoritesBtn = runtime.elementsById.get("favoritesBtn");
  const clearFavoritesBtn = runtime.elementsById.get("clearFavoritesBtn");
  const favoritesList = runtime.elementsById.get("favoritesList");

  context.setFavoriteQueriesState([{
    id: "fav_runtime_smoke",
    sql: "select * from clientes",
    createdAt: "2026-06-10T12:00:00.000Z"
  }]);
  favoritesBtn.click();

  assert(
    favoritesList?.innerHTML?.includes("select * from clientes") && favoritesList?.innerHTML?.includes("Favorita"),
    "Runtime smoke expected favorites modal to render persisted favorite SQL."
  );

  clearFavoritesBtn.click();
  assert(context.getFavoriteQueriesState().length === 0, "Runtime smoke expected clear favorites action to empty favorite state.");
  assert(
    favoritesList?.innerHTML?.includes("Nenhuma favorita salva."),
    "Runtime smoke expected favorites modal to render the empty state after clearing."
  );
}

async function assertSettingsTransferFlows(runtime, context) {
  const settingsInputs = getSettingsScopeInputs(runtime);
  const settingsTransferModal = runtime.elementsById.get("settingsTransferModal");
  const lastSettingsExportInfo = runtime.elementsById.get("lastSettingsExportInfo");

  if (settingsTransferModal) {
    settingsTransferModal.querySelectorAll = (selector = "") => {
      if (selector === ".cfg-scope") return settingsInputs;
      if (selector === ".cfg-scope:checked") return settingsInputs.filter((input) => input.checked);
      return [];
    };
  }

  settingsInputs.forEach((input) => {
    input.checked = ["favorites", "queryHistory", "theme", "session", "tabPreset"].includes(input.value);
  });
  assert(
    settingsTransferModal?.querySelectorAll(".cfg-scope:checked")?.length === 5,
    "Runtime smoke expected five selected config scopes before settings export."
  );

  context.setFavoriteQueriesState([{
    id: "fav_settings_export",
    sql: "select * from export_scope",
    createdAt: "2026-06-10T12:30:00.000Z"
  }]);
  context.setQueryHistoryState([{
    id: "history_settings_export",
    sql: "select * from audit_log",
    status: "success",
    createdAt: "2026-06-10T12:31:00.000Z"
  }]);
  context.setTheme("light");
  context.setSessionPersistence(false);
  context.setTabNamePresetPreference("star_wars");

  context.exportSettingsConfig();
  const settingsDownload = runtime.downloads.at(-1);
  assert(
    /^hsqlite-config-.*\.json$/.test(settingsDownload?.download || ""),
    `Runtime smoke expected settings export filename, got ${settingsDownload?.download || "empty"}.`
  );

  const exported = JSON.parse(settingsDownload.text || "{}");
  assert(
    Array.isArray(exported.scopes) && exported.scopes.includes("favorites") && exported.scopes.includes("session"),
    "Runtime smoke expected settings export payload to preserve selected scopes."
  );
  assert(
    exported.data?.theme === "light" && exported.data?.session?.shouldPersistSession === false,
    "Runtime smoke expected settings export payload to capture theme and session preferences."
  );
  assert(
    Array.isArray(exported.data?.favorites) && exported.data.favorites[0]?.sql === "select * from export_scope",
    "Runtime smoke expected settings export payload to capture favorites."
  );
  assert(
    Array.isArray(exported.data?.queryHistory) && exported.data.queryHistory[0]?.sql === "select * from audit_log",
    "Runtime smoke expected settings export payload to capture query history."
  );
  assert(
    context.localStorage.getItem("hSQLiteEditorLastSettingsExportAtV1") === exported.exportedAt,
    "Runtime smoke expected settings export to persist the last export timestamp."
  );
  assert(
    /Última exportação:/i.test(lastSettingsExportInfo?.textContent || ""),
    "Runtime smoke expected last settings export info to be rendered after export."
  );

  context.setFavoriteQueriesState([]);
  context.setQueryHistoryState([]);
  context.setTheme("dark");
  context.setSessionPersistence(true);
  context.setTabNamePresetPreference("heman");

  await context.importSettingsConfig({
    async text() {
      return settingsDownload.text;
    }
  });

  assert(
    context.getFavoriteQueriesState()[0]?.sql === "select * from export_scope",
    `Runtime smoke expected settings import to restore favorites. Status: ${runtime.statusEl.textContent || "empty"}.`
  );
  assert(
    context.getQueryHistoryState()[0]?.sql === "select * from audit_log",
    "Runtime smoke expected settings import to restore query history."
  );
  assert(
    runtime.document.documentElement.dataset.theme === "light",
    "Runtime smoke expected settings import to restore theme."
  );
  assert(
    context.localStorage.getItem("hSQLiteEditorSessionPersistenceV1") === "false",
    "Runtime smoke expected settings import to restore session persistence preference."
  );
  assert(
    context.localStorage.getItem("hSQLiteEditorTabNamePresetV1") === "star_wars",
    "Runtime smoke expected settings import to restore tab name preset."
  );

  settingsInputs.forEach((input) => {
    input.checked = input.value === "favorites";
  });
  context.setFavoriteQueriesState([]);
  context.setQueryHistoryState([{
    id: "history_scope_guard",
    sql: "select 'history must remain'",
    status: "success",
    executedAt: "2026-06-10T13:00:00.000Z",
    errorMessage: ""
  }]);
  context.setTheme("dark");
  await context.importSettingsConfig({
    async text() {
      return JSON.stringify({
        version: 1,
        exportedAt: "2026-06-10T13:01:00.000Z",
        scopes: ["favorites", "queryHistory", "theme"],
        data: {
          favorites: [{
            id: "favorite_scope_only",
            sql: "select 'favorite imported'",
            createdAt: "2026-06-10T13:01:00.000Z"
          }],
          queryHistory: [{
            id: "history_must_not_import",
            sql: "select 'wrong history'",
            status: "success",
            executedAt: "2026-06-10T13:01:00.000Z",
            errorMessage: ""
          }],
          theme: "light"
        }
      });
    }
  });
  assert(
    context.getFavoriteQueriesState()[0]?.id === "favorite_scope_only",
    "Runtime smoke expected selected favorites scope to import."
  );
  assert(
    context.getQueryHistoryState()[0]?.id === "history_scope_guard"
      && runtime.document.documentElement.dataset.theme === "dark",
    "Runtime smoke expected unselected history and theme scopes to remain unchanged."
  );

  const beforeInvalidFavorites = JSON.stringify(context.getFavoriteQueriesState());
  await context.importSettingsConfig({
    async text() {
      return JSON.stringify({
        version: 1,
        scopes: ["favorites"],
        data: { favorites: { invalid: true } }
      });
    }
  });
  assert(
    JSON.stringify(context.getFavoriteQueriesState()) === beforeInvalidFavorites,
    "Runtime smoke expected malformed settings payload rejection before state mutation."
  );
  await context.importSettingsConfig({
    async text() {
      return "x".repeat(2_000_001);
    }
  });
  assert(
    JSON.stringify(context.getFavoriteQueriesState()) === beforeInvalidFavorites,
    "Runtime smoke expected oversized settings payload rejection before state mutation."
  );

  settingsInputs.forEach((input) => {
    input.checked = ["favorites", "theme"].includes(input.value);
  });
  context.setFavoriteQueriesState([{
    id: "favorite_atomic_snapshot",
    sql: "select 'atomic snapshot'",
    createdAt: "2026-06-10T13:02:00.000Z"
  }]);
  context.setTheme("dark");
  let shouldFailThemeOnce = true;
  context.setRuntimeTestOverride("setTheme", (value, applyTheme) => {
    if (shouldFailThemeOnce) {
      shouldFailThemeOnce = false;
      throw new Error("forced settings apply failure");
    }
    return applyTheme(value);
  });
  await context.importSettingsConfig({
    async text() {
      return JSON.stringify({
        version: 1,
        scopes: ["favorites", "theme"],
        data: {
          favorites: [{
            id: "favorite_must_roll_back",
            sql: "select 'must roll back'",
            createdAt: "2026-06-10T13:03:00.000Z"
          }],
          theme: "light"
        }
      });
    }
  });
  context.setRuntimeTestOverride("setTheme", null);
  assert(
    context.getFavoriteQueriesState()[0]?.id === "favorite_atomic_snapshot"
      && runtime.document.documentElement.dataset.theme === "dark",
    "Runtime smoke expected settings import failure to roll back earlier scope mutations."
  );
}

async function assertSqlExecutionMutationFlows(runtime, context) {
  const beforeBytes = new Uint8Array(context.getCurrentDbBytes());
  context.setEditorValue("insert into clientes(id, nome) values (4, 'Dora');");
  await context.executeSql();

  assert(
    context.isCurrentDbDirty() === true,
    "Runtime smoke expected mutation SQL to mark the current DB session as dirty."
  );
  assert(
    context.getCurrentDbBytes().byteLength !== beforeBytes.byteLength,
    "Runtime smoke expected mutation SQL to replace in-memory DB bytes with the worker result."
  );
  assert(
    runtime.elementsById.get("saveDbBtn")?.classList?.contains("dirty") === true,
    "Runtime smoke expected mutation SQL to surface dirty-save affordance."
  );
  assert(
    context.getGridResultSets().length === 1 && context.getGridResultSets()[0].message === context.t("worker.noResultSet"),
    "Runtime smoke expected mutation SQL to surface a no-result execution message."
  );
}

async function assertSqlExecutionCancellationFlows(runtime, context) {
  context.setEditorValue("select * from clientes -- runtime_long");
  const previousSnapshot = JSON.stringify(snapshotGridState(context));
  const executionPromise = context.executeSql();
  await new Promise((resolve) => setTimeout(resolve, 5));

  runtime.elementsById.get("cancelSqlBtn")?.click();
  await executionPromise;

  assert(
    runtime.document.body.classList.contains("sql-running") === false,
    "Runtime smoke expected SQL cancellation to leave the busy body state cleared."
  );
  assert(
    runtime.elementsById.get("sqlRunningBar")?.classList?.contains("visible") === false,
    "Runtime smoke expected SQL cancellation to hide the running bar."
  );
  assert(
    /Execução SQL interrompida/i.test(runtime.elementsById.get("status")?.textContent || ""),
    `Runtime smoke expected cancellation status feedback, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
  );
  assert(
    JSON.stringify(snapshotGridState(context)) === previousSnapshot,
    "Runtime smoke expected SQL cancellation to preserve the previously visible grid state."
  );
}

async function assertSqlExecutionMultiStatementFlows(runtime, context) {
  context.setEditorValue("select * from clientes; select * from pedidos;");
  await context.executeSql();

  assert(
    context.getGridResultSets().length === 2,
    `Runtime smoke expected multi-statement execution to surface two result sets, got ${context.getGridResultSets().length}.`
  );
  assert(
    context.getGridResultSets()[0]?.statement === "select * from clientes" && context.getGridResultSets()[1]?.statement === "select * from pedidos",
    "Runtime smoke expected result sets to preserve each executed statement."
  );
  assert(
    context.getGridActiveResultIndex() === 0 && context.getGridColumns().length > 0,
    "Runtime smoke expected multi-statement execution to keep a tabular result set active when one is available."
  );
  assert(
    /2 consulta\(s\) executada\(s\)/i.test(runtime.elementsById.get("status")?.textContent || ""),
    `Runtime smoke expected status line to mention two executed statements, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
  );
}

async function assertSqlExecutionMixedStatementFlows(runtime, context) {
  context.setEditorValue("create table runtime_toolbar (id integer primary key, nome text); insert into runtime_toolbar (nome) values ('Ana'); select id, nome from runtime_toolbar;");
  await context.executeSql();

  assert(
    context.getGridResultSets().length === 3,
    `Runtime smoke expected mixed execution to surface three result sets, got ${context.getGridResultSets().length}.`
  );
  assert(
    context.getGridActiveResultIndex() === 2,
    `Runtime smoke expected the tabular SELECT result set to become active after mixed execution, got ${context.getGridActiveResultIndex()}.`
  );
  assert(
    context.getGridColumns().join(",") === "id,nome",
    `Runtime smoke expected the active mixed result set columns to be id,nome, got ${context.getGridColumns().join(",") || "empty"}.`
  );
  assert(
    runtime.elementsById.get("exportCsvBtn")?.disabled === false && runtime.elementsById.get("exportJsonBtn")?.disabled === false,
    "Runtime smoke expected export actions to stay enabled when mixed execution ends on a tabular SELECT result set."
  );
}

function assertQuickGuideEmptyState(runtime) {
  const quickGuide = runtime.elementsById.get("schemaQuickGuide");
  const quickGuideSummary = runtime.elementsById.get("schemaQuickGuideSummary");

  assert(
    quickGuide?.open === true,
    "Runtime smoke expected the Quick guide to initialize expanded without an active database or schema."
  );

  quickGuide.open = false;
  const toggleAllowed = quickGuideSummary.dispatchEvent({
    type: "click",
    target: quickGuideSummary
  });
  assert(
    toggleAllowed === false && quickGuide.open === true,
    "Runtime smoke expected the Quick guide to remain expanded throughout the true empty state."
  );
}

function assertQuickGuideAvailableAfterDatabaseLoad(runtime) {
  const quickGuide = runtime.elementsById.get("schemaQuickGuide");
  const quickGuideSummary = runtime.elementsById.get("schemaQuickGuideSummary");

  quickGuide.open = false;
  const toggleAllowed = quickGuideSummary.dispatchEvent({
    type: "click",
    target: quickGuideSummary
  });
  assert(
    toggleAllowed === true && quickGuide.open === false,
    "Runtime smoke expected the Quick guide disclosure to become user-controlled after a database loads."
  );
}

function assertSchemaFlows(runtime, context) {
  const schemaList = runtime.elementsById.get("schemaList");
  const schemaSearch = runtime.elementsById.get("schemaSearch");
  const schemaTypeTableBtn = runtime.elementsById.get("schemaTypeTableBtn");
  const clearSchemaFiltersBtn = runtime.elementsById.get("clearSchemaFiltersBtn");

  context.loadSchema();

  assert(
    Array.isArray(schemaList?.children) && schemaList.children.length >= 3,
    `Runtime smoke expected schema list to render multiple objects after DB load, got ${schemaList?.children?.length ?? "empty"}.`
  );

  schemaSearch.value = "ped";
  context.renderSchema();
  assert(
    schemaList.children.length === 1,
    `Runtime smoke expected schema search to reduce rendered objects to one match, got ${schemaList.children.length}.`
  );

  schemaTypeTableBtn.click();
  assert(
    schemaList.children.length === 0 && /Nenhum objeto encontrado/i.test(schemaList.innerHTML || ""),
    "Runtime smoke expected disabling the remaining matching object type to surface the empty schema-filter state."
  );

  clearSchemaFiltersBtn.click();
  assert(
    schemaList.children.length >= 3,
    "Runtime smoke expected clearing schema filters to restore visible schema objects."
  );

  const clientesDetails = schemaList.children.find((entry) => entry.tagName === "DETAILS");
  const clientesSummary = clientesDetails?.children?.[0] || null;
  const clientesFirstField = clientesDetails?.children?.find((entry) => entry.classList?.contains("field")) || null;

  assert(clientesSummary && clientesFirstField, "Runtime smoke expected rendered schema object rows for editor insertion checks.");

  context.setEditorValue("");
  clientesFirstField.dispatchEvent({ type: "click", target: clientesFirstField });
  assert(
    context.getEditorValue() === "clientes.id",
    `Runtime smoke expected schema field click to insert clientes.id into the editor, got ${context.getEditorValue() || "empty"}.`
  );

  context.setEditorValue("");
  clientesSummary.dispatchEvent({
    type: "click",
    target: clientesSummary,
    ctrlKey: true,
    metaKey: false,
    altKey: false
  });
  assert(
    context.getEditorValue() === "clientes",
    `Runtime smoke expected Ctrl/Cmd+click on schema object to insert clientes into the editor, got ${context.getEditorValue() || "empty"}.`
  );
}

function assertGridStateFlows(runtime, context) {
  const filterInputs = getFilterInputs(runtime);
  const seededRows = [
    { __rowKey: "grid_1", id: 3, nome: "Carlos", cidade: "Recife" },
    { __rowKey: "grid_2", id: 1, nome: "Ana", cidade: "Santos" },
    { __rowKey: "grid_3", id: 2, nome: "Bruno", cidade: "Recife" }
  ];

  const resultSet = context.createResultSetState({
    statement: "select id, nome, cidade from clientes",
    statementIndex: 0,
    columns: ["id", "nome", "cidade"],
    allRows: seededRows.map((row) => ({ ...row })),
    filteredRows: seededRows.map((row) => ({ ...row })),
    pageSizeValue: 2,
    currentPageValue: 1,
    columnOrderValue: ["id", "nome", "cidade"]
  });

  context.setGridState({
    resultSets: [resultSet],
    activeResultIndex: 0,
    columns: resultSet.columns,
    allRows: resultSet.allRows,
    filteredRows: resultSet.filteredRows,
    pageSize: resultSet.pageSize,
    currentPage: resultSet.currentPage,
    sortStates: resultSet.sortStates,
    selectedKeys: resultSet.selectedKeys,
    currentRowKey: resultSet.currentRowKey,
    columnOrder: resultSet.columnOrder,
    frozenColumnCount: resultSet.frozenColumnCount
  });

  context.toggleSort("id", false);
  assert(
    context.getGridFilteredRows().map((row) => row.id).join(",") === "1,2,3",
    "Runtime smoke expected grid ascending sort by id."
  );
  context.toggleSort("id", false);
  assert(
    context.getGridFilteredRows().map((row) => row.id).join(",") === "3,2,1",
    "Runtime smoke expected grid descending sort by id."
  );
  context.clearSort();
  assert(context.getGridSortStates().length === 0, "Runtime smoke expected clearSort() to remove all sort states.");

  filterInputs.forEach((input) => {
    input.value = "recife";
  });
  context.applyFilter();
  assert(
    context.getGridFilteredRows().length === 2 && context.getGridFilteredRows().every((row) => row.cidade === "Recife"),
    "Runtime smoke expected grid filter to keep only matching rows."
  );
  assert(context.getGridCurrentPage() === 1, "Runtime smoke expected grid filter to normalize current page.");

  context.setGridState({ pageSize: 1, currentPage: 2 });
  assert(
    context.getGridCurrentPage() === 2 && context.getGridPageSize() === 1,
    "Runtime smoke expected grid page size and page state update."
  );

  context.setGridState({ selectedKeys: new Set(["grid_1", "grid_3"]), currentRowKey: "grid_3" });
  const selectedRows = context.getRowsByScope("selected");
  const currentRows = context.getRowsByScope("current");
  assert(
    selectedRows.length === 2 && selectedRows.every((row) => !Object.prototype.hasOwnProperty.call(row, "__rowKey")),
    "Runtime smoke expected selected scope rows without internal keys."
  );
  assert(
    currentRows.length === 1 && currentRows[0].id === 2,
    "Runtime smoke expected current scope export to return the current row."
  );

  context.moveColumn("cidade", "id", false);
  assert(
    context.getGridColumnOrder().join(",") === "cidade,id,nome",
    `Runtime smoke expected moved column order, got ${context.getGridColumnOrder().join(",") || "empty"}.`
  );

  context.setFrozenColumnsUntil("id");
  assert(context.getGridFrozenColumnCount() === 1, "Runtime smoke expected one frozen column after freezing until id.");
  context.clearFrozenColumns();
  assert(context.getGridFrozenColumnCount() === 0, "Runtime smoke expected clearFrozenColumns() to reset frozen state.");

  const activeResultSet = context.getGridResultSets()[0];
  assert(
    activeResultSet.columnOrder.join(",") === context.getGridColumnOrder().join(","),
    "Runtime smoke expected grid column order to persist back into the active result set."
  );
}

function assertGridColumnDragDropFlows(runtime, context) {
  const tableWrap = runtime.elementsById.get("tableWrap");
  assert(tableWrap, "Runtime smoke could not find tableWrap for grid drag/drop checks.");

  const headerRow = runtime.document.createElement("tr");
  const firstHeader = runtime.document.createElement("th");
  firstHeader.className = "column-draggable";
  firstHeader.dataset.col = "id";
  firstHeader.getBoundingClientRect = () => ({ left: 0, top: 0, width: 120, height: 36 });

  const secondHeader = runtime.document.createElement("th");
  secondHeader.className = "column-draggable";
  secondHeader.dataset.col = "nome";
  secondHeader.getBoundingClientRect = () => ({ left: 140, top: 0, width: 120, height: 36 });

  const thirdHeader = runtime.document.createElement("th");
  thirdHeader.className = "column-draggable";
  thirdHeader.dataset.col = "cidade";
  thirdHeader.getBoundingClientRect = () => ({ left: 280, top: 0, width: 120, height: 36 });

  headerRow.appendChild(firstHeader);
  headerRow.appendChild(secondHeader);
  headerRow.appendChild(thirdHeader);
  tableWrap.innerHTML = "";
  tableWrap.appendChild(headerRow);

  const dragResultSet = context.createResultSetState({
    statement: "select id, nome, cidade from clientes",
    statementIndex: 0,
    columns: ["id", "nome", "cidade"],
    allRows: [{ __rowKey: "drag_grid_1", id: 1, nome: "Ana", cidade: "Santos" }],
    filteredRows: [{ __rowKey: "drag_grid_1", id: 1, nome: "Ana", cidade: "Santos" }],
    pageSizeValue: 50,
    currentPageValue: 1,
    columnOrderValue: ["id", "nome", "cidade"]
  });

  context.setGridState({
    resultSets: [dragResultSet],
    activeResultIndex: 0,
    columns: dragResultSet.columns,
    allRows: dragResultSet.allRows,
    filteredRows: dragResultSet.filteredRows,
    pageSize: dragResultSet.pageSize,
    currentPage: dragResultSet.currentPage,
    sortStates: dragResultSet.sortStates,
    selectedKeys: dragResultSet.selectedKeys,
    currentRowKey: dragResultSet.currentRowKey,
    columnOrder: dragResultSet.columnOrder,
    frozenColumnCount: dragResultSet.frozenColumnCount
  });

  context.bindColumnDragAndDrop();

  const dataTransfer = createFakeDataTransfer();
  firstHeader.dispatchEvent({ type: "dragstart", target: firstHeader, dataTransfer });
  assert(
    firstHeader.classList.contains("dragging-column") === true,
    "Runtime smoke expected grid column dragstart to mark the dragged header."
  );
  assert(
    dataTransfer.effectAllowed === "move" && dataTransfer.getData("text/plain") === "id",
    "Runtime smoke expected grid column dragstart to publish the dragged column id."
  );

  thirdHeader.dispatchEvent({ type: "dragover", target: thirdHeader, clientX: 390, dataTransfer });
  assert(
    thirdHeader.classList.contains("column-drop-after") === true,
    "Runtime smoke expected grid column dragover to mark the target edge."
  );

  thirdHeader.dispatchEvent({ type: "drop", target: thirdHeader, clientX: 390, dataTransfer });
  assert(
    context.getGridColumnOrder().join(",") === "nome,cidade,id",
    `Runtime smoke expected grid drag/drop reorder to move the dragged column, got ${context.getGridColumnOrder().join(",") || "empty"}.`
  );
  assert(
    context.getGridResultSets()[0]?.columnOrder?.join(",") === "nome,cidade,id",
    "Runtime smoke expected grid drag/drop reorder to persist back into the active result set."
  );
  assert(
    /Coluna movida: id/i.test(runtime.elementsById.get("status")?.textContent || ""),
    `Runtime smoke expected grid drag/drop status feedback, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
  );
}

function assertGridColumnResizeFlows(runtime, context) {
  const tableWrap = runtime.elementsById.get("tableWrap");
  assert(tableWrap, "Runtime smoke could not find tableWrap for grid resize checks.");

  const headerRow = runtime.document.createElement("tr");
  const header = runtime.document.createElement("th");
  header.className = "column-draggable";
  header.dataset.col = "nome";
  header.getBoundingClientRect = () => ({ left: 0, top: 0, width: 120, height: 36 });

  const resizer = runtime.document.createElement("span");
  resizer.className = "col-resizer";
  resizer.dataset.col = "nome";
  header.appendChild(resizer);
  headerRow.appendChild(header);

  const tbody = runtime.document.createElement("tbody");
  const bodyRow = runtime.document.createElement("tr");
  const checkboxCell = runtime.document.createElement("td");
  const valueCell = runtime.document.createElement("td");
  bodyRow.appendChild(checkboxCell);
  bodyRow.appendChild(valueCell);
  tbody.appendChild(bodyRow);

  tableWrap.innerHTML = "";
  tableWrap.appendChild(headerRow);
  tableWrap.appendChild(tbody);

  const resizeResultSet = context.createResultSetState({
    statement: "select nome from clientes",
    statementIndex: 0,
    columns: ["nome"],
    allRows: [{ __rowKey: "resize_grid_1", nome: "Ana" }],
    filteredRows: [{ __rowKey: "resize_grid_1", nome: "Ana" }],
    pageSizeValue: 50,
    currentPageValue: 1,
    columnOrderValue: ["nome"]
  });

  context.setGridState({
    resultSets: [resizeResultSet],
    activeResultIndex: 0,
    columns: resizeResultSet.columns,
    allRows: resizeResultSet.allRows,
    filteredRows: resizeResultSet.filteredRows,
    pageSize: resizeResultSet.pageSize,
    currentPage: resizeResultSet.currentPage,
    sortStates: resizeResultSet.sortStates,
    selectedKeys: resizeResultSet.selectedKeys,
    currentRowKey: resizeResultSet.currentRowKey,
    columnOrder: resizeResultSet.columnOrder,
    frozenColumnCount: resizeResultSet.frozenColumnCount,
    columnWidths: {}
  });

  context.bindColumnResizers();

  resizer.dispatchEvent({
    type: "mousedown",
    target: resizer,
    clientX: 100
  });
  assert(
    resizer.classList.contains("active") === true && runtime.document.body.classList.contains("resizing-column") === true,
    "Runtime smoke expected column resize mousedown to activate the resizer and body resize state."
  );

  runtime.document.dispatchEvent({ type: "mousemove", clientX: 145 });
  assert(
    context.getGridColumnWidths().nome === 165,
    `Runtime smoke expected column resize drag to persist width 165, got ${context.getGridColumnWidths().nome || "empty"}.`
  );
  assert(
    header.style.width === "165px" && valueCell.style.width === "165px",
    "Runtime smoke expected column resize drag to apply width styles to header and visible cell."
  );

  runtime.document.dispatchEvent({ type: "mouseup", clientX: 145 });
  assert(
    resizer.classList.contains("active") === false && runtime.document.body.classList.contains("resizing-column") === false,
    "Runtime smoke expected column resize mouseup to clear the active resize affordance."
  );
}

function assertResultExportFlows(runtime, context) {
  const exportCsvBtn = runtime.elementsById.get("exportCsvBtn");
  const exportJsonBtn = runtime.elementsById.get("exportJsonBtn");
  const confirmExportBtn = runtime.elementsById.get("confirmExportBtn");
  const exportAllCount = runtime.elementsById.get("exportAllCount");

  const exportRows = [{ __rowKey: "export_1", id: 1 }];
  const exportResultSet = context.createResultSetState({
    statement: "select id from export_seed",
    statementIndex: 0,
    columns: ["id"],
    allRows: exportRows.map((row) => ({ ...row })),
    filteredRows: exportRows.map((row) => ({ ...row })),
    pageSizeValue: 50,
    currentPageValue: 1,
    columnOrderValue: ["id"]
  });

  context.setGridState({
    resultSets: [exportResultSet],
    activeResultIndex: 0,
    columns: exportResultSet.columns,
    allRows: exportResultSet.allRows,
    filteredRows: exportResultSet.filteredRows,
    pageSize: exportResultSet.pageSize,
    currentPage: exportResultSet.currentPage,
    sortStates: exportResultSet.sortStates,
    selectedKeys: exportResultSet.selectedKeys,
    currentRowKey: exportResultSet.currentRowKey,
    columnOrder: exportResultSet.columnOrder,
    frozenColumnCount: exportResultSet.frozenColumnCount
  });
  context.saveActiveResultSetState();
  context.updateToolbars();

  assert(exportCsvBtn?.disabled === false, "Runtime smoke expected CSV export button enabled with seeded results.");
  assert(exportJsonBtn?.disabled === false, "Runtime smoke expected JSON export button enabled with seeded results.");

  context.openExportModal("csv");
  assert(confirmExportBtn?.disabled === false, "Runtime smoke expected export confirmation enabled when rows exist.");
  assert(
    /1 registro/i.test(exportAllCount?.textContent || ""),
    `Runtime smoke expected export count to reflect seeded rows, got ${exportAllCount?.textContent || "empty"}.`
  );
  confirmExportBtn.click();

  const csvDownload = runtime.downloads.at(-1);
  assert(csvDownload?.download === "resultado_sqlite.csv", "Runtime smoke expected localized CSV export filename.");
  assert(
    csvDownload.text.includes("id") && csvDownload.text.includes("1"),
    "Runtime smoke expected CSV export payload to contain header and row data."
  );

  context.openExportModal("json");
  confirmExportBtn.click();
  const jsonDownload = runtime.downloads.at(-1);
  assert(jsonDownload?.download === "resultado_sqlite.json", "Runtime smoke expected localized JSON export filename.");
  assert(
    /"id"\s*:\s*1/.test(jsonDownload.text),
    "Runtime smoke expected JSON export payload to contain row data."
  );
}

async function assertSqlMapFlows(runtime, context) {
  const sqlMapSqlPreview = runtime.elementsById.get("sqlMapSqlPreview");
  const sqlMapVirtualSummary = runtime.elementsById.get("sqlMapVirtualSummary");
  const sqlMapCopySqlBtn = runtime.elementsById.get("sqlMapCopySqlBtn");
  const sqlMapPasteSqlBtn = runtime.elementsById.get("sqlMapPasteSqlBtn");
  const sqlMapClearPasteSqlBtn = runtime.elementsById.get("sqlMapClearPasteSqlBtn");

  context.openSqlMap();
  context.toggleSqlMapField("clientes", "id", true);
  context.toggleSqlMapField("pedidos", "id_cliente", true);

  assert(
    /from clientes/i.test(sqlMapSqlPreview?.textContent || "") && /join pedidos/i.test(sqlMapSqlPreview?.textContent || ""),
    `Runtime smoke expected SQL Map to generate declared-FK join SQL, got ${sqlMapSqlPreview?.textContent || "empty"}.`
  );
  assert(
    /clientes\.id = pedidos\.id_cliente|pedidos\.id_cliente = clientes\.id/i.test(sqlMapSqlPreview?.textContent || ""),
    "Runtime smoke expected SQL Map join predicate to reflect the declared FK path."
  );
  assert(sqlMapCopySqlBtn?.disabled === false, "Runtime smoke expected SQL Map copy action enabled when generated SQL exists.");
  assert(sqlMapPasteSqlBtn?.disabled === true, "Runtime smoke expected SQL Map paste action disabled while the editor already has content.");
  assert(sqlMapClearPasteSqlBtn?.disabled === false, "Runtime smoke expected SQL Map clear-and-paste action enabled when generated SQL exists and the editor already has content.");
  sqlMapCopySqlBtn.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(
    /from clientes/i.test(runtime.clipboard.text || "") && /join pedidos/i.test(runtime.clipboard.text || ""),
    "Runtime smoke expected SQL Map copy action to write the generated SQL into the clipboard adapter."
  );
  assert(
    /SQL gerado copiado/i.test(runtime.elementsById.get("status")?.textContent || ""),
    `Runtime smoke expected SQL Map copy status feedback, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
  );

  context.setEditorValue("");
  context.updateSqlMapActionButtons();
  assert(sqlMapPasteSqlBtn?.disabled === false, "Runtime smoke expected SQL Map paste action enabled when the editor is empty.");
  sqlMapPasteSqlBtn.click();
  assert(
    /from clientes/i.test(context.getEditorValue()) && /join pedidos/i.test(context.getEditorValue()),
    "Runtime smoke expected SQL Map paste action to load the generated SQL into the active tab."
  );
  assert(
    /SQL gerado colado no editor da aba ativa/i.test(runtime.elementsById.get("status")?.textContent || ""),
    `Runtime smoke expected SQL Map paste status feedback, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
  );

  context.setEditorValue("select 999;");
  context.updateSqlMapActionButtons();
  sqlMapClearPasteSqlBtn.click();
  assert(
    /from clientes/i.test(context.getEditorValue()) && /join pedidos/i.test(context.getEditorValue()),
    "Runtime smoke expected SQL Map clear-and-paste action to replace previous editor content after confirmation."
  );

  context.clearSqlMapSelection();
  const virtualDraft = context.buildSqlMapRelationDraft("enderecos", "cliente_uuid", "clientes", "uuid");
  assert(virtualDraft?.valid === true, "Runtime smoke expected SQL Map virtual relationship draft to be valid for compatible text fields.");
  context.createSqlMapVirtualRelationship(virtualDraft.edge, "Runtime smoke virtual relationship created.");

  assert(
    sqlMapVirtualSummary?.textContent === context.t("sqlMap.virtualSummary", { count: "1", warnings: "" }),
    "Runtime smoke expected SQL Map virtual relationship summary to reflect one active virtual edge."
  );

  context.toggleSqlMapField("clientes", "uuid", true);
  context.toggleSqlMapField("enderecos", "cliente_uuid", true);
  assert(
    /from clientes/i.test(sqlMapSqlPreview?.textContent || "") && /join enderecos/i.test(sqlMapSqlPreview?.textContent || ""),
    "Runtime smoke expected SQL Map to generate SQL through the virtual relationship."
  );
  assert(
    /enderecos\.cliente_uuid = clientes\.uuid|clientes\.uuid = enderecos\.cliente_uuid/i.test(sqlMapSqlPreview?.textContent || ""),
    "Runtime smoke expected SQL Map virtual join predicate to match the created relationship."
  );

  context.clearSqlMapVirtualRelationships();
  assert(
    sqlMapVirtualSummary?.textContent === context.t("sqlMap.virtualHint"),
    "Runtime smoke expected SQL Map virtual summary to return to the empty instruction after clearing virtual edges."
  );
  assert(
    (sqlMapSqlPreview?.textContent || "").includes(context.t("sqlMap.noPath", { table: "enderecos" })),
    "Runtime smoke expected SQL Map SQL preview to reflect missing path after clearing virtual relationships."
  );

  context.closeSqlMap();
}

async function assertSqlMapFieldDragFlows(runtime, context) {
  context.openSqlMap();
  context.clearSqlMapVirtualRelationships();
  context.getSqlMapState().tables.arquivados = {
    fields: [
      { name: "uuid", type: "TEXT", normalizedType: "text", pk: 0 }
    ]
  };
  context.getSqlMapState().tables.clientes.fields.push({
    name: "codigo",
    type: "TEXT",
    normalizedType: "text",
    pk: 0
  });
  context.getSqlMapState().tables.eventos = {
    fields: [
      { name: "codigo_interno", type: "TEXT", normalizedType: "text", pk: 0 }
    ]
  };

  const sqlMapCanvas = runtime.elementsById.get("sqlMapCanvas");
  const sqlMapCanvasWrap = runtime.elementsById.get("sqlMapCanvasWrap");
  const sqlMapVirtualSummary = runtime.elementsById.get("sqlMapVirtualSummary");
  assert(sqlMapCanvas, "Runtime smoke could not find sqlMapCanvas for SQL Map field drag checks.");
  assert(sqlMapCanvasWrap, "Runtime smoke could not find sqlMapCanvasWrap for floating drag checks.");

  sqlMapCanvas.innerHTML = "";
  const sourceRow = runtime.document.createElement("span");
  sourceRow.className = "sql-map-field-row";
  sourceRow.dataset.mapFieldDrag = "clientes::uuid";
  sourceRow.dataset.mapFieldTable = "clientes";
  sourceRow.dataset.mapFieldName = "uuid";
  sourceRow.offsetLeft = 40;
  sourceRow.offsetTop = 40;
  sourceRow.offsetWidth = 140;
  sourceRow.offsetHeight = 24;
  const sourceState = runtime.document.createElement("span");
  sourceState.className = "sql-map-field-drop-state";
  sourceState.setAttribute("aria-hidden", "true");
  sourceRow.appendChild(sourceState);

  const targetRow = runtime.document.createElement("span");
  targetRow.className = "sql-map-field-row";
  targetRow.dataset.mapFieldDrag = "enderecos::cliente_uuid";
  targetRow.dataset.mapFieldTable = "enderecos";
  targetRow.dataset.mapFieldName = "cliente_uuid";
  targetRow.offsetLeft = 220;
  targetRow.offsetTop = 48;
  targetRow.offsetWidth = 180;
  targetRow.offsetHeight = 24;
  const targetState = runtime.document.createElement("span");
  targetState.className = "sql-map-field-drop-state";
  targetState.setAttribute("aria-hidden", "true");
  targetRow.appendChild(targetState);

  const suggestionRow = runtime.document.createElement("span");
  suggestionRow.className = "sql-map-field-row";
  suggestionRow.dataset.mapFieldDrag = "arquivados::uuid";
  suggestionRow.dataset.mapFieldTable = "arquivados";
  suggestionRow.dataset.mapFieldName = "uuid";
  suggestionRow.offsetLeft = 220;
  suggestionRow.offsetTop = 84;
  suggestionRow.offsetWidth = 180;
  suggestionRow.offsetHeight = 24;
  const suggestionState = runtime.document.createElement("span");
  suggestionState.className = "sql-map-field-drop-state";
  suggestionState.setAttribute("aria-hidden", "true");
  suggestionRow.appendChild(suggestionState);

  const prefixSuggestionRow = runtime.document.createElement("span");
  prefixSuggestionRow.className = "sql-map-field-row";
  prefixSuggestionRow.dataset.mapFieldDrag = "eventos::codigo_interno";
  prefixSuggestionRow.dataset.mapFieldTable = "eventos";
  prefixSuggestionRow.dataset.mapFieldName = "codigo_interno";
  prefixSuggestionRow.offsetLeft = 220;
  prefixSuggestionRow.offsetTop = 120;
  prefixSuggestionRow.offsetWidth = 180;
  prefixSuggestionRow.offsetHeight = 24;
  const prefixSuggestionState = runtime.document.createElement("span");
  prefixSuggestionState.className = "sql-map-field-drop-state";
  prefixSuggestionState.setAttribute("aria-hidden", "true");
  prefixSuggestionRow.appendChild(prefixSuggestionState);

  sqlMapCanvas.appendChild(sourceRow);
  sqlMapCanvas.appendChild(targetRow);
  sqlMapCanvas.appendChild(suggestionRow);
  sqlMapCanvas.appendChild(prefixSuggestionRow);

  context.bindSqlMapFieldRelationshipDrag();

  sourceRow.dispatchEvent({
    type: "mousedown",
    button: 0,
    clientX: 40,
    clientY: 40,
    target: sourceRow
  });

  assert(
    sourceRow.classList.contains("drag-source") === true,
    "Runtime smoke expected SQL Map field dragstart to mark the source field."
  );
  assert(
    !sqlMapCanvasWrap.querySelector(".sql-map-field-drag-ghost"),
    "Runtime smoke expected no floating SQL Map field ghost before the drag threshold is crossed."
  );

  context.onSqlMapMouseMove({ clientX: 56, clientY: 52 });
  assert(
    Boolean(sqlMapCanvasWrap.querySelector(".sql-map-field-drag-ghost")),
    "Runtime smoke expected a floating SQL Map field ghost after an intentional drag movement."
  );
  assert(
    Boolean(runtime.elementsById.get("sqlMapLinks")?.querySelector(".sql-map-link.draft")),
    "Runtime smoke expected an SVG draft relationship edge after an intentional drag movement."
  );
  assert(
    suggestionRow.classList.contains("natural-candidate") === true,
    "Runtime smoke expected SQL Map drag to highlight same-name same-type natural FK candidates in other tables."
  );
  assert(
    /Sugestão/i.test(suggestionState.textContent || ""),
    `Runtime smoke expected SQL Map natural FK candidate helper label, got ${suggestionState.textContent || "empty"}.`
  );

  context.resetSqlMapFieldDragRuntime();
  context.syncSqlMapFieldDragUi();
  sourceRow.dataset.mapFieldDrag = "clientes::codigo";
  sourceRow.dataset.mapFieldName = "codigo";
  sourceRow.dispatchEvent({
    type: "mousedown",
    button: 0,
    clientX: 40,
    clientY: 40,
    target: sourceRow
  });
  context.onSqlMapMouseMove({ clientX: 56, clientY: 52 });
  assert(
    prefixSuggestionRow.classList.contains("natural-candidate") === true,
    "Runtime smoke expected SQL Map drag to highlight cod/codigo natural FK candidates across accepted prefixes."
  );
  assert(
    /Sugestão/i.test(prefixSuggestionState.textContent || ""),
    `Runtime smoke expected SQL Map cod/codigo candidate helper label, got ${prefixSuggestionState.textContent || "empty"}.`
  );

  context.resetSqlMapFieldDragRuntime();
  context.syncSqlMapFieldDragUi();
  sourceRow.dataset.mapFieldDrag = "clientes::uuid";
  sourceRow.dataset.mapFieldName = "uuid";
  sourceRow.dispatchEvent({
    type: "mousedown",
    button: 0,
    clientX: 40,
    clientY: 40,
    target: sourceRow
  });
  context.onSqlMapMouseMove({ clientX: 56, clientY: 52 });

  targetRow.dispatchEvent({ type: "mouseenter", target: targetRow });
  assert(
    targetRow.classList.contains("drop-target") === true,
    "Runtime smoke expected SQL Map field hover during drag to mark the target field."
  );
  assert(
    targetRow.classList.contains("drop-target-allowed") === true,
    "Runtime smoke expected SQL Map field hover to classify an allowed drop target."
  );
  assert(
    /Compatível/i.test(targetState.textContent || ""),
    `Runtime smoke expected SQL Map field hover to expose non-color target feedback, got ${targetState.textContent || "empty"}.`
  );

  targetRow.dispatchEvent({
    type: "mouseup",
    button: 0,
    clientX: 120,
    clientY: 48,
    target: targetRow
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert(
    sqlMapVirtualSummary?.textContent === context.t("sqlMap.virtualSummary", { count: "1", warnings: "" }),
    "Runtime smoke expected SQL Map field drag/drop to create one virtual relationship in the summary."
  );
  assert(
    runtime.elementsById.get("status")?.textContent === context.t("sqlMap.relationCreated"),
    `Runtime smoke expected SQL Map field drag/drop status feedback, got ${runtime.elementsById.get("status")?.textContent || "empty"}.`
  );
  assert(
    !sqlMapCanvasWrap.querySelector(".sql-map-field-drag-ghost"),
    "Runtime smoke expected floating SQL Map field ghost cleanup after a successful drop."
  );
  assert(
    !runtime.elementsById.get("sqlMapLinks")?.querySelector(".sql-map-link.draft"),
    "Runtime smoke expected draft relationship edge cleanup after a successful drop."
  );

  context.clearSqlMapVirtualRelationships();
  sourceRow.dispatchEvent({ type: "keydown", key: "Enter", target: sourceRow });
  assert(
    /Origem selecionada: clientes\.uuid/i.test(runtime.elementsById.get("status")?.textContent || ""),
    "Runtime smoke expected Enter on a SQL Map field to select a keyboard relationship source."
  );
  targetRow.dispatchEvent({ type: "keydown", key: "Enter", target: targetRow });
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert(
    context.getSqlMapState().virtualFks.length === 1,
    "Runtime smoke expected the keyboard SQL Map path to create a validated virtual relationship."
  );
  context.clearSqlMapVirtualRelationships();
  context.closeSqlMap();

  const cleanDraft = context.buildSqlMapRelationDraft("clientes", "uuid", "enderecos", "cliente_uuid");
  const invertedCleanDraft = context.buildSqlMapRelationDraft("enderecos", "cliente_uuid", "clientes", "uuid");
  const cleanValidation = await context.runSqlMapRelationPreflight(cleanDraft);
  const invertedValidation = await context.runSqlMapRelationPreflight(invertedCleanDraft);
  assert(
    cleanValidation?.status === "allowed" && invertedValidation?.status === "allowed",
    "Runtime smoke expected SQL Map preflight to revalidate the inverted clean relationship direction successfully."
  );

  await context.openDbFromBytes("runtime-smoke-orphaned", buildOrphanedSqliteStubBytes());
  context.openSqlMap();
  context.handleSqlMapFieldDrop("clientes", "uuid", "enderecos", "cliente_uuid");
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));

  const sqlMapConfirmDataBlock = runtime.elementsById.get("sqlMapConfirmDataBlock");
  const sqlMapConfirmDiagnosticSql = runtime.elementsById.get("sqlMapConfirmDiagnosticSql");
  const sqlMapConfirmCopySqlBtn = runtime.elementsById.get("sqlMapConfirmCopySqlBtn");
  const sqlMapConfirmOpenSqlBtn = runtime.elementsById.get("sqlMapConfirmOpenSqlBtn");
  const sqlMapConfirmCreateBtn = runtime.elementsById.get("sqlMapConfirmCreateBtn");
  const sqlMapConfirmOrphanCounts = runtime.elementsById.get("sqlMapConfirmOrphanCounts");

  assert(
    sqlMapConfirmDataBlock?.hidden === false,
    "Runtime smoke expected blocked-by-data SQL Map validation to expose the diagnostic data block."
  );
  assert(
    sqlMapConfirmCreateBtn?.disabled === true,
    "Runtime smoke expected blocked-by-data SQL Map validation to disable relationship creation."
  );
  assert(
    /LIMIT 200/i.test(sqlMapConfirmDiagnosticSql?.textContent || "") && /"clientes"/.test(sqlMapConfirmDiagnosticSql?.textContent || ""),
    `Runtime smoke expected blocked-by-data diagnostic SQL to be capped and quoted, got ${sqlMapConfirmDiagnosticSql?.textContent || "empty"}.`
  );
  assert(
    /Órfãos distintos/i.test(sqlMapConfirmOrphanCounts?.textContent || ""),
    `Runtime smoke expected blocked-by-data orphan counts summary, got ${sqlMapConfirmOrphanCounts?.textContent || "empty"}.`
  );
  assert(
    sqlMapConfirmCopySqlBtn?.disabled === false && sqlMapConfirmOpenSqlBtn?.disabled === false,
    "Runtime smoke expected blocked-by-data diagnostic actions to be enabled."
  );

  await context.copySqlMapDiagnosticSql();
  assert(
    /fk_without_reference/i.test(runtime.clipboard.text || ""),
    "Runtime smoke expected blocked-by-data diagnostic SQL copy action to populate the clipboard."
  );

  context.openSqlMapDiagnosticSql();
  assert(
    /reference_without_fk/i.test(context.getEditorValue() || ""),
    "Runtime smoke expected blocked-by-data diagnostic SQL to load into the editor without executing."
  );

  context.closeSqlMapRelationConfirm();
  assert(
    context.getSqlMapState().pendingRelationDraft === null,
    "Runtime smoke expected blocked-by-data draft state to clear after closing the relation modal."
  );
  const sqlMapModal = runtime.elementsById.get("sqlMapModal");
  const sqlMapSearch = runtime.elementsById.get("sqlMapSearch");
  assert(
    sqlMapModal?.style.display === "flex" && runtime.document.body.classList.contains("modal-active"),
    "Runtime smoke expected the parent SQL Map modal to recover focus-trap ownership after closing relation confirmation."
  );
  sqlMapSearch.focus();
  let parentTabPrevented = false;
  runtime.document.dispatchEvent({
    type: "keydown",
    key: "Tab",
    shiftKey: true,
    target: sqlMapSearch,
    preventDefault() { parentTabPrevented = true; }
  });
  assert(
    parentTabPrevented,
    "Runtime smoke expected Shift+Tab to remain trapped inside the restored parent SQL Map modal."
  );
  let parentEscapePrevented = false;
  runtime.document.dispatchEvent({
    type: "keydown",
    key: "Escape",
    target: sqlMapSearch,
    preventDefault() { parentEscapePrevented = true; }
  });
  assert(
    parentEscapePrevented && sqlMapModal?.style.display === "none",
    "Runtime smoke expected Escape to close the restored parent SQL Map modal."
  );
  await context.openDbFromBytes("runtime-smoke-db", buildValidSqliteStubBytes());
}

async function assertTablePopulationFlows(runtime, context) {
  await context.openDbFromBytes("runtime-smoke-population", buildValidSqliteStubBytes());
  context.loadSchema();

  const numericOptions = context.getTablePopulationStrategyOptions({
    name: "total",
    type: "REAL",
    notnull: 1,
    pk: 0,
    hidden: 0,
    defaultValue: null
  });
  assert(
    numericOptions.some((option) => option.value === "increment")
      && numericOptions.some((option) => option.value === "random-number"),
    "Runtime smoke expected numeric population strategies to be type-aware."
  );

  context.openTablePopulationModal("clientes");
  assert(
    runtime.elementsById.get("tablePopulationModal")?.style.display === "flex"
      && runtime.elementsById.get("tablePopulationTableName")?.textContent === "clientes"
      && runtime.document.body.classList.contains("modal-active"),
    "Runtime smoke expected the table-level population action to open a labelled modal."
  );
  runtime.elementsById.get("tablePopulationRecordCount").value = "100001";
  context.updateTablePopulationLargeConfirmation();
  assert(
    runtime.elementsById.get("tablePopulationLargeConfirmWrap")?.hidden === false,
    "Runtime smoke expected a large-volume confirmation above 100,000 rows."
  );
  let largePopulationBlocked = false;
  try {
    context.buildTablePopulationPlan();
  } catch (error) {
    largePopulationBlocked = /Confirme o impacto/i.test(error?.message || "");
  }
  assert(
    largePopulationBlocked,
    "Runtime smoke expected population above 100,000 rows to require explicit confirmation."
  );
  context.closeTablePopulationModal();
  assert(
    runtime.elementsById.get("tablePopulationModal")?.style.display === "none"
      && !runtime.elementsById.get("tablePopulationModal")?.classList.contains("is-open"),
    "Runtime smoke expected modal state to clear when the population dialog closes."
  );

  const initialRows = readFakeDbState(context.getCurrentDbBytes()).tables.clientes.rows.length;
  const populationResult = await context.runTablePopulationInWorker({
    table: "clientes",
    rowCount: 3,
    batchSize: 2,
    columns: [
      { name: "id", strategy: "omit" },
      { name: "uuid", strategy: "increment", start: 100, step: 1 },
      { name: "nome", strategy: "fixed-text", value: "QA" }
    ]
  });
  context.applyWorkerDatabaseState(populationResult);
  const populatedState = readFakeDbState(context.getCurrentDbBytes());
  assert(
    populatedState.tables.clientes.rows.length === initialRows + 3,
    "Runtime smoke expected the population worker to insert the requested row count."
  );
  assert(
    populatedState.tables.clientes.rows.slice(-3).every((row) => row.nome === "QA"),
    "Runtime smoke expected prepared population values to follow the normalized strategy plan."
  );

  const stableBytes = new Uint8Array(context.getCurrentDbBytes());
  let failedPopulation = null;
  try {
    await context.runTablePopulationInWorker({
      table: "clientes",
      rowCount: 2,
      columns: [{ name: "missing_column", strategy: "fixed-text", value: "invalid" }]
    });
  } catch (error) {
    failedPopulation = error;
  }
  assert(Boolean(failedPopulation), "Runtime smoke expected an invalid population plan to fail.");
  assert(
    JSON.stringify(Array.from(context.getCurrentDbBytes())) === JSON.stringify(Array.from(stableBytes)),
    "Runtime smoke expected failed population to preserve the active DB bytes."
  );

  let cancelledPopulation = null;
  const pendingPopulation = context.runTablePopulationInWorker({
    table: "clientes",
    rowCount: 2,
    testDelayMs: 40,
    columns: [{ name: "nome", strategy: "fixed-text", value: "cancelled" }]
  }).catch((error) => {
    cancelledPopulation = error;
  });
  context.terminateActiveSqlWorker(true);
  await pendingPopulation;
  assert(
    cancelledPopulation?.cancelled === true,
    "Runtime smoke expected cancelling population to reject with the cancellation contract."
  );
  assert(
    JSON.stringify(Array.from(context.getCurrentDbBytes())) === JSON.stringify(Array.from(stableBytes)),
    "Runtime smoke expected cancelled population to preserve the active DB bytes."
  );

  let oversizedPopulation = null;
  try {
    await context.runTablePopulationInWorker({ table: "clientes", rowCount: 1000001, columns: [] });
  } catch (error) {
    oversizedPopulation = error;
  }
  assert(Boolean(oversizedPopulation), "Runtime smoke expected population above 1,000,000 rows to be blocked.");
}

async function assertSqlMapExportFlows(runtime, context) {
  context.openSqlMap();

  const sqlMapCanvas = runtime.elementsById.get("sqlMapCanvas");
  assert(sqlMapCanvas, "Runtime smoke could not find sqlMapCanvas for export checks.");
  sqlMapCanvas.innerHTML = "";

  const clientesNode = runtime.document.createElement("div");
  clientesNode.className = "sql-map-node";
  clientesNode.dataset.table = "clientes";
  clientesNode.offsetLeft = 40;
  clientesNode.offsetTop = 40;
  clientesNode.offsetWidth = 220;
  clientesNode.offsetHeight = 180;

  const pedidosNode = runtime.document.createElement("div");
  pedidosNode.className = "sql-map-node";
  pedidosNode.dataset.table = "pedidos";
  pedidosNode.offsetLeft = 340;
  pedidosNode.offsetTop = 60;
  pedidosNode.offsetWidth = 220;
  pedidosNode.offsetHeight = 180;

  sqlMapCanvas.appendChild(clientesNode);
  sqlMapCanvas.appendChild(pedidosNode);

  const downloadsBefore = runtime.downloads.length;
  context.exportSqlMapPng();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const exportDownload = runtime.downloads[downloadsBefore];
  assert(exportDownload, "Runtime smoke expected SQL Map export to trigger a download.");
  assert(
    /^mapa-sql-der-.*\.png$/i.test(exportDownload.download || ""),
    `Runtime smoke expected SQL Map export filename to be a PNG artifact, got ${exportDownload?.download || "empty"}.`
  );
  assert(
    exportDownload.type === "image/png",
    `Runtime smoke expected SQL Map export download type image/png, got ${exportDownload?.type || "empty"}.`
  );

  context.closeSqlMap();
}

function createFakeCodeEditorRuntime() {
  return {
    engine: "CodeMirror",
    majorVersion: 6,
    createSqlEditor(options = {}) {
      const textArea = options.textarea;
      let value = String(textArea?.value || "");
      let selectionFrom = 0;
      let selectionTo = 0;
      const inputAttributes = new Map();
      inputAttributes.set("aria-label", String(options.label || "SQL editor"));
      return {
        getContentElement() {
          return {
            setAttribute(name, attributeValue) {
              inputAttributes.set(name, String(attributeValue));
            },
            getAttribute(name) {
              return inputAttributes.get(name) || null;
            }
          };
        },
        getTokenTypeAtCursor() {
          return "";
        },
        getCursorRect() {
          return { left: 24, right: 24, top: 24, bottom: 42 };
        },
        refresh() {},
        focus() {},
        hasFocus() { return true; },
        setTheme() {},
        setValue(nextValue) {
          value = String(nextValue || "");
          selectionFrom = 0;
          selectionTo = 0;
        },
        getValue() {
          return value;
        },
        getSelection() {
          return value.slice(Math.min(selectionFrom, selectionTo), Math.max(selectionFrom, selectionTo));
        },
        getCursorIndex() { return selectionTo; },
        replaceRange(from, to, text) {
          const insert = String(text || "");
          value = value.slice(0, from) + insert + value.slice(to);
          selectionFrom = selectionTo = from + insert.length;
        },
        replaceRanges(replacements) {
          [...(replacements || [])].sort((a, b) => b.from - a.from).forEach(item => {
            value = value.slice(0, item.from) + String(item.text || "") + value.slice(item.to);
          });
        },
        setCursor(index) { selectionFrom = selectionTo = Number(index) || 0; },
        setSelection(from, to) {
          selectionFrom = Number(from) || 0;
          selectionTo = Number(to) || 0;
        },
        scrollIntoView() {},
        setSearchHighlights() {},
        clearSearchHighlights() {},
        setPopupAccessibility({ activeDescendant = "" } = {}) {
          if (activeDescendant) inputAttributes.set("aria-activedescendant", String(activeDescendant));
          else inputAttributes.delete("aria-activedescendant");
        }
      };
    }
  };
}

function createFakeWorkerClass(_runtime) {
  return class FakeWorker {
    constructor(url) {
      this.url = url;
      this.onmessage = null;
      this.onerror = null;
      this._terminated = false;
    }

    postMessage(message) {
      if (this._terminated) return;
      const payload = message?.payload || {};
      const type = String(message?.action || message?.type || "execute");
      const sql = String(payload.sql ?? message?.sql ?? "").trim();
      const dbBytes = new Uint8Array(message?.dbBytes || []);
      const dbState = readFakeDbState(dbBytes);
      const statements = sql
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean);

      const emit = (payload) => {
        if (this._terminated || typeof this.onmessage !== "function") return;
        this.onmessage({ data: payload });
      };

      setTimeout(() => {
        try {
          if (type === "validate-virtual-fk") {
            const edge = payload.edge || message?.edge || {};
            const fromSide = countDistinctOrphans(dbState, edge?.fromTable, edge?.fromColumn, edge?.toTable, edge?.toColumn);
            const toSide = countDistinctOrphans(dbState, edge?.toTable, edge?.toColumn, edge?.fromTable, edge?.fromColumn);
            emit({
              ok: true,
              type: "virtual-fk-validation",
              status: fromSide > 0 || toSide > 0 ? "blocked-data" : "allowed",
              orphanCounts: { fromSide, toSide }
            });
            return;
          }
          if (type === "populate-table") {
            const population = payload.population || message?.population || {};
            const insertedCount = applyFakeTablePopulation(dbState, population);
            emit({
              ok: true,
              type: "population-progress",
              event: "progress",
              completed: insertedCount,
              total: insertedCount
            });
            const nextBytes = persistFakeDbState(dbState);
            const delayMs = Number(population.testDelayMs || 0);
            setTimeout(() => {
              emit({
                ok: true,
                type: "population-done",
                event: "done",
                elapsed: 12,
                insertedCount,
                table: population.table,
                dbBytes: nextBytes.buffer
              });
            }, delayMs);
            return;
          }
          statements.forEach((statement, statementIndex) => {
            emit({
              ok: true,
              type: "statement-start",
              statementIndex,
              totalStatements: statements.length,
              statement
            });
          });
          let mutated = false;
          const resultSets = statements.map((statement, statementIndex) => {
            const isMutation = /^(create|alter|drop|insert|update|delete|replace|vacuum|reindex)\b/i.test(statement);
            if (isMutation) {
              const created = applyCreateTable(dbState, statement);
              const inserted = created ? false : applyInsertInto(dbState, statement);
              if (!created && !inserted) {
                throw new Error(`Unsupported fake runtime mutation: ${statement}`);
              }
              mutated = true;
              return {
                statement,
                statementIndex,
                columns: [],
                values: [],
                messageCode: "noResultSet"
              };
            }

            const selectResult = buildSelectResult(dbState, statement, statementIndex);
            if (!selectResult) {
              throw new Error(`Unsupported fake runtime query: ${statement}`);
            }
            return selectResult;
          });
          const nextBytes = mutated
            ? persistFakeDbState(dbState)
            : new Uint8Array(dbBytes);
          const delayMs = /runtime_long/i.test(sql) ? 40 : 0;
          setTimeout(() => {
            emit({
              ok: true,
              type: "done",
              elapsed: 12,
              resultSets,
              dbBytes: nextBytes.buffer
            });
          }, delayMs);
        } catch (error) {
          if (typeof this.onerror === "function") {
            this.onerror({ message: error?.message || String(error) });
          }
        }
      }, 0);
    }

    terminate() {
      this._terminated = true;
    }
  };
}

function countDistinctOrphans(state, fromTableName, fromColumnName, toTableName, toColumnName) {
  const fromTable = state.tables[fromTableName];
  const toTable = state.tables[toTableName];
  if (!fromTable || !toTable) return 0;
  const targetValues = new Set(
    (toTable.rows || [])
      .map((row) => row[toColumnName])
      .filter((value) => value !== null && value !== undefined)
  );
  const orphanValues = new Set();
  (fromTable.rows || []).forEach((row) => {
    const value = row[fromColumnName];
    if (value === null || value === undefined) return;
    if (!targetValues.has(value)) orphanValues.add(value);
  });
  return orphanValues.size;
}

function buildFakePopulationValue(column, rowIndex) {
  if (column.strategy === "null") return null;
  if (column.strategy === "fixed-number") return Number(column.value || 0);
  if (column.strategy === "increment") return Number(column.start || 0) + rowIndex * Number(column.step || 0);
  if (column.strategy === "random-number") return Number(column.min || 0);
  if (column.strategy === "fixed-text") return String(column.value || "");
  if (column.strategy === "random-text") return `random-${rowIndex + 1}`;
  if (column.strategy === "lorem-text") return `lorem-${rowIndex + 1}`;
  throw new Error(`Unsupported fake population strategy: ${column.strategy}`);
}

function applyFakeTablePopulation(state, population) {
  const table = state.tables[String(population?.table || "")];
  const rowCount = Number(population?.rowCount || 0);
  if (!table) throw new Error("Fake population table does not exist.");
  if (!Number.isInteger(rowCount) || rowCount < 1 || rowCount > 1000000) {
    throw new Error("Fake population row count is invalid.");
  }
  const configByName = new Map((population.columns || []).map((column) => [column.name, column]));
  const knownNames = new Set((table.columns || []).map((column) => column.name));
  for (const name of configByName.keys()) {
    if (!knownNames.has(name)) throw new Error(`Fake population column does not exist: ${name}`);
  }
  const integerPk = (table.columns || []).find((column) => column.pk && /int/i.test(column.type || ""));
  let nextPk = integerPk
    ? Math.max(0, ...(table.rows || []).map((row) => Number(row[integerPk.name] || 0))) + 1
    : 0;
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = {};
    for (const schemaColumn of table.columns || []) {
      const config = configByName.get(schemaColumn.name);
      if (!config || config.strategy === "omit") {
        if (integerPk && schemaColumn.name === integerPk.name) row[schemaColumn.name] = nextPk++;
        else row[schemaColumn.name] = null;
        continue;
      }
      row[schemaColumn.name] = buildFakePopulationValue(config, rowIndex);
    }
    table.rows.push(row);
  }
  return rowCount;
}

function createFakeElement(tagName, ownerDocument, runtime = {}) {
  const attributes = new Map();
  const classes = new Set();
  const children = [];
  const listeners = new Map();
  let innerHTMLValue = "";
  let textContentValue = "";

  const element = {
    tagName: String(tagName || "div").toUpperCase(),
    ownerDocument,
    style: {},
    dataset: {},
    classList: {
      add(...tokens) {
        tokens.forEach((token) => classes.add(token));
      },
      remove(...tokens) {
        tokens.forEach((token) => classes.delete(token));
      },
      toggle(token, force) {
        if (force === true) {
          classes.add(token);
          return true;
        }
        if (force === false) {
          classes.delete(token);
          return false;
        }
        if (classes.has(token)) {
          classes.delete(token);
          return false;
        }
        classes.add(token);
        return true;
      },
      contains(token) {
        return classes.has(token);
      }
    },
    children,
    parentNode: null,
    hidden: false,
    disabled: false,
    checked: false,
    open: false,
    value: "",
    title: "",
    scrollLeft: 0,
    scrollWidth: 0,
    clientWidth: 0,
    appendChild(child) {
      if (child) {
        child.parentNode = this;
        children.push(child);
      }
      return child;
    },
    removeChild(child) {
      const index = children.indexOf(child);
      if (index >= 0) children.splice(index, 1);
      return child;
    },
    remove() {
      if (!this.parentNode) return;
      this.parentNode.removeChild(this);
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      if (!listeners.has(type)) return;
      listeners.set(type, listeners.get(type).filter((item) => item !== handler));
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
      if (name === "class") {
        this.className = String(value || "");
        return;
      }
      this[name] = value;
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    removeAttribute(name) {
      attributes.delete(name);
    },
    querySelector(selector) {
      if (this.id === "exportScopeOptions") {
        if (selector.startsWith('input[name="exportScope"][value="')) {
          const value = selector.match(/value="([^"]+)"/)?.[1] || "";
          return getExportScopeInputs(runtime.elementsById || new Map()).find((input) => input.value === value) || null;
        }
        if (selector.startsWith('[data-export-scope-label="')) {
          const value = selector.match(/data-export-scope-label="([^"]+)"/)?.[1] || "";
          return getExportScopeLabels(runtime).get(value) || null;
        }
      }
      if (selector === ".toast-close") {
        return createFakeElement("button", ownerDocument, runtime);
      }
      return queryElementTree(this, selector)[0] || null;
    },
    querySelectorAll(selector = "") {
      return queryElementTree(this, selector);
    },
    closest(selector = "") {
      let current = this;
      while (current) {
        if (matchesSimpleSelector(current, selector)) return current;
        current = current.parentNode || null;
      }
      return null;
    },
    contains(target) {
      return target === this || children.includes(target) || children.some((child) => child && typeof child.contains === "function" && child.contains(target));
    },
    focus() {
      if (ownerDocument) ownerDocument.activeElement = this;
    },
    blur() {},
    click() {
      if (this.tagName === "A" && this.href && this.download) {
        const blob = runtime.blobStore?.get(this.href) || null;
        runtime.downloads?.push({
          href: this.href,
          download: this.download,
          type: blob?.type || "",
          text: readBlobText(blob)
        });
      }
      const handlers = listeners.get("click") || [];
      handlers.forEach((handler) => handler({ target: this, preventDefault() {}, stopPropagation() {} }));
    },
    dispatchEvent(event) {
      const payload = event && typeof event === "object" ? event : { type: String(event || "") };
      payload.type = String(payload.type || "");
      payload.target = payload.target || this;
      payload.currentTarget = this;
      if (typeof payload.preventDefault !== "function") {
        payload.defaultPrevented = false;
        payload.preventDefault = () => {
          payload.defaultPrevented = true;
        };
      }
      if (typeof payload.stopPropagation !== "function") {
        payload.stopPropagation = () => {};
      }
      const handlers = listeners.get(payload.type) || [];
      handlers.forEach((handler) => handler(payload));
      return !payload.defaultPrevented;
    },
    select() {},
    setSelectionRange() {},
    scrollIntoView() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 100, height: 36 };
    }
  };

  if (Array.isArray(runtime.allElements)) {
    runtime.allElements.push(element);
  }

  if (String(tagName || "").toLowerCase() === "canvas") {
    element.width = 0;
    element.height = 0;
    element.getContext = () => ({
      scale() {},
      drawImage() {}
    });
    element.toBlob = (callback, mimeType = "image/png") => {
      if (typeof callback === "function") {
        callback(new Blob(["fake-png"], { type: mimeType || "image/png" }));
      }
    };
  }

  Object.defineProperty(element, "className", {
    get() {
      return Array.from(classes).join(" ");
    },
    set(value) {
      classes.clear();
      String(value || "").split(/\s+/).map((token) => token.trim()).filter(Boolean).forEach((token) => classes.add(token));
    }
  });

  Object.defineProperty(element, "innerHTML", {
    get() {
      return innerHTMLValue;
    },
    set(value) {
      innerHTMLValue = String(value ?? "");
      children.length = 0;
      hydrateInnerHtmlChildren(element, innerHTMLValue, ownerDocument, runtime);
    }
  });

  Object.defineProperty(element, "textContent", {
    get() {
      return textContentValue;
    },
    set(value) {
      textContentValue = String(value ?? "");
    }
  });

  return element;
}

function formatConsoleValue(value) {
  if (value instanceof Error) return value.stack || value.message;
  return String(value);
}

function hydrateInnerHtmlChildren(parent, html, ownerDocument, runtime) {
  const markup = String(html || "");
  const buttonMatches = markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi);

  for (const match of buttonMatches) {
    const attrs = match[1] || "";
    const text = extractMarkupText(match[2] || "").trim();
    const button = createFakeElement("button", ownerDocument, runtime);
    button.textContent = text;

    const classMatch = attrs.match(/\bclass="([^"]*)"/i);
    if (classMatch) button.className = classMatch[1];

    const dataAttrMatches = attrs.matchAll(/\bdata-([a-z0-9-]+)="([^"]*)"/gi);
    for (const dataMatch of dataAttrMatches) {
      const dataKey = dataMatch[1].replace(/-([a-z])/g, (_full, letter) => letter.toUpperCase());
      button.dataset[dataKey] = dataMatch[2];
    }

    const typeMatch = attrs.match(/\btype="([^"]*)"/i);
    if (typeMatch) button.type = typeMatch[1];

    parent.appendChild(button);
  }
}

function queryElementTree(root, selector = "") {
  const selectorParts = String(selector || "").trim().split(/\s+/).filter(Boolean);
  const matches = [];
  const visit = (node) => {
    if (!node || !Array.isArray(node.children)) return;
    node.children.forEach((child) => {
      if (matchesSelectorChain(child, selectorParts)) matches.push(child);
      visit(child);
    });
  };
  visit(root);
  return matches;
}

function matchesSelectorChain(element, parts) {
  if (!Array.isArray(parts) || !parts.length) return false;
  let current = element;
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const selector = parts[index];
    while (current && !matchesSimpleSelector(current, selector)) {
      current = current.parentNode || null;
    }
    if (!current) return false;
    current = current.parentNode || null;
  }
  return true;
}

function matchesSimpleSelector(element, selector = "") {
  const raw = String(selector || "").trim();
  if (!raw || !element) return false;

  let remainder = raw;
  let expectedTag = "";
  const requiredClasses = [];
  const dataChecks = [];
  let expectedId = "";

  const tagMatch = remainder.match(/^[a-z][a-z0-9-]*/i);
  if (tagMatch) {
    expectedTag = tagMatch[0].toLowerCase();
    remainder = remainder.slice(tagMatch[0].length);
  }

  while (remainder.length) {
    if (remainder.startsWith("#")) {
      const idMatch = remainder.match(/^#([a-z0-9_-]+)/i);
      if (!idMatch) return false;
      expectedId = idMatch[1];
      remainder = remainder.slice(idMatch[0].length);
      continue;
    }
    if (remainder.startsWith(".")) {
      const classMatch = remainder.match(/^\.([a-z0-9_-]+)/i);
      if (!classMatch) return false;
      requiredClasses.push(classMatch[1]);
      remainder = remainder.slice(classMatch[0].length);
      continue;
    }
    if (remainder.startsWith("[data-")) {
      const dataValueMatch = remainder.match(/^\[data-([a-z0-9-]+)="([^"]*)"\]/i);
      if (dataValueMatch) {
        dataChecks.push({
          key: dataValueMatch[1].replace(/-([a-z])/g, (_full, letter) => letter.toUpperCase()),
          value: dataValueMatch[2],
          presenceOnly: false
        });
        remainder = remainder.slice(dataValueMatch[0].length);
        continue;
      }
      const dataPresenceMatch = remainder.match(/^\[data-([a-z0-9-]+)\]/i);
      if (!dataPresenceMatch) return false;
      dataChecks.push({
        key: dataPresenceMatch[1].replace(/-([a-z])/g, (_full, letter) => letter.toUpperCase()),
        value: "",
        presenceOnly: true
      });
      remainder = remainder.slice(dataPresenceMatch[0].length);
      continue;
    }
    return false;
  }

  if (expectedTag && String(element.tagName || "").toLowerCase() !== expectedTag) return false;
  if (expectedId && String(element.id || "") !== expectedId) return false;
  if (requiredClasses.some((token) => !element.classList?.contains(token))) return false;
  if (dataChecks.some(({ key, value, presenceOnly }) => (
    presenceOnly
      ? !Object.prototype.hasOwnProperty.call(element.dataset || {}, key)
      : String(element.dataset?.[key] || "") !== value
  ))) return false;
  return Boolean(expectedTag || expectedId || requiredClasses.length || dataChecks.length);
}

function getExportScopeInputs(elementsById) {
  const exportScopeOptions = elementsById.get("exportScopeOptions");
  if (!exportScopeOptions) return [];
  if (!exportScopeOptions.__exportScopeInputs) {
    exportScopeOptions.__exportScopeInputs = ["all", "selected", "current"].map((value, index) => ({
      value,
      disabled: false,
      checked: index === 0
    }));
  }
  return exportScopeOptions.__exportScopeInputs;
}

function getFilterInputs(runtime) {
  const target = runtime.elementsById || runtime;
  if (!target.__filterInputs) {
    target.__filterInputs = [{
      value: "",
      disabled: false,
      addEventListener() {},
      removeEventListener() {},
      focus() {}
    }];
  }
  return target.__filterInputs;
}

function getSettingsScopeInputs(runtime) {
  const settingsTransferModal = runtime.elementsById.get("settingsTransferModal");
  if (!settingsTransferModal) return [];
  if (!settingsTransferModal.__settingsScopeInputs) {
    settingsTransferModal.__settingsScopeInputs = [
      "favorites",
      "queryHistory",
      "theme",
      "session",
      "tabPreset"
    ].map((value) => ({
      value,
      checked: true,
      disabled: false,
      addEventListener() {},
      removeEventListener() {}
    }));
  }
  return settingsTransferModal.__settingsScopeInputs;
}

function getExportScopeLabels(runtime) {
  if (!runtime.exportScopeLabels) {
    runtime.exportScopeLabels = new Map(
      ["all", "selected", "current"].map((value) => [value, { classList: createTestClassList() }])
    );
  }
  return runtime.exportScopeLabels;
}

function createTestClassList() {
  const set = new Set();
  return {
    add(...tokens) {
      tokens.forEach((token) => set.add(token));
    },
    remove(...tokens) {
      tokens.forEach((token) => set.delete(token));
    },
    toggle(token, force) {
      if (force === true) {
        set.add(token);
        return true;
      }
      if (force === false) {
        set.delete(token);
        return false;
      }
      if (set.has(token)) {
        set.delete(token);
        return false;
      }
      set.add(token);
      return true;
    },
    contains(token) {
      return set.has(token);
    }
  };
}

function readBlobText(blob) {
  if (!blob || !Array.isArray(blob.parts)) return "";
  return blob.parts.map((part) => {
    if (typeof part === "string") return part;
    if (part instanceof Uint8Array) return new TextDecoder().decode(part);
    if (ArrayBuffer.isView(part)) return new TextDecoder().decode(new Uint8Array(part.buffer, part.byteOffset, part.byteLength));
    if (part instanceof ArrayBuffer) return new TextDecoder().decode(new Uint8Array(part));
    return String(part ?? "");
  }).join("");
}
