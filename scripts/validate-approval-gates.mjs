import fs from "node:fs";
import path from "node:path";
import { readJson } from "./vendor-utils.mjs";
import {
  assertStableReleaseVersion,
  escapeRegExp,
  getReleaseArtifactPath
} from "./release-utils.mjs";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);

const packageJson = readJson(path.join(rootDir, "package.json"));
const releaseManifest = readJson(path.join(rootDir, ".release-please-manifest.json"));
const version = assertStableReleaseVersion(packageJson.version);
const manifestVersion = assertStableReleaseVersion(releaseManifest["."]);

const requiredFiles = [
  "index.html",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "SUPPORT.md",
  "GOVERNANCE.md",
  "THIRD_PARTY_NOTICES.md",
  "github-controls-policy.json",
  "runtime-components.json",
  "sbom.spdx.json",
  "security_posture.md",
  "docs/accessibility.md",
  "docs/architecture.md",
  "docs/adr/0001-codemirror-6-editor-runtime.md",
  "docs/adr/0002-esm-application-module-graph.md",
  "docs/localization.md",
  "docs/linux-packaging.md",
  "docs/privacy.md",
  "docs/releasing.md",
  "docs/validation.md",
  ".github/CODEOWNERS",
  ".github/codeql/codeql-config.yml",
  ".github/workflows/browser-quality.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/commit-convention.yml",
  ".github/workflows/dependency-review.yml",
  ".github/workflows/linux-package.yml",
  ".github/workflows/pages.yml",
  ".github/workflows/quality.yml",
  ".github/workflows/release-please.yml",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/bug.yml",
  ".github/ISSUE_TEMPLATE/feature.yml",
  ".github/dependabot.yml",
  "src/core/08-runtime-config.js",
  "src/app.mjs",
  "src/core/10-state-root.js",
  "src/core/11-state-tabs.js",
  "src/core/12-state-grid-results.js",
  "src/core/13-state-preferences.js",
  "src/core/14-state-database-schema.js",
  "src/core/15-state-runtime-library.js",
  "src/editor/codemirror6-adapter.mjs",
  "src/ports/05-storage.js",
  "src/ports/20-sql-worker.js",
  "src/ports/30-file-access.js",
  "src/capabilities/06-sql-runtime.js",
  "src/capabilities/07-database-runtime.js",
  "src/capabilities/45a-sql-map-runtime.js",
  "src/ui/70-bindings-database.js",
  "src/ui/71-bindings-library.js",
  "src/ui/72-bindings-advanced-ui.js",
  "src/ui/80-bindings.js",
  "scripts/validate-browser-backlog.mjs",
  "scripts/validate-browser-quality.mjs",
  "scripts/validate-github-controls.mjs",
  "scripts/validate-native-chromium.mjs",
  "scripts/validate-i18n.mjs",
  "scripts/validate-accessibility.mjs",
  "scripts/generate-sbom.mjs",
  "scripts/release-assets.mjs",
  "scripts/linux-package-safety.mjs",
  "scripts/stage-linux-release.mjs",
  "scripts/sync-linux-release-metadata.mjs",
  "scripts/validate-linux-package.mjs",
  "scripts/validate-linux-system-tools.sh",
  "scripts/generate-runtime-components.mjs",
  "scripts/editor-bundle.mjs",
  "scripts/app-bundle.mjs",
  "scripts/validate-module-graph.mjs",
  "scripts/validate-dependencies.mjs",
  "scripts/validate-privacy-docs.mjs",
  "scripts/validate-workflows.mjs",
  "scripts/validate-repository-state.mjs",
  "scripts/validate-settings-transfer.mjs",
  "scripts/contract-tests/sql-statement-splitter.test.mjs",
  "scripts/contract-tests/sqlite-types.test.mjs",
  "scripts/contract-tests/database-file-validation.test.mjs",
  "scripts/contract-tests/state-contracts.test.mjs",
  "scripts/contract-tests/github-controls.test.mjs",
  "scripts/validate-security-update.sh",
  "packaging/linux/hsqlite-editor",
  "packaging/linux/io.github.helbertm.hsqlite-editor.desktop",
  "packaging/linux/io.github.helbertm.hsqlite-editor.metainfo.xml",
  "packaging/linux/io.github.helbertm.hsqlite-editor.svg"
];

