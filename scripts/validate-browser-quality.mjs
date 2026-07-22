import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const baseUrl = process.env.HSQLITE_BASE_URL || "http://127.0.0.1:4173/";
const browser = await chromium.launch({ headless: true });
const locales = [
  {
    tag: "en-US", subtitle: "Work and learn with SQLite", database: "Database file", run: "RUN",
    editorLabel: "SQL statement editor", autocompleteLabel: "SQL autocomplete suggestions", quickHistoryLabel: "Quick query history", findPlaceholder: "Find...", replacePlaceholder: "Replace with...",
    tableName: "Select table qa_parent", fieldName: "Select field id in table qa_parent",
    relationName: "Create a virtual relationship from qa_virtual_a.code",
    sourceAnnouncement: "Source selected: qa_virtual_a.code.", relationCreated: "Virtual relationship created for this session.",
    blockedAnnouncement: "Virtual relationships between columns in the same table are not supported.",
    populationTitle: "Populate table for QA", exportTitle: "Export result", historyTitle: "Query history",
    favoritesTitle: "Favorite queries", closeTabTitle: "Close tab?", renameTabPrefix: "Rename tab", closeTabPrefix: "Close tab", missingTableCause: "a table or view name was not found",
    helpPrefix: "https://learn.microsoft.com/en-us/", csvFilename: "sqlite_result.csv"
  },
  {
    tag: "pt-BR", subtitle: "Para trabalhar e estudar com SQLite", database: "Arquivo de dados", run: "EXECUTAR",
    editorLabel: "Editor de instruções SQL", autocompleteLabel: "Sugestões de preenchimento automático SQL", quickHistoryLabel: "Histórico rápido de consultas", findPlaceholder: "Localizar...", replacePlaceholder: "Substituir por...",
    tableName: "Selecionar tabela qa_parent", fieldName: "Selecionar campo id da tabela qa_parent",
    relationName: "Criar relacionamento virtual a partir de qa_virtual_a.code",
    sourceAnnouncement: "Origem selecionada: qa_virtual_a.code.", relationCreated: "Relacionamento virtual criado para a sessão atual.",
    blockedAnnouncement: "Relacionamentos virtuais entre colunas da mesma tabela não são suportados.",
    populationTitle: "Popular tabela para QA", exportTitle: "Exportar resultado", historyTitle: "Histórico de consultas",
    favoritesTitle: "Consultas favoritas", closeTabTitle: "Fechar aba?", renameTabPrefix: "Renomear aba", closeTabPrefix: "Fechar aba", missingTableCause: "uma tabela ou view não foi encontrada",
    helpPrefix: "https://learn.microsoft.com/pt-br/", csvFilename: "resultado_sqlite.csv"
  },
  {
    tag: "es-ES", subtitle: "Trabaja y aprende con SQLite", database: "Archivo de datos", run: "EJECUTAR",
    editorLabel: "Editor de sentencias SQL", autocompleteLabel: "Sugerencias de autocompletado SQL", quickHistoryLabel: "Historial rápido de consultas", findPlaceholder: "Buscar...", replacePlaceholder: "Reemplazar por...",
    tableName: "Seleccionar tabla qa_parent", fieldName: "Seleccionar campo id de la tabla qa_parent",
    relationName: "Crear una relación virtual desde qa_virtual_a.code",
    sourceAnnouncement: "Origen seleccionado: qa_virtual_a.code.", relationCreated: "Relación virtual creada para esta sesión.",
    blockedAnnouncement: "No se admiten relaciones virtuales entre columnas de la misma tabla.",
    populationTitle: "Poblar tabla para QA", exportTitle: "Exportar resultado", historyTitle: "Historial de consultas",
    favoritesTitle: "Consultas favoritas", closeTabTitle: "¿Cerrar pestaña?", renameTabPrefix: "Renombrar pestaña", closeTabPrefix: "Cerrar pestaña", missingTableCause: "no se encontró una tabla o vista",
    helpPrefix: "https://learn.microsoft.com/es-es/", csvFilename: "resultado_sqlite.csv"
  }
];
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 }
];
const failures = [];
const results = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

