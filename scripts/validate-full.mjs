import { spawnSync } from "node:child_process";
import path from "node:path";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const expectCleanWorktree = process.argv.includes("--expect-clean-index");

const steps = [
  { label: "Layer 1/4: static policy", command: ["npm", "run", "validate:static"] },
  { label: "Layer 2/4: deterministic unit and contract tests", command: ["npm", "run", "test:contract"] },
  { label: "Build readable artifact", command: ["npm", "run", "build"] },
  { label: "Layer 3/4: readable artifact structure", command: ["npm", "run", "validate:artifact:structure"] },
  { label: "Layer 3/4: readable cross-surface runtime", command: ["npm", "run", "validate:runtime"] },
  { label: "Layer 3/4: readable feature-owned runtime", command: ["npm", "run", "validate:runtime:features"] },
  { label: "Build public release artifact", command: ["npm", "run", "build:release"] },
  { label: "Layer 3/4: release artifact structure", command: ["npm", "run", "validate:release:structure"] },
  { label: "Layer 3/4: release artifact runtime", command: ["npm", "run", "validate:release:runtime"] },
  { label: "Layer 4/4: deterministic Linux packaging satellite", command: ["npm", "run", "validate:linux"] },
  { label: "Layer 4/4: approval and release surface", command: ["npm", "run", "validate:approval"] }
];

if (expectCleanWorktree) {
  steps.unshift({
    label: "Verify clean repository baseline",
    command: ["node", "scripts/validate-repository-state.mjs", "--require-clean"]
  });
  steps.push({
    label: "Verify validation leaves the repository clean",
    command: ["node", "scripts/validate-repository-state.mjs", "--require-clean"]
  });
}

for (const step of steps) {
  process.stdout.write(`\n[validate:full] ${step.label}\n`);
  const result = spawnSync(step.command[0], step.command.slice(1), {
    cwd: rootDir,
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

process.stdout.write(
  `\n[validate:full] Full standalone release gate passed${expectCleanWorktree ? " with clean-worktree verification" : ""}.\n`
);
