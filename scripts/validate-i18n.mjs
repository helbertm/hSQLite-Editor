import fs from "node:fs";
import path from "node:path";
import { parse } from "acorn";
import { I18N_BASE_MESSAGES } from "../src/capabilities/03-localization.js";
import { I18N_ADDITIONAL_MESSAGES } from "../src/capabilities/03a-localization-messages.js";
import { SUPPORTED_LOCALES } from "../src/core/02-locales.js";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const localizationPath = path.join(rootDir, "src/capabilities/03-localization.js");
const localizationSource = fs.readFileSync(localizationPath, "utf8");
const additionalPath = path.join(rootDir, "src/capabilities/03a-localization-messages.js");

const failures = [];
const locales = Array.from(SUPPORTED_LOCALES);
const catalogs = Object.fromEntries(SUPPORTED_LOCALES.map(locale => [
  locale,
  { ...I18N_BASE_MESSAGES[locale], ...I18N_ADDITIONAL_MESSAGES[locale] }
]));
const expectedLocales = ["en-US", "pt-BR", "es-ES"];

if (JSON.stringify(locales) !== JSON.stringify(expectedLocales)) {
  failures.push(`Supported locales must be exactly ${expectedLocales.join(", ")}.`);
}

const canonicalKeys = Object.keys(catalogs["en-US"] || {}).sort();
const canonicalKeySet = new Set(canonicalKeys);
for (const locale of expectedLocales) {
  const keys = Object.keys(catalogs[locale] || {}).sort();
  const missing = canonicalKeys.filter(key => !keys.includes(key));
  const extra = keys.filter(key => !canonicalKeys.includes(key));
  if (missing.length) failures.push(`${locale} is missing keys: ${missing.join(", ")}`);
  if (extra.length) failures.push(`${locale} has unexpected keys: ${extra.join(", ")}`);
  for (const key of canonicalKeys) {
    const value = String(catalogs[locale]?.[key] || "").trim();
    if (!value) failures.push(`${locale}.${key} is empty.`);
    const canonicalVariables = Array.from(String(catalogs["en-US"]?.[key] || "").matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g), match => match[1]).sort();
    const localeVariables = Array.from(value.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g), match => match[1]).sort();
    if (JSON.stringify(canonicalVariables) !== JSON.stringify(localeVariables)) {
      failures.push(`${locale}.${key} does not preserve interpolation variables.`);
    }
  }
}

const catalogLanguageGuards = {
  "pt-BR": [
    /\brelación(?:ar|arse)?\b/i,
    /\bseleccióne\b/i,
    /\bNão ha\b/i,
    /\bSo e\b/i,
    /\b(?:instrucoes|importacao|rapido|sintetica|disponiveis|ocorrencia)\b/i
  ],
  "es-ES": [
    /\b(?:seleccióne|selecciónar|relaciónar|relaciónarse|ningúna)\b/i,
    /\b(?:memória|preferências)\b/i,
    /\b(?:restaurara|guardara|iniciara|vacio|poblacion|transaccion|revirtio|ambito)\b/i
  ]
};
for (const [locale, patterns] of Object.entries(catalogLanguageGuards)) {
  for (const [key, value] of Object.entries(catalogs[locale] || {})) {
    for (const pattern of patterns) {
      if (pattern.test(String(value))) failures.push(`${locale}.${key} contains a known cross-locale or diacritic regression: ${pattern}`);
    }
  }
}

const template = fs.readFileSync(path.join(rootDir, "src/index.template.html"), "utf8");
if (!/<html lang="en-US"/.test(template)) failures.push("The source template must use en-US as its fallback document language.");
for (const id of ["localeSelect", "firstRunLocaleSelect", "settingsLocaleSelect"]) {
  if (!new RegExp(`id="${id}"[^>]*data-locale-select`).test(template)) failures.push(`Missing locale selector: ${id}`);
}
for (const match of template.matchAll(/data-i18n(?:-(?:aria-label|aria-description|placeholder|title|html))?="([^"]+)"/g)) {
  if (!canonicalKeys.includes(match[1])) failures.push(`Template references unknown localization key: ${match[1]}`);
}
if (/STATIC_SOURCE_KEYS|translateSubtreeMessage|localizedTextNodes|localizedAttributes/.test(localizationSource)) {
  failures.push("Localization must not infer keys from source text or retain the legacy source-text maps.");
}

for (const issue of findUnboundTemplateCopy(template)) {
  failures.push(`src/index.template.html contains uncataloged visible copy: ${issue}`);
}

