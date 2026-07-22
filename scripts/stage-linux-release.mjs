import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildArtifact,
  buildReleaseMetadata,
  rootDir
} from "./build.mjs";
import {
  assertStableReleaseVersion,
  escapeRegExp,
  getReleaseArtifactPath,
  minifyStandaloneHtml
} from "./release-utils.mjs";
import { assertRegularRepoFiles } from "./linux-package-safety.mjs";

const applicationId = "io.github.helbertm.hsqlite-editor";

function isWithinRoot(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function ensureRegularDirectory(parentCanonicalPath, directoryPath) {
  if (fs.existsSync(directoryPath)) {
    const stats = fs.lstatSync(directoryPath);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error(`Linux staging requires a regular directory: ${path.relative(rootDir, directoryPath)}`);
    }
  } else {
    fs.mkdirSync(directoryPath, { mode: 0o755 });
  }
  const canonicalDirectory = fs.realpathSync.native(directoryPath);
  if (!isWithinRoot(parentCanonicalPath, canonicalDirectory)) {
    throw new Error(`Linux staging directory escapes its repository-owned parent: ${path.relative(rootDir, directoryPath)}`);
  }
  return canonicalDirectory;
}

export function assertConfinedStageRoot(allowedRoot, stageRoot) {
  const canonicalRepositoryRoot = fs.realpathSync.native(rootDir);
  const distRoot = path.dirname(allowedRoot);
  const canonicalDistRoot = ensureRegularDirectory(canonicalRepositoryRoot, distRoot);
  const canonicalAllowedRoot = ensureRegularDirectory(canonicalDistRoot, allowedRoot);
  const relativeStageRoot = path.relative(allowedRoot, stageRoot);
  if (!relativeStageRoot || relativeStageRoot.startsWith("..") || path.isAbsolute(relativeStageRoot)) {
    throw new Error("Linux staging is restricted to a child of dist/linux.");
  }

  let currentPath = allowedRoot;
  for (const segment of relativeStageRoot.split(path.sep)) {
    currentPath = path.join(currentPath, segment);
    if (!fs.existsSync(currentPath)) break;
    if (fs.lstatSync(currentPath).isSymbolicLink()) {
      throw new Error(`Linux staging rejects symbolic-link path components: ${path.relative(rootDir, currentPath)}`);
    }
    const canonicalCurrentPath = fs.realpathSync.native(currentPath);
    if (!isWithinRoot(canonicalAllowedRoot, canonicalCurrentPath)) {
      throw new Error("Linux staging path escapes the canonical dist/linux root.");
    }
  }

  return canonicalAllowedRoot;
}

function writeFile(targetPath, contents, mode) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true, mode: 0o755 });
  fs.writeFileSync(targetPath, contents, { mode });
  fs.chmodSync(targetPath, mode);
}

function copyFile(sourcePath, targetPath, mode) {
  writeFile(targetPath, fs.readFileSync(sourcePath), mode);
}

function getCanonicalTimestamp(version) {
  const canonicalVersion = assertStableReleaseVersion(version);
  const changelog = fs.readFileSync(path.join(rootDir, "CHANGELOG.md"), "utf8");
  const escapedVersion = escapeRegExp(canonicalVersion);
  const releaseDate = changelog.match(new RegExp(`^## \\[${escapedVersion}\\].*\\((\\d{4}-\\d{2}-\\d{2})\\)$`, "m"))?.[1];
  if (!releaseDate) throw new Error(`CHANGELOG.md is missing a release date for ${canonicalVersion}.`);
  return new Date(`${releaseDate}T00:00:00Z`);
}

function collectFiles(directory, relativeRoot = "") {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = path.posix.join(relativeRoot, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(absolutePath, relativePath));
    if (entry.isFile()) files.push(relativePath);
  }
  return files;
}

function normalizeTimestamps(directory, timestamp) {
  fs.chmodSync(directory, 0o755);
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) normalizeTimestamps(absolutePath, timestamp);
    fs.utimesSync(absolutePath, timestamp, timestamp);
  }
  fs.utimesSync(directory, timestamp, timestamp);
}

