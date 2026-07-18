import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const outputPath = path.join(rootDir, "runtime-components.json");
const checkOnly = process.argv.includes("--check");

function packageNameFromSpecifier(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

function getLockedComponent(packageLock, name) {
  const metadata = packageLock.packages?.[`node_modules/${name}`];
  if (!metadata?.version) throw new Error(`Runtime package is missing from package-lock.json: ${name}`);
  return {
    name,
    version: metadata.version,
    license: metadata.license || "NOASSERTION",
    resolved: metadata.resolved || "NOASSERTION",
    integrity: metadata.integrity || "NOASSERTION"
  };
}

function getLockedRuntimeClosure(entryPoint) {
  const packageLock = JSON.parse(fs.readFileSync(path.join(rootDir, "package-lock.json"), "utf8"));
  const source = fs.readFileSync(path.join(rootDir, entryPoint), "utf8");
  const pending = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g), match => packageNameFromSpecifier(match[1]))
    .filter(name => !name.startsWith(".") && !name.startsWith("node:"));
  const visited = new Set();

  while (pending.length) {
    const name = pending.pop();
    if (!name || visited.has(name)) continue;
    visited.add(name);
    const metadata = packageLock.packages?.[`node_modules/${name}`];
    if (!metadata?.version) throw new Error(`Runtime package is missing from package-lock.json: ${name}`);
    pending.push(...Object.keys(metadata.dependencies || {}));
  }

  return Array.from(visited).sort().map(name => getLockedComponent(packageLock, name));
}

function createDocument(components) {
  return {
    schemaVersion: 1,
    bundles: [{
      id: "codemirror6-editor-runtime",
      entryPoint: "src/editor/codemirror6-adapter.mjs",
      format: "iife",
      runtime: true,
      components
    }]
  };
}

if (checkOnly) {
  const components = getLockedRuntimeClosure("src/editor/codemirror6-adapter.mjs");
  const serialized = `${JSON.stringify(createDocument(components), null, 2)}\n`;
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== serialized) {
    console.error("runtime-components.json is missing or stale. Run npm run generate:runtime-components.");
    process.exit(1);
  }
  console.log(`Runtime-component validation passed (${components.length} bundled packages).`);
} else {
  const { buildEditorBundle } = await import("./editor-bundle.mjs");
  const { components } = buildEditorBundle(rootDir);
  const lockedComponents = getLockedRuntimeClosure("src/editor/codemirror6-adapter.mjs");
  if (JSON.stringify(components) !== JSON.stringify(lockedComponents)) {
    throw new Error("Editor bundle inputs and the locked runtime dependency closure disagree.");
  }
  const serialized = `${JSON.stringify(createDocument(components), null, 2)}\n`;
  fs.writeFileSync(outputPath, serialized);
  console.log(`Generated runtime-components.json (${components.length} bundled packages).`);
}