const requiredScripts = [
  "build",
  "build:release",
  "generate:release-checksums",
  "generate:linux-metadata",
  "serve:artifact",
  "stage:linux",
  "validate:source",
  "validate:linux",
  "validate:linux-metadata",
  "validate:linux:system",
  "validate:modules",
  "validate:static",
  "validate:i18n",
  "validate:accessibility",
  "validate:dependencies",
  "validate:privacy",
  "validate:runtime-components",
  "validate:sbom",
  "validate:workflows",
  "validate:artifact",
  "validate:artifact:structure",
  "validate:runtime",
  "validate:runtime:database",
  "validate:runtime:library",
  "validate:runtime:execution-grid",
  "validate:runtime:sql-map",
  "validate:runtime:features",
  "validate:runtime:all",
  "validate:browser:backlog",
  "validate:browser:quality",
  "validate:native:chromium",
  "validate:release",
  "validate:release:structure",
  "validate:release:runtime",
  "validate:release-assets",
  "validate:repository",
  "validate:settings-import",
  "test:unit",
  "test:contract",
  "validate:approval",
  "validate:full",
  "validate:full:ci",
  "validate:github-controls",
  "quality:docker",
  "quality:docker:update",
  "quality:security:docker"
];

const failures = [];

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function requireRegex(text, pattern, label) {
  if (!pattern.test(text)) {
    failures.push(label);
  }
}

function forbidRegex(text, pattern, label) {
  if (pattern.test(text)) {
    failures.push(label);
  }
}

for (const relativeFile of requiredFiles) {
  if (!fs.existsSync(path.join(rootDir, relativeFile))) {
    failures.push(`Missing required approval file: ${relativeFile}`);
  }
}

for (const scriptName of requiredScripts) {
  if (!packageJson.scripts || typeof packageJson.scripts[scriptName] !== "string") {
    failures.push(`Missing required repo-owned command: npm run ${scriptName}`);
  }
}

const scriptContracts = [
  ["validate:artifact", ["validate:artifact:structure", "validate:runtime:all"]],
  ["validate:release", ["validate:release:structure", "validate:release:runtime"]],
  ["validate:quality:offline", ["validate:static", "test:contract", "build", "build:release", "validate:linux", "validate:approval"]],
  ["test:contract", ["test:unit", "validate:settings-import"]],
  ["validate:runtime:features", [
    "validate:runtime:database",
    "validate:runtime:library",
    "validate:runtime:execution-grid",
    "validate:runtime:sql-map"
  ]]
];
for (const [scriptName, requiredFragments] of scriptContracts) {
  const command = packageJson.scripts?.[scriptName] || "";
  for (const fragment of requiredFragments) {
    if (!command.includes(fragment)) {
      failures.push(`npm run ${scriptName} must consume the focused ${fragment} command.`);
    }
  }
}

