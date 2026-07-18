import fs from "node:fs";
import path from "node:path";
import { buildSync } from "esbuild";

export function buildEditorBundle(rootDir, { minify = false } = {}) {
  const entryPoint = path.join(rootDir, "src/editor/codemirror6-adapter.mjs");
  const result = buildSync({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    legalComments: "none",
    sourcemap: false,
    minify,
    metafile: true,
    logLevel: "silent"
  });
  const code = result.outputFiles?.[0]?.text || "";
  if (!code) throw new Error("Editor bundle generation produced no JavaScript output.");

  const packageLock = JSON.parse(fs.readFileSync(path.join(rootDir, "package-lock.json"), "utf8"));
  const packageNames = new Set();
  for (const inputPath of Object.keys(result.metafile?.inputs || {})) {
    const match = inputPath.match(/(?:^|\/)node_modules\/(?:(@[^/]+\/[^/]+)|([^/]+))(?:\/|$)/);
    const packageName = match?.[1] || match?.[2] || "";
    if (packageName) packageNames.add(packageName);
  }

  const components = Array.from(packageNames).sort().map(name => {
    const metadata = packageLock.packages?.[`node_modules/${name}`];
    if (!metadata?.version) throw new Error(`Bundled editor package is missing from package-lock.json: ${name}`);
    return {
      name,
      version: metadata.version,
      license: metadata.license || "NOASSERTION",
      resolved: metadata.resolved || "NOASSERTION",
      integrity: metadata.integrity || "NOASSERTION"
    };
  });

  return { code, components };
}
