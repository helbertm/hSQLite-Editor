import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { assertRegularRepoFile } from "./linux-package-safety.mjs";
import { assertStableReleaseVersion, escapeRegExp } from "./release-utils.mjs";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const metainfoPath = path.join(rootDir, "packaging/linux/io.github.helbertm.hsqlite-editor.metainfo.xml");

export function getCanonicalLinuxReleaseMetadata() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  const version = assertStableReleaseVersion(packageJson.version);
  const changelog = fs.readFileSync(path.join(rootDir, "CHANGELOG.md"), "utf8");
  const escapedVersion = escapeRegExp(version);
  const date = changelog.match(new RegExp(`^## \\[${escapedVersion}\\].*\\((\\d{4}-\\d{2}-\\d{2})\\)$`, "m"))?.[1];
  if (!version || !date) throw new Error(`Missing canonical Linux release metadata for ${version || "empty version"}.`);
  return { version, date };
}

export function renderLinuxReleaseMetadata(metainfo, metadata) {
  const releasePattern = /<release\s+version="[^"]+"\s+date="[^"]+"\s+type="stable"\s*\/>\s*<!--\s*x-release-please-version\s*-->/;
  if (!releasePattern.test(metainfo)) {
    throw new Error("Linux AppStream release marker is missing or malformed.");
  }
  return metainfo.replace(
    releasePattern,
    `<release version="${metadata.version}" date="${metadata.date}" type="stable" /> <!-- x-release-please-version -->`
  );
}

export function syncLinuxReleaseMetadata(options = {}) {
  assertRegularRepoFile(rootDir, metainfoPath);
  const current = fs.readFileSync(metainfoPath, "utf8");
  const expected = renderLinuxReleaseMetadata(current, getCanonicalLinuxReleaseMetadata());
  if (options.check) {
    if (current !== expected) {
      throw new Error("Linux AppStream release metadata is stale. Run npm run generate:linux-metadata.");
    }
    return false;
  }
  fs.writeFileSync(metainfoPath, expected);
  return current !== expected;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const check = process.argv.includes("--check");
  if (process.argv.length !== (check ? 3 : 2)) {
    process.stderr.write("Usage: node scripts/sync-linux-release-metadata.mjs [--check]\n");
    process.exit(64);
  }
  try {
    const changed = syncLinuxReleaseMetadata({ check });
    process.stdout.write(check
      ? "Linux AppStream release metadata is synchronized.\n"
      : `Linux AppStream release metadata ${changed ? "updated" : "already current"}.\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