const sourceRoots = ["src/core", "src/ports", "src/capabilities", "src/ui"];
for (const relativeRoot of sourceRoots) {
  const files = collectJavaScript(path.join(rootDir, relativeRoot));
  for (const file of files) {
    if (file === localizationPath || file === additionalPath) continue;
    const source = fs.readFileSync(file, "utf8");
    if (/toLocaleString\(\s*["']pt-BR["']|localeCompare\([^\n]*["']pt-BR["']|Intl\.(?:NumberFormat|DateTimeFormat|Collator|RelativeTimeFormat)\(\s*["']pt-BR["']/.test(source)) {
      failures.push(`${path.relative(rootDir, file)} contains feature-owned pt-BR formatting.`);
    }
    for (const match of source.matchAll(/\bt\(\s*["']([^"']+)["']/g)) {
      if (!canonicalKeySet.has(match[1])) failures.push(`${path.relative(rootDir, file)} references unknown localization key: ${match[1]}`);
    }
    for (const issue of findDirectVisibleAssignments(source)) {
      failures.push(`${path.relative(rootDir, file)} contains uncataloged visible assignment: ${issue}`);
    }
    for (const issue of findDirectVisibleSinks(source)) {
      failures.push(`${path.relative(rootDir, file)} contains uncataloged visible sink: ${issue}`);
    }
    for (const issue of findUncatalogedHtmlLiterals(source)) {
      failures.push(`${path.relative(rootDir, file)} contains uncataloged dynamic HTML: ${issue}`);
    }
    if (file !== additionalPath && /[áéíóúãõçÁÉÍÓÚÃÕÇ]/.test(source)) {
      const allowedProperNameOnly = path.basename(file) === "22a-sql-tab-presets.js"
        && source.replaceAll("Caverna do Dragão", "").search(/[áéíóúãõçÁÉÍÓÚÃÕÇ]/) === -1;
      if (!allowedProperNameOnly) failures.push(`${path.relative(rootDir, file)} contains Portuguese user-facing source outside the catalogs.`);
    }
  }
}

if (findDirectVisibleAssignments('status.textContent = "Uncataloged visible message";').length !== 1) {
  failures.push("The direct-visible-copy detector does not reject its mutation fixture.");
}
if (findDirectVisibleSinks('setStatus("Uncataloged visible status", "warn");').length !== 1) {
  failures.push("The visible-sink detector does not reject its mutation fixture.");
}
if (findDirectVisibleSinks('chooseSingleFileHandle({ description: "Uncataloged picker description" });').length !== 1) {
  failures.push("The structured-visible-sink detector does not reject its mutation fixture.");
}
if (findUncatalogedHtmlLiterals('const html = `<button type="button">Uncataloged action</button>`;').length !== 1) {
  failures.push("The dynamic-HTML detector does not reject its mutation fixture.");
}

const workerSource = fs.readFileSync(path.join(rootDir, "src/ports/20-sql-worker.js"), "utf8");
if (/STATIC_SOURCE_KEYS|error:\s*["'][^"']+["']/.test(workerSource)) {
  failures.push("SQL worker failures must use stable errorCode and errorVariables fields.");
}
if (/(?<!function )\bworkerError\(\s*(?!["'])/.test(workerSource)) {
  failures.push("SQL worker error codes must be static string literals.");
}
const workerMessageCodes = new Set([
  ...Array.from(workerSource.matchAll(/\bworkerError\(\s*["']([^"']+)["']/g), match => match[1]),
  ...Array.from(workerSource.matchAll(/\b(?:errorCode|messageCode|summaryCode|code)\s*:\s*["']([^"']+)["']/g), match => match[1])
]);
for (const code of workerMessageCodes) {
  if (!canonicalKeySet.has(`worker.${code}`)) failures.push(`SQL worker emits uncataloged message code: worker.${code}`);
}

if (failures.length) {
  console.error("Localization validation failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Localization validation passed for ${expectedLocales.join(", ")} (${canonicalKeys.length} catalog keys).`);

function collectJavaScript(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectJavaScript(fullPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

function findUnboundTemplateCopy(source) {
  const issues = [];
  const stack = [];
  const tokens = source.match(/<!--[\s\S]*?-->|<![^>]*>|<[^>]+>|[^<]+/g) || [];
  const skippedTags = new Set(["script", "style", "svg"]);
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const visibleAttributes = [
    ["aria-label", "data-i18n-aria-label"],
    ["aria-description", "data-i18n-aria-description"],
    ["placeholder", "data-i18n-placeholder"],
    ["title", "data-i18n-title"],
    ["alt", "data-i18n-alt"]
  ];

  for (const token of tokens) {
    if (token.startsWith("<!--") || token.startsWith("<!")) continue;
    if (token.startsWith("</")) {
      stack.pop();
      continue;
    }
    if (token.startsWith("<")) {
      const tag = token.match(/^<\s*([A-Za-z0-9-]+)/)?.[1]?.toLowerCase();
      if (!tag) continue;
      const attributes = Object.fromEntries(Array.from(token.matchAll(/([:\w-]+)(?:\s*=\s*"([^"]*)")?/g), match => [match[1], match[2] ?? ""]));
      const parent = stack[stack.length - 1];
      const skipped = Boolean(parent?.skipped || skippedTags.has(tag) || attributes["aria-hidden"] === "true");
      const localized = Boolean(parent?.localized || attributes["data-i18n"] || attributes["data-i18n-html"] || attributes["data-i18n-ignore"] !== undefined);
      for (const [attribute, binding] of visibleAttributes) {
        const value = String(attributes[attribute] || "").trim();
        if (value && attributes["data-i18n-ignore"] === undefined && !attributes[binding] && !isApprovedLiteral(value)) issues.push(`${attribute}="${value}"`);
      }
      if (!token.endsWith("/>") && !voidTags.has(tag)) stack.push({ tag, skipped, localized });
      continue;
    }

    const context = stack[stack.length - 1];
    const text = token.replace(/\s+/g, " ").trim();
    if (!text || context?.skipped || context?.localized || isApprovedLiteral(text)) continue;
    issues.push(`text "${text.slice(0, 120)}"`);
  }
  return issues;
}

function findDirectVisibleAssignments(source) {
  const issues = [];
  const properties = new Set(["textContent", "innerText", "innerHTML", "placeholder", "title"]);
  walkSyntax(source, node => {
    if (node.type !== "AssignmentExpression" || node.left?.type !== "MemberExpression") return;
    const property = getMemberPropertyName(node.left);
    if (!properties.has(property)) return;
    const visible = findFirstUnapprovedFragment(node.right, property === "innerHTML");
    if (visible) issues.push(`line ${node.loc.start.line}: "${visible.slice(0, 100)}"`);
  });
  return issues;
}

function findDirectVisibleSinks(source) {
  const issues = [];
  const sinkArguments = new Map([
    ["setStatus", [0]],
    ["announceSqlMap", [0]],
    ["showToast", [1, 2]]
  ]);
  walkSyntax(source, node => {
    if (node.type !== "CallExpression" || node.callee?.type !== "Identifier") return;
    if (node.callee.name === "chooseSingleFileHandle" && node.arguments[0]?.type === "ObjectExpression") {
      const description = node.arguments[0].properties.find(property => (
        property.type === "Property" && getPropertyName(property.key) === "description"
      ));
      const visible = findFirstUnapprovedFragment(description?.value, false);
      if (visible) issues.push(`line ${node.loc.start.line} chooseSingleFileHandle.description: "${visible.slice(0, 100)}"`);
    }
    const indexes = sinkArguments.get(node.callee.name);
    if (!indexes) return;
    for (const index of indexes) {
      if (node.callee.name === "showToast" && !isCatalogedToastExpression(node.arguments[index])) {
        issues.push(`line ${node.loc.start.line} showToast argument ${index} is not catalog-backed`);
        continue;
      }
      const visible = findFirstUnapprovedFragment(node.arguments[index], false);
      if (visible) issues.push(`line ${node.loc.start.line} ${node.callee.name}: "${visible.slice(0, 100)}"`);
    }
  });
  return issues;
}

function isCatalogedToastExpression(node) {
  if (node?.type === "ConditionalExpression") {
    return isCatalogedToastExpression(node.consequent) && isCatalogedToastExpression(node.alternate);
  }
  if (node?.type !== "CallExpression" || node.callee?.type !== "Identifier") return false;
  return node.callee.name === "t" || node.callee.name === "buildSqlErrorToastMessage";
}

function findUncatalogedHtmlLiterals(source) {
  const issues = [];
  walkSyntax(source, node => {
    const raw = node.type === "Literal" && typeof node.value === "string"
      ? node.value
      : node.type === "TemplateElement"
        ? node.value.raw
        : "";
    if (!/<\/?[A-Za-z][^>]*>/.test(raw)) return;
    const visible = normalizeHtmlVisibleFragment(raw);
    if (visible && !isApprovedLiteral(visible)) issues.push(`line ${node.loc.start.line}: "${visible.slice(0, 100)}"`);
  });
  return issues;
}

function findFirstUnapprovedFragment(node, stripMarkup) {
  const fragments = collectLiteralFragments(node);
  for (const fragment of fragments) {
    const visible = stripMarkup ? normalizeHtmlVisibleFragment(fragment) : String(fragment || "").trim();
    if (visible && !isApprovedLiteral(visible)) return visible;
  }
  return "";
}

function collectLiteralFragments(node) {
  if (!node || typeof node !== "object") return [];
  if (node.type === "Literal" && typeof node.value === "string") return [node.value];
  if (node.type === "TemplateLiteral") return node.quasis.map(quasi => quasi.value.raw);
  if (["BinaryExpression", "LogicalExpression"].includes(node.type)) {
    return [...collectLiteralFragments(node.left), ...collectLiteralFragments(node.right)];
  }
  if (node.type === "ConditionalExpression") {
    return [...collectLiteralFragments(node.consequent), ...collectLiteralFragments(node.alternate)];
  }
  if (node.type === "ArrayExpression") return node.elements.flatMap(collectLiteralFragments);
  return [];
}

function getMemberPropertyName(node) {
  if (!node?.computed && node.property?.type === "Identifier") return node.property.name;
  if (node?.computed && node.property?.type === "Literal") return String(node.property.value || "");
  return "";
}

function getPropertyName(node) {
  if (node?.type === "Identifier") return node.name;
  if (node?.type === "Literal") return String(node.value || "");
  return "";
}

function walkSyntax(source, visit) {
  const tree = parse(String(source || ""), {
    ecmaVersion: "latest",
    sourceType: "module",
    locations: true,
    allowHashBang: true
  });
  const stack = [tree];
  while (stack.length) {
    const node = stack.pop();
    visit(node);
    for (const [key, value] of Object.entries(node)) {
      if (["start", "end", "loc"].includes(key) || !value) continue;
      if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index -= 1) {
          if (value[index]?.type) stack.push(value[index]);
        }
      } else if (value?.type) {
        stack.push(value);
      }
    }
  }
}

function normalizeVisibleLiteral(value) {
  return String(value || "")
    .replace(/\$\{[\s\S]*?\}/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[A-Za-z#0-9]+;/g, " ")
    .replace(/\\[nrt]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHtmlVisibleFragment(value) {
  let fragment = String(value || "");
  if (!/[<>]/.test(fragment) && /^\s*["']?\s*(?:aria-|data-|class\b|id\b|name\b|type\b|title\b|value\b|step\b|minlength\b|maxlength\b|min\b|max\b|role\b|placeholder\b|autocomplete\b|spellcheck\b|disabled\b|checked\b|selected\b|tabindex\b)/.test(fragment)) {
    return "";
  }
  const firstOpen = fragment.indexOf("<");
  const firstClose = fragment.indexOf(">");
  if (firstClose >= 0 && (firstOpen === -1 || firstClose < firstOpen)) {
    fragment = fragment.slice(firstClose + 1);
  }
  fragment = fragment.replace(/<[^>]*$/g, "");
  return normalizeVisibleLiteral(fragment);
}

function isApprovedLiteral(value) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return true;
  if (!/[\p{L}\p{N}]/u.test(normalized)) return true;
  if (/^hSQLite Editor(?: v\{\{VERSION\}\})?$/.test(normalized)) return true;
  if (/^(?:v|· MB|\\n\.\.\.)$/.test(normalized)) return true;
  if (/^(?:\$\d+|· PK)$/.test(normalized)) return true;
  if (/^<[^>]*class=\\?$/.test(normalized)) return true;
  if (/^\+ .* \+$/.test(normalized)) return true;
  if (/^(?:hSQLite Editor|v\{\{VERSION\}\}|OFF|ON|ALL|TABLE|VIEW|CSV|JSON|GitHub|MIT|F\d+|Cmd\/Ctrl|Ctrl\/Cmd|PK|NULL|SQL|SQLite|WebAssembly|IndexedDB)$/.test(normalized)) return true;
  if (/^(?:(?:Ctrl|Cmd|Shift|Mayús|Alt|Option|F\d+)[+/]?)+(?:[A-Z])?$/.test(normalized)) return true;
  if (/^[A-Za-z0-9_-]+(?: [A-Za-z0-9_-]+)*$/.test(normalized) && normalized.split(" ").every(token => token.includes("-") || /^[A-Z0-9_]+$/.test(token))) return true;
  if (/^[\d\s.,:;!?+*/=()\[\]{}<>#%&|_~^'"`-]+$/.test(normalized)) return true;
  if (/^(?:https?:\/\/|file:\/\/|data:|blob:)/.test(normalized)) return true;
  return false;
}
