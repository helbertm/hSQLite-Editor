import { I18N_ADDITIONAL_MESSAGES } from "./03a-localization-messages.js";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../core/02-locales.js";
import { appState } from "../core/10-state-root.js";
import { setPreferencesState } from "../core/13-state-preferences.js";
import { STORAGE_KEYS, storage } from "../ports/05-storage.js";

export const LOCALE_LABELS = Object.freeze({
  "en-US": "English (US)",
  "pt-BR": "Português (Brasil)",
  "es-ES": "Español (España)"
});

export const I18N_BASE_MESSAGES = Object.freeze({
  "en-US": Object.freeze({
    "app.subtitle": "Work and learn with SQLite",
    "common.open": "Open", "common.save": "Save", "common.close": "Close", "common.cancel": "Cancel", "common.continue": "Continue", "common.copy": "Copy", "common.clear": "Clear", "common.export": "Export", "common.import": "Import", "common.yes": "Yes", "common.no": "No", "common.more": "More",
    "language.label": "Language", "language.description": "Choose the interface language.", "session.save": "Save session", "release.whatsNew": "What's new", "help.label": "Help", "issues.report": "Report a bug", "issues.suggest": "Suggest improvement", "database.none": "No database loaded", "database.file": "Database file", "database.recent": "Recent", "database.new": "New",
    "session.description": "When enabled, hSQLite Editor stores open tabs, draft queries, history, favorites, and preferences locally in this browser. Use Settings to export or import them on another browser or device.", "theme.toggle": "Switch light or dark theme", "issues.tooltip": "Report a bug in GitHub Issues", "issues.suggestTooltip": "Suggest improvement: open the GitHub Feature request form in a new tab", "database.actions": "Database file actions", "database.openRecent": "Open recent databases", "database.openFile": "Choose a SQLite file", "database.newFile": "Create an empty database", "database.saveFile": "Save the current database",
    "schema.title": "Schema", "schema.other": "Other", "schema.clearFilters": "Clear filters", "schema.empty": "No file loaded.", "schema.quickGuide": "Quick guide", "tabs.new": "New tab", "tabs.label": "SQL statement tabs",
    "schema.show": "Show Schema", "schema.toggle": "Hide or show Schema", "schema.filter": "Filter schema objects", "schema.filterTypes": "Filter by schema object type", "schema.noObjects": "No objects found.",
    "editor.title": "SQL statements", "editor.run": "RUN", "editor.openSql": "Open .sql", "editor.saveSql": "Save .sql", "editor.history": "History", "editor.openRun": "Open and run", "editor.closeAll": "Close all tabs", "editor.clearPaste": "Clear and paste", "editor.exportSchema": "Export schema (.sql)", "editor.favorites": "Favorites", "editor.settings": "Settings", "editor.shortcuts": "Shortcuts", "editor.sqlMap": "SQL Map", "editor.drop": "Drop the file here", "editor.dropTypes": ".sql, .txt, or plain-text files", "editor.find": "Find...", "editor.replace": "Replace", "editor.replaceWith": "Replace with...", "editor.replaceAll": "Replace all",
    "editor.actions": "Query and export actions", "editor.moreActions": "More actions", "results.exportActions": "Result export", "results.pageSize": "Records per page", "results.pagination": "Result pagination", "results.pageEmpty": "Page 0/0", "preferences.initialTheme": "Initial theme", "preferences.tabPreset": "SQL tab naming preset",
    "status.loadDatabase": "Open a SQLite database to begin.", "status.running": "Running query...", "status.stop": "Stop execution", "status.sqlError": "SQL error",
    "results.title": "Results", "results.empty": "No results to display", "results.emptyHelp": "Open a SQLite database, write a query, and run it with F5.", "results.filter": "Filter results...", "results.clearFilter": "Clear filter", "results.clearSort": "Clear sorting", "results.clearSelection": "Clear selection", "results.unfreeze": "Unfreeze", "results.firstPage": "First page", "results.previousPage": "Previous page", "results.nextPage": "Next page", "results.lastPage": "Last page", "results.selectPage": "Select current page", "results.tableLabel": "Query results",
    "preferences.title": "Preferences", "preferences.description": "Choose how the editor should behave when reopened.", "preferences.theme": "Theme", "preferences.themeDescription": "Choose the initial interface theme.", "preferences.dark": "Dark", "preferences.light": "Light", "preferences.tabNames": "Tab names", "preferences.tabNamesDescription": "Choose the naming set for new SQL tabs.",
    "settings.title": "Settings", "settings.description": "Adjust editor preferences and export or import your settings.", "settings.lastExportNever": "Last export: never", "history.title": "Query history", "history.empty": "No queries in history.", "recent.title": "Recent databases", "recent.empty": "No recent databases.", "favorites.title": "Favorite queries", "favorites.empty": "No saved favorites.", "release.title": "What's new in this version", "release.updated": "Your editor has been updated.", "release.newVersion": "{count} new version", "release.newVersions": "{count} new versions", "database.newTitle": "New database", "database.fileName": "File name", "database.create": "Create .db", "export.title": "Export result", "export.description": "Choose the export scope.",
    "boot.initializing": "Initializing editor", "boot.preparing": "Preparing hSQLite Editor", "boot.loading": "Loading the local environment and checking the embedded runtime.", "boot.retry": "Try again", "offline.invalid": "Invalid offline artifact", "offline.unavailable": "Offline mode unavailable",
    "grid.sortHelp": "Press Enter to sort. Shift+Enter adds a sort criterion. Ctrl or Command+Enter freezes columns. Alt+Left or Alt+Right moves the column. Alt+Shift+Left or Alt+Shift+Right resizes it.", "grid.rowHelp": "Use Up and Down Arrow to move. Press Space to select this row.", "grid.rowSelection": "Select row {row}", "grid.selectedCount": "{count} selected", "grid.perPage": "{count} per page", "grid.pageInfo": "Page {page}/{pages} · {count} filtered records"
  }),
  "pt-BR": Object.freeze({
    "app.subtitle": "Para trabalhar e estudar com SQLite",
    "common.open": "Abrir", "common.save": "Salvar", "common.close": "Fechar", "common.cancel": "Cancelar", "common.continue": "Continuar", "common.copy": "Copiar", "common.clear": "Limpar", "common.export": "Exportar", "common.import": "Importar", "common.yes": "Sim", "common.no": "Não", "common.more": "Mais",
    "language.label": "Idioma", "language.description": "Escolha o idioma da interface.", "session.save": "Salvar sessão", "release.whatsNew": "Novidades", "help.label": "Ajuda", "issues.report": "Reportar erro", "issues.suggest": "Sugerir melhoria", "database.none": "Nenhum banco carregado", "database.file": "Arquivo de dados", "database.recent": "Recentes", "database.new": "Novo",
    "session.description": "Quando ativado, o hSQLite Editor armazena localmente neste navegador as abas abertas, consultas em edição, histórico, favoritas e preferências. Use Configurações para exportar ou importar esses dados em outro navegador ou dispositivo.", "theme.toggle": "Alternar tema claro ou escuro", "issues.tooltip": "Reportar um erro no GitHub Issues", "issues.suggestTooltip": "Sugerir melhoria: abrir o formulário Feature request do GitHub em uma nova aba", "database.actions": "Ações do arquivo de banco de dados", "database.openRecent": "Abrir bancos recentes", "database.openFile": "Escolher um arquivo SQLite", "database.newFile": "Criar um banco de dados vazio", "database.saveFile": "Salvar o banco de dados atual",
    "schema.title": "Schema", "schema.other": "Outros", "schema.clearFilters": "Limpar filtros", "schema.empty": "Nenhum arquivo carregado.", "schema.quickGuide": "Guia rápido", "tabs.new": "Nova aba", "tabs.label": "Abas de instruções SQL",
    "schema.show": "Mostrar Schema", "schema.toggle": "Ocultar ou mostrar Schema", "schema.filter": "Filtrar objetos do schema", "schema.filterTypes": "Filtrar por tipo de objeto do schema", "schema.noObjects": "Nenhum objeto encontrado.",
    "editor.title": "Instruções SQL", "editor.run": "EXECUTAR", "editor.openSql": "Abrir .sql", "editor.saveSql": "Salvar .sql", "editor.history": "Histórico", "editor.openRun": "Abrir e executar", "editor.closeAll": "Fechar todas as abas", "editor.clearPaste": "Limpar e colar", "editor.exportSchema": "Exportar estrutura (.sql)", "editor.favorites": "Favoritas", "editor.settings": "Configurações", "editor.shortcuts": "Atalhos", "editor.sqlMap": "Mapa SQL", "editor.drop": "Solte o arquivo aqui", "editor.dropTypes": "Arquivos .sql, .txt ou texto puro", "editor.find": "Localizar...", "editor.replace": "Substituir", "editor.replaceWith": "Substituir por...", "editor.replaceAll": "Substituir tudo",
    "editor.actions": "Ações da consulta e exportação", "editor.moreActions": "Mais ações", "results.exportActions": "Exportação de resultados", "results.pageSize": "Registros por página", "results.pagination": "Paginação dos resultados", "results.pageEmpty": "Página 0/0", "preferences.initialTheme": "Tema inicial", "preferences.tabPreset": "Preset de nomes das abas SQL",
    "status.loadDatabase": "Carregue um banco SQLite para começar.", "status.running": "Executando consulta...", "status.stop": "Parar execução", "status.sqlError": "Erro SQL",
    "results.title": "Resultados", "results.empty": "Nenhum resultado para exibir", "results.emptyHelp": "Abra um banco SQLite, escreva uma consulta e execute com F5.", "results.filter": "Filtrar resultados...", "results.clearFilter": "Limpar filtro", "results.clearSort": "Limpar ordenação", "results.clearSelection": "Limpar seleção", "results.unfreeze": "Descongelar", "results.firstPage": "Primeira página", "results.previousPage": "Página anterior", "results.nextPage": "Próxima página", "results.lastPage": "Última página", "results.selectPage": "Selecionar página atual", "results.tableLabel": "Resultados da consulta",
    "preferences.title": "Preferências", "preferences.description": "Escolha como o editor deve se comportar ao abrir novamente.", "preferences.theme": "Tema", "preferences.themeDescription": "Escolha o tema inicial da interface.", "preferences.dark": "Escuro", "preferences.light": "Claro", "preferences.tabNames": "Nomes das abas", "preferences.tabNamesDescription": "Escolha o universo de nomes para novas abas SQL.",
    "settings.title": "Configurações", "settings.description": "Ajuste preferências do editor e exporte ou importe suas configurações.", "settings.lastExportNever": "Última exportação: nunca", "history.title": "Histórico de consultas", "history.empty": "Nenhuma consulta no histórico.", "recent.title": "Bancos recentes", "recent.empty": "Nenhum banco recente.", "favorites.title": "Consultas favoritas", "favorites.empty": "Nenhuma favorita salva.", "release.title": "Novidades da versão", "release.updated": "Seu editor foi atualizado.", "release.newVersion": "{count} versão nova", "release.newVersions": "{count} versões novas", "database.newTitle": "Novo banco de dados", "database.fileName": "Nome do arquivo", "database.create": "Criar .db", "export.title": "Exportar resultado", "export.description": "Escolha o escopo da exportação.",
    "boot.initializing": "Inicializando editor", "boot.preparing": "Preparando hSQLite Editor", "boot.loading": "Carregando o ambiente local e verificando o runtime embutido.", "boot.retry": "Tentar novamente", "offline.invalid": "Artefato offline inválido", "offline.unavailable": "Modo offline indisponível",
    "grid.sortHelp": "Pressione Enter para ordenar. Shift+Enter adiciona um critério. Ctrl ou Command+Enter congela colunas. Alt+Esquerda ou Alt+Direita move a coluna. Alt+Shift+Esquerda ou Alt+Shift+Direita redimensiona.", "grid.rowHelp": "Use as setas para cima e para baixo para navegar. Pressione Espaço para selecionar esta linha.", "grid.rowSelection": "Selecionar linha {row}", "grid.selectedCount": "{count} selecionado(s)", "grid.perPage": "{count} por página", "grid.pageInfo": "Página {page}/{pages} · {count} registro(s) filtrado(s)"
  }),
  "es-ES": Object.freeze({
    "app.subtitle": "Trabaja y aprende con SQLite",
    "common.open": "Abrir", "common.save": "Guardar", "common.close": "Cerrar", "common.cancel": "Cancelar", "common.continue": "Continuar", "common.copy": "Copiar", "common.clear": "Limpiar", "common.export": "Exportar", "common.import": "Importar", "common.yes": "Sí", "common.no": "No", "common.more": "Más",
    "language.label": "Idioma", "language.description": "Elige el idioma de la interfaz.", "session.save": "Guardar sesión", "release.whatsNew": "Novedades", "help.label": "Ayuda", "issues.report": "Informar de un error", "issues.suggest": "Sugerir una mejora", "database.none": "No hay ninguna base de datos cargada", "database.file": "Archivo de datos", "database.recent": "Recientes", "database.new": "Nueva",
    "session.description": "Cuando está activado, hSQLite Editor guarda localmente en este navegador las pestañas abiertas, consultas en edición, historial, favoritas y preferencias. Usa Configuración para exportar o importar estos datos en otro navegador o dispositivo.", "theme.toggle": "Cambiar entre tema claro y oscuro", "issues.tooltip": "Informar de un error en GitHub Issues", "issues.suggestTooltip": "Sugerir una mejora: abrir el formulario Feature request de GitHub en una pestaña nueva", "database.actions": "Acciones del archivo de base de datos", "database.openRecent": "Abrir bases de datos recientes", "database.openFile": "Elegir un archivo SQLite", "database.newFile": "Crear una base de datos vacía", "database.saveFile": "Guardar la base de datos actual",
    "schema.title": "Esquema", "schema.other": "Otros", "schema.clearFilters": "Limpiar filtros", "schema.empty": "No hay ningún archivo cargado.", "schema.quickGuide": "Guía rápida", "tabs.new": "Nueva pestaña", "tabs.label": "Pestañas de sentencias SQL",
    "schema.show": "Mostrar esquema", "schema.toggle": "Ocultar o mostrar esquema", "schema.filter": "Filtrar objetos del esquema", "schema.filterTypes": "Filtrar por tipo de objeto del esquema", "schema.noObjects": "No se encontraron objetos.",
    "editor.title": "Sentencias SQL", "editor.run": "EJECUTAR", "editor.openSql": "Abrir .sql", "editor.saveSql": "Guardar .sql", "editor.history": "Historial", "editor.openRun": "Abrir y ejecutar", "editor.closeAll": "Cerrar todas las pestañas", "editor.clearPaste": "Limpiar y pegar", "editor.exportSchema": "Exportar esquema (.sql)", "editor.favorites": "Favoritas", "editor.settings": "Configuración", "editor.shortcuts": "Atajos", "editor.sqlMap": "Mapa SQL", "editor.drop": "Suelta el archivo aquí", "editor.dropTypes": "Archivos .sql, .txt o de texto sin formato", "editor.find": "Buscar...", "editor.replace": "Reemplazar", "editor.replaceWith": "Reemplazar por...", "editor.replaceAll": "Reemplazar todo",
    "editor.actions": "Acciones de consulta y exportación", "editor.moreActions": "Más acciones", "results.exportActions": "Exportación de resultados", "results.pageSize": "Registros por página", "results.pagination": "Paginación de resultados", "results.pageEmpty": "Página 0/0", "preferences.initialTheme": "Tema inicial", "preferences.tabPreset": "Conjunto de nombres de pestañas SQL",
    "status.loadDatabase": "Abre una base de datos SQLite para empezar.", "status.running": "Ejecutando consulta...", "status.stop": "Detener ejecución", "status.sqlError": "Error SQL",
    "results.title": "Resultados", "results.empty": "No hay resultados para mostrar", "results.emptyHelp": "Abre una base de datos SQLite, escribe una consulta y ejecútala con F5.", "results.filter": "Filtrar resultados...", "results.clearFilter": "Limpiar filtro", "results.clearSort": "Limpiar ordenación", "results.clearSelection": "Limpiar selección", "results.unfreeze": "Descongelar", "results.firstPage": "Primera página", "results.previousPage": "Página anterior", "results.nextPage": "Página siguiente", "results.lastPage": "Última página", "results.selectPage": "Seleccionar página actual", "results.tableLabel": "Resultados de la consulta",
    "preferences.title": "Preferencias", "preferences.description": "Elige cómo debe comportarse el editor al volver a abrirlo.", "preferences.theme": "Tema", "preferences.themeDescription": "Elige el tema inicial de la interfaz.", "preferences.dark": "Oscuro", "preferences.light": "Claro", "preferences.tabNames": "Nombres de las pestañas", "preferences.tabNamesDescription": "Elige el conjunto de nombres para las nuevas pestañas SQL.",
    "settings.title": "Configuración", "settings.description": "Ajusta las preferencias del editor y exporta o importa su configuración.", "settings.lastExportNever": "Última exportación: nunca", "history.title": "Historial de consultas", "history.empty": "No hay consultas en el historial.", "recent.title": "Bases de datos recientes", "recent.empty": "No hay bases de datos recientes.", "favorites.title": "Consultas favoritas", "favorites.empty": "No hay favoritas guardadas.", "release.title": "Novedades de esta versión", "release.updated": "El editor se ha actualizado.", "release.newVersion": "{count} versión nueva", "release.newVersions": "{count} versiones nuevas", "database.newTitle": "Nueva base de datos", "database.fileName": "Nombre del archivo", "database.create": "Crear .db", "export.title": "Exportar resultado", "export.description": "Elige el ámbito de exportación.",
    "boot.initializing": "Inicializando el editor", "boot.preparing": "Preparando hSQLite Editor", "boot.loading": "Cargando el entorno local y comprobando el runtime integrado.", "boot.retry": "Intentar de nuevo", "offline.invalid": "Artefacto sin conexión no válido", "offline.unavailable": "Modo sin conexión no disponible",
    "grid.sortHelp": "Pulsa Intro para ordenar. Mayús+Intro añade un criterio. Ctrl o Comando+Intro congela columnas. Alt+Izquierda o Alt+Derecha mueve la columna. Alt+Mayús+Izquierda o Alt+Mayús+Derecha cambia su tamaño.", "grid.rowHelp": "Usa Flecha arriba y Flecha abajo para desplazarte. Pulsa Espacio para seleccionar esta fila.", "grid.rowSelection": "Seleccionar fila {row}", "grid.selectedCount": "{count} seleccionados", "grid.perPage": "{count} por página", "grid.pageInfo": "Página {page}/{pages} · {count} registros filtrados"
  })
});

