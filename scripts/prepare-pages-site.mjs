import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const UMAMI_SCRIPT_URL = "https://cloud.umami.is/script.js";
export const PAGES_ORIGIN = "https://helbertm.github.io";
export const PAGES_PATH_PREFIX = "/hSQLite-Editor/";
export const ANALYTICS_MARKER = 'data-pages-analytics="umami"';

const WEBSITE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const COPY_FILES = ["CHANGELOG.md", ".release-please-manifest.json"];

function assertWebsiteId(websiteId) {
  const value = String(websiteId || "").trim();
  if (!WEBSITE_ID_PATTERN.test(value)) {
    throw new Error("UMAMI_WEBSITE_ID must be a valid UUID.");
  }
  return value;
}

function assertVersion(version) {
  const value = String(version || "").trim();
  if (!VERSION_PATTERN.test(value)) {
    throw new Error(`Unsupported package version: ${value || "(empty)"}`);
  }
  return value;
}

export function buildPagesAnalyticsLoader({ websiteId, version }) {
  const normalizedWebsiteId = assertWebsiteId(websiteId);
  const normalizedVersion = assertVersion(version);
  const tag = `hsqlite-editor-v${normalizedVersion}`;

  return [
    `<script ${ANALYTICS_MARKER}>`,
    "(() => {",
    `  const expectedOrigin = ${JSON.stringify(PAGES_ORIGIN)};`,
    `  const expectedPathPrefix = ${JSON.stringify(PAGES_PATH_PREFIX)};`,
    "  const currentPath = window.location.pathname;",
    "  if (window.location.origin !== expectedOrigin) return;",
    "  if (currentPath !== expectedPathPrefix.slice(0, -1) && !currentPath.startsWith(expectedPathPrefix)) return;",
    '  const doNotTrack = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;',
    '  if (doNotTrack === "1" || doNotTrack === "yes" || navigator.globalPrivacyControl === true) return;',
    '  const tracker = document.createElement("script");',
    "  tracker.defer = true;",
    `  tracker.src = ${JSON.stringify(UMAMI_SCRIPT_URL)};`,
    `  tracker.dataset.websiteId = ${JSON.stringify(normalizedWebsiteId)};`,
    `  tracker.dataset.domains = ${JSON.stringify(new URL(PAGES_ORIGIN).hostname)};`,
    '  tracker.dataset.doNotTrack = "true";',
    '  tracker.dataset.excludeSearch = "true";',
    '  tracker.dataset.excludeHash = "true";',
    `  tracker.dataset.tag = ${JSON.stringify(tag)};`,
    "  document.head.appendChild(tracker);",
    "})();",
    "</script>"
  ].join("\n");
}

export function validatePagesSite({
  sourceHtml,
  pagesHtml,
  websiteId,
  version
}) {
  const normalizedWebsiteId = assertWebsiteId(websiteId);
  const normalizedVersion = assertVersion(version);
  const failures = [];
  const markerCount = (pagesHtml.match(/data-pages-analytics="umami"/g) || []).length;

  if (sourceHtml.includes(ANALYTICS_MARKER) || sourceHtml.includes(UMAMI_SCRIPT_URL)) {
    failures.push("The standalone index.html contains hosted analytics code.");
  }
  if (markerCount !== 1) failures.push(`The Pages artifact must contain exactly one analytics loader; found ${markerCount}.`);
  if (!pagesHtml.includes(`tracker.src = ${JSON.stringify(UMAMI_SCRIPT_URL)};`)) failures.push("The Pages artifact does not use the reviewed Umami script URL.");
  if (!pagesHtml.includes(`tracker.dataset.websiteId = ${JSON.stringify(normalizedWebsiteId)};`)) failures.push("The Pages artifact does not contain the configured Umami website ID.");
  if (!pagesHtml.includes(`tracker.dataset.tag = ${JSON.stringify(`hsqlite-editor-v${normalizedVersion}`)};`)) failures.push("The Pages artifact does not tag pageviews with the editor version.");
  for (const required of [
    `const expectedOrigin = ${JSON.stringify(PAGES_ORIGIN)};`,
    `const expectedPathPrefix = ${JSON.stringify(PAGES_PATH_PREFIX)};`,
    'tracker.dataset.domains = "helbertm.github.io";',
    'tracker.dataset.doNotTrack = "true";',
    'tracker.dataset.excludeSearch = "true";',
    'tracker.dataset.excludeHash = "true";'
  ]) {
    if (!pagesHtml.includes(required)) failures.push(`The Pages analytics guard is missing: ${required}`);
  }
  for (const forbidden of [
    "data-performance",
    "data-auto-track",
    "data-before-send",
    "data-umami-event",
    "umami.track",
    "umami.identify",
    "session-replay",
    "heatmap"
  ]) {
    if (pagesHtml.includes(forbidden)) failures.push(`The Pages artifact contains forbidden analytics behavior: ${forbidden}`);
  }
  if (failures.length) throw new Error(failures.join("\n"));
}

export function preparePagesSite({
  rootDir,
  outputDir = path.join(rootDir, "_site"),
  websiteId = process.env.UMAMI_WEBSITE_ID
}) {
  const normalizedWebsiteId = assertWebsiteId(websiteId);
  const sourcePath = path.join(rootDir, "index.html");
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  const version = assertVersion(packageJson.version);
  const sourceHtml = fs.readFileSync(sourcePath, "utf8");

  if (sourceHtml.includes(ANALYTICS_MARKER) || sourceHtml.includes(UMAMI_SCRIPT_URL)) {
    throw new Error("Hosted analytics must not exist in the standalone index.html.");
  }
  if ((sourceHtml.match(/<\/head>/g) || []).length !== 1) {
    throw new Error("Standalone index.html must contain exactly one closing head tag.");
  }

  const loader = buildPagesAnalyticsLoader({ websiteId: normalizedWebsiteId, version });
  const pagesHtml = sourceHtml.replace("</head>", `${loader}\n</head>`);
  validatePagesSite({
    sourceHtml,
    pagesHtml,
    websiteId: normalizedWebsiteId,
    version
  });

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.html"), pagesHtml);
  for (const file of COPY_FILES) {
    fs.copyFileSync(path.join(rootDir, file), path.join(outputDir, file));
  }

  return {
    outputDir,
    version,
    tag: `hsqlite-editor-v${version}`
  };
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  try {
    const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
    const result = preparePagesSite({ rootDir });
    console.log(`GitHub Pages site prepared for ${result.tag}.`);
  } catch (error) {
    console.error(`GitHub Pages preparation failed: ${error.message}`);
    process.exit(1);
  }
}
