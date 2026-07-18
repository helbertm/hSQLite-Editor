import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {
  readJson,
  readVendorManifest,
  sha256
} from "./vendor-utils.mjs";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const artifactArg = process.argv[2] || "index.html";
const artifactPath = path.isAbsolute(artifactArg)
  ? artifactArg
  : path.join(rootDir, artifactArg);
const html = fs.readFileSync(artifactPath, "utf8");
const vendorManifest = readVendorManifest(rootDir);
const packageJson = readJson(path.join(rootDir, "package.json"));
const releaseManifest = readJson(path.join(rootDir, ".release-please-manifest.json"));

const failures = [];
const packageVersion = String(packageJson.version || "").trim();
const manifestVersion = String(releaseManifest["."] || "").trim();

function extractInlineScripts(markup) {
  return Array.from(markup.matchAll(/<script>([\s\S]*?)<\/script>/g)).map((match) => match[1] || "");
}

function validateInlineScriptSyntax(markup) {
  const scripts = extractInlineScripts(markup);
  const syntaxErrors = [];

  scripts.forEach((scriptSource, index) => {
    try {
      new vm.Script(scriptSource, {
        filename: `${path.basename(artifactPath)}#inline-script-${index + 1}`
      });
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      syntaxErrors.push(`Inline script ${index + 1} has invalid JavaScript syntax: ${message}`);
    }
  });

  return syntaxErrors;
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

function extractBootPayload(markup) {
  const combinedScript = extractInlineScripts(markup).find((source) => source.includes("window.__HSQLITE_BOOT__ = "));
  if (!combinedScript) return null;

  const assignmentToken = "window.__HSQLITE_BOOT__ = ";
  const assignmentStart = combinedScript.indexOf(assignmentToken);
  const objectStart = combinedScript.indexOf("{", assignmentStart);
  if (assignmentStart < 0 || objectStart < 0) return null;

  const objectEnd = findMatchingBrace(combinedScript, objectStart);
  const statementEnd = combinedScript.indexOf(";", objectEnd);
  if (objectEnd < 0 || statementEnd < 0) return null;

  const bootSource = combinedScript.slice(assignmentStart, statementEnd + 1);
  const context = vm.createContext({ window: {} });
  new vm.Script(bootSource, {
    filename: `${path.basename(artifactPath)}#boot-payload`
  }).runInContext(context);

  return context.window.__HSQLITE_BOOT__ || null;
}

if (!packageVersion || !manifestVersion) {
  failures.push("Missing version in package.json or .release-please-manifest.json.");
} else if (packageVersion !== manifestVersion) {
  failures.push(`Version mismatch: package.json=${packageVersion} manifest=${manifestVersion}`);
}

if (!html.includes("window.__HSQLITE_BOOT__")) {
  failures.push("Missing embedded boot metadata.");
}
if (/cdnjs\.cloudflare\.com|raw\.githubusercontent\.com/.test(html)) {
  failures.push("Artifact still contains external CDN/runtime URLs.");
}
if (/\/Users\/|[A-Za-z]:\\\\/.test(html)) {
  failures.push("Artifact still contains a machine-local absolute filesystem path.");
}
if (/SEU_USUARIO|SEU_REPOSITORIO/.test(html)) {
  failures.push("Artifact still contains placeholder sample database configuration.");
}
if (/sampleDbBtn|sampleDbModal|Bases didáticas|openSampleAfterCreate/.test(html)) {
  failures.push("Artifact still contains the disabled sample-database surface.");
}
if (/new Function\s*\(/.test(html)) {
  failures.push("Artifact still contains string-evaluated runtime code.");
}
if (/\beval\s*\(/.test(html)) {
  failures.push("Artifact still contains eval-based runtime code.");
}
if (/sourceMappingURL\s*=/.test(html)) {
  failures.push("Artifact still contains a source-map reference.");
}
if (/<(?:script|link)\b[^>]*(?:src|href)=["']https?:\/\//i.test(html)) {
  failures.push("Artifact still contains an external script or style dependency.");
}
if (/CodeMirror\.fromTextArea|CodeMirror\.Pos|\.CodeMirror(?:\b|-)|5\.65\./.test(html)) {
  failures.push("Artifact still contains CodeMirror 5 runtime residue.");
}
if (!html.includes("HSQLiteCodeEditor") || !/majorVersion\s*:\s*6/.test(html)) {
  failures.push("Artifact is missing the embedded CodeMirror 6 adapter contract.");
}
if (/splitSqlStatements\.toString\s*\(/.test(html)) {
  failures.push("Artifact still contains runtime SQL splitter source serialization.");
}
if (/class="[^"]*(?:ui-button|ui-button-icon|ui-button-sm)[^"]*sql-tab-(?:control|close|rename)|class="[^"]*sql-tab-(?:control|close|rename)[^"]*(?:ui-button|ui-button-icon|ui-button-sm)/.test(html)) {
  failures.push("Artifact still applies generic ui-button classes to SQL tab inline action controls.");
}
if (!/<title>hSQLite Editor v\d+\.\d+\.\d+<\/title>/.test(html)) {
  failures.push("Artifact title was not versioned from release metadata.");
}
if (manifestVersion && !html.includes(`<title>hSQLite Editor v${manifestVersion}</title>`)) {
  failures.push(`Artifact title version does not match manifest version ${manifestVersion}.`);
}
if (!/window\.__HSQLITE_BOOT__ = /.test(html)) {
  failures.push("Artifact is missing release bootstrap data.");
}
const bootPayload = extractBootPayload(html);
if (!bootPayload) {
  failures.push("Artifact boot payload could not be parsed.");
} else {
  const bootRelease = bootPayload.release || {};
  const bootVersion = String(bootRelease.version || "").trim();
  const bootVersions = Array.isArray(bootRelease.versions) ? bootRelease.versions.map((item) => String(item || "").trim()).filter(Boolean) : [];
  const currentNotes = bootRelease.notesByVersion && typeof bootRelease.notesByVersion === "object"
    ? bootRelease.notesByVersion[manifestVersion]
    : null;

  if (bootVersion !== manifestVersion) {
    failures.push(`Embedded boot release version mismatch: boot=${bootVersion || "empty"} manifest=${manifestVersion || "empty"}`);
  }
  if (!bootVersions.length || !bootVersions.includes(manifestVersion)) {
    failures.push(`Embedded boot release history is missing manifest version ${manifestVersion}.`);
  }
  if (!Array.isArray(currentNotes) || !currentNotes.length) {
    failures.push(`Embedded boot release notes are missing entries for manifest version ${manifestVersion}.`);
  }
}
if ((html.match(/<!DOCTYPE html>/g) || []).length !== 1) {
  failures.push("Artifact must contain exactly one DOCTYPE.");
}
if ((html.match(/<body>/g) || []).length !== 1 || (html.match(/<\/body>/g) || []).length !== 1) {
  failures.push("Artifact must contain exactly one body element.");
}
if (!/"sqlWasmBase64"\s*:\s*"[A-Za-z0-9+/=]+"/.test(html)) {
  failures.push("Artifact is missing embedded sql.js wasm payload.");
}
if (!/"sqlJsWorkerSource"\s*:\s*".+?"/.test(html)) {
  failures.push("Artifact is missing embedded sql.js worker source.");
}
if (!/"sqlWorkerSharedSource"\s*:\s*".+?"/.test(html)) {
  failures.push("Artifact is missing embedded shared SQL worker source.");
}
if (manifestVersion && !html.includes(`id="offlineHtmlFileName">hSQLite-Editor-v${manifestVersion}.html</code>`)) {
  failures.push(`Artifact offline filename help does not match manifest version ${manifestVersion}.`);
}
failures.push(...validateInlineScriptSyntax(html));
if (!path.basename(artifactPath).endsWith(".html")) {
  failures.push("Artifact validation only supports .html outputs.");
}
for (const asset of vendorManifest.assets || []) {
  const absolutePath = path.join(rootDir, asset.path);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Vendored asset missing: ${asset.path}`);
    continue;
  }
  const actualSha = sha256(absolutePath);
  if (actualSha !== asset.sha256) {
    failures.push(`Vendored asset checksum mismatch: ${asset.path}`);
  }
}

if (failures.length) {
  console.error("Artifact validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Artifact validation passed: ${path.relative(rootDir, artifactPath)}`);
