import fs from "node:fs";
import path from "node:path";

function isWithinRoot(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);
  return relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

export function assertRegularRepoFile(rootDir, filePath) {
  const relativePath = path.relative(rootDir, filePath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Linux packaging input is outside the repository: ${filePath}`);
  }

  let currentPath = rootDir;
  const segments = relativePath.split(path.sep);
  for (const [index, segment] of segments.entries()) {
    currentPath = path.join(currentPath, segment);
    const stats = fs.lstatSync(currentPath);
    if (stats.isSymbolicLink()) {
      throw new Error(`Linux packaging input rejects symbolic links: ${relativePath}`);
    }
    const isFile = index === segments.length - 1;
    if (isFile ? !stats.isFile() : !stats.isDirectory()) {
      throw new Error(`Linux packaging input must be a regular repo-owned file: ${relativePath}`);
    }
  }

  const canonicalRoot = fs.realpathSync.native(rootDir);
  const canonicalFile = fs.realpathSync.native(filePath);
  if (!isWithinRoot(canonicalRoot, canonicalFile)) {
    throw new Error(`Linux packaging input escapes the repository: ${relativePath}`);
  }
  return canonicalFile;
}

export function assertRegularRepoFiles(rootDir, filePaths) {
  return filePaths.map(filePath => assertRegularRepoFile(rootDir, filePath));
}
