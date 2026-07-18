import fs from "node:fs";
import {
  buildArtifact,
  buildReleaseMetadata,
  rootDir
} from "./build.mjs";
import {
  getReleaseArtifactPath,
  minifyStandaloneHtml
} from "./release-utils.mjs";

const releaseMetadata = buildReleaseMetadata();
const releaseArtifactPath = getReleaseArtifactPath(rootDir, releaseMetadata.version);
const { outputPath } = buildArtifact({
  outputPath: releaseArtifactPath,
  minifyBootstrap: true
});

const readableHtml = fs.readFileSync(outputPath, "utf8");
const minifiedHtml = minifyStandaloneHtml(readableHtml);
fs.writeFileSync(outputPath, minifiedHtml);

process.stdout.write(`Release artifact generated: ${releaseArtifactPath}\n`);