const fullValidator = readText("scripts/validate-full.mjs");
const repositoryValidator = readText("scripts/validate-repository-state.mjs");
const sourceValidator = readText("scripts/validate-source.mjs");
forbidRegex(
  sourceValidator,
  /["'](?:agent-state|dist|node_modules)\//,
  "scripts/validate-source.mjs must not depend on local, generated, or dependency trees."
);
requireRegex(
  repositoryValidator,
  /vendor\/codemirror\/5\.65\.18\//,
  "scripts/validate-repository-state.mjs must reject indexed CodeMirror 5 legacy paths."
);
for (const focusedCommand of [
  "validate:static",
  "test:contract",
  "validate:artifact:structure",
  "validate:runtime",
  "validate:runtime:features",
  "validate:release:structure",
  "validate:release:runtime",
  "validate:linux",
  "validate:approval"
]) {
  requireRegex(
    fullValidator,
    new RegExp(`\\["npm", "run", "${escapeRegExp(focusedCommand)}"\\]`),
    `scripts/validate-full.mjs must execute npm run ${focusedCommand} as a distinct step.`
  );
}
forbidRegex(
  fullValidator,
  /validate:github-controls/,
  "scripts/validate-full.mjs must keep live GitHub control auditing outside deterministic local CI."
);

if (!version || !manifestVersion || version !== manifestVersion) {
  failures.push(`Version sync failed: package.json=${version || "empty"} manifest=${manifestVersion || "empty"}`);
}

const changelog = readText("CHANGELOG.md");
requireRegex(changelog, new RegExp(`## \\[${escapeRegExp(version)}\\]`), `CHANGELOG.md is missing current version heading ${version}.`);

const readme = readText("README.md");
requireRegex(readme, /one standalone `index\.html` artifact/, "README.md must state the one-HTML distribution contract.");
requireRegex(readme, /offline-capable in `file:\/\/` mode/, "README.md must state the offline file:// support contract.");
requireRegex(readme, /npm run validate:full/, "README.md must document the complete release validator command.");
requireRegex(readme, /docs\/privacy\.md/, "README.md must link to the complete local-data inventory.");
requireRegex(readme, /docs\/validation\.md/, "README.md must link to the validation-layer contract.");
requireRegex(readme, /MIT/, "README.md must identify the project license.");
forbidRegex(readme, /- `src\/ui`:[^\n]*\n- `src\/ui`:/, "README.md still contains duplicate src/ui architecture bullets.");

const stateSource = readText("src/core/10-state-root.js");
for (const sliceName of [
  "tabs",
  "grid",
  "dbSession",
  "schema",
  "sqlMap",
  "preferences",
  "release",
  "history",
  "editor",
  "runtime"
]) {
  requireRegex(
    stateSource,
    new RegExp(`appState\\s*=\\s*\\{[\\s\\S]*?\\b${sliceName}\\s*:`),
    `src/core/10-state-root.js must keep appState.${sliceName} as an explicit authoritative slice.`
  );
}

forbidRegex(
  stateSource,
  /\bconst\s+(STORAGE_KEYS|SQL_TAB_NAME_PRESETS|FK_DIRECTION_HELP_LINKS|SCHEMA_COMMON_TYPES|ALLOWED_SQLITE_EXTENSIONS)\b/,
  "src/core/10-state-root.js still owns storage/domain constants that should remain outside the core state module."
);
forbidRegex(
  stateSource,
  /\bconst\s+(BOOT|APP_LOG_PREFIX|HSQLITE_DEBUG_FLAG|EMBEDDED_SQLJS_WASM_DATA_URL|EMBEDDED_SQLJS_WORKER_SOURCE|EMBEDDED_SQL_WORKER_SHARED_SOURCE|MAX_SQL_TABS|SHORTCUT_ACTIONS)\b|\blet\s+(SQL|db|sqlMapRuntime)\b|\bconst\s+sqlMapState\s*=\s*appState\.sqlMap\b/,
  "src/core/10-state-root.js still owns runtime-config or runtime-cache responsibilities that should remain outside the core state module."
);

const bindingsEntry = readText("src/ui/80-bindings.js");
const bindingsLineCount = bindingsEntry.split(/\n/).length;
if (bindingsLineCount > 100) {
  failures.push(`src/ui/80-bindings.js should remain a thin composition entrypoint, but has ${bindingsLineCount} lines.`);
}
forbidRegex(
  bindingsEntry,
  /function\s+bind(DatabaseFileInputs|RecentDatabaseUi|HistoryAndFavoritesUi|SettingsAndHelpUi|SqlMapUi|SqlFindUi|ExecutionAndTabDialogs|BootRecoveryUi)\s*\(/,
  "src/ui/80-bindings.js still contains feature-level binding blocks instead of composition-only wiring."
);

const runtimeExecution = readText("src/capabilities/10-sql-execution.js");
forbidRegex(runtimeExecution, /function\s+createSqlWorker\s*\(/, "src/capabilities/10-sql-execution.js still defines the SQL worker factory inline.");
forbidRegex(runtimeExecution, /splitSqlStatements\.toString\s*\(/, "src/capabilities/10-sql-execution.js still serializes shared SQL splitter source at runtime.");

const dbSessionRuntime = readText("src/capabilities/31-database-session-runtime.js");
forbidRegex(dbSessionRuntime, /showOpenFilePicker\s*\(/, "src/capabilities/31-database-session-runtime.js still owns raw browser file-picker access.");

const dbSessionStorage = readText("src/capabilities/30-database-session-storage.js");
forbidRegex(dbSessionStorage, /indexedDB\.open\s*\(/, "src/capabilities/30-database-session-storage.js still owns raw IndexedDB handle storage.");

const template = readText("src/index.template.html");
forbidRegex(template, /sampleDbBtn|sampleDbModal|Bases didáticas|openSampleAfterCreate/, "src/index.template.html still exposes the disabled sample-database surface.");
forbidRegex(template, /cdnjs\.cloudflare\.com|raw\.githubusercontent\.com/, "src/index.template.html still exposes runtime CDN references.");

const rootArtifact = readText("index.html");
const releaseArtifactPath = getReleaseArtifactPath(rootDir, version);
if (!fs.existsSync(releaseArtifactPath)) {
  failures.push(`Missing expected versioned release artifact: ${path.relative(rootDir, releaseArtifactPath)}`);
} else {
  const releaseArtifact = fs.readFileSync(releaseArtifactPath, "utf8");
  requireRegex(rootArtifact, new RegExp(`<title>hSQLite Editor v${escapeRegExp(version)}</title>`), "index.html title is out of sync with the current version.");
  requireRegex(releaseArtifact, new RegExp(`<title>hSQLite Editor v${escapeRegExp(version)}</title>`), "Release artifact title is out of sync with the current version.");
  if (releaseArtifact.length > rootArtifact.length) {
    failures.push("Release artifact should stay smaller than the readable root artifact after release minification.");
  }
}

const securityPolicy = readText("SECURITY.md");
requireRegex(securityPolicy, /Private Vulnerability Reporting/, "SECURITY.md must define a private vulnerability reporting path.");

const releaseWorkflow = readText(".github/workflows/release-please.yml");
requireRegex(releaseWorkflow, /npm run validate:dependencies/, "Release workflow must consume the repo-owned dependency vulnerability gate.");
requireRegex(releaseWorkflow, /npm run generate:release-checksums/, "Release workflow must generate checksums through the repo-owned portable command.");
requireRegex(releaseWorkflow, /npm run validate:release-assets/, "Release workflow must validate the exact release asset set.");
requireRegex(releaseWorkflow, /actions\/attest@[a-f0-9]{40}/, "Release workflow must use the unified immutable-pinned attestation action.");
requireRegex(releaseWorkflow, /publish-assets:[\s\S]*?needs:\s*release-please/, "Release assets must publish in a separate job after release creation.");
requireRegex(releaseWorkflow, /ref:\s*\$\{\{ needs\.release-please\.outputs\.tag_name \}\}/, "Release asset publication must rebuild the exact created tag.");
requireRegex(releaseWorkflow, /subject-path:\s*dist\/hSQLite-Editor-v\$\{\{ needs\.release-please\.outputs\.version \}\}\.html/, "Release provenance must identify the exact versioned HTML artifact.");
requireRegex(releaseWorkflow, /sbom-path:\s*sbom\.spdx\.json/, "Release workflow must bind the SPDX SBOM to the exact HTML artifact.");
forbidRegex(releaseWorkflow, /actions\/attest-build-provenance@/, "Release workflow still uses the superseded provenance wrapper action.");
forbidRegex(releaseWorkflow, /\s--clobber(?:\s|$)/m, "Release workflow must fail closed instead of overwriting release assets.");
const releaseUploadIndex = releaseWorkflow.indexOf("gh release upload");
const releasePublishIndex = releaseWorkflow.indexOf("gh release edit");
if (releaseUploadIndex < 0 || releasePublishIndex < 0 || releasePublishIndex <= releaseUploadIndex) {
  failures.push("Release workflow must upload the complete draft bundle before publishing it.");
}
requireRegex(
  releaseWorkflow,
  /gh release edit "\$\{\{ needs\.release-please\.outputs\.tag_name \}\}" --draft=false/,
  "Release workflow must publish the exact draft tag after asset closure."
);

const qualityWorkflow = readText(".github/workflows/quality.yml");
requireRegex(qualityWorkflow, /pull_request:[\s\S]*?branches:\s*\[master\]/, "Quality workflow must validate pull requests targeting master.");
requireRegex(qualityWorkflow, /^  validate:\n    name: Quality Gate$/m, "Quality workflow must emit the stable Quality Gate check name.");
requireRegex(qualityWorkflow, /npm run validate:dependencies/, "Quality workflow must consume the blocking dependency gate.");
requireRegex(qualityWorkflow, /npm run validate:full:ci/, "Quality workflow must run the clean-index full release gate.");

const linuxPackageWorkflow = readText(".github/workflows/linux-package.yml");
requireRegex(linuxPackageWorkflow, /^  validate:\n    name: Linux Package$/m, "Linux workflow must emit the stable Linux Package check name.");
requireRegex(linuxPackageWorkflow, /runs-on:\s*ubuntu-24\.04/, "Linux package workflow must use a stable Ubuntu release.");
requireRegex(linuxPackageWorkflow, /appstream desktop-file-utils xdg-utils/, "Linux package workflow must install the freedesktop.org validation tools.");
requireRegex(linuxPackageWorkflow, /npm run validate:linux:system/, "Linux package workflow must consume the strict repo-owned Linux system-tool gate.");
const linuxSystemGate = readText("scripts/validate-linux-system-tools.sh");
requireRegex(linuxSystemGate, /appstreamcli --version/, "Linux system-tool gate must record the AppStream validator version.");
requireRegex(linuxSystemGate, /desktop-file-validate --version/, "Linux system-tool gate must record the desktop-entry validator version.");

const releasePleaseConfig = JSON.parse(readText("release-please-config.json"));
const releasePackageConfig = releasePleaseConfig.packages?.["."] || {};
if (releasePackageConfig["package-name"] !== packageJson.name || releasePackageConfig["include-component-in-tag"] !== true || releasePackageConfig["include-v-in-tag"] !== true || releasePackageConfig.draft !== true || releasePackageConfig["force-tag-creation"] !== true) {
  failures.push("release-please-config.json must explicitly preserve the hsqlite-editor-v<version> tag contract.");
}
const linuxMetainfoUpdater = (releasePackageConfig["extra-files"] || []).find(item =>
  item?.type === "generic"
  && item?.path === "packaging/linux/io.github.helbertm.hsqlite-editor.metainfo.xml"
);
if (!linuxMetainfoUpdater) {
  failures.push("release-please-config.json must update the Linux AppStream release version.");
}

const pagesWorkflow = readText(".github/workflows/pages.yml");
requireRegex(pagesWorkflow, /npm run validate:dependencies/, "Pages workflow must consume the repo-owned dependency vulnerability gate.");

const dependencyReviewWorkflow = readText(".github/workflows/dependency-review.yml");
requireRegex(dependencyReviewWorkflow, /^  dependency-review:\n    name: Dependency Review$/m, "Dependency-review workflow must emit the stable Dependency Review check name.");
requireRegex(dependencyReviewWorkflow, /npm run validate:dependencies/, "Dependency-review workflow must consume the repo-owned dependency vulnerability gate.");
requireRegex(dependencyReviewWorkflow, /fail-on-severity:\s*high/, "Dependency-review workflow must block high-severity dependency changes.");

const githubControlsPolicy = JSON.parse(readText("github-controls-policy.json"));
const requiredHostedChecks = [
  "Quality Gate",
  "Linux Package",
  "Browser Quality",
  "CodeQL Analysis",
  "CodeQL",
  "Commit Convention",
  "Dependency Review"
];
const attestationPredicates = githubControlsPolicy.release?.attestationPredicates || [];
if (
  githubControlsPolicy.repository !== "helbertm/hSQLite-Editor"
  || githubControlsPolicy.defaultBranch !== "master"
  || githubControlsPolicy.actions?.defaultWorkflowPermissions !== "read"
  || githubControlsPolicy.actions?.canCreateOrApprovePullRequests !== true
  || githubControlsPolicy.actions?.shaPinningRequired !== true
  || JSON.stringify(githubControlsPolicy.requiredChecks) !== JSON.stringify(requiredHostedChecks)
  || githubControlsPolicy.release?.repositoryImmutabilityEnabled !== true
  || githubControlsPolicy.release?.immutable !== true
  || githubControlsPolicy.release?.subjectAssetTemplate !== "hSQLite-Editor-v{version}.html"
  || !githubControlsPolicy.release?.assetTemplates?.includes(githubControlsPolicy.release?.subjectAssetTemplate)
  || !attestationPredicates.some(predicate => predicate.name === "provenance" && predicate.query === "provenance" && predicate.predicateType === "https://slsa.dev/provenance/v1")
  || !attestationPredicates.some(predicate => predicate.name === "sbom" && predicate.query === "sbom" && predicate.predicateType === "https://spdx.dev/Document/v2.3")
) {
  failures.push("github-controls-policy.json does not preserve the required hosted release-security posture.");
}
const validationDocs = readText("docs/validation.md");
const releasingDocs = readText("docs/releasing.md");
requireRegex(validationDocs, /npm run validate:github-controls/, "docs/validation.md must document the hosted GitHub control audit boundary.");
requireRegex(releasingDocs, /npm run validate:github-controls/, "docs/releasing.md must require the hosted GitHub control audit.");
requireRegex(releasingDocs, /draft release/, "docs/releasing.md must document draft-first immutable publication.");

const license = readText("LICENSE");
requireRegex(license, /^MIT License/m, "LICENSE must contain the approved MIT license.");

const packageLicense = String(packageJson.license || "");
if (packageLicense !== "MIT") failures.push(`package.json license must be MIT, found ${packageLicense || "empty"}.`);

const publicFiles = requiredFiles.filter(relativeFile => !relativeFile.startsWith("index.html"));
for (const relativeFile of publicFiles) {
  const content = readText(relativeFile);
  forbidRegex(content, /\/Users\/|[A-Za-z]:\\\\/, `${relativeFile} leaks a machine-local absolute path.`);
}

if (failures.length) {
  console.error("Approval-gate validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Approval-gate validation passed.");
