import fs from "node:fs";
import path from "node:path";
import {
  buildReleaseMetadata,
  rootDir
} from "./build.mjs";
import {
  getReleaseArtifactPath
} from "./release-utils.mjs";

const releaseMetadata = buildReleaseMetadata();
const releaseArtifactPath = getReleaseArtifactPath(rootDir, releaseMetadata.version);
const readableArtifactPath = path.join(rootDir, "index.html");

if (!fs.existsSync(releaseArtifactPath)) {
  throw new Error(`Release artifact missing: ${path.relative(rootDir, releaseArtifactPath)}`);
}
if (!fs.existsSync(readableArtifactPath)) {
  throw new Error("Readable artifact missing: index.html");
}

const releaseSize = fs.statSync(releaseArtifactPath).size;
const readableSize = fs.statSync(readableArtifactPath).size;
if (releaseSize > readableSize) {
  throw new Error(
    `Release artifact is larger than readable artifact: release=${releaseSize} readable=${readableSize}`
  );
}

process.stdout.write(
  `Release size check passed: ${path.relative(rootDir, releaseArtifactPath)} (${releaseSize} bytes) <= index.html (${readableSize} bytes)\n`
);
