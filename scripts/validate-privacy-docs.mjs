import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const storageSource = fs.readFileSync(path.join(rootDir, "src/ports/05-storage.js"), "utf8");
const recentSource = fs.readFileSync(path.join(rootDir, "src/capabilities/30-database-session-storage.js"), "utf8");
const fileAccessSource = fs.readFileSync(path.join(rootDir, "src/ports/30-file-access.js"), "utf8");
const preferenceSource = fs.readFileSync(path.join(rootDir, "src/capabilities/15-preferences.js"), "utf8");
const recentBindingSource = fs.readFileSync(path.join(rootDir, "src/ui/70-bindings-database.js"), "utf8");
const privacy = fs.readFileSync(path.join(rootDir, "docs/privacy.md"), "utf8");
const failures = [];

const storageKeysBlock = storageSource.match(/const STORAGE_KEYS\s*=\s*\{([\s\S]*?)\n\};/)?.[1] || "";
const storageKeys = Array.from(storageKeysBlock.matchAll(/:\s*"([^"]+)"/g), match => match[1]);
for (const key of storageKeys) {
  if (!privacy.includes(`\`${key}\``)) failures.push(`docs/privacy.md does not document localStorage key ${key}.`);
}

for (const field of ["id", "name", "path", "size", "lastModified", "lastOpenedAt", "hasHandle"]) {
  if (!new RegExp(`\\b${field}\\b`).test(recentSource)) failures.push(`Recent database source no longer contains documented field ${field}.`);
  if (!privacy.includes(`\`${field}\``)) failures.push(`docs/privacy.md does not document recent database field ${field}.`);
}

for (const requiredText of [
  "IndexedDB",
  "hSQLiteEditorFileHandlesV1",
  "hSQLiteEditorSqlMapPositionsV1:",
  "Clear recent databases",
  "browser site data",
  "file permission",
  "database bytes are not persisted",
  "Turning session persistence off"
]) {
  if (!privacy.includes(requiredText)) failures.push(`docs/privacy.md is missing required persistence guidance: ${requiredText}`);
}

if (!/indexedDB\.open\(STORAGE_KEYS\.FILE_HANDLES_STORE/.test(fileAccessSource)) {
  failures.push("IndexedDB file-handle storage contract changed without a privacy-documentation update.");
}
if (!/sqlTabsStorage\.clear\(\)/.test(preferenceSource)) {
  failures.push("Session-persistence disable no longer clears SQL tabs as documented.");
}
if (!/recentDbStorage\.clear\(\);[\s\S]*clearFileHandles\(\)/.test(recentBindingSource)) {
  failures.push("Clear recent databases no longer clears metadata and file handles as documented.");
}

if (failures.length) {
  console.error("Privacy documentation validation failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Privacy documentation validation passed (${storageKeys.length} localStorage keys, 7 recent-database fields, IndexedDB clearing contract).`);