export const LOCALIZED_ATTRIBUTES = Object.freeze(["aria-label", "aria-description", "placeholder", "title"]);
export const localeRefreshers = new Set();

export function registerLocaleRefresher(refresh) {
  if (typeof refresh !== "function") throw new TypeError("Locale refresher must be a function.");
  localeRefreshers.add(refresh);
  return () => localeRefreshers.delete(refresh);
}

export function normalizeLocale(value) {
  const candidate = String(value || "").replace("_", "-").toLowerCase();
  return SUPPORTED_LOCALES.find(locale => locale.toLowerCase() === candidate)
    || SUPPORTED_LOCALES.find(locale => locale.split("-")[0].toLowerCase() === candidate.split("-")[0])
    || DEFAULT_LOCALE;
}

export function getLocale() {
  return normalizeLocale(appState.preferences.locale || DEFAULT_LOCALE);
}

export function interpolateMessage(message, variables = {}) {
  return String(message).replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : match
  ));
}

export function t(key, variables = {}) {
  const locale = getLocale();
  const additional = typeof I18N_ADDITIONAL_MESSAGES === "undefined" ? null : I18N_ADDITIONAL_MESSAGES;
  const message = additional?.[locale]?.[key]
    ?? I18N_BASE_MESSAGES[locale]?.[key]
    ?? additional?.[DEFAULT_LOCALE]?.[key]
    ?? I18N_BASE_MESSAGES[DEFAULT_LOCALE]?.[key]
    ?? key;
  return interpolateMessage(message, variables);
}

