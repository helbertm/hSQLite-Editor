import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const template = fs.readFileSync(path.join(rootDir, "src/index.template.html"), "utf8");
const tableSource = fs.readFileSync(path.join(rootDir, "src/ui/22-results-table.js"), "utf8");
const sqlMapRenderSource = fs.readFileSync(path.join(rootDir, "src/capabilities/47-sql-map-render.js"), "utf8");
const sqlMapInteractionSource = fs.readFileSync(path.join(rootDir, "src/capabilities/48-sql-map-interactions.js"), "utf8");
const sqlMapConstantsSource = fs.readFileSync(path.join(rootDir, "src/capabilities/44-sql-map-constants.js"), "utf8");
const editorFeedbackSource = fs.readFileSync(path.join(rootDir, "src/capabilities/32b-editor-feedback.js"), "utf8");
const sqlTabsSource = fs.readFileSync(path.join(rootDir, "src/capabilities/24-sql-tabs-render.js"), "utf8");
const stylesDir = path.join(rootDir, "src/styles");
const css = fs.readdirSync(stylesDir)
  .filter(fileName => fileName.endsWith(".css"))
  .sort()
  .map(fileName => fs.readFileSync(path.join(stylesDir, fileName), "utf8"))
  .join("\n");
const failures = [];

const requiredNamedInputs = [
  "schemaSearch", "sqlEditor", "sqlFindInput", "sqlReplaceInput", "queryHistorySearch",
  "sqlMapSearch", "tablePopulationRecordCount", "newDbFileNameInput", "resultHScrollRange"
];

for (const id of requiredNamedInputs) {
  const elementMatch = template.match(new RegExp(`<(?:input|textarea)[^>]*id="${id}"[^>]*>`, "i"));
  if (!elementMatch) {
    failures.push(`Missing expected input: ${id}`);
    continue;
  }
  const element = elementMatch[0];
  const explicitName = /aria-label=|aria-labelledby=/.test(element);
  const enclosingLabel = new RegExp(`<label[^>]*>[\\s\\S]{0,500}id="${id}"`, "i").test(template);
  if (!explicitName && !enclosingLabel) failures.push(`${id} has no programmatic accessible name.`);
}