function buildReleaseArtifact(version) {
  const releaseArtifactPath = getReleaseArtifactPath(rootDir, version);
  const { outputPath } = buildArtifact({
    outputPath: releaseArtifactPath,
    minifyBootstrap: true
  });
  const html = minifyStandaloneHtml(fs.readFileSync(outputPath, "utf8"));
  fs.writeFileSync(outputPath, html);
  return outputPath;
}

export function getDefaultLinuxStagePath(version) {
  return path.join(rootDir, "dist", "linux", `hsqlite-editor-${version}`);
}

export function stageLinuxRelease(options = {}) {
  const metadata = buildReleaseMetadata();
  const version = metadata.version;
  const stageRoot = path.resolve(options.stageRoot || getDefaultLinuxStagePath(version));
  const allowedRoot = path.join(rootDir, "dist", "linux");
  const canonicalAllowedRoot = assertConfinedStageRoot(allowedRoot, stageRoot);
  const packagingRoot = path.join(rootDir, "packaging", "linux");
  const packagingPaths = {
    launcher: path.join(packagingRoot, "hsqlite-editor"),
    desktop: path.join(packagingRoot, `${applicationId}.desktop`),
    metainfo: path.join(packagingRoot, `${applicationId}.metainfo.xml`),
    icon: path.join(packagingRoot, `${applicationId}.svg`),
    license: path.join(rootDir, "LICENSE"),
    thirdPartyNotices: path.join(rootDir, "THIRD_PARTY_NOTICES.md")
  };
  assertRegularRepoFiles(rootDir, Object.values(packagingPaths));

  const releaseArtifactPath = options.skipBuild
    ? getReleaseArtifactPath(rootDir, version)
    : buildReleaseArtifact(version);
  if (!fs.existsSync(releaseArtifactPath)) {
    throw new Error(`Release artifact missing: ${path.relative(rootDir, releaseArtifactPath)}`);
  }

  fs.rmSync(stageRoot, { recursive: true, force: true });
  fs.mkdirSync(stageRoot, { recursive: true, mode: 0o755 });
  if (!isWithinRoot(canonicalAllowedRoot, fs.realpathSync.native(stageRoot))) {
    throw new Error("Linux staging path escaped the canonical dist/linux root during creation.");
  }

  const paths = {
    launcher: path.join(stageRoot, "usr", "bin", "hsqlite-editor"),
    html: path.join(stageRoot, "usr", "share", "hsqlite-editor", "hsqlite-editor.html"),
    desktop: path.join(stageRoot, "usr", "share", "applications", `${applicationId}.desktop`),
    metainfo: path.join(stageRoot, "usr", "share", "metainfo", `${applicationId}.metainfo.xml`),
    icon: path.join(stageRoot, "usr", "share", "icons", "hicolor", "scalable", "apps", `${applicationId}.svg`),
    license: path.join(stageRoot, "usr", "share", "doc", "hsqlite-editor", "LICENSE"),
    thirdPartyNotices: path.join(stageRoot, "usr", "share", "doc", "hsqlite-editor", "THIRD_PARTY_NOTICES.md")
  };

  copyFile(packagingPaths.launcher, paths.launcher, 0o755);
  copyFile(releaseArtifactPath, paths.html, 0o644);
  copyFile(packagingPaths.desktop, paths.desktop, 0o644);
  copyFile(packagingPaths.metainfo, paths.metainfo, 0o644);
  copyFile(packagingPaths.icon, paths.icon, 0o644);
  copyFile(packagingPaths.license, paths.license, 0o644);
  copyFile(packagingPaths.thirdPartyNotices, paths.thirdPartyNotices, 0o644);

  const checksumLines = collectFiles(stageRoot).map(relativePath => {
    const digest = crypto.createHash("sha256").update(fs.readFileSync(path.join(stageRoot, relativePath))).digest("hex");
    return `${digest}  ${relativePath}`;
  });
  writeFile(path.join(stageRoot, "SHA256SUMS"), `${checksumLines.join("\n")}\n`, 0o644);
  normalizeTimestamps(stageRoot, getCanonicalTimestamp(version));

  return { stageRoot, version, paths };
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  if (process.argv.length !== 2) {
    process.stderr.write("Usage: node scripts/stage-linux-release.mjs\n");
    process.exit(64);
  }
  const result = stageLinuxRelease();
  process.stdout.write(`Linux release staged: ${path.relative(rootDir, result.stageRoot)}\n`);
}
