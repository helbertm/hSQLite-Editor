import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const VENDOR_PACKAGES = {
  "sql.js": {
    dirName: "sql.js",
    license: "MIT",
    files: [
      "sql-wasm.js",
      "sql-wasm.wasm"
    ],
    sourcePath(fileName) {
      return `dist/${fileName}`;
    }
  }
};

export function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

export function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

export function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function sha256(filePath) {
  const bytes = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export function vendorManifestPath(rootDir) {
  return path.join(rootDir, "vendor", "manifest.json");
}

export function readVendorManifest(rootDir) {
  return readJson(vendorManifestPath(rootDir));
}

export function writeVendorManifest(rootDir, manifest) {
  writeJson(vendorManifestPath(rootDir), manifest);
}

export function verifyVendorManifest(rootDir, manifest = readVendorManifest(rootDir)) {
  for (const asset of manifest.assets || []) {
    const absolutePath = path.join(rootDir, asset.path);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Missing vendored asset: ${asset.path}`);
    }
    const actualSha = sha256(absolutePath);
    if (actualSha !== asset.sha256) {
      throw new Error(`Checksum mismatch for ${asset.path}`);
    }
  }
}

export function getPackageAssets(manifest, packageName) {
  const packageConfig = VENDOR_PACKAGES[packageName];
  if (!packageConfig) {
    throw new Error(`Unsupported vendor package: ${packageName}`);
  }
  return (manifest.assets || []).filter((asset) => asset.path.startsWith(`vendor/${packageConfig.dirName}/`));
}

export function getPackageVersion(manifest, packageName) {
  const assets = getPackageAssets(manifest, packageName);
  const version = assets[0]?.version || "";
  if (!version) {
    throw new Error(`No vendored assets recorded for package ${packageName}`);
  }
  return version;
}

export function getVendorAssetPath(rootDir, manifest, packageName, fileName) {
  const assets = getPackageAssets(manifest, packageName);
  const asset = assets.find((entry) => path.basename(entry.path) === fileName);
  if (!asset) {
    throw new Error(`Vendored asset not found for ${packageName}: ${fileName}`);
  }
  return path.join(rootDir, asset.path);
}