export function formatNumber(value, options = {}) {
  return new Intl.NumberFormat(getLocale(), options).format(Number(value || 0));
}

export function formatDateTime(value, options = {}) {
  return new Intl.DateTimeFormat(getLocale(), options).format(value instanceof Date ? value : new Date(value));
}

export function compareLocalized(a, b, options = {}) {
  return new Intl.Collator(getLocale(), options).compare(String(a ?? ""), String(b ?? ""));
}

export function translateElement(element) {
  if (!element || element.nodeType !== 1) return;
  const htmlKey = element.dataset.i18nHtml;
  if (htmlKey) element.innerHTML = t(htmlKey);
  const textKey = element.dataset.i18n;
  if (textKey && !htmlKey) element.textContent = t(textKey);
  for (const attribute of LOCALIZED_ATTRIBUTES) {
    const suffix = attribute.split("-").map(part => part[0].toUpperCase() + part.slice(1)).join("");
    const key = element.dataset[`i18n${suffix}`];
    if (key) element.setAttribute(attribute, t(key));
  }
}

export function translateSubtree(root = document.body) {
  if (!root) return;
  if (root.nodeType === 1) translateElement(root);
  root.querySelectorAll?.("[data-i18n], [data-i18n-html], [data-i18n-aria-label], [data-i18n-aria-description], [data-i18n-placeholder], [data-i18n-title]").forEach(translateElement);
}

