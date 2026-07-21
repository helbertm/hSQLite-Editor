import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const workflowDir = path.join(rootDir, ".github/workflows");
const workflowFiles = fs.readdirSync(workflowDir)
  .filter(file => /\.ya?ml$/.test(file))
  .sort();
const failures = [];

for (const file of workflowFiles) {
  const source = fs.readFileSync(path.join(workflowDir, file), "utf8");
  for (const match of source.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/gm)) {
    const reference = match[1];
    if (!/@[a-f0-9]{40}$/.test(reference)) {
      failures.push(`${file} uses a mutable action reference: ${reference}`);
    }
  }
  if (!/^permissions:/m.test(source)) failures.push(`${file} has no explicit permissions block.`);
  if (!/timeout-minutes:/m.test(source)) failures.push(`${file} has no job timeout.`);
}

const releaseWorkflow = fs.readFileSync(path.join(workflowDir, "release-please.yml"), "utf8");
const releasePleaseConfig = JSON.parse(fs.readFileSync(path.join(rootDir, "release-please-config.json"), "utf8"));
const releasePackageConfig = releasePleaseConfig.packages?.["."] || {};
if (/actions\/attest-build-provenance@/.test(releaseWorkflow)) {
  failures.push("release-please.yml uses the superseded attest-build-provenance wrapper.");
}
if ((releaseWorkflow.match(/uses:\s*actions\/attest@[a-f0-9]{40}/g) || []).length < 2) {
  failures.push("release-please.yml must create separate provenance and SPDX SBOM attestations with actions/attest.");
}
if (!/subject-path:\s*dist\/hSQLite-Editor-v\$\{\{ needs\.release-please\.outputs\.version \}\}\.html/.test(releaseWorkflow)) {
  failures.push("release-please.yml does not attest the exact versioned HTML release subject.");
}
if (!/sbom-path:\s*sbom\.spdx\.json/.test(releaseWorkflow)) {
  failures.push("release-please.yml does not bind the SPDX SBOM to the HTML release subject.");
}
if (!/ref:\s*\$\{\{ needs\.release-please\.outputs\.tag_name \}\}/.test(releaseWorkflow)) {
  failures.push("release-please.yml does not rebuild the exact created release tag before publication.");
}
if (releasePackageConfig.draft !== true) {
  failures.push("release-please must create a draft release so assets close before immutable publication.");
}
if (releasePackageConfig["force-tag-creation"] !== true) {
  failures.push("release-please must create the exact tag before a draft release can be rebuilt and validated.");
}
if (/\s--clobber(?:\s|$)/m.test(releaseWorkflow)) {
  failures.push("release-please.yml must fail closed instead of overwriting release assets with --clobber.");
}
const uploadIndex = releaseWorkflow.indexOf("gh release upload");
const publishIndex = releaseWorkflow.indexOf("gh release edit");
if (uploadIndex < 0 || publishIndex < 0 || publishIndex <= uploadIndex) {
  failures.push("release-please.yml must upload the exact draft assets before publishing the release.");
}
if (!/gh release edit "\$\{\{ needs\.release-please\.outputs\.tag_name \}\}" --draft=false/.test(releaseWorkflow)) {
  failures.push("release-please.yml must publish the exact draft tag only after asset upload succeeds.");
}

if (failures.length) {
  console.error("Workflow validation failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Workflow validation passed (${workflowFiles.length} workflows, immutable action pins, atomic draft-first release publication, explicit permissions, attestations, and timeouts).`);
