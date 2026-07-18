import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { rootDir } from "./build.mjs";
import { assertRegularRepoFile } from "./linux-package-safety.mjs";
import { assertConfinedStageRoot, stageLinuxRelease } from "./stage-linux-release.mjs";
import { getCanonicalLinuxReleaseMetadata } from "./sync-linux-release-metadata.mjs";

const applicationId = "io.github.helbertm.hsqlite-editor";
const packagingRoot = path.join(rootDir, "packaging", "linux");
const packageVersion = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8")).version;
const canonicalRelease = getCanonicalLinuxReleaseMetadata();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function parseDesktopEntry(text) {
  const values = new Map();
  let section = "";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("[") && line.endsWith("]")) {
      section = line.slice(1, -1);
      continue;
    }
    const separator = line.indexOf("=");
    if (separator < 1) fail(`Invalid desktop-entry line: ${rawLine}`);
    else values.set(`${section}.${line.slice(0, separator)}`, line.slice(separator + 1));
  }
  return values;
}

function validateXmlShape(xml) {
  const stack = [];
  const tokenPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]+>/g;
  let token;
  while ((token = tokenPattern.exec(xml))) {
    const value = token[0];
    if (/^<\?|^<!--|^<!\[CDATA\[/.test(value)) continue;
    if (/^<\//.test(value)) {
      const name = value.match(/^<\/\s*([^\s>]+)/)?.[1];
      if (stack.pop() !== name) fail(`AppStream XML has a mismatched closing element: ${name || value}`);
      continue;
    }
    if (/\/>$/.test(value)) continue;
    const name = value.match(/^<\s*([^\s>/]+)/)?.[1];
    if (!name) fail(`AppStream XML contains an invalid element: ${value}`);
    else stack.push(name);
  }
  if (stack.length) fail(`AppStream XML has unclosed elements: ${stack.join(", ")}`);
  if (!/^<\?xml version="1\.0" encoding="UTF-8"\?>/.test(xml)) fail("AppStream XML must declare UTF-8.");
}

function collectTree(directory, relativeRoot = "") {
  const entries = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = path.posix.join(relativeRoot, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) entries.push(...collectTree(absolutePath, relativePath));
    if (entry.isFile()) {
      const stats = fs.statSync(absolutePath);
      entries.push({
        path: relativePath,
        mode: stats.mode & 0o777,
        modifiedAt: stats.mtime.toISOString(),
        digest: crypto.createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex")
      });
    }
  }
  return entries;
}

function collectDirectories(directory, relativeRoot = "") {
  const stats = fs.statSync(directory);
  const directories = [{
    path: relativeRoot || ".",
    mode: stats.mode & 0o777,
    modifiedAt: stats.mtime.toISOString()
  }];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const relativePath = path.posix.join(relativeRoot, entry.name);
    directories.push(...collectDirectories(path.join(directory, entry.name), relativePath));
  }
  return directories;
}

const sourceFiles = [
  "packaging/linux/hsqlite-editor",
  `packaging/linux/${applicationId}.desktop`,
  `packaging/linux/${applicationId}.metainfo.xml`,
  `packaging/linux/${applicationId}.svg`
];
for (const relativePath of sourceFiles) {
  const absolutePath = path.join(rootDir, relativePath);
  try {
    assertRegularRepoFile(rootDir, absolutePath);
  } catch (error) {
    fail(error instanceof Error ? error.message : `Invalid Linux packaging input: ${relativePath}`);
  }
}
if (process.platform !== "win32") {
  const launcherMode = fs.statSync(path.join(packagingRoot, "hsqlite-editor")).mode & 0o777;
  if ((launcherMode & 0o111) === 0) fail("Linux packaging launcher source must be executable on POSIX hosts.");
}

