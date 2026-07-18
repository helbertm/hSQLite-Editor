import fs from "node:fs";
import path from "node:path";
import { buildApplicationBundle } from "./app-bundle.mjs";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const reportOnly = process.argv.includes("--report-only");
const sourceRoots = ["src/core", "src/ports", "src/capabilities", "src/ui"];
const productionEntry = "src/app.mjs";

function collectModules(relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  const modules = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) modules.push(...collectModules(relativePath));
    if (entry.isFile() && /\.m?js$/.test(entry.name)) modules.push(relativePath);
  }
  return modules;
}

function findStronglyConnectedComponents(graph) {
  let nextIndex = 0;
  const indices = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function visit(node) {
    indices.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const dependency of graph.get(node) || []) {
      if (!graph.has(dependency)) continue;
      if (!indices.has(dependency)) {
        visit(dependency);
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(dependency)));
      } else if (onStack.has(dependency)) {
        lowLinks.set(node, Math.min(lowLinks.get(node), indices.get(dependency)));
      }
    }

    if (lowLinks.get(node) !== indices.get(node)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    if (component.length > 1) components.push(component.sort());
  }

  for (const node of graph.keys()) {
    if (!indices.has(node)) visit(node);
  }
  return components.sort((left, right) => right.length - left.length);
}

const failures = [];
const ownedModules = sourceRoots.flatMap(collectModules).sort();
const { metafile } = buildApplicationBundle(rootDir);
const bundleInputs = new Set(
  Object.keys(metafile.inputs)
    .map(file => file.split(path.sep).join("/"))
    .filter(file => file.startsWith("src/"))
);

for (const modulePath of ownedModules) {
  if (!bundleInputs.has(modulePath)) {
    failures.push(`Production entry cannot reach owned module: ${modulePath}.`);
  }
}

const graph = new Map();
for (const [inputPath, metadata] of Object.entries(metafile.inputs)) {
  const normalizedInput = inputPath.split(path.sep).join("/");
  if (!normalizedInput.startsWith("src/")) continue;
  graph.set(normalizedInput, metadata.imports
    .map(entry => entry.path.split(path.sep).join("/"))
    .filter(importPath => importPath.startsWith("src/")));
}

for (const [modulePath, dependencies] of graph) {
  for (const dependency of dependencies) {
    if (modulePath.startsWith("src/core/") && !dependency.startsWith("src/core/")) {
      failures.push(`Core layer inversion: ${modulePath} imports ${dependency}.`);
    }
    if (modulePath.startsWith("src/ports/") && /src\/(capabilities|ui)\//.test(dependency)) {
      failures.push(`Port layer inversion: ${modulePath} imports ${dependency}.`);
    }
  }
}

for (const modulePath of [...bundleInputs, productionEntry]) {
  const source = fs.readFileSync(path.join(rootDir, modulePath), "utf8");
  if (/generated-module-imports:(?:start|end)/.test(source)) {
    failures.push(`Migration marker remains in ${modulePath}.`);
  }
}

const components = findStronglyConnectedComponents(graph);
for (const component of components) {
  failures.push(`Circular module component (${component.length}): ${component.join(", ")}.`);
  if (reportOnly) {
    const members = new Set(component);
    for (const modulePath of component) {
      const internalDependencies = (graph.get(modulePath) || []).filter(dependency => members.has(dependency));
      if (internalDependencies.length) {
        failures.push(`  ${modulePath} -> ${internalDependencies.join(", ")}`);
      }
    }
  }
}

if (failures.length) {
  console.error(`Module graph validation ${reportOnly ? "report" : "failed"}:`);
  for (const failure of failures) console.error(`- ${failure}`);
  if (!reportOnly) process.exit(1);
} else {
  console.log(`Module graph validation passed (${graph.size} production modules, no cycles).`);
}
