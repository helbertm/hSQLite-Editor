import fs from "node:fs";
import path from "node:path";
const rootDir = path.resolve(new URL("..", import.meta.url).pathname);

function collectFiles(dirPath, extension) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, extension));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(extension)) files.push(fullPath);
  }
  return files.sort();
}

const checks = [
  {
    label: "placeholder sample database configuration",
    pattern: /SEU_USUARIO|SEU_REPOSITORIO/,
    files: [
      "README.md",
      "src/index.template.html",
      "packaging/linux/hsqlite-editor",
      "packaging/linux/io.github.helbertm.hsqlite-editor.desktop",
      "packaging/linux/io.github.helbertm.hsqlite-editor.metainfo.xml",
      "packaging/linux/io.github.helbertm.hsqlite-editor.svg"
    ]
  },
  {
    label: "disabled sample-database surface",
    pattern: /sampleDbBtn|sampleDbModal|Bases didáticas|openSampleAfterCreate/,
    files: [
      "README.md",
      "src/index.template.html"
    ]
  },
  {
    label: "runtime CDN reference in source template",
    pattern: /cdnjs\.cloudflare\.com|raw\.githubusercontent\.com/,
    files: [
      "README.md",
      "src/index.template.html"
    ]
  },
  {
    label: "machine-local absolute path leakage",
    pattern: /\/Users\/|[A-Za-z]:\\\\/,
    files: [
      "README.md",
      "src/index.template.html"
    ]
  },
  {
    label: "stale release literal in source template",
    pattern: /v0\.1beta|v0\.3\.3|hSQLite-Editor-v0\.[\w.-]+\.html/i,
    files: [
      "src/index.template.html"
    ]
  },
  {
    label: "runtime worker source serialization for SQL splitter",
    pattern: /splitSqlStatements\.toString\s*\(/,
    files: [
      "src/capabilities/10-sql-execution.js"
    ]
  },
  {
    label: "inline worker factory inside SQL execution capability",
    pattern: /function\s+createSqlWorker\s*\(/,
    files: [
      "src/capabilities/10-sql-execution.js"
    ]
  },
  {
    label: "inline indexedDB file-handle store inside app session storage",
    pattern: /indexedDB\.open\s*\(/,
    files: [
      "src/capabilities/30-database-session-storage.js"
    ]
  },
  {
    label: "direct showOpenFilePicker browser access inside database session runtime",
    pattern: /showOpenFilePicker\s*\(/,
    files: [
      "src/capabilities/31-database-session-runtime.js"
    ]
  },
  {
    label: "generic ui-button classes on SQL tab inline action controls",
    pattern: /class="[^"]*(?:ui-button|ui-button-icon|ui-button-sm)[^"]*sql-tab-(?:control|close|rename)|class="[^"]*sql-tab-(?:control|close|rename)[^"]*(?:ui-button|ui-button-icon|ui-button-sm)/,
    files: [
      "src/capabilities/24-sql-tabs-render.js"
    ]
  },
  {
    label: "obsolete runtime changelog parsing after build-time release metadata adoption",
    pattern: /function\s+parseReleaseNotesFromChangelog\s*\(|function\s+parseReleaseHistoryFromChangelog\s*\(/,
    files: [
      "src/capabilities/10-release-metadata.js"
    ]
  },
  {
    label: "obsolete SQLite file validation wrapper",
    pattern: /function\s+assertValidSqliteFile\s*\(/,
    files: [
      "src/capabilities/32-database-file-validation.js"
    ]
  },
  {
    label: "non-awaited bootstrap invocation",
    pattern: /(?<!await\s)bootApp\(\)/,
    files: [
      "src/ui/80-bindings.js"
    ]
  },
  {
    label: "interactive shell binding before awaited boot completion",
    pattern: /await\s+bootApp\(\)[\s\S]*?(initShortcutRegistry\(\)|bindShellBootstrapUi\(\))/,
    invert: true,
    files: [
      "src/ui/80-bindings.js"
    ]
  },
  {
    label: "non-awaited SQL editor initialization during boot",
    pattern: /(?<!await\s)initSqlEditor\(\)/,
    files: [
      "src/capabilities/14-app-boot.js"
    ]
  },
  {
    label: "missing bootstrap failure catch entrypoint",
    pattern: /initUiBindings\(\)\.catch\(/,
    invert: true,
    files: [
      "src/ui/80-bindings.js"
    ]
  },
  {
    label: "feature-level UI binding blocks still concentrated in ui/80-bindings.js",
    pattern: /function\s+bind(DatabaseFileInputs|RecentDatabaseUi|HistoryAndFavoritesUi|SettingsAndHelpUi|SqlMapUi|SqlFindUi|ExecutionAndTabDialogs|BootRecoveryUi)\s*\(/,
    files: [
      "src/ui/80-bindings.js"
    ]
  }
];

const failures = [];
const editorAdapterPath = "src/editor/codemirror6-adapter.mjs";

for (const check of checks) {
  const localDependency = check.files.find(relativeFile => /^(?:agent-state|dist|node_modules)\//.test(relativeFile));
  if (localDependency) {
    failures.push(`Source validation configuration must not depend on local or generated path: ${localDependency}`);
  }
}

for (const extension of [".js", ".mjs"]) {
  for (const absoluteFile of collectFiles(path.join(rootDir, "src"), extension)) {
    const relativeFile = path.relative(rootDir, absoluteFile);
    const text = fs.readFileSync(absoluteFile, "utf8");
    if (relativeFile !== editorAdapterPath && /(?:from\s*|import\s*\()["']@(?:codemirror|lezer)\//.test(text)) {
      failures.push(`${relativeFile} imports the editor runtime outside ${editorAdapterPath}.`);
    }
    if (/CodeMirror\.(?:fromTextArea|Pos)|\.CodeMirror(?:\b|-)|5\.65\./.test(text)) {
      failures.push(`${relativeFile} contains CodeMirror 5 runtime residue.`);
    }
  }
}

for (const absoluteFile of collectFiles(path.join(rootDir, "src/styles"), ".css")) {
  const text = fs.readFileSync(absoluteFile, "utf8");
  if (/\.sample-|didactic bases|didactic modal/i.test(text)) {
    failures.push(`${path.relative(rootDir, absoluteFile)} contains obsolete sample-database CSS residue.`);
  }
  if (/letter-spacing\s*:\s*-[^;]+;/.test(text)) {
    failures.push(`${path.relative(rootDir, absoluteFile)} contains negative letter spacing.`);
  }
}

for (const check of checks) {
  for (const relativeFile of check.files) {
    const absoluteFile = path.join(rootDir, relativeFile);
    if (!fs.existsSync(absoluteFile)) continue;
    const text = fs.readFileSync(absoluteFile, "utf8");
    const hasMatch = check.pattern.test(text);
    if ((check.invert && !hasMatch) || (!check.invert && hasMatch)) {
      failures.push(`${relativeFile} still contains ${check.label}.`);
    }
  }
}

const generatedDbRuntimePath = path.join(rootDir, "src/capabilities/31-database-session-runtime.js");
if (fs.existsSync(generatedDbRuntimePath)) {
  const runtimeText = fs.readFileSync(generatedDbRuntimePath, "utf8");
  const emptyPayloadAllowances = runtimeText.match(/allowEmptyGeneratedPayload\s*:\s*true/g) || [];
  if (emptyPayloadAllowances.length !== 1) {
    failures.push(`src/capabilities/31-database-session-runtime.js must contain exactly one generated empty-payload allowance, found ${emptyPayloadAllowances.length}.`);
  }
  if (!/nextDb:\s*nextDbBytes\.length\s*\?\s*new SqlJs\.Database\(nextDbBytes\)\s*:\s*new SqlJs\.Database\(\)/.test(runtimeText)) {
    failures.push("src/capabilities/31-database-session-runtime.js must keep the explicit empty-vs-bytes SqlJs.Database runtime split for generated databases.");
  }
}

const sqliteValidationPath = path.join(rootDir, "src/capabilities/32-database-file-validation.js");
if (fs.existsSync(sqliteValidationPath)) {
  const validationText = fs.readFileSync(sqliteValidationPath, "utf8");
  if (!/if\s*\(\s*allowEmptyGeneratedPayload\s*&&\s*\(!bytes\s*\|\|\s*bytes\.length\s*===\s*0\)\s*\)\s*\{\s*return normalizedFileName;\s*\}/.test(validationText)) {
    failures.push("src/capabilities/32-database-file-validation.js must keep the guarded empty generated-payload acceptance branch.");
  }
}

const guardedSourceRoots = [
  "src/ui",
  "src/capabilities",
  "src/ports"
];

const forbiddenStateMutations = [
  {
    label: "direct db-session/global state reassignment",
    pattern: /\b(currentDbBytes|currentDbFileName|currentDbSession|currentDbSessionId|isDbDirty)\s*=\s*/
  },
  {
    label: "direct tab field mutation",
    pattern: /\btab\.(sql|resultSets|activeResultIndex|filterValue|title)\s*=\s*/
  },
  {
    label: "in-place sqlTabs array mutation",
    pattern: /\bsqlTabs\.(push|splice)\s*\(/
  },
  {
    label: "in-place selectedKeys mutation outside core",
    pattern: /\bselectedKeys\.(add|delete|clear)\s*\(/
  },
  {
    label: "in-place sortStates mutation outside core",
    pattern: /\bsortStates\.(push|splice)\s*\(/
  },
  {
    label: "direct columnWidths mutation outside core",
    pattern: /\b(?:delete\s+columnWidths\[[^\]]+\]|columnWidths\[[^\]]+\]\s*=)/
  }
];

for (const relativeRoot of guardedSourceRoots) {
  const absoluteRoot = path.join(rootDir, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) continue;
  const files = collectFiles(absoluteRoot, ".js");

  for (const absoluteFile of files) {
    const relativeFile = path.relative(rootDir, absoluteFile);
    const text = fs.readFileSync(absoluteFile, "utf8");

    for (const rule of forbiddenStateMutations) {
      if (rule.pattern.test(text)) {
        failures.push(`${relativeFile} still contains ${rule.label}.`);
      }
    }
  }
}

if (failures.length) {
  console.error("Source validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Source validation passed.");
