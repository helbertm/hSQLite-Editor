import fs from "node:fs";
import path from "node:path";
import {
  readJson,
  readText,
  writeJson
} from "./vendor-utils.mjs";
import { syncLinuxReleaseMetadata } from "./sync-linux-release-metadata.mjs";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const packageJsonPath = path.join(rootDir, "package.json");
const manifestPath = path.join(rootDir, ".release-please-manifest.json");
const changelogPath = path.join(rootDir, "CHANGELOG.md");

function parseVersion(version) {
  const match = String(version || "").trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Unsupported version format: ${version}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function formatVersion(parts) {
  return `${parts.major}.${parts.minor}.${parts.patch}`;
}

function incrementPatch(version) {
  const parsed = parseVersion(version);
  return formatVersion({
    ...parsed,
    patch: parsed.patch + 1
  });
}

function prependChangelogEntry(changelogText, version, previousVersion) {
  const date = new Date().toISOString().slice(0, 10);
  const heading = `## [${version}](https://github.com/helbertm/hSQLite-Editor/compare/hsqlite-editor-v${previousVersion}...hsqlite-editor-v${version}) (${date})`;
  const entry = [
    heading,
    "",
    "### Features",
    "",
    "* summarize the change set for this version",
    ""
  ].join("\n");

  if (changelogText.includes(heading)) return changelogText;
  return changelogText.replace("# Changelog\n\n", `# Changelog\n\n${entry}\n`);
}

const packageJson = readJson(packageJsonPath);
const manifest = readJson(manifestPath);
const packageVersion = String(packageJson.version || "").trim();
const manifestVersion = String(manifest["."] || "").trim();

if (!packageVersion || !manifestVersion) {
  throw new Error("Missing version in package.json or .release-please-manifest.json");
}
if (packageVersion !== manifestVersion) {
  throw new Error(`Version mismatch before bump: package.json=${packageVersion} manifest=${manifestVersion}`);
}

const nextVersion = incrementPatch(packageVersion);
packageJson.version = nextVersion;
manifest["."] = nextVersion;

writeJson(packageJsonPath, packageJson);
writeJson(manifestPath, manifest);

const changelogText = readText(changelogPath);
const nextChangelog = prependChangelogEntry(changelogText, nextVersion, packageVersion);
fs.writeFileSync(changelogPath, nextChangelog);

syncLinuxReleaseMetadata();

process.stdout.write(`Version bumped: v${packageVersion} -> v${nextVersion}\n`);
