import path from "node:path";
import { buildSync } from "esbuild";

export function buildApplicationBundle(rootDir, { entryPoint = "src/app.mjs", minify = false } = {}) {
  const result = buildSync({
    absWorkingDir: rootDir,
    bundle: true,
    entryPoints: [path.join(rootDir, entryPoint)],
    format: "iife",
    legalComments: "none",
    metafile: true,
    minify,
    platform: "browser",
    sourcemap: false,
    target: ["es2022"],
    write: false
  });
  return {
    code: result.outputFiles[0].text,
    metafile: result.metafile
  };
}
