import fs from "node:fs";
import path from "node:path";
import {
  assertReleasePackageName,
  assertStableReleaseVersion,
  escapeRegExp,
  getReleaseTag
} from "./release-utils.mjs";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const packageLock = JSON.parse(fs.readFileSync(path.join(rootDir, "package-lock.json"), "utf8"));
const vendorManifest = JSON.parse(fs.readFileSync(path.join(rootDir, "vendor/manifest.json"), "utf8"));
const runtimeComponents = JSON.parse(fs.readFileSync(path.join(rootDir, "runtime-components.json"), "utf8"));
const changelog = fs.readFileSync(path.join(rootDir, "CHANGELOG.md"), "utf8");
const checkOnly = process.argv.includes("--check");
const outputPath = path.join(rootDir, "sbom.spdx.json");
const releasePackageName = assertReleasePackageName(packageJson.name);
const releaseVersion = assertStableReleaseVersion(packageJson.version);

const componentGroups = new Map();
for (const [packagePath, metadata] of Object.entries(packageLock.packages || {})) {
  if (!packagePath || !metadata?.version) continue;
  const name = packagePath.split("node_modules/").at(-1);
  const key = `${name}@${metadata.version}`;
  componentGroups.set(key, {
    name,
    version: metadata.version,
    license: metadata.license || "NOASSERTION",
    upstream: metadata.resolved || "NOASSERTION",
    checksums: [],
    runtime: false,
    development: true
  });
}

for (const asset of vendorManifest.assets || []) {
  const match = String(asset.path || "").match(/^vendor\/([^/]+)\/([^/]+)\//);
  if (!match) continue;
  const key = `${match[1]}@${match[2]}`;
  const group = componentGroups.get(key) || {
    name: match[1],
    version: match[2],
    license: asset.license || "NOASSERTION",
    upstream: asset.upstream || "NOASSERTION",
    checksums: [],
    runtime: false,
    development: false
  };
  group.checksums.push({ algorithm: "SHA256", checksumValue: asset.sha256 });
  group.runtime = true;
  if (group.upstream === "NOASSERTION") group.upstream = asset.upstream || "NOASSERTION";
  if (group.license === "NOASSERTION") group.license = asset.license || "NOASSERTION";
  componentGroups.set(key, group);
}

for (const bundle of runtimeComponents.bundles || []) {
  if (bundle.runtime !== true) continue;
  for (const component of bundle.components || []) {
    const key = `${component.name}@${component.version}`;
    const group = componentGroups.get(key);
    if (!group) {
      console.error(`Bundled runtime component is missing from package-lock.json: ${key}`);
      process.exit(1);
    }
    group.runtime = true;
    if (group.license === "NOASSERTION") group.license = component.license || "NOASSERTION";
    if (group.upstream === "NOASSERTION") group.upstream = component.resolved || "NOASSERTION";
  }
}

const mainSpdxId = "SPDXRef-Package-hSQLite-Editor";
const dependencies = Array.from(componentGroups.values()).sort((a, b) => a.name.localeCompare(b.name));
const changelogPattern = new RegExp(`^## \\[${escapeRegExp(releaseVersion)}\\].*\\((\\d{4}-\\d{2}-\\d{2})\\)$`, "m");
const releaseDate = changelog.match(changelogPattern)?.[1];
if (!releaseDate) {
  console.error(`CHANGELOG.md does not contain a release date for ${releaseVersion}.`);
  process.exit(1);
}
const canonicalCreatedAt = `${releaseDate}T00:00:00Z`;
const releaseTag = getReleaseTag(releasePackageName, releaseVersion);

function getComponentSpdxId(component) {
  return `SPDXRef-Package-${component.name}-${component.version}`.replace(/[^A-Za-z0-9.-]/g, "-");
}

function getNpmPurl(component) {
  const encodedName = encodeURIComponent(component.name).replace(/%2F/gi, "/");
  return `pkg:npm/${encodedName}@${component.version}`;
}

const document = {
  spdxVersion: "SPDX-2.3",
  dataLicense: "CC0-1.0",
  SPDXID: "SPDXRef-DOCUMENT",
  name: `hSQLite Editor ${packageJson.version} SBOM`,
  documentNamespace: `https://github.com/helbertm/hSQLite-Editor/releases/tag/${releaseTag}/sbom.spdx.json`,
  creationInfo: {
    created: canonicalCreatedAt,
    creators: [`Tool: hSQLite Editor repo-owned SBOM generator@${packageJson.version}`]
  },
  packages: [
    {
      name: "hSQLite Editor",
      SPDXID: mainSpdxId,
      versionInfo: packageJson.version,
      downloadLocation: "https://github.com/helbertm/hSQLite-Editor",
      filesAnalyzed: false,
      primaryPackagePurpose: "APPLICATION",
      licenseConcluded: "MIT",
      licenseDeclared: "MIT",
      copyrightText: "Copyright (c) 2026 hSQLite Editor contributors"
    },
    ...dependencies.map(component => ({
      name: component.name,
      SPDXID: getComponentSpdxId(component),
      versionInfo: component.version,
      downloadLocation: component.upstream,
      filesAnalyzed: false,
      ...(component.checksums.length ? { checksums: component.checksums } : {}),
      licenseConcluded: component.license,
      licenseDeclared: component.license,
      copyrightText: "NOASSERTION",
      primaryPackagePurpose: "LIBRARY",
      comment: [component.runtime ? "Bundled runtime dependency." : "", component.development ? "Development or release dependency from package-lock.json." : ""].filter(Boolean).join(" "),
      externalRefs: [{
        referenceCategory: "PACKAGE-MANAGER",
        referenceType: "purl",
        referenceLocator: getNpmPurl(component)
      }]
    }))
  ],
  relationships: [
    { spdxElementId: "SPDXRef-DOCUMENT", relationshipType: "DESCRIBES", relatedSpdxElement: mainSpdxId },
    ...dependencies.flatMap(component => [
      ...(component.runtime ? [{
        spdxElementId: mainSpdxId,
        relationshipType: "DEPENDS_ON",
        relatedSpdxElement: getComponentSpdxId(component)
      }] : []),
      ...(component.development ? [{
        spdxElementId: getComponentSpdxId(component),
        relationshipType: "DEV_DEPENDENCY_OF",
        relatedSpdxElement: mainSpdxId
      }] : [])
    ])
  ]
};

const serialized = `${JSON.stringify(document, null, 2)}\n`;
if (checkOnly) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== serialized) {
    console.error("sbom.spdx.json is missing or stale. Run npm run generate:sbom.");
    process.exit(1);
  }
  console.log("SPDX SBOM validation passed.");
} else {
  fs.writeFileSync(outputPath, serialized);
  console.log(`Generated ${path.relative(rootDir, outputPath)}.`);
}
