import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  readJson,
  readText,
  readVendorManifest,
  verifyVendorManifest,
  getVendorAssetPath
} from "./vendor-utils.mjs";
import {
  ensureDir
} from "./release-utils.mjs";
import { buildEditorBundle } from "./editor-bundle.mjs";
import { buildApplicationBundle } from "./app-bundle.mjs";

export const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const srcDir = path.join(rootDir, "src");

function collectFiles(dirPath, extension) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, extension));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(extension)) files.push(fullPath);
  }
  return files.sort();
}

function escapeScriptCloseTag(source) {
  return source.replace(/<\/script>/gi, "<\\/script>");
}

function parseReleaseNotesFromChangelog(changelogText) {
  const lines = changelogText.split("\n");
  const versions = [];
  const notesByVersion = {};
  let currentVersion = "";
  let currentNotes = [];

  function flushCurrent() {
    if (!currentVersion) return;
    if (currentNotes.length) {
      versions.push(currentVersion);
      notesByVersion[currentVersion] = currentNotes;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(/^##\s+\[?v?(\d+\.\d+\.\d+)\]?/i);
    if (match) {
      flushCurrent();
      currentVersion = match[1];
      currentNotes = [];
      continue;
    }
    if (currentVersion && /^[-*]\s+/.test(line)) {
      currentNotes.push(line.replace(/^[-*]\s+/, "").trim());
    }
  }
  flushCurrent();

  return { versions, notesByVersion };
}

export function buildReleaseMetadata() {
  const manifest = readJson(path.join(rootDir, ".release-please-manifest.json"));
  const version = String(manifest["."] || "").trim();
  if (!version) throw new Error("Missing release version in .release-please-manifest.json");
  const packageJson = readJson(path.join(rootDir, "package.json"));
  const packageVersion = String(packageJson.version || "").trim();
  if (!packageVersion) throw new Error("Missing version in package.json");
  if (packageVersion !== version) {
    throw new Error(`Version mismatch: package.json=${packageVersion} manifest=${version}`);
  }

  const changelogText = readText(path.join(rootDir, "CHANGELOG.md"));
  const { versions, notesByVersion } = parseReleaseNotesFromChangelog(changelogText);
  if (!versions.includes(version)) {
    throw new Error(`CHANGELOG.md is missing a section for version ${version}`);
  }
  return {
    version,
    versions,
    notesByVersion
  };
}

function buildBootstrapScript(releaseMetadata, sqlWasmBase64, sqlJsWorkerSource, sqlWorkerSharedSource, minify = false) {
  const boot = {
    release: releaseMetadata,
    sqlWasmBase64,
    sqlJsWorkerSource,
    sqlWorkerSharedSource
  };

  return [
    "window.__HSQLITE_BOOT__ = ",
    JSON.stringify(boot, null, minify ? 0 : 2),
    ";"
  ].join("");
}

function stripTrailingWhitespace(text) {
  return String(text || "").replace(/[ \t]+$/gm, "");
}

export function buildArtifact(options = {}) {
  const outputPath = options.outputPath || path.join(rootDir, "index.html");
  const minifyBootstrap = Boolean(options.minifyBootstrap);
  const vendorManifest = readVendorManifest(rootDir);
  verifyVendorManifest(rootDir, vendorManifest);
  const templatePath = path.join(srcDir, "index.template.html");
  const template = readText(templatePath);
  const styles = collectFiles(path.join(srcDir, "styles"), ".css")
    .map(filePath => stripTrailingWhitespace(readText(filePath)))
    .join("\n\n");
  const appBundle = stripTrailingWhitespace(buildApplicationBundle(rootDir, { minify: minifyBootstrap }).code);
  const vendorScripts = [
    readText(getVendorAssetPath(rootDir, vendorManifest, "sql.js", "sql-wasm.js"))
  ].map(stripTrailingWhitespace).join("\n\n");
  const editorBundle = stripTrailingWhitespace(buildEditorBundle(rootDir, { minify: minifyBootstrap }).code);
  const sqlWasmBase64 = fs.readFileSync(getVendorAssetPath(rootDir, vendorManifest, "sql.js", "sql-wasm.wasm")).toString("base64");
  const releaseMetadata = buildReleaseMetadata();
  const sqlWorkerSharedSource = readText(path.join(srcDir, "core", "05-sql-statement-splitter.js"))
    .replace(/^export\s+/gm, "");
  const bootstrapScript = buildBootstrapScript(
    releaseMetadata,
    sqlWasmBase64,
    readText(getVendorAssetPath(rootDir, vendorManifest, "sql.js", "sql-wasm.js")),
    sqlWorkerSharedSource,
    minifyBootstrap
  );

  let output = template;
  output = output.replace(/<title>.*?<\/title>/, `<title>hSQLite Editor v${releaseMetadata.version}</title>`);
  output = output.replace(
    /<span class="version-pill" id="appVersionPill">.*?<\/span>/,
    `<span class="version-pill" id="appVersionPill">v${releaseMetadata.version}</span>`
  );
  output = output.replace(
    /<code id="offlineHtmlFileName">.*?<\/code>/,
    `<code id="offlineHtmlFileName">hSQLite-Editor-v${releaseMetadata.version}.html</code>`
  );
  output = output.replace("<!-- INLINE_STYLES -->", () => styles);
  output = output.replace(
    "<!-- INLINE_VENDOR_AND_APP -->",
    () => [
      escapeScriptCloseTag(vendorScripts),
      escapeScriptCloseTag(editorBundle),
      escapeScriptCloseTag(bootstrapScript),
      escapeScriptCloseTag(appBundle)
    ].join("\n\n")
  );

  ensureDir(path.dirname(outputPath));
  fs.writeFileSync(outputPath, output);
  return {
    outputPath,
    releaseMetadata
  };
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  buildArtifact();
}
