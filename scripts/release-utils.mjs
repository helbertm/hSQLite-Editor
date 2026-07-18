import fs from "node:fs";
import path from "node:path";

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function collapseTagWhitespace(html) {
  return html
    .replace(/>\s+</g, "><")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function minifyStandaloneHtml(html) {
  return collapseTagWhitespace(html);
}

export function getReleaseArtifactPath(rootDir, version) {
  return path.join(rootDir, "dist", `hSQLite-Editor-v${version}.html`);
}

export function getReleaseTag(packageName, version) {
  return `${packageName}-v${version}`;
}