if (!failures.length) {
  const sourceText = sourceFiles.map(relativePath => read(relativePath)).join("\n");
  if (/\/Users\/|[A-Za-z]:\\\\|\/private\/tmp\//.test(sourceText)) fail("Linux packaging inputs leak a machine-local path.");
  const allowedUrls = new Set([
    "http://www.w3.org/2000/svg",
    "https://github.com/helbertm/hSQLite-Editor",
    "https://github.com/helbertm/hSQLite-Editor/issues",
    "https://helbertm.github.io/hSQLite-Editor/"
  ]);
  for (const url of sourceText.match(/https?:\/\/[^\s<"]+/g) || []) {
    if (!allowedUrls.has(url)) fail(`Linux packaging inputs contain an unexpected remote endpoint: ${url}`);
  }
  if (/\b(?:eval|sh\s+-c|bash\s+-c)\b|`|\$\{HSQLITE|HSQLITE_EDITOR_BROWSER/.test(read("packaging/linux/hsqlite-editor"))) {
    fail("Launcher contains a shell-evaluation or browser-command override surface.");
  }

  const launcherSyntax = spawnSync("sh", ["-n", path.join(packagingRoot, "hsqlite-editor")], { encoding: "utf8" });
  if (launcherSyntax.status !== 0) fail(`Launcher shell syntax failed: ${launcherSyntax.stderr.trim()}`);

  const desktopText = read(`packaging/linux/${applicationId}.desktop`);
  const desktop = parseDesktopEntry(desktopText);
  const requiredDesktopValues = new Map([
    ["Desktop Entry.Version", "1.5"],
    ["Desktop Entry.Type", "Application"],
    ["Desktop Entry.Exec", "hsqlite-editor"],
    ["Desktop Entry.TryExec", "hsqlite-editor"],
    ["Desktop Entry.Icon", applicationId],
    ["Desktop Entry.Terminal", "false"],
    ["Desktop Entry.Categories", "Development;Database;"]
  ]);
  for (const [key, expected] of requiredDesktopValues) {
    if (desktop.get(key) !== expected) fail(`Desktop entry ${key} must equal ${expected}.`);
  }
  for (const locale of ["pt_BR", "es_ES"]) {
    if (!desktop.has(`Desktop Entry.GenericName[${locale}]`) || !desktop.has(`Desktop Entry.Comment[${locale}]`)) {
      fail(`Desktop entry is missing ${locale} localization.`);
    }
  }
  if (/^(?:MimeType|DBusActivatable|StartupNotify|StartupWMClass)=/m.test(desktopText) || /%[fFuUdDnNickvm]/.test(desktopText)) {
    fail("Desktop entry must not claim file, URL, MIME, D-Bus, window-class, or startup-notification handling.");
  }

  const metainfo = read(`packaging/linux/${applicationId}.metainfo.xml`);
  validateXmlShape(metainfo);
  for (const required of [
    `<id>${applicationId}</id>`,
    "<metadata_license>MIT</metadata_license>",
    "<project_license>MIT</project_license>",
    '<developer id="io.github.helbertm">',
    "<name>hSQLite Editor contributors</name>",
    `<release version="${packageVersion}" date="${canonicalRelease.date}" type="stable" /> <!-- x-release-please-version -->`,
    `<launchable type="desktop-id">${applicationId}.desktop</launchable>`,
    "<binary>hsqlite-editor</binary>",
    '<summary xml:lang="pt-BR">',
    '<summary xml:lang="es-ES">',
    '<p xml:lang="pt-BR">',
    '<p xml:lang="es-ES">',
    '<content_rating type="oars-1.1" />'
  ]) {
    if (!metainfo.includes(required)) fail(`AppStream metadata is missing required contract: ${required}`);
  }
  if ((metainfo.match(/<description(?:\s|>)/g) || []).length !== 1 || /<description\s+xml:lang=/.test(metainfo)) {
    fail("AppStream metadata must localize paragraph children inside one description element.");
  }
  if (/update|sync|encrypt|sandbox|MimeType|remote icon/i.test(metainfo.replace(/automatic updates/g, ""))) {
    fail("AppStream metadata contains an unsupported integration or security claim.");
  }

  const icon = read(`packaging/linux/${applicationId}.svg`);
  validateXmlShape(icon);
  if (!/viewBox="0 0 32 32"/.test(icon) || /(?:href|src)="https?:/.test(icon)) {
    fail("Linux icon must be self-contained and define a stable viewBox.");
  }
}

const validationRoot = path.join(rootDir, "dist", "linux", ".validation");
const stageA = path.join(validationRoot, "a");
const stageB = path.join(validationRoot, "b");
try {
  const allowedRootFixture = path.join(validationRoot, "allowed-root-fixture");
  const allowedRootTarget = path.join(validationRoot, "allowed-root-target");
  const symlinkedAllowedRoot = path.join(allowedRootFixture, "linux");
  fs.mkdirSync(allowedRootFixture, { recursive: true });
  fs.mkdirSync(allowedRootTarget, { recursive: true });
  fs.symlinkSync(allowedRootTarget, symlinkedAllowedRoot, process.platform === "win32" ? "junction" : "dir");
  let rejectedSymlinkedAllowedRoot = false;
  try {
    assertConfinedStageRoot(symlinkedAllowedRoot, path.join(symlinkedAllowedRoot, "stage"));
  } catch (error) {
    rejectedSymlinkedAllowedRoot = /regular directory/.test(String(error));
  }
  if (!rejectedSymlinkedAllowedRoot) fail("Linux staging did not reject a symbolic-link allowed root.");

  const distRootTarget = path.join(validationRoot, "dist-root-target");
  const symlinkedDistRoot = path.join(validationRoot, "dist-root-link");
  fs.mkdirSync(distRootTarget, { recursive: true });
  fs.symlinkSync(distRootTarget, symlinkedDistRoot, process.platform === "win32" ? "junction" : "dir");
  let rejectedSymlinkedDistRoot = false;
  try {
    const allowedRootThroughSymlink = path.join(symlinkedDistRoot, "linux");
    assertConfinedStageRoot(allowedRootThroughSymlink, path.join(allowedRootThroughSymlink, "stage"));
  } catch (error) {
    rejectedSymlinkedDistRoot = /regular directory/.test(String(error));
  }
  if (!rejectedSymlinkedDistRoot) fail("Linux staging did not reject a symbolic-link dist root.");

  const inputTarget = path.join(validationRoot, "packaging-input-target");
  const inputLink = path.join(validationRoot, "packaging-input-link");
  fs.writeFileSync(inputTarget, "fixture\n");
  fs.symlinkSync(inputTarget, inputLink, "file");
  let rejectedSymlinkedInput = false;
  try {
    assertRegularRepoFile(rootDir, inputLink);
  } catch (error) {
    rejectedSymlinkedInput = /rejects symbolic links/.test(String(error));
  }
  if (!rejectedSymlinkedInput) fail("Linux packaging did not reject a symbolic-link input.");

  const inputDirectoryTarget = path.join(validationRoot, "packaging-input-directory-target");
  const inputDirectoryLink = path.join(validationRoot, "packaging-input-directory-link");
  fs.mkdirSync(inputDirectoryTarget, { recursive: true });
  fs.writeFileSync(path.join(inputDirectoryTarget, "input"), "fixture\n");
  fs.symlinkSync(inputDirectoryTarget, inputDirectoryLink, process.platform === "win32" ? "junction" : "dir");
  let rejectedSymlinkedInputAncestor = false;
  try {
    assertRegularRepoFile(rootDir, path.join(inputDirectoryLink, "input"));
  } catch (error) {
    rejectedSymlinkedInputAncestor = /rejects symbolic links/.test(String(error));
  }
  if (!rejectedSymlinkedInputAncestor) fail("Linux packaging did not reject a symbolic-link input ancestor.");

  const escapeTarget = path.join(rootDir, "dist", ".linux-stage-escape-target");
  const escapeLink = path.join(validationRoot, "escape-link");
  fs.mkdirSync(escapeTarget, { recursive: true });
  fs.mkdirSync(validationRoot, { recursive: true });
  fs.symlinkSync(escapeTarget, escapeLink, process.platform === "win32" ? "junction" : "dir");
  let rejectedSymlinkEscape = false;
  try {
    stageLinuxRelease({ stageRoot: path.join(escapeLink, "stage") });
  } catch (error) {
    rejectedSymlinkEscape = /symbolic-link|canonical dist\/linux root/.test(String(error));
  }
  if (!rejectedSymlinkEscape) fail("Linux staging did not reject a symbolic-link ancestor escape.");
  fs.rmSync(escapeLink, { recursive: true, force: true });
  fs.rmSync(escapeTarget, { recursive: true, force: true });

  const first = stageLinuxRelease({ stageRoot: stageA });
  const second = stageLinuxRelease({ stageRoot: stageB, skipBuild: true });
  const firstTree = collectTree(first.stageRoot);
  const secondTree = collectTree(second.stageRoot);
  if (JSON.stringify(firstTree) !== JSON.stringify(secondTree)) fail("Linux staging is not byte-for-byte and mode deterministic.");
  const firstDirectories = collectDirectories(first.stageRoot);
  const secondDirectories = collectDirectories(second.stageRoot);
  if (JSON.stringify(firstDirectories) !== JSON.stringify(secondDirectories)) fail("Linux staging directory metadata is not deterministic.");
  for (const directory of firstDirectories) {
    if (directory.mode !== 0o755) fail(`${directory.path} has directory mode ${directory.mode.toString(8)}; expected 755.`);
  }

  const expectedFiles = [
    "SHA256SUMS",
    "usr/bin/hsqlite-editor",
    `usr/share/applications/${applicationId}.desktop`,
    "usr/share/doc/hsqlite-editor/LICENSE",
    "usr/share/doc/hsqlite-editor/THIRD_PARTY_NOTICES.md",
    "usr/share/hsqlite-editor/hsqlite-editor.html",
    `usr/share/icons/hicolor/scalable/apps/${applicationId}.svg`,
    `usr/share/metainfo/${applicationId}.metainfo.xml`
  ];
  if (JSON.stringify(firstTree.map(entry => entry.path)) !== JSON.stringify(expectedFiles)) {
    fail(`Linux stage contains an unexpected file set: ${firstTree.map(entry => entry.path).join(", ")}`);
  }
  for (const entry of firstTree) {
    const expectedMode = entry.path === "usr/bin/hsqlite-editor" ? 0o755 : 0o644;
    if (entry.mode !== expectedMode) fail(`${entry.path} has mode ${entry.mode.toString(8)}; expected ${expectedMode.toString(8)}.`);
  }

  const checksumPath = path.join(first.stageRoot, "SHA256SUMS");
  const checksumText = fs.readFileSync(checksumPath, "utf8");
  for (const entry of firstTree.filter(item => item.path !== "SHA256SUMS")) {
    if (!checksumText.includes(`${entry.digest}  ${entry.path}\n`)) fail(`Stage checksum manifest is missing ${entry.path}.`);
  }

  const fakeBin = path.join(validationRoot, "fake-bin");
  const launchLog = path.join(validationRoot, "launch.log");
  fs.mkdirSync(fakeBin, { recursive: true });
  const fakeXdgOpen = path.join(fakeBin, "xdg-open");
  fs.writeFileSync(fakeXdgOpen, "#!/bin/sh\nprintf '%s\\n' \"$#\" \"$1\" > \"$HSQLITE_LAUNCH_LOG\"\n", { mode: 0o755 });
  fs.chmodSync(fakeXdgOpen, 0o755);
  const launch = spawnSync(first.paths.launcher, [], {
    env: { ...process.env, PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ""}`, HSQLITE_LAUNCH_LOG: launchLog },
    encoding: "utf8"
  });
  if (launch.status !== 0) fail(`Staged launcher smoke failed: ${launch.stderr.trim()}`);
  const logged = fs.existsSync(launchLog) ? fs.readFileSync(launchLog, "utf8").trim().split("\n") : [];
  if (logged[0] !== "1" || logged[1] !== first.paths.html) fail("Launcher did not pass exactly the packaged HTML path to xdg-open.");
  for (const [locale, expectedMessage] of [
    ["C", "does not accept file or URL arguments"],
    ["pt_BR.UTF-8", "não aceita argumentos de arquivo ou URL"],
    ["es_ES.UTF-8", "no acepta argumentos de archivo ni URL"]
  ]) {
    const rejectedArgument = spawnSync(first.paths.launcher, ["database.sqlite"], {
      env: { ...process.env, LC_ALL: "", LC_MESSAGES: "", LANG: locale },
      encoding: "utf8"
    });
    if (rejectedArgument.status !== 64 || !rejectedArgument.stderr.includes(expectedMessage)) {
      fail(`Launcher must reject file and URL arguments with the localized ${locale} diagnostic and exit code 64.`);
    }
  }

  if (os.platform() === "linux") {
    for (const [command, args] of [
      ["desktop-file-validate", [first.paths.desktop]],
      ["appstreamcli", ["validate", "--no-net", first.paths.metainfo]]
    ]) {
      const available = spawnSync(command, ["--version"], { encoding: "utf8" });
      if (!available.error) {
        const result = spawnSync(command, args, { encoding: "utf8" });
        if (result.status !== 0) fail(`${command} rejected the staged metadata: ${(result.stderr || result.stdout).trim()}`);
      }
    }
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  fs.rmSync(validationRoot, { recursive: true, force: true });
  fs.rmSync(path.join(rootDir, "dist", ".linux-stage-escape-target"), { recursive: true, force: true });
}

if (failures.length) {
  process.stderr.write(`Linux package validation failed:\n${failures.map(item => `- ${item}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write("Linux package validation passed: deterministic stage, metadata, permissions, checksums, and launcher contract.\n");
