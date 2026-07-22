import fs from "node:fs";
import path from "node:path";
import {
  VENDOR_PACKAGES,
  readVendorManifest,
  writeVendorManifest,
  sha256,
  verifyVendorManifest
} from "./vendor-utils.mjs";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);

function parseArgs(argv) {
  const args = { packageName: "", version: "" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--package") args.packageName = argv[i + 1] || "";
    if (argv[i] === "--version") args.version = argv[i + 1] || "";
  }
  if (!args.packageName || !args.version) {
    throw new Error("Usage: node scripts/update-vendor.mjs --package <codemirror|sql.js> --version <version>");
  }
  if (!VENDOR_PACKAGES[args.packageName]) throw new Error(`Unsupported package: ${args.packageName}`);
  return args;
}

function buildAssetRecord(packageName, version, fileName) {
  const pkg = VENDOR_PACKAGES[packageName];
  const relativePath = path.posix.join("vendor", pkg.dirName, version, fileName);
  return {
    path: relativePath,
    version,
    upstream: `https://www.npmjs.com/package/${packageName}/v/${version}?activeTab=code#${pkg.sourcePath(fileName)}`,
    license: pkg.license,
    sha256: sha256(path.join(rootDir, relativePath))
  };
}

function removeOldPackageDirectory(packageName, keepVersion) {
  const packageDir = path.join(rootDir, "vendor", VENDOR_PACKAGES[packageName].dirName);
  if (!fs.existsSync(packageDir)) return;
  for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== keepVersion) {
      fs.rmSync(path.join(packageDir, entry.name), { recursive: true, force: true });
    }
  }
}

function main() {
  const { packageName, version } = parseArgs(process.argv.slice(2));
  const pkg = VENDOR_PACKAGES[packageName];
  const packageRoot = path.join(rootDir, "node_modules", packageName);
  const installedPackageJson = path.join(packageRoot, "package.json");
  if (!fs.existsSync(installedPackageJson)) {
    throw new Error(`Missing node_modules/${packageName}. Run npm install before updating vendored assets.`);
  }
  const installedVersion = JSON.parse(fs.readFileSync(installedPackageJson, "utf8")).version;
  if (installedVersion !== version) {
    throw new Error(`Installed ${packageName} version is ${installedVersion}; expected ${version}. Update package.json and package-lock.json first.`);
  }

  const manifest = readVendorManifest(rootDir);
  for (const fileName of pkg.files) {
    const sourcePath = path.join(packageRoot, pkg.sourcePath(fileName));
    const relativePath = path.posix.join("vendor", pkg.dirName, version, fileName);
    const destinationPath = path.join(rootDir, relativePath);
    if (!fs.existsSync(sourcePath)) throw new Error(`Installed package asset is missing: ${sourcePath}`);
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
  }

  removeOldPackageDirectory(packageName, version);
  const nextAssets = (manifest.assets || []).filter(asset => !asset.path.startsWith(`vendor/${pkg.dirName}/`));
  for (const fileName of pkg.files) nextAssets.push(buildAssetRecord(packageName, version, fileName));
  nextAssets.sort((a, b) => a.path.localeCompare(b.path));

  const nextManifest = { ...manifest, assets: nextAssets };
  writeVendorManifest(rootDir, nextManifest);
  verifyVendorManifest(rootDir, nextManifest);
  process.stdout.write(`Updated ${packageName} to ${version} from the package-lock verified npm installation.\n`);
}

try {
  main();
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