export function renderLocaleSelects() {
  document.querySelectorAll("[data-locale-select]").forEach(select => {
    if (!select.options.length) {
      for (const locale of SUPPORTED_LOCALES) {
        const option = document.createElement("option");
        option.value = locale;
        option.textContent = LOCALE_LABELS[locale];
        select.appendChild(option);
      }
    }
    select.value = getLocale();
    select.setAttribute("aria-label", t("language.label"));
  });
}

export function refreshLocalizedUi() {
  translateSubtree(document.body);
  renderLocaleSelects();
  for (const refresh of localeRefreshers) refresh();
}

export function setLocale(value, options = {}) {
  const locale = normalizeLocale(value);
  setPreferencesState({ locale });
  document.documentElement.lang = locale;
  if (options.persist !== false) storage.set(STORAGE_KEYS.LOCALE, locale);
  refreshLocalizedUi();
  if (typeof CustomEvent === "function") {
    document.dispatchEvent(new CustomEvent("hsqlite:localechange", { detail: { locale } }));
  }
  return locale;
}

export function initLocalization() {
  const saved = storage.get(STORAGE_KEYS.LOCALE, "");
  const requested = saved || navigator.languages?.[0] || navigator.language || DEFAULT_LOCALE;
  setLocale(requested, { persist: Boolean(saved) });
  document.querySelectorAll("[data-locale-select]").forEach(select => {
    select.addEventListener("change", () => setLocale(select.value));
  });
  translateSubtree(document.body);
}
