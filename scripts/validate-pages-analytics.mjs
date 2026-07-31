import fs from "node:fs";
import path from "node:path";
import {
  ANALYTICS_MARKER,
  buildPagesAnalyticsLoader,
  PAGES_ORIGIN,
  UMAMI_SCRIPT_URL
} from "./prepare-pages-site.mjs";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const failures = [];

for (const relativePath of ["index.html", "src/index.template.html"]) {
  const source = fs.readFileSync(path.join(rootDir, relativePath), "utf8");
  if (source.includes(ANALYTICS_MARKER) || source.includes(UMAMI_SCRIPT_URL)) {
    failures.push(`${relativePath} must not contain the GitHub Pages analytics loader.`);
  }
}

const distDir = path.join(rootDir, "dist");
if (fs.existsSync(distDir)) {
  for (const entry of fs.readdirSync(distDir)) {
    if (!entry.endsWith(".html")) continue;
    const source = fs.readFileSync(path.join(distDir, entry), "utf8");
    if (source.includes(ANALYTICS_MARKER) || source.includes(UMAMI_SCRIPT_URL)) {
      failures.push(`dist/${entry} must not contain the GitHub Pages analytics loader.`);
    }
  }
}

const workflow = fs.readFileSync(path.join(rootDir, ".github/workflows/pages.yml"), "utf8");
for (const required of [
  "npm run prepare:pages",
  "UMAMI_WEBSITE_ID: ${{ vars.UMAMI_WEBSITE_ID }}"
]) {
  if (!workflow.includes(required)) failures.push(`pages.yml is missing: ${required}`);
}
if (/UMAMI_SCRIPT_URL:\s*\$\{\{/.test(workflow)) {
  failures.push("pages.yml must not accept a mutable analytics script URL.");
}

const prepareSource = fs.readFileSync(path.join(rootDir, "scripts/prepare-pages-site.mjs"), "utf8");
for (const required of [
  `export const UMAMI_SCRIPT_URL = "${UMAMI_SCRIPT_URL}"`,
  `export const PAGES_ORIGIN = "${PAGES_ORIGIN}"`,
  'tracker.dataset.excludeSearch = "true"',
  'tracker.dataset.excludeHash = "true"',
  'tracker.dataset.doNotTrack = "true"',
  "navigator.globalPrivacyControl === true",
  "tracker.dataset.tag"
]) {
  if (!prepareSource.includes(required)) failures.push(`Pages preparation is missing: ${required}`);
}

const sampleLoader = buildPagesAnalyticsLoader({
  websiteId: "94db1cb1-74f4-4a40-ad6c-962362670409",
  version: "0.0.0"
});
for (const forbidden of [
  "data-performance",
  "data-before-send",
  "data-umami-event",
  "umami.track(",
  "umami.identify("
]) {
  if (sampleLoader.includes(forbidden)) failures.push(`Pages loader contains forbidden analytics behavior: ${forbidden}`);
}

const privacy = fs.readFileSync(path.join(rootDir, "docs/privacy.md"), "utf8");
for (const required of [
  "GitHub Pages",
  "Umami",
  "Do Not Track",
  "Global Privacy Control",
  "editor version",
  "SQL text",
  "file names"
]) {
  if (!privacy.includes(required)) failures.push(`docs/privacy.md is missing hosted-analytics guidance: ${required}`);
}

if (failures.length) {
  console.error("GitHub Pages analytics validation failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("GitHub Pages analytics validation passed (standalone isolation, fixed vendor URL, origin, minimization, and documentation).");
