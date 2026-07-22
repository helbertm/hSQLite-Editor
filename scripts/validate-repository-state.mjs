import { spawnSync } from "node:child_process";
import path from "node:path";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const requireClean = process.argv.includes("--require-clean");
const failures = [];

function git(args) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "git " + args.join(" ") + " failed.");
  }
  return result.stdout;
}

const trackedFiles = new Set(git(["ls-files"]).split("\n").filter(Boolean));
const indexedModes = new Map(git(["ls-files", "-s"]).split("\n").filter(Boolean).map(line => {
  const match = line.match(/^(\d{6})\s+[a-f0-9]+\s+\d+\t(.+)$/);
  if (!match) throw new Error("Unable to parse indexed file mode: " + line);
  return [match[2], match[1]];
}));
const requiredTrackedPaths = [
  ".editorconfig",
  ".gitattributes",
  ".github/CODEOWNERS",
  ".github/codeql/codeql-config.yml",
  ".github/dependabot.yml",
  ".github/workflows/browser-quality.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/commit-convention.yml",
  ".github/workflows/dependency-review.yml",
  ".github/workflows/linux-package.yml",
  ".github/workflows/pages.yml",
  ".github/workflows/quality.yml",
  ".github/workflows/release-please.yml",
  ".gitignore",
  "BACKLOG.md",
  "CHANGELOG.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "GOVERNANCE.md",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "SUPPORT.md",
  "THIRD_PARTY_NOTICES.md",
  "design_system.md",
  "docs/linux-packaging.md",
  "docs/remediation-execution-plan.md",
  "index.html",
  "package-lock.json",
  "package.json",
  "packaging/linux/hsqlite-editor",
  "packaging/linux/io.github.helbertm.hsqlite-editor.desktop",
  "packaging/linux/io.github.helbertm.hsqlite-editor.metainfo.xml",
  "packaging/linux/io.github.helbertm.hsqlite-editor.svg",
  "release-please-config.json",
  "sbom.spdx.json",
  "runtime-components.json",
  "security_posture.md",
  "scripts/linux-package-safety.mjs",
  "scripts/stage-linux-release.mjs",
  "scripts/sync-linux-release-metadata.mjs",
  "scripts/validate-linux-package.mjs",
  "scripts/validate-linux-system-tools.sh",
  "scripts/validate-repository-state.mjs",
  "src/index.template.html",
  "vendor/manifest.json"
];

for (const relativePath of requiredTrackedPaths) {
  if (!trackedFiles.has(relativePath)) {
    failures.push("Required public repository file is not tracked: " + relativePath);
  }
}

const requiredExecutablePaths = new Set([
  "packaging/linux/hsqlite-editor",
  "scripts/run-codex-quality.sh",
  "scripts/validate-linux-system-tools.sh",
  "scripts/validate-quality-offline.sh"
]);
for (const relativePath of requiredExecutablePaths) {
  if (indexedModes.get(relativePath) !== "100755") {
    failures.push("Required executable does not have mode 100755 in the index: " + relativePath);
  }
}
const unexpectedExecutables = [...indexedModes]
  .filter(([relativePath, mode]) => mode === "100755" && !requiredExecutablePaths.has(relativePath))
  .map(([relativePath]) => relativePath);
if (unexpectedExecutables.length) {
  failures.push("Unexpected executable file mode in the repository index: " + unexpectedExecutables.join(", "));
}

for (const prefix of ["docs/", "portable/", "scripts/", "src/", "vendor/"]) {
  if (![...trackedFiles].some(file => file.startsWith(prefix))) {
    failures.push("Required public repository tree has no tracked files: " + prefix);
  }
}

for (const forbiddenPrefix of ["agent-state/", ".codex/", "dist/", "node_modules/"]) {
  const leaked = [...trackedFiles].filter(file => file.startsWith(forbiddenPrefix));
  if (leaked.length) {
    failures.push("Local or generated tree must not be tracked: " + leaked.join(", "));
  }
}

const legacyEditorPaths = [...trackedFiles].filter(file => file.startsWith("vendor/codemirror/5.65.18/"));
if (legacyEditorPaths.length) {
  failures.push("Legacy CodeMirror 5 paths must not be present in the repository index: " + legacyEditorPaths.join(", "));
}

if (requireClean) {
  const status = git(["status", "--porcelain=v1", "--untracked-files=all"]).trim();
  if (status) {
    failures.push("Worktree is not clean:\n" + status);
  }
}

if (failures.length) {
  console.error("Repository-state validation failed:");
  failures.forEach(failure => console.error("- " + failure));
  process.exit(1);
}

console.log("Repository-state validation passed" + (requireClean ? " with a clean worktree." : "."));
