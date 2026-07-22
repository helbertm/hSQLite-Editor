import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getReleaseArtifactPath, getReleaseTag } from "./release-utils.mjs";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const checkOnly = process.argv.includes("--check");
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const releaseManifest = JSON.parse(fs.readFileSync(path.join(rootDir, ".release-please-manifest.json"), "utf8"));
const version = String(packageJson.version || "").trim();
const manifestVersion = String(releaseManifest["."] || "").trim();

if (!version || version !== manifestVersion) {
  console.error(`Release version mismatch: package=${version || "empty"} manifest=${manifestVersion || "empty"}`);
  process.exit(1);
}

const releaseTag = getReleaseTag(packageJson.name, version);
const artifactPath = getReleaseArtifactPath(rootDir, version);
const sbomPath = path.join(rootDir, "sbom.spdx.json");
const checksumPath = path.join(rootDir, "SHA256SUMS");
const subjects = [artifactPath, sbomPath];

for (const subjectPath of subjects) {
  if (!fs.existsSync(subjectPath)) {
    console.error(`Release subject is missing: ${path.relative(rootDir, subjectPath)}`);
    process.exit(1);
  }
}

const sbom = JSON.parse(fs.readFileSync(sbomPath, "utf8"));
const expectedNamespace = `https://github.com/helbertm/hSQLite-Editor/releases/tag/${releaseTag}/sbom.spdx.json`;
const describedPackage = (sbom.packages || []).find(item => item.SPDXID === "SPDXRef-Package-hSQLite-Editor");
if (sbom.spdxVersion !== "SPDX-2.3" || sbom.documentNamespace !== expectedNamespace || describedPackage?.versionInfo !== version) {
  console.error("SPDX SBOM does not describe the exact release tag and version.");
  process.exit(1);
}

const checksumText = subjects.map(subjectPath => {
  const digest = crypto.createHash("sha256").update(fs.readFileSync(subjectPath)).digest("hex");
  return `${digest}  ${path.relative(rootDir, subjectPath)}`;
}).join("\n") + "\n";

if (checkOnly) {
  if (!fs.existsSync(checksumPath) || fs.readFileSync(checksumPath, "utf8") !== checksumText) {
    console.error("SHA256SUMS is missing or stale. Run npm run generate:release-checksums.");
    process.exit(1);
  }
  console.log(`Release assets validated for ${releaseTag}.`);
} else {
  fs.writeFileSync(checksumPath, checksumText);
  console.log(`Generated SHA256SUMS for ${releaseTag}.`);
}