try {
  for (const locale of locales) {
    for (const viewport of viewports) {
      const context = await browser.newContext({ locale: locale.tag, viewport, reducedMotion: "reduce" });
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on("pageerror", error => runtimeErrors.push(error.message));
      page.on("console", message => {
        if (message.type() === "error") runtimeErrors.push(message.text());
      });
      await page.addInitScript(tag => {
        window.__HSQLITE_TEST__ = true;
        localStorage.setItem("hSQLiteEditorFirstRunDoneV1", "true");
        localStorage.setItem("hSQLiteEditorLocaleV1", tag);
      }, locale.tag);
      await page.goto(baseUrl, { waitUntil: "load" });
      await page.waitForFunction(() => document.body.dataset.bootState === "ready");
      await page.evaluate(() => Object.assign(window, window.__HSQLITE_TEST_API__));

      const shell = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        subtitle: document.querySelector(".subtitle")?.textContent?.trim(),
        database: document.querySelector("#databaseMenuSummary > span")?.textContent?.trim(),
        run: document.querySelector("#runBtn span:last-child")?.textContent?.trim(),
        selectedLocales: Array.from(document.querySelectorAll("[data-locale-select]"), select => select.value),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      }));

      assert(shell.lang === locale.tag, `${locale.tag}/${viewport.name}: document language is ${shell.lang}.`);
      assert(shell.selectedLocales.length === 3, `${locale.tag}/${viewport.name}: expected three synchronized locale selectors.`);
      assert(shell.selectedLocales.every(value => value === locale.tag), `${locale.tag}/${viewport.name}: locale selectors are ${shell.selectedLocales.join(", ")}.`);
      assert(shell.subtitle === locale.subtitle, `${locale.tag}/${viewport.name}: subtitle was not localized.`);
      assert(shell.database === locale.database, `${locale.tag}/${viewport.name}: database command was not localized.`);
      assert(shell.run === locale.run, `${locale.tag}/${viewport.name}: run command was not localized.`);
      assert(!shell.pageOverflow, `${locale.tag}/${viewport.name}: document has horizontal overflow.`);
      assert(runtimeErrors.length === 0, `${locale.tag}/${viewport.name}: runtime errors: ${runtimeErrors.join(" | ")}`);

      const editor = page.locator(".cm-content");
      assert(await editor.count() === 1, `${locale.tag}/${viewport.name}: CodeMirror 6 content surface is missing.`);
      assert(await editor.getAttribute("aria-label") === locale.editorLabel, `${locale.tag}/${viewport.name}: editor accessible name is not localized.`);
      assert(await editor.getAttribute("aria-multiline") === "true", `${locale.tag}/${viewport.name}: editor is not exposed as multiline.`);
      assert(await editor.getAttribute("aria-autocomplete") === "list", `${locale.tag}/${viewport.name}: editor does not expose list autocomplete semantics.`);
      assert(await editor.getAttribute("aria-controls") === "autocomplete queryHistoryPopover", `${locale.tag}/${viewport.name}: editor does not identify its controlled suggestion surfaces.`);
      assert(await page.evaluate(() => window.HSQLiteCodeEditor?.majorVersion) === 6, `${locale.tag}/${viewport.name}: editor major version is not 6.`);
      assert(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), `${locale.tag}/${viewport.name}: reduced-motion browser preference is not active.`);

      await page.evaluate(() => {
        setEditorValue("select 1");
        cmEditor.setCursor(getEditorValue().length);
      });
      await editor.focus();
      await page.keyboard.type(" + 1");
      assert(await page.evaluate(() => getEditorValue()) === "select 1 + 1", `${locale.tag}/${viewport.name}: keyboard typing did not update the editor.`);
      await page.keyboard.down("Shift");
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.up("Shift");
      assert(await page.evaluate(() => getEditorSelection()) === "1", `${locale.tag}/${viewport.name}: keyboard selection did not update the editor.`);

      await page.evaluate(() => setEditorValue("select alpha, alpha"));
      await editor.focus();
      await page.keyboard.press("Control+f");
      await page.locator("#sqlFindPanel.open").waitFor();
      assert(await page.locator("#sqlFindInput").getAttribute("placeholder") === locale.findPlaceholder, `${locale.tag}/${viewport.name}: find placeholder is not localized.`);
      await page.locator("#sqlFindInput").fill("alpha");
      await page.waitForFunction(() => document.querySelector("#sqlFindCount")?.textContent === "1/2");
      assert(await page.locator(".sql-search-highlight").count() === 1, `${locale.tag}/${viewport.name}: inactive search highlight is missing.`);
      assert(await page.locator(".sql-search-highlight-active").count() === 1, `${locale.tag}/${viewport.name}: active search highlight is missing.`);
      await page.locator("#sqlFindNextBtn").click();
      assert(await page.locator("#sqlFindCount").textContent() === "2/2", `${locale.tag}/${viewport.name}: find-next did not advance the match.`);
      await page.locator("#sqlFindToggleReplaceBtn").click();
      assert(await page.locator("#sqlReplaceInput").getAttribute("placeholder") === locale.replacePlaceholder, `${locale.tag}/${viewport.name}: replace placeholder is not localized.`);
      await page.locator("#sqlReplaceInput").fill("beta");
      await page.locator("#sqlReplaceAllBtn").click();
      assert(await page.evaluate(() => getEditorValue()) === "select beta, beta", `${locale.tag}/${viewport.name}: replace-all did not update every match.`);
      await page.locator("#sqlFindCloseBtn").click();
      assert(await editor.evaluate(element => element === document.activeElement), `${locale.tag}/${viewport.name}: closing find did not restore editor focus.`);

      const themeBefore = await page.evaluate(() => ({
        name: document.documentElement.dataset.theme,
        background: getComputedStyle(document.querySelector(".cm-editor")).backgroundColor
      }));
      await editor.focus();
      await page.keyboard.press("Shift+F2");
      const themeAfter = await page.evaluate(() => ({
        name: document.documentElement.dataset.theme,
        background: getComputedStyle(document.querySelector(".cm-editor")).backgroundColor
      }));
      assert(themeAfter.name !== themeBefore.name, `${locale.tag}/${viewport.name}: theme command did not change the active theme.`);
      assert(themeAfter.background !== themeBefore.background, `${locale.tag}/${viewport.name}: editor background did not react to the theme change.`);
      await page.keyboard.press("Shift+F2");

      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const serious = axe.violations.filter(violation => ["critical", "serious"].includes(violation.impact));
      assert(axe.violations.length === 0, `${locale.tag}/${viewport.name}: axe reported ${axe.violations.length} shell violation(s).`);
      assert(serious.length === 0, `${locale.tag}/${viewport.name}: ${serious.map(violation => (
        `${violation.id}: ${violation.nodes.map(node => node.target.join(" ")).join(" | ")}`
      )).join(", ")}`);

      await page.evaluate(async () => {
        const SqlJs = await initSqlJsIfNeeded();
        const database = new SqlJs.Database();
        database.run(`
          PRAGMA foreign_keys = ON;
          CREATE TABLE qa_parent (id INTEGER PRIMARY KEY, label TEXT NOT NULL);
          CREATE TABLE qa_child (id INTEGER PRIMARY KEY, parent_id INTEGER REFERENCES qa_parent(id));
          CREATE TABLE qa_virtual_a (id INTEGER PRIMARY KEY, code TEXT NOT NULL);
          CREATE TABLE qa_virtual_b (id INTEGER PRIMARY KEY, code TEXT NOT NULL);
        `);
        const bytes = database.export();
        database.close();
        await openDbFromBytes("sql-map-accessibility.db", bytes);
        buildSqlMapSchema();
      });

      await page.evaluate(() => {
        setEditorValue("select * from qa_");
        cmEditor.setCursor(getEditorValue().length);
      });
      await editor.focus();
      await page.keyboard.press("Control+ ");
      await page.waitForFunction(() => document.querySelector("#autocomplete")?.style.display === "block");
      assert(await page.locator("#autocomplete .suggestion").count() >= 4, `${locale.tag}/${viewport.name}: forced autocomplete did not expose schema suggestions.`);
      assert(await page.locator("#autocomplete").getAttribute("role") === "listbox", `${locale.tag}/${viewport.name}: autocomplete is not exposed as a listbox.`);
      assert(await page.locator("#autocomplete").getAttribute("aria-label") === locale.autocompleteLabel, `${locale.tag}/${viewport.name}: autocomplete accessible name is not localized.`);
      const autocompleteActiveId = await editor.getAttribute("aria-activedescendant");
      assert(Boolean(autocompleteActiveId), `${locale.tag}/${viewport.name}: autocomplete does not expose an active descendant.`);
      assert(await page.locator(`#${autocompleteActiveId}`).getAttribute("aria-selected") === "true", `${locale.tag}/${viewport.name}: autocomplete active descendant is not selected.`);
      const autocompleteBounds = await page.locator("#autocomplete").boundingBox();
      assert(Boolean(autocompleteBounds), `${locale.tag}/${viewport.name}: autocomplete bounds are unavailable.`);
      if (autocompleteBounds) {
        assert(autocompleteBounds.x >= 0 && autocompleteBounds.x + autocompleteBounds.width <= viewport.width + 1, `${locale.tag}/${viewport.name}: autocomplete overflows the viewport horizontally.`);
      }
      await page.keyboard.press("Enter");
      assert((await page.evaluate(() => getEditorValue())).includes("qa_"), `${locale.tag}/${viewport.name}: autocomplete selection did not update the editor.`);

      await page.evaluate(() => openSqlMap());
      await page.locator("#sqlMapModal").waitFor({ state: "visible" });
      await page.locator('[data-map-table-check="qa_parent"]').waitFor();

      const tableCheckbox = page.locator('[data-map-table-check="qa_parent"]');
      const fieldCheckbox = page.locator('input[data-map-field-table="qa_parent"][data-map-field-name="id"]');
      assert(await tableCheckbox.getAttribute("aria-label") === locale.tableName, `${locale.tag}/${viewport.name}: SQL Map table checkbox name is ambiguous.`);
      assert(await fieldCheckbox.getAttribute("aria-label") === locale.fieldName, `${locale.tag}/${viewport.name}: SQL Map field checkbox name is ambiguous.`);
      assert(await page.getByRole("checkbox", { name: locale.tableName }).count() === 1, `${locale.tag}/${viewport.name}: table checkbox is not exposed by its localized name.`);
      assert(await page.getByRole("checkbox", { name: locale.fieldName }).count() === 1, `${locale.tag}/${viewport.name}: field checkbox is not exposed by its localized name.`);

      await tableCheckbox.focus();
      await page.keyboard.press("Tab");
      assert(await fieldCheckbox.evaluate(element => element === document.activeElement), `${locale.tag}/${viewport.name}: table-to-field focus order is not predictable.`);
      await page.keyboard.press("Tab");
      const firstFieldRelation = page.locator('[data-map-field-drag="qa_parent::id"]');
      assert(await firstFieldRelation.evaluate(element => element === document.activeElement), `${locale.tag}/${viewport.name}: field selector-to-relationship focus order is not predictable.`);

      const accessibilityTree = await page.locator("#sqlMapCanvas").ariaSnapshot();
      assert(accessibilityTree.includes(locale.tableName), `${locale.tag}/${viewport.name}: accessibility tree omits the table name.`);
      assert(accessibilityTree.includes(locale.fieldName), `${locale.tag}/${viewport.name}: accessibility tree omits the field name.`);
      assert(accessibilityTree.includes(locale.relationName), `${locale.tag}/${viewport.name}: accessibility tree omits the relationship control name.`);

      const sqlMapAxe = await new AxeBuilder({ page })
        .include("#sqlMapModal")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const sqlMapSerious = sqlMapAxe.violations.filter(violation => ["critical", "serious"].includes(violation.impact));
      assert(sqlMapAxe.violations.length === 0, `${locale.tag}/${viewport.name}: axe reported ${sqlMapAxe.violations.length} populated SQL Map violation(s).`);
      assert(sqlMapSerious.length === 0, `${locale.tag}/${viewport.name}/sql-map: ${sqlMapSerious.map(violation => (
        `${violation.id}: ${violation.nodes.map(node => node.target.join(" ")).join(" | ")}`
      )).join(", ")}`);

      const virtualSource = page.locator('[data-map-field-drag="qa_virtual_a::code"]');
      const virtualTarget = page.locator('[data-map-field-drag="qa_virtual_b::code"]');
      await virtualSource.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(expected => document.querySelector("#sqlMapAnnouncement")?.textContent?.startsWith(expected), locale.sourceAnnouncement);
      assert(await virtualSource.getAttribute("aria-pressed") === "true", `${locale.tag}/${viewport.name}: keyboard source does not expose pressed state.`);
      await virtualTarget.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => sqlMapState.virtualFks.length === 1);
      await page.waitForFunction(expected => document.querySelector("#sqlMapAnnouncement")?.textContent === expected, locale.relationCreated);

      const blockedSource = page.locator('[data-map-field-drag="qa_virtual_a::id"]');
      const blockedTarget = page.locator('[data-map-field-drag="qa_virtual_a::code"]');
      await blockedSource.focus();
      await page.keyboard.press("Space");
      await blockedTarget.focus();
      await page.keyboard.press("Space");
      await page.locator("#sqlMapRelationConfirmModal").waitFor({ state: "visible" });
      assert(await page.locator("#sqlMapConfirmCreateBtn").isDisabled(), `${locale.tag}/${viewport.name}: blocked same-table relationship remains actionable.`);
      await page.waitForFunction(expected => document.querySelector("#sqlMapConfirmAnnouncement")?.textContent === expected, locale.blockedAnnouncement);
      const helpHref = await page.locator("#sqlMapConfirmHelpLink").getAttribute("href");
      assert(String(helpHref || "").startsWith(locale.helpPrefix), `${locale.tag}/${viewport.name}: FK-direction help does not match the active locale.`);
      await page.locator("#sqlMapConfirmCancelBtn").click();

      await page.evaluate(() => {
        closeSqlMap();
        openTablePopulationModal("qa_virtual_a");
      });
      await page.locator("#tablePopulationModal").waitFor({ state: "visible" });
      assert(await page.getByRole("dialog", { name: locale.populationTitle }).count() === 1, `${locale.tag}/${viewport.name}: population dialog name is not localized.`);
      await page.locator("#tablePopulationRecordCount").fill("2");
      await page.locator("#tablePopulationRunBtn").click();
      await page.locator("#tablePopulationModal").waitFor({ state: "hidden" });
      await page.waitForFunction(() => getActiveDatabase().exec("SELECT COUNT(*) FROM qa_virtual_a")[0].values[0][0] === 2);

      const successfulSql = "select id, code from qa_virtual_a order by id";
      await page.evaluate(sql => {
        setEditorValue(sql);
        saveCurrentTabState();
      }, successfulSql);
      await page.locator("#runBtn").click();
      await page.waitForFunction(() => !isSqlExecutionRunning() && document.querySelector("#tableWrap table"));
      const resultText = await page.locator("#tableWrap").innerText();
      assert(resultText.includes("id") && resultText.includes("code"), `${locale.tag}/${viewport.name}: populated result columns are not visible.`);

      await page.evaluate(() => setEditorValue("select 'scratch'"));
      await editor.focus();
      await page.keyboard.press("Control+h");
      await page.locator("#queryHistoryPopover").waitFor({ state: "visible" });
      assert(await page.locator("#queryHistoryPopover [role=option]").count() >= 1, `${locale.tag}/${viewport.name}: quick history has no keyboard-selectable options.`);
      assert(await page.locator("#queryHistoryPopover").getAttribute("aria-label") === locale.quickHistoryLabel, `${locale.tag}/${viewport.name}: quick-history accessible name is not localized.`);
      const historyActiveId = await editor.getAttribute("aria-activedescendant");
      assert(Boolean(historyActiveId), `${locale.tag}/${viewport.name}: quick history does not expose an active descendant.`);
      assert(await page.locator(`#${historyActiveId}`).getAttribute("aria-selected") === "true", `${locale.tag}/${viewport.name}: quick-history active descendant is not selected.`);
      const historyBounds = await page.locator("#queryHistoryPopover").boundingBox();
      assert(Boolean(historyBounds), `${locale.tag}/${viewport.name}: quick-history bounds are unavailable.`);
      if (historyBounds) {
        assert(historyBounds.x >= 0 && historyBounds.x + historyBounds.width <= viewport.width + 1, `${locale.tag}/${viewport.name}: quick history overflows the viewport horizontally.`);
      }
      await page.keyboard.press("Enter");
      assert(await page.evaluate(() => getEditorValue()) === successfulSql, `${locale.tag}/${viewport.name}: quick-history keyboard selection did not load the query.`);
      assert(await editor.evaluate(element => element === document.activeElement), `${locale.tag}/${viewport.name}: quick history did not restore editor focus.`);

      await page.locator("#exportCsvBtn").click();
      await page.locator("#exportModal").waitFor({ state: "visible" });
      assert(await page.getByRole("dialog", { name: locale.exportTitle }).count() === 1, `${locale.tag}/${viewport.name}: export dialog name is not localized.`);
      const downloadPromise = page.waitForEvent("download");
      await page.locator("#confirmExportBtn").click();
      const download = await downloadPromise;
      assert(download.suggestedFilename() === locale.csvFilename, `${locale.tag}/${viewport.name}: CSV export filename is not localized.`);

      await page.locator("#queryHistoryBtn").click();
      await page.locator("#queryHistoryModal").waitFor({ state: "visible" });
      assert(await page.getByRole("dialog", { name: locale.historyTitle }).count() === 1, `${locale.tag}/${viewport.name}: history dialog name is not localized.`);
      assert((await page.locator("#queryHistoryList").innerText()).includes(successfulSql), `${locale.tag}/${viewport.name}: successful query is absent from history.`);
      await page.locator("[data-history-fav]").first().click();
      await page.locator("#closeQueryHistoryBtn").click();
      await page.locator("#editorMoreActions > summary").click();
      await page.locator("#favoritesBtn").click();
      await page.locator("#favoritesModal").waitFor({ state: "visible" });
      assert(await page.getByRole("dialog", { name: locale.favoritesTitle }).count() === 1, `${locale.tag}/${viewport.name}: favorites dialog name is not localized.`);
      assert((await page.locator("#favoritesList").innerText()).includes(successfulSql), `${locale.tag}/${viewport.name}: saved favorite is absent.`);
      await page.locator("#closeFavoritesBtn").click();

      await page.evaluate(() => {
        setEditorValue("select * from qa_missing_table");
        saveCurrentTabState();
      });
      await page.locator("#runBtn").click();
      await page.waitForFunction(() => !isSqlExecutionRunning() && document.querySelector(".toast.error .toast-message")?.textContent?.trim());
      assert((await page.locator(".toast.error .toast-message").last().innerText()).includes(locale.missingTableCause), `${locale.tag}/${viewport.name}: worker-originated SQL guidance is not localized.`);

      await page.evaluate(() => {
        addSqlTab();
        setEditorValue("select 'unsaved browser matrix'");
        saveCurrentTabState();
      });
      const activeTab = page.locator('.sql-tab[aria-selected="true"]');
      const originalTabTitle = (await activeTab.innerText()).trim();
      await activeTab.focus();
      await page.keyboard.press("F2");
      const renameInput = page.locator(".sql-tab-item.active .sql-tab-title-input");
      await renameInput.waitFor({ state: "visible" });
      assert(
        await renameInput.evaluate(element => element.closest('[role="tab"]') === null),
        `${locale.tag}/${viewport.name}: rename input remains nested inside a tab control.`
      );
      assert(
        String(await renameInput.getAttribute("aria-label") || "").startsWith(locale.renameTabPrefix),
        `${locale.tag}/${viewport.name}: rename input name is not localized.`
      );
      await renameInput.fill("cancelled-browser-rename");
      await page.keyboard.press("Escape");
      await renameInput.waitFor({ state: "detached" });
      await page.waitForFunction(() => document.activeElement?.matches('.sql-tab[aria-selected="true"]'));
      assert((await activeTab.innerText()).trim() === originalTabTitle, `${locale.tag}/${viewport.name}: Escape changed the tab title.`);
      assert(await activeTab.evaluate(element => element === document.activeElement), `${locale.tag}/${viewport.name}: Escape did not restore focus to the renamed tab.`);

      await page.keyboard.press("F2");
      await renameInput.waitFor({ state: "visible" });
      await renameInput.fill("browser-renamed");
      await page.keyboard.press("Enter");
      await renameInput.waitFor({ state: "detached" });
      await page.waitForFunction(() => document.activeElement?.matches('.sql-tab[aria-selected="true"]'));
      assert((await activeTab.innerText()).trim() === "browser-renamed", `${locale.tag}/${viewport.name}: Enter did not commit the tab title.`);
      assert(await activeTab.evaluate(element => element === document.activeElement), `${locale.tag}/${viewport.name}: Enter did not restore focus to the renamed tab.`);

      const closeTabAction = page.locator("#closeActiveSqlTabBtn");
      const renameTabAction = page.locator("#renameActiveSqlTabBtn");
      assert(
        String(await closeTabAction.getAttribute("aria-label") || "").startsWith(locale.closeTabPrefix),
        `${locale.tag}/${viewport.name}: close-tab action name is not localized.`
      );
      assert(
        String(await renameTabAction.getAttribute("aria-label") || "").startsWith(locale.renameTabPrefix),
        `${locale.tag}/${viewport.name}: rename-tab action name is not localized.`
      );
      await activeTab.focus();
      await page.keyboard.press("Tab");
      assert(await renameTabAction.evaluate(element => element === document.activeElement), `${locale.tag}/${viewport.name}: rename-tab action is not keyboard reachable.`);
      await page.keyboard.press("Tab");
      assert(await closeTabAction.evaluate(element => element === document.activeElement), `${locale.tag}/${viewport.name}: close-tab action is not keyboard reachable.`);

      const tabAxe = await new AxeBuilder({ page })
        .include("#sqlTabs")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      assert(tabAxe.violations.length === 0, `${locale.tag}/${viewport.name}: axe reported ${tabAxe.violations.length} SQL-tab violation(s).`);

      await activeTab.focus();
      await page.keyboard.press("Delete");
      await page.locator("#closeTabConfirmModal").waitFor({ state: "visible" });
      assert(await page.getByRole("dialog", { name: locale.closeTabTitle }).count() === 1, `${locale.tag}/${viewport.name}: close-tab confirmation is not localized.`);
      const tabCountBeforeCancel = await page.locator(".sql-tab").count();
      await page.locator("#cancelCloseTabBtn").click();
      assert(await page.locator(".sql-tab").count() === tabCountBeforeCancel, `${locale.tag}/${viewport.name}: canceling close-tab removed a tab.`);
      await activeTab.focus();
      await page.keyboard.press("Delete");
      await page.locator("#confirmCloseTabBtn").click();
      assert(await page.locator(".sql-tab").count() === tabCountBeforeCancel - 1, `${locale.tag}/${viewport.name}: confirming close-tab did not remove one tab.`);

      if (viewport.name === "desktop") {
        await page.setViewportSize({ width: Math.floor(viewport.width / 2), height: Math.floor(viewport.height / 2) });
        await page.waitForTimeout(50);
        const reflowOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        assert(!reflowOverflow, `${locale.tag}/${viewport.name}: 200% equivalent reflow has horizontal page overflow.`);
        await page.setViewportSize(viewport);
      }

      const expectedWorkerErrors = runtimeErrors.filter(message => /qa_missing_table/.test(message));
      const unexpectedRuntimeErrors = runtimeErrors.filter(message => !/qa_missing_table/.test(message));
      assert(expectedWorkerErrors.length === 1, `${locale.tag}/${viewport.name}: expected worker error was not captured exactly once.`);
      assert(unexpectedRuntimeErrors.length === 0, `${locale.tag}/${viewport.name}: unexpected runtime errors: ${unexpectedRuntimeErrors.join(" | ")}`);
      results.push({
        locale: locale.tag,
        viewport: viewport.name,
        shellViolations: axe.violations.length,
        shellSerious: serious.length,
        tabViolations: tabAxe.violations.length,
        sqlMapViolations: sqlMapAxe.violations.length,
        sqlMapSerious: sqlMapSerious.length
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error("Browser quality validation failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Browser quality validation passed: ${JSON.stringify(results)}`);
