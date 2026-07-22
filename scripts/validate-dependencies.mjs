import { spawnSync } from "node:child_process";

const result = spawnSync("npm", ["audit", "--audit-level=high", "--json"], {
  encoding: "utf8",
  shell: false
});

if (result.error) {
  console.error(`Dependency vulnerability validation could not start: ${result.error.message}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout || "{}");
} catch {
  console.error("Dependency vulnerability validation returned invalid JSON.");
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

if (report.error) {
  const summary = typeof report.error === "string"
    ? report.error
    : report.error.summary
      || report.error.message
      || report.error.code
      || report.error.detail
      || JSON.stringify(report.error);
  console.error(`Dependency vulnerability validation failed: ${summary}`);
  if (result.stderr?.trim()) console.error(result.stderr.trim());
  process.exit(1);
}

const vulnerabilities = report.metadata?.vulnerabilities || {};
const high = Number(vulnerabilities.high || 0);
const critical = Number(vulnerabilities.critical || 0);
const total = Number(vulnerabilities.total || 0);

if (result.status !== 0 || high > 0 || critical > 0) {
  console.error(`Dependency vulnerability validation blocked: ${critical} critical, ${high} high, ${total} total.`);
  process.exit(1);
}

console.log(`Dependency vulnerability validation passed: ${critical} critical, ${high} high, ${total} total.`);