const requiredGridContracts = [
  [/<table aria-label=/, "results table accessible name"],
  [/scope="col" tabindex="0"/, "keyboard-focusable column headers"],
  [/aria-sort=/, "column sort state"],
  [/aria-selected=/, "row selection state"],
  [/tr\.addEventListener\("keydown"/, "row keyboard navigation"],
  [/th\.addEventListener\("keydown"/, "column keyboard commands"],
  [/moveColumnFromKeyboard/, "keyboard column reordering"],
  [/resizeColumnFromKeyboard/, "keyboard column resizing"]
];
for (const [pattern, label] of requiredGridContracts) {
  if (!pattern.test(tableSource)) failures.push(`Missing ${label}.`);
}

const requiredSqlMapContracts = [
  [sqlMapRenderSource, /data-map-table-check=.*aria-label=.*sqlMap\.selectTable.*table: tableName/, "localized SQL Map table-checkbox name"],
  [sqlMapRenderSource, /data-map-field-table=.*aria-label=.*sqlMap\.selectField.*table: tableName, field: field\.name/, "localized SQL Map field-checkbox name"],
  [sqlMapRenderSource, /role="button" tabindex="0" aria-pressed=/, "keyboard relationship control state"],
  [sqlMapRenderSource, /function announceSqlMap\(/, "SQL Map modal-local live announcements"],
  [template, /id="sqlMapConfirmAnnouncement"[^>]*role="status"[^>]*aria-live="polite"/, "relation-confirmation live region"],
  [sqlMapRenderSource, /sqlMapRelationConfirmModal\?\.style\.display === "flex"[\s\S]*sqlMapConfirmAnnouncement/, "active-dialog announcement routing"],
  [sqlMapInteractionSource, /event\.key !== "Enter" && event\.key !== " "/, "Enter and Space relationship operation"],
  [sqlMapInteractionSource, /announceSqlMap\(announcement\)/, "keyboard relationship announcement"],
  [sqlMapConstantsSource, /"en-US": "https:\/\/learn\.microsoft\.com\/en-us\//, "en-US foreign-key help destination"],
  [sqlMapConstantsSource, /"pt-BR": "https:\/\/learn\.microsoft\.com\/pt-br\//, "pt-BR foreign-key help destination"],
  [sqlMapConstantsSource, /"es-ES": "https:\/\/learn\.microsoft\.com\/es-es\//, "es-ES foreign-key help destination"]
];
for (const [source, pattern, label] of requiredSqlMapContracts) {
  if (!pattern.test(source)) failures.push(`Missing ${label}.`);
}

if (!/:focus-visible/.test(css) || !/--ring/.test(css)) failures.push("Visible focus styling is missing or disconnected from the ring token.");
if (!/<html lang="en-US"/.test(template)) failures.push("The source document language is not declared.");
if (!/role="status" aria-live="polite"/.test(template)) failures.push("Polite status announcements are missing.");

const requiredToastContracts = [
  [/setAttribute\("role", isError \? "alert" : "status"\)/, "severity-appropriate toast role"],
  [/setAttribute\("aria-live", isError \? "assertive" : "polite"\)/, "severity-appropriate toast live priority"],
  [/setAttribute\("aria-atomic", "true"\)/, "atomic toast announcements"],
  [/toast-close[^>]*aria-label=.*common\.close/, "localized toast close-button name"],
  [/toast-icon[^>]*aria-hidden="true"/, "decorative toast icon exclusion"]
];
for (const [pattern, label] of requiredToastContracts) {
  if (!pattern.test(editorFeedbackSource)) failures.push(`Missing ${label}.`);
}

const tabButtonTemplate = sqlTabsSource.match(/button\.innerHTML\s*=\s*`([\s\S]*?)`;/)?.[1] || "";
if (!tabButtonTemplate || /<input\b/.test(tabButtonTemplate)) {
  failures.push("SQL tab buttons must not contain nested form controls.");
}
const requiredTabContracts = [
  [/renameField\.innerHTML[\s\S]*<input class="sql-tab-title-input"/, "sibling tab-rename field"],
  [/(?:aria-label=.*tabs\.renameNamedLabel|setAttribute\("aria-label",\s*t\("tabs\.renameNamedLabel)/, "tab-specific rename-button name"],
  [/setAttribute\("aria-label",\s*t\("tabs\.closeNamedLabel/, "tab-specific close-button name"],
  [/if \(renameField\) item\.appendChild\(renameField\)/, "rename field outside the tab button"],
  [template, /id="sqlTabs"[^>]*role="tablist"[^>]*><\/div>\s*<button id="renameActiveSqlTabBtn" class="ui-button ui-button-icon ui-button-sm sql-tab-header-action"/, "active-tab commands outside the tablist"]
];
for (const contract of requiredTabContracts) {
  const [sourceOrPattern, patternOrLabel, optionalLabel] = contract;
  const source = optionalLabel ? sourceOrPattern : sqlTabsSource;
  const pattern = optionalLabel ? patternOrLabel : sourceOrPattern;
  const label = optionalLabel || patternOrLabel;
  if (!pattern.test(source)) failures.push(`Missing ${label}.`);
}
if (/sql-tab-actions|actions\.setAttribute\("aria-hidden"|(?:closeEl|renameEl)\.tabIndex\s*=\s*-1/.test(sqlTabsSource)) {
  failures.push("Visible SQL tab actions must remain available to keyboard and assistive-technology users.");
}

const dialogs = Array.from(template.matchAll(/<div class="[^"]*modal[^"]*" role="dialog"([^>]*)>/g), match => match[1]);
for (const attributes of dialogs) {
  if (!/aria-modal="true"/.test(attributes) || !/aria-labelledby=/.test(attributes)) {
    failures.push("A dialog is missing aria-modal or aria-labelledby.");
  }
}

if (failures.length) {
  console.error("Accessibility validation failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Accessibility validation passed (${requiredNamedInputs.length} named inputs, ${dialogs.length} dialogs, keyboard grid and SQL Map contracts).`);
